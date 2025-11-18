import * as Asset from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { PDFDocument } from 'pdf-lib';

// 2025 Worksheet (Page 8) — Line-by-line computation per IRS 1040-ES instructions.
// This module is designed to be data-driven: pass all available inputs, and it
// will compute each line or report missing requirements.

export type FilingStatus = 'single' | 'married_filing_jointly' | 'married_filing_separately' | 'head_of_household' | 'qualifying_surviving_spouse';

export type WorksheetInputs = {
  taxYear: number; // 2025
  filingStatus: FilingStatus;
  projected_2025_gross_income?: number;
  above_line_adjustments?: number; // total expected adjustments excluding 1/2 SE tax deduction
  expected_self_employment_net_profit_2025?: number;
  useStandardDeduction?: boolean;
  projected_2025_itemized_deductions?: number;
  standardDeductionOverride?: number; // if user wants to override embedded standard deduction
  expects_QBI_deduction?: boolean;
  projected_QBI_amount?: number;
  expected_AMT_2025?: number;
  expected_other_taxes_2025?: number; // included in line 6 (1040 line 16 type), and also line 10 if applicable
  expected_nonrefundable_credits_2025?: number; // line 7
  expected_refundable_credits_2025?: number; // line 11b
  expected_2025_income_tax_withheld?: number; // line 13
  additional_medicare_withholding?: number; // may adjust safe harbor
  prior_year_total_tax_2024?: number; // for 12b
  was_high_income_prior_year?: boolean; // to apply 110% rule for 12b
  farmer_or_fisher?: boolean; // for 12a 2/3 rule
  overpayment_2024_applied_first_installment?: number; // for line 15
  scheduleConfig?: Partial<RateScheduleConfig>; // allow override of rate schedules and thresholds
  ssWageBase?: number; // Social Security wage base for 2025 (if unspecified, must be provided for exact SE tax)
};

export type WorksheetLines = {
  line1: number; line2a: number; line2b: number; line2c: number; line3: number; line4: number; line5: number; line6: number; line7: number; line8: number;
  line9: number; line10: number; line11a: number; line11b: number; line11c: number; line12a: number; line12b: number; line12c: number; line13: number;
  line14a: number; line14b: number; line15: number;
};

export type WorksheetResult = WorksheetLines & {
  decisions: { requirePayments: boolean; reason: string };
  missingInputs: string[];
  explainers: Record<keyof WorksheetLines, string>;
  seTaxDetail?: { seTax: number; halfDeduction: number; netEarnings: number };
};

// Basic 2025 scaffolding: standard deduction placeholders (require confirmation)
// Update these with official 2025 numbers from f1040es once confirmed.
const DEFAULT_STANDARD_DEDUCTION_2025: Record<FilingStatus, number> = {
  single: 14600,
  married_filing_jointly: 29200,
  married_filing_separately: 14600,
  head_of_household: 21900,
  qualifying_surviving_spouse: 29200,
};

// Rate schedule configuration (placeholders — must be validated with 2025 IRS schedule)
export type RateBracket = { upTo: number; rate: number; base: number; baseAt: number };
export type RateScheduleConfig = Record<FilingStatus, RateBracket[]>;

const DEFAULT_RATE_SCHEDULE_2025: RateScheduleConfig = {
  single: [
    { upTo: 11600, rate: 0.10, base: 0, baseAt: 0 },
    { upTo: 47150, rate: 0.12, base: 1160, baseAt: 11600 },
    { upTo: 100525, rate: 0.22, base: 5426, baseAt: 47150 },
    { upTo: 191950, rate: 0.24, base: 17470, baseAt: 100525 },
    { upTo: 243725, rate: 0.32, base: 39145, baseAt: 191950 },
    { upTo: 609350, rate: 0.35, base: 55678, baseAt: 243725 },
    { upTo: Infinity, rate: 0.37, base: 183647.5, baseAt: 609350 },
  ],
  married_filing_jointly: [
    { upTo: 23200, rate: 0.10, base: 0, baseAt: 0 },
    { upTo: 94300, rate: 0.12, base: 2320, baseAt: 23200 },
    { upTo: 201050, rate: 0.22, base: 10852, baseAt: 94300 },
    { upTo: 383900, rate: 0.24, base: 34940, baseAt: 201050 },
    { upTo: 487450, rate: 0.32, base: 78290, baseAt: 383900 },
    { upTo: 731200, rate: 0.35, base: 111356, baseAt: 487450 },
    { upTo: Infinity, rate: 0.37, base: 183647.5*2, baseAt: 731200 },
  ],
  married_filing_separately: [
    { upTo: 11600, rate: 0.10, base: 0, baseAt: 0 },
    { upTo: 47150, rate: 0.12, base: 1160, baseAt: 11600 },
    { upTo: 100525, rate: 0.22, base: 5426, baseAt: 47150 },
    { upTo: 191950, rate: 0.24, base: 17470, baseAt: 100525 },
    { upTo: 243725, rate: 0.32, base: 39145, baseAt: 191950 },
    { upTo: 365600, rate: 0.35, base: 55678, baseAt: 243725 },
    { upTo: Infinity, rate: 0.37, base: 91823.75, baseAt: 365600 },
  ],
  head_of_household: [
    { upTo: 16550, rate: 0.10, base: 0, baseAt: 0 },
    { upTo: 63100, rate: 0.12, base: 1655, baseAt: 16550 },
    { upTo: 100500, rate: 0.22, base: 7207, baseAt: 63100 },
    { upTo: 191950, rate: 0.24, base: 17367, baseAt: 100500 },
    { upTo: 243700, rate: 0.32, base: 39145, baseAt: 191950 },
    { upTo: 609350, rate: 0.35, base: 55678, baseAt: 243700 },
    { upTo: Infinity, rate: 0.37, base: 183647.5, baseAt: 609350 },
  ],
  qualifying_surviving_spouse: [
    { upTo: 23200, rate: 0.10, base: 0, baseAt: 0 },
    { upTo: 94300, rate: 0.12, base: 2320, baseAt: 23200 },
    { upTo: 201050, rate: 0.22, base: 10852, baseAt: 94300 },
    { upTo: 383900, rate: 0.24, base: 34940, baseAt: 201050 },
    { upTo: 487450, rate: 0.32, base: 78290, baseAt: 383900 },
    { upTo: 731200, rate: 0.35, base: 111356, baseAt: 487450 },
    { upTo: Infinity, rate: 0.37, base: 183647.5*2, baseAt: 731200 },
  ],
};

function roundD(n: number) { return Math.round((n || 0) * 100) / 100; }
function roundDollar(n: number) { return Math.round(n || 0); }

export function computeTaxFromTaxRateSchedule(taxableIncome: number, status: FilingStatus, config?: Partial<RateScheduleConfig>, roundToDollars = true) {
  const schedules = { ...DEFAULT_RATE_SCHEDULE_2025, ...(config || {}) } as RateScheduleConfig;
  const sched = schedules[status];
  let tax = 0;
  for (const b of sched) {
    if (taxableIncome <= b.upTo) {
      tax = b.base + (taxableIncome - b.baseAt) * b.rate;
      break;
    }
  }
  return roundToDollars ? roundDollar(tax) : roundD(tax);
}

export function computeSelfEmploymentTax(netProfit: number, opts: { ssWageBase?: number } = {}) {
  // IRS: net earnings = 92.35% of net profit
  const netEarnings = Math.max(0, (netProfit || 0) * 0.9235);
  const ssBase = opts.ssWageBase ?? 0; // require explicit base for exactness
  const ssTaxable = Math.min(netEarnings, ssBase);
  const ssTax = ssBase ? ssTaxable * 0.124 : 0; // 12.4%
  const medicareTax = netEarnings * 0.029; // 2.9% basic Medicare (ignore additional surtax here; can be added via expected_other_taxes_2025)
  const seTax = ssTax + medicareTax;
  const halfDeduction = seTax / 2; // deductible half
  return { seTax: roundDollar(seTax), halfDeduction: roundDollar(halfDeduction), netEarnings: roundDollar(netEarnings) };
}

export function computePriorYearSafeHarbor(priorYearTotalTax: number, highIncome: boolean, additionalMedicareWithholding = 0) {
  const base = Math.max(0, priorYearTotalTax || 0);
  const required = highIncome ? base * 1.10 : base; // 110% for high-income
  // Instructions note adjustments for Additional Medicare Tax withholding; subtract if applicable
  const adjusted = Math.max(0, required - (additionalMedicareWithholding || 0));
  return roundDollar(adjusted);
}

export function getPdfFieldMapping() {
  return {
    line1: 'topmostSubform[0].Page8[0].f8_1[0]',
    line2a: 'topmostSubform[0].Page8[0].f8_2[0]',
    line2b: 'topmostSubform[0].Page8[0].f8_3[0]',
    line2c: 'topmostSubform[0].Page8[0].f8_4[0]',
    line3: 'topmostSubform[0].Page8[0].f8_5[0]',
    line4: 'topmostSubform[0].Page8[0].f8_6[0]',
    line5: 'topmostSubform[0].Page8[0].f8_7[0]',
    line6: 'topmostSubform[0].Page8[0].f8_8[0]',
    line7: 'topmostSubform[0].Page8[0].f8_9[0]',
    line8: 'topmostSubform[0].Page8[0].f8_10[0]',
    line9: 'topmostSubform[0].Page8[0].f8_11[0]',
    line10: 'topmostSubform[0].Page8[0].f8_12[0]',
    line11a: 'topmostSubform[0].Page8[0].f8_13[0]',
    line11b: 'topmostSubform[0].Page8[0].f8_14[0]',
    line11c: 'topmostSubform[0].Page8[0].f8_15[0]',
    line12a: 'topmostSubform[0].Page8[0].f8_16[0]',
    line12b: 'topmostSubform[0].Page8[0].f8_17[0]',
    line12c: 'topmostSubform[0].Page8[0].f8_18[0]',
    line13: 'topmostSubform[0].Page8[0].f8_19[0]',
    line14a: 'topmostSubform[0].Page8[0].f8_20[0]',
    line14b: 'topmostSubform[0].Page8[0].f8_21[0]',
    line15: 'topmostSubform[0].Page8[0].f8_22[0]',
  } as const;
}

export function computeEstimatedTaxWorksheet(inputs: WorksheetInputs, roundToDollars = true): WorksheetResult {
  const missing: string[] = [];
  const explainers: WorksheetResult['explainers'] = {
    line1: 'Line 1: Adjusted gross income you expect in 2025 — IRS 1040-ES p8',
    line2a: 'Line 2a: Deductions (itemized or standard) — p8',
    line2b: 'Line 2b: QBI deduction — p8',
    line2c: 'Line 2c: Add 2a and 2b — p8',
    line3: 'Line 3: Line 1 minus 2c — p8',
    line4: 'Line 4: Tax using 2025 Tax Rate Schedules — p8',
    line5: 'Line 5: AMT (Form 6251) — p8',
    line6: 'Line 6: Add 4,5 and other taxes — p8',
    line7: 'Line 7: Credits (nonrefundable) — p8',
    line8: 'Line 8: Line 6 minus 7 (>= 0) — p8',
    line9: 'Line 9: Self-employment tax — p8',
    line10: 'Line 10: Other taxes — p8',
    line11a: 'Line 11a: Add 8 through 10 — p8',
    line11b: 'Line 11b: Refundable credits — p8',
    line11c: 'Line 11c: 11a minus 11b (>=0) — p8',
    line12a: 'Line 12a: 90% (or 2/3 for farmers/fishers) of 11c — p8',
    line12b: 'Line 12b: Prior-year safe harbor (100% or 110%) — p8',
    line12c: 'Line 12c: Smaller of 12a or 12b — p8',
    line13: 'Line 13: 2025 withholding (incl. Additional Medicare) — p8',
    line14a: 'Line 14a: 12c minus 13 — p8',
    line14b: 'Line 14b: 11c minus 13 — p8',
    line15: 'Line 15: 1/4 of 14a minus applied overpayment — p8',
  } as any;

  const r = (n: number) => (roundToDollars ? roundDollar(n) : roundD(n));
  const stdDed = inputs.standardDeductionOverride ?? DEFAULT_STANDARD_DEDUCTION_2025[inputs.filingStatus];

  // SE tax & half deduction
  let seTaxDetail: WorksheetResult['seTaxDetail'] | undefined;
  if (inputs.expected_self_employment_net_profit_2025 != null) {
    seTaxDetail = computeSelfEmploymentTax(inputs.expected_self_employment_net_profit_2025, { ssWageBase: inputs.ssWageBase });
  }

  // Line 1
  if (inputs.projected_2025_gross_income == null) missing.push('projected_2025_gross_income');
  const aboveLine = inputs.above_line_adjustments || 0;
  const halfSE = seTaxDetail?.halfDeduction || 0;
  const line1 = r((inputs.projected_2025_gross_income || 0) - aboveLine - halfSE);

  // Line 2a
  let line2a = 0;
  if (inputs.useStandardDeduction) line2a = stdDed;
  else if (inputs.projected_2025_itemized_deductions != null) line2a = inputs.projected_2025_itemized_deductions;
  else { missing.push('useStandardDeduction or projected_2025_itemized_deductions'); line2a = 0; }
  line2a = r(line2a);

  // Line 2b
  const line2b = r(inputs.expects_QBI_deduction ? (inputs.projected_QBI_amount || 0) : 0);

  // Line 2c
  const line2c = r(line2a + line2b);

  // Line 3
  const line3 = r(Math.max(0, line1 - line2c));

  // Line 4 — use tax rate schedules; warn if qualified dividends/capital gains not handled
  const line4 = r(computeTaxFromTaxRateSchedule(line3, inputs.filingStatus, inputs.scheduleConfig));

  // Line 5 — AMT
  const line5 = r(inputs.expected_AMT_2025 || 0);

  // Line 6 — add other taxes
  const line6 = r(line4 + line5 + (inputs.expected_other_taxes_2025 || 0));

  // Line 7 — nonrefundable credits (exclude withholding)
  const line7 = r(inputs.expected_nonrefundable_credits_2025 || 0);

  // Line 8 — 6 - 7 (>=0)
  const line8 = r(Math.max(0, line6 - line7));

  // Line 9 — SE tax
  const line9 = r(seTaxDetail?.seTax || 0);

  // Line 10 — Other taxes (again, per IRS worksheet)
  const line10 = r(inputs.expected_other_taxes_2025 || 0);

  // Line 11a — add 8 through 10
  const line11a = r(line8 + line9 + line10);

  // Line 11b — refundable credits
  const line11b = r(inputs.expected_refundable_credits_2025 || 0);

  // Line 11c — 11a - 11b >= 0
  const line11c = r(Math.max(0, line11a - line11b));

  // Line 12a — 90% or 2/3 for farmers/fishers
  const factor = inputs.farmer_or_fisher ? (2/3) : 0.9;
  const line12a = r(line11c * factor);

  // Line 12b — prior-year safe harbor
  const priorYear = inputs.prior_year_total_tax_2024 || 0;
  const line12b = r(computePriorYearSafeHarbor(priorYear, !!inputs.was_high_income_prior_year, inputs.additional_medicare_withholding || 0));

  // Line 12c — smaller of 12a or 12b
  const line12c = r(Math.min(line12a, line12b));

  // Line 13 — 2025 withholding
  const line13 = r(inputs.expected_2025_income_tax_withheld || 0);

  // Line 14a — 12c - 13
  const line14a = r(line12c - line13);

  // Line 14b — 11c - 13
  const line14b = r(line11c - line13);

  // Line 15 — 1/4 of 14a minus applied overpayment
  const perInstallment = r(line14a / 4);
  const appliedOverpay = inputs.overpayment_2024_applied_first_installment || 0;
  const line15 = r(Math.max(0, perInstallment - appliedOverpay));

  // Decision logic
  let requirePayments = true;
  let reason = 'Estimated payments required';
  if (line14a <= 0) { requirePayments = false; reason = 'Line 14a <= 0: no estimated payments required'; }
  else if (line14b > 0 && line14b < 1000) { requirePayments = false; reason = 'Line 11c - 13 < $1,000: no estimated payments required'; }

  const result: WorksheetResult = {
    line1, line2a, line2b, line2c, line3, line4, line5, line6, line7, line8,
    line9, line10, line11a, line11b, line11c, line12a, line12b, line12c, line13,
    line14a, line14b, line15,
    decisions: { requirePayments, reason },
    missingInputs: missing,
    explainers,
    seTaxDetail
  };
  return result;
}

export async function generateFilledWorksheetPdf(inputs: WorksheetInputs, values?: Partial<WorksheetLines>): Promise<string> {
  // Use the unified fillable booklet to ensure Page 8 fields exist and match IDs
  const moduleId = require('../../assets/form1040esFillable.pdf');
  const asset = Asset.Asset.fromModule(moduleId);
  await asset.downloadAsync();
  const resp = await fetch(asset.localUri!);
  const ab = await resp.arrayBuffer();
  const pdfDoc = await PDFDocument.load(ab);
  const form = pdfDoc.getForm();

  const computed = computeEstimatedTaxWorksheet(inputs);
  const fields = getPdfFieldMapping();
  const finalVals: WorksheetLines = { ...computed, ...(values || {}) } as WorksheetLines;
  const set = (id: string, n: number) => { try { form.getTextField(id).setText(String(n ?? '')); } catch {} };
  set(fields.line1, finalVals.line1);
  set(fields.line2a, finalVals.line2a);
  set(fields.line2b, finalVals.line2b);
  set(fields.line2c, finalVals.line2c);
  set(fields.line3, finalVals.line3);
  set(fields.line4, finalVals.line4);
  set(fields.line5, finalVals.line5);
  set(fields.line6, finalVals.line6);
  set(fields.line7, finalVals.line7);
  set(fields.line8, finalVals.line8);
  set(fields.line9, finalVals.line9);
  set(fields.line10, finalVals.line10);
  set(fields.line11a, finalVals.line11a);
  set(fields.line11b, finalVals.line11b);
  set(fields.line11c, finalVals.line11c);
  set(fields.line12a, finalVals.line12a);
  set(fields.line12b, finalVals.line12b);
  set(fields.line12c, finalVals.line12c);
  set(fields.line13, finalVals.line13);
  set(fields.line14a, finalVals.line14a);
  set(fields.line14b, finalVals.line14b);
  set(fields.line15, finalVals.line15);

  // Flatten to bake in appearances
  try { form.flatten(); } catch {}

  // Extract just Page 8 (0-based index 7) into a new single-page PDF
  const outDoc = await PDFDocument.create();
  const [page8] = await outDoc.copyPages(pdfDoc, [7]);
  outDoc.addPage(page8);
  const bytes = await outDoc.save();
  const b64 = bytesToBase64(bytes);
  const dir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
  const out = dir + `Worksheet2025_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(out, b64, { encoding: 'base64' as any });
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  let i = 0;
  const len = bytes.length;
  while (i < len) {
    const b1 = bytes[i++] ?? 0;
    const b2 = bytes[i++] ?? 0;
    const b3 = bytes[i++] ?? 0;
    const triplet = (b1 << 16) | (b2 << 8) | b3;
    const enc1 = (triplet >> 18) & 0x3f;
    const enc2 = (triplet >> 12) & 0x3f;
    const enc3 = (triplet >> 6) & 0x3f;
    const enc4 = triplet & 0x3f;
    output += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
  }
  const mod = len % 3;
  if (mod > 0) output = output.slice(0, mod === 1 ? -2 : -1) + (mod === 1 ? '==' : '=');
  return output;
}
