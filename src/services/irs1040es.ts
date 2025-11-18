import * as FileSystem from 'expo-file-system/legacy';
import * as Asset from 'expo-asset';
import { PDFDocument, StandardFonts, rgb, PDFTextField } from 'pdf-lib';
import { estimateTaxes, FilingStatus } from '@/services/taxes';
import { computeEstimatedTaxWorksheet, getPdfFieldMapping, WorksheetInputs } from '@/services/worksheet2025';

export type PriorPayment = { quarter: 1 | 2 | 3 | 4; amount: number; date?: string };

export type Irs1040EsInput = {
  taxYear: number; // e.g., 2025
  name: string;
  ssn?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  filingStatus: FilingStatus;
  expectedAnnualIncome: number; // gross self-employed income
  deductibleExpenses: number; // business expenses + other deductions
  otherAdjustments?: number; // IRA/HSA etc. (legacy)
  above_line_adjustments?: number; // preferred for worksheet mapping
  credits?: number; // total nonrefundable credits expected (legacy)
  expected_nonrefundable_credits_2025?: number; // worksheet line 7
  expected_refundable_credits_2025?: number; // worksheet line 11b
  expected_2025_income_tax_withheld?: number; // worksheet line 13
  expected_AMT_2025?: number; // worksheet line 5
  expected_other_taxes_2025?: number; // worksheet lines 6 and 10
  additional_medicare_withholding?: number; // safe harbor adj
  overpayment_2024_applied_first_installment?: number; // worksheet line 15 adjustment
  ssWageBase?: number; // for SE tax calc
  was_high_income_prior_year?: boolean; // 110% rule for 12b
  farmer_or_fisher?: boolean; // 2/3 rule for 12a
  priorYearTotalTax?: number; // total tax from prior-year Form 1040, line 24
  priorPayments?: PriorPayment[]; // prior estimated payments in current year
  safeHarbor?: '90_percent_current' | '100_percent_prior' | '110_percent_high_income';
};

export type Irs1040EsOutput = {
  worksheetUri: string;
  recordUri: string;
  voucherUri: string;
  computed: {
    totalTax: number;
    quarterlyPayment: number;
  };
  missingPrompts: string[];
};

async function loadAssetArrayBuffer(moduleId: any): Promise<ArrayBuffer> {
  const asset = Asset.Asset.fromModule(moduleId);
  await asset.downloadAsync();
  const resp = await fetch(asset.localUri!);
  return await resp.arrayBuffer();
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
  if (mod > 0) {
    output = output.slice(0, mod === 1 ? -2 : -1) + (mod === 1 ? '==' : '=');
  }
  return output;
}

function trySetText(form: any, name: string, value: string | number) {
  try {
    const tf = form.getTextField(name);
    tf.setText(String(value ?? ''));
  } catch {
    // field not present; ignore
  }
}

function computeFromInput(input: Irs1040EsInput) {
  const credits = input.credits || 0;
  const adjustments = input.otherAdjustments || 0;
  const se = estimateTaxes({
    filingStatus: input.filingStatus,
    expectedAnnualIncome: input.expectedAnnualIncome,
    deductibleExpenses: input.deductibleExpenses + adjustments
  });
  // Total tax less credits (not below zero)
  const totalTax = Math.max(0, se.federalTax + se.selfEmploymentTax - credits);
  // Safe harbor logic per IRS: pay the greater of
  // - 90% of current-year tax, or
  // - 100% of prior-year total tax (110% if high-income safe harbor is chosen)
  const candidates: number[] = [totalTax * 0.90];
  if (input.priorYearTotalTax != null) {
    candidates.push(input.priorYearTotalTax);
    if (input.safeHarbor === '110_percent_high_income') {
      candidates.push(input.priorYearTotalTax * 1.10);
    }
  }
  const requiredAnnual = Math.max(...candidates);
  const quarterlyBase = requiredAnnual / 4;
  const paidSoFar = (input.priorPayments || []).reduce((s, p) => s + (p.amount || 0), 0);
  const remaining = Math.max(0, requiredAnnual - paidSoFar);
  // Next voucher suggested amount (if mid-year); default to quarterlyBase for first run
  const nextVoucher = Math.max(0, remaining / Math.max(1, 4 - (input.priorPayments?.length || 0)));
  return { se, totalTax, quarterlyBase, nextVoucher };
}

function normalize(s: string) { return s.toLowerCase().replace(/\s+/g, ' ').trim(); }
function includesAny(hay: string, needles: string[]) { return needles.some(n => hay.includes(n)); }
function safeSet(tf: PDFTextField, value: string) { try { tf.setText(value); } catch {} }

async function fillUnifiedAcroForm(pdfDoc: PDFDocument, input: Irs1040EsInput) {
  const form = pdfDoc.getForm();
  const { se, totalTax, quarterlyBase, nextVoucher } = computeFromInput(input);
  const matched = new Set<string>();
  const allTextFieldNames: string[] = [];
  const mark = (tf: PDFTextField, value: string) => { try { tf.setText(value); matched.add(tf.getName()); } catch {} };

  // Adapter to drive Page 8 from the worksheet engine (Option B)
  const toWorksheetInputs = (i: Irs1040EsInput): WorksheetInputs => ({
    taxYear: i.taxYear || 2025,
    filingStatus: i.filingStatus as any,
    projected_2025_gross_income: i.expectedAnnualIncome,
    above_line_adjustments: (i.above_line_adjustments ?? i.otherAdjustments) || 0,
    expected_self_employment_net_profit_2025: i.expectedAnnualIncome, // treat as SE net profit if applicable
    useStandardDeduction: true,
    projected_2025_itemized_deductions: undefined,
    expects_QBI_deduction: false,
    projected_QBI_amount: 0,
    expected_AMT_2025: i.expected_AMT_2025 || 0,
    expected_other_taxes_2025: i.expected_other_taxes_2025 || 0,
    expected_nonrefundable_credits_2025: (i.expected_nonrefundable_credits_2025 ?? i.credits) || 0,
    expected_refundable_credits_2025: i.expected_refundable_credits_2025 || 0,
    expected_2025_income_tax_withheld: i.expected_2025_income_tax_withheld || 0,
    additional_medicare_withholding: i.additional_medicare_withholding || 0,
    prior_year_total_tax_2024: i.priorYearTotalTax || 0,
    was_high_income_prior_year: i.was_high_income_prior_year ?? (i.safeHarbor === '110_percent_high_income'),
    farmer_or_fisher: i.farmer_or_fisher || false,
    overpayment_2024_applied_first_installment: i.overpayment_2024_applied_first_installment || 0,
    ssWageBase: i.ssWageBase,
  });
  const ws = computeEstimatedTaxWorksheet(toWorksheetInputs(input));
  const page8Map = getPdfFieldMapping();
  for (const f of form.getFields()) {
    if (f instanceof PDFTextField) {
      const raw = f.getName();
      allTextFieldNames.push(raw);
      const nm = normalize(raw);

      // Drive Page 8 using worksheet results and exact field IDs
      if (raw.includes('Page8')) {
        const setIf = (id: string, v: number) => { if (raw.includes(id)) { mark(f, String(v)); return true; } return false; };
        if (setIf('f8_1', ws.line1)) continue;
        if (setIf('f8_2', ws.line2a)) continue;
        if (setIf('f8_3', ws.line2b)) continue;
        if (setIf('f8_4', ws.line2c)) continue;
        if (setIf('f8_5', ws.line3)) continue;
        if (setIf('f8_6', ws.line4)) continue;
        if (setIf('f8_7', ws.line5)) continue;
        if (setIf('f8_8', ws.line6)) continue;
        if (setIf('f8_9', ws.line7)) continue;
        if (setIf('f8_10', ws.line8)) continue;
        if (setIf('f8_11', ws.line9)) continue;
        if (setIf('f8_12', ws.line10)) continue;
        if (setIf('f8_13', ws.line11a)) continue;
        if (setIf('f8_14', ws.line11b)) continue;
        if (setIf('f8_15', ws.line11c)) continue;
        if (setIf('f8_16', ws.line12a)) continue;
        if (setIf('f8_17', ws.line12b)) continue;
        if (setIf('f8_18', ws.line12c)) continue;
        if (setIf('f8_19', ws.line13)) continue;
        if (setIf('f8_20', ws.line14a)) continue;
        if (setIf('f8_21', ws.line14b)) continue;
        if (setIf('f8_22', ws.line15)) continue;
      }
      if (raw.includes('Page9')) {
        const paidSoFar = (input.priorPayments || []).reduce((s, p) => s + (p.amount || 0), 0);
        const remaining = Math.max(0, totalTax - paidSoFar);
        if (raw.includes('f9_25')) { mark(f, String(paidSoFar.toFixed(2))); continue; }
        if (raw.includes('f9_26')) { mark(f, String(remaining.toFixed(2))); continue; }
        if (raw.includes('f9_27')) { mark(f, String(nextVoucher.toFixed(2))); continue; }
      }
      if (raw.includes('Page10')) {
        if (raw.includes('f10_1')) { mark(f, input.name || ''); continue; }
        if (raw.includes('f10_2')) { mark(f, input.ssn || ''); continue; }
        if (raw.includes('f10_3')) {
          const addr = [input.addressLine1, input.addressLine2, [input.city, input.state].filter(Boolean).join(', '), input.zip]
            .filter(Boolean).join(' ');
          mark(f, addr);
          continue;
        }
        if (raw.includes('f10_4')) { mark(f, String(nextVoucher.toFixed(2))); continue; }
      }
      // Identity fields
      if (includesAny(nm, ['name']) && !includesAny(nm, ['spouse'])) { mark(f, input.name || ''); continue; }
      if (includesAny(nm, ['ssn', 'social'])) { mark(f, input.ssn || ''); continue; }
      if (includesAny(nm, ['address2', 'apt', 'unit', 'address line 2'])) { mark(f, input.addressLine2 || ''); continue; }
      if (includesAny(nm, ['address', 'street', 'address1', 'address line 1']) && !includesAny(nm, ['address2'])) { mark(f, input.addressLine1 || ''); continue; }
      if (includesAny(nm, ['city'])) { mark(f, input.city || ''); continue; }
      if (includesAny(nm, ['state'])) { mark(f, input.state || ''); continue; }
      if (includesAny(nm, ['zip', 'postal'])) { mark(f, input.zip || ''); continue; }

      // Worksheet-like line mapping
      if (nm.match(/line\s*1/)) { mark(f, String(input.expectedAnnualIncome || 0)); continue; }
      if (nm.match(/line\s*2/) && !nm.includes('12')) { mark(f, String((input.deductibleExpenses || 0) + (input.otherAdjustments || 0))); continue; }
      if (nm.match(/line\s*3/)) { mark(f, String(se.taxableIncome.toFixed(0))); continue; }
      if (includesAny(nm, ['income tax']) || nm.match(/line\s*4/)) { mark(f, String(se.federalTax.toFixed(0))); continue; }
      if (includesAny(nm, ['self employment']) || nm.match(/line\s*5/)) { mark(f, String(se.selfEmploymentTax.toFixed(0))); continue; }
      if (includesAny(nm, ['total tax']) || nm.match(/line\s*6/)) { mark(f, String((se.federalTax + se.selfEmploymentTax).toFixed(0))); continue; }
      if (includesAny(nm, ['credits']) || nm.match(/line\s*7/)) { mark(f, String((input.credits || 0).toFixed(0))); continue; }
      if (includesAny(nm, ['after credits']) || nm.match(/line\s*8/)) { mark(f, String(totalTax.toFixed(0))); continue; }
      if (includesAny(nm, ['quarter', 'divide by 4']) || nm.match(/line\s*9/)) { mark(f, String(quarterlyBase.toFixed(2))); continue; }

      // Voucher amounts
      if (includesAny(nm, ['voucher amount', 'amount due', 'amount'])) { mark(f, String(nextVoucher.toFixed(2))); continue; }

      // Record payments fields
      if (includesAny(nm, ['q1']) && includesAny(nm, ['amount'])) { const p = (input.priorPayments||[]).find(p=>p.quarter===1); if (p) mark(f, String((p.amount||0).toFixed(2))); continue; }
      if (includesAny(nm, ['q2']) && includesAny(nm, ['amount'])) { const p = (input.priorPayments||[]).find(p=>p.quarter===2); if (p) mark(f, String((p.amount||0).toFixed(2))); continue; }
      if (includesAny(nm, ['q3']) && includesAny(nm, ['amount'])) { const p = (input.priorPayments||[]).find(p=>p.quarter===3); if (p) mark(f, String((p.amount||0).toFixed(2))); continue; }
      if (includesAny(nm, ['q4']) && includesAny(nm, ['amount'])) { const p = (input.priorPayments||[]).find(p=>p.quarter===4); if (p) mark(f, String((p.amount||0).toFixed(2))); continue; }
      if (includesAny(nm, ['q1']) && includesAny(nm, ['date'])) { const p = (input.priorPayments||[]).find(p=>p.quarter===1); if (p?.date) mark(f, p.date); continue; }
      if (includesAny(nm, ['q2']) && includesAny(nm, ['date'])) { const p = (input.priorPayments||[]).find(p=>p.quarter===2); if (p?.date) mark(f, p.date); continue; }
      if (includesAny(nm, ['q3']) && includesAny(nm, ['date'])) { const p = (input.priorPayments||[]).find(p=>p.quarter===3); if (p?.date) mark(f, p.date); continue; }
      if (includesAny(nm, ['q4']) && includesAny(nm, ['date'])) { const p = (input.priorPayments||[]).find(p=>p.quarter===4); if (p?.date) mark(f, p.date); continue; }
    }
  }
  const unmatched = allTextFieldNames.filter(n => !matched.has(n));
  // Derive amounts consistent with worksheet when possible
  const wsQuarterly = Math.max(0, ws.line14a / 4);
  const wsNextVoucher = Math.max(0, ws.line15);
  return { se, totalTax, quarterlyBase: wsQuarterly || quarterlyBase, nextVoucher: wsNextVoucher || nextVoucher, unmatched };
}

export async function fillAll1040ESFromUnified(input: Irs1040EsInput, opts: { output?: 'combined' | 'separate' } = {}): Promise<{
  combinedUri?: string;
  parts?: { worksheetUri: string; recordUri: string; voucherUri: string };
  unmatched: string[];
  computed: { totalTax: number; quarterlyPayment: number };
}> {
  const moduleId = require('../../assets/form1040esFillable.pdf');
  const ab = await loadAssetArrayBuffer(moduleId);
  const pdfDoc = await PDFDocument.load(ab);
  const filled = await fillUnifiedAcroForm(pdfDoc, input);
  // Flatten to bake in appearances before page extraction
  try { pdfDoc.getForm().flatten(); } catch {}
  // Extract pages 8,9,11 (0-based indexes 7,8,10)
  const pageIdx = [7, 8, 10];
  const dir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
  const output = opts.output || 'combined';
  if (output === 'separate') {
    const copied = await pdfDoc.copyPages(pdfDoc, pageIdx);
    const saveSingle = async (page: any, name: string) => {
      const d = await PDFDocument.create();
      d.addPage(page);
      const b = await d.save();
      const b64 = bytesToBase64(b);
      const path = dir + `${name}_${input.taxYear}_${Date.now()}.pdf`;
      await FileSystem.writeAsStringAsync(path, b64, { encoding: 'base64' as any });
      return path;
    };
    const worksheetUri = await saveSingle(copied[0], '1040ES_Worksheet');
    const recordUri = await saveSingle(copied[1], 'Record_EstimatedTaxPayments');
    const voucherUri = await saveSingle(copied[2], '1040ES_PaymentVoucher');
    return { parts: { worksheetUri, recordUri, voucherUri }, unmatched: filled.unmatched || [], computed: { totalTax: filled.totalTax, quarterlyPayment: filled.quarterlyBase } };
  } else {
    const outDoc = await PDFDocument.create();
    const pages = await outDoc.copyPages(pdfDoc, pageIdx);
    pages.forEach((p) => outDoc.addPage(p));
    const bytes = await outDoc.save();
    const base64 = bytesToBase64(bytes);
    const out = dir + `1040ES_Combined_${input.taxYear}_${Date.now()}.pdf`;
    await FileSystem.writeAsStringAsync(out, base64, { encoding: 'base64' as any });
    return { combinedUri: out, unmatched: filled.unmatched || [], computed: { totalTax: filled.totalTax, quarterlyPayment: filled.quarterlyBase } };
  }
}

export async function fillWorksheetPDF(input: Irs1040EsInput): Promise<string> {
  let moduleId: any;
  moduleId = require('../../assets/1040ES_Worksheet_2025.pdf');
  const ab = await loadAssetArrayBuffer(moduleId);
  const pdfDoc = await PDFDocument.load(ab);
  const form = pdfDoc.getForm();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const { se, totalTax, quarterlyBase } = computeFromInput(input);

  // Attempt to fill common field names if present (many IRS PDFs are non-fillable/XFA)
  trySetText(form, 'line1_agib', input.expectedAnnualIncome);
  trySetText(form, 'line2_deductions', input.deductibleExpenses + (input.otherAdjustments || 0));
  trySetText(form, 'line3_taxable_income', se.taxableIncome.toFixed(0));
  trySetText(form, 'line4_income_tax', se.federalTax.toFixed(0));
  trySetText(form, 'line5_se_tax', se.selfEmploymentTax.toFixed(0));
  trySetText(form, 'line6_total_tax', (se.federalTax + se.selfEmploymentTax).toFixed(0));
  trySetText(form, 'line7_credits', (input.credits || 0).toFixed(0));
  trySetText(form, 'line8_total_after_credits', totalTax.toFixed(0));
  trySetText(form, 'line9_quarterly', quarterlyBase.toFixed(2));

  // Always draw a visible summary overlay so the PDF isn't blank when no AcroForm fields exist
  try {
    const page = pdfDoc.getPage(0);
    const draw = (text: string, x: number, y: number, size = 11) =>
      page.drawText(text, { x, y, size, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
    let y = page.getHeight() - 60;
    draw('TaxTrail 1040-ES Worksheet Summary (Not an official IRS fill)', 40, y, 12); y -= 18;
    draw(`Name: ${input.name || ''}    Year: ${input.taxYear}`, 40, y); y -= 14;
    draw(`Expected Income: $${(input.expectedAnnualIncome || 0).toFixed(2)}`, 40, y); y -= 14;
    draw(`Deductions+Adj: $${(input.deductibleExpenses + (input.otherAdjustments || 0)).toFixed(2)}`, 40, y); y -= 14;
    draw(`Taxable Income: $${se.taxableIncome.toFixed(2)}`, 40, y); y -= 14;
    draw(`Federal Tax: $${se.federalTax.toFixed(2)}  •  SE Tax: $${se.selfEmploymentTax.toFixed(2)}`, 40, y); y -= 14;
    draw(`Total Estimated Tax: $${totalTax.toFixed(2)}  •  Quarterly: $${quarterlyBase.toFixed(2)}`, 40, y);
  } catch {}

  const bytes = await pdfDoc.save();
  const base64 = bytesToBase64(bytes);
  const dir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
  const out = dir + `1040ES_Worksheet_${input.taxYear}_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(out, base64, { encoding: 'base64' as any });
  return out;
}

export async function fillRecordPaymentsPDF(input: Irs1040EsInput): Promise<string> {
  let moduleId: any;
  moduleId = require('../../assets/Record_EstimatedTaxPayments_2025.pdf');
  const ab = await loadAssetArrayBuffer(moduleId);
  const pdfDoc = await PDFDocument.load(ab);
  const form = pdfDoc.getForm();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const payments = input.priorPayments || [];
  // Map quarters to form fields
  const map: Record<number, { amount: string; date: string }> = {
    1: { amount: 'q1_amount', date: 'q1_date' },
    2: { amount: 'q2_amount', date: 'q2_date' },
    3: { amount: 'q3_amount', date: 'q3_date' },
    4: { amount: 'q4_amount', date: 'q4_date' }
  };
  for (const p of payments) {
    trySetText(form, map[p.quarter].amount, (p.amount || 0).toFixed(2));
    if (p.date) trySetText(form, map[p.quarter].date, p.date);
  }
  const total = payments.reduce((s, p) => s + (p.amount || 0), 0);
  trySetText(form, 'total_payments', total.toFixed(2));

  // Overlay visible payments table
  try {
    const page = pdfDoc.getPage(0);
    const draw = (text: string, x: number, y: number, size = 11) =>
      page.drawText(text, { x, y, size, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
    let y = page.getHeight() - 60;
    draw('TaxTrail Record of Estimated Payments (Overlay)', 40, y, 12); y -= 18;
    for (const q of [1,2,3,4] as const) {
      const p = payments.find(pp => pp.quarter === q);
      draw(`Q${q}: $${(p?.amount || 0).toFixed(2)}${p?.date ? `  on ${p.date}` : ''}`, 40, y);
      y -= 14;
    }
    draw(`Total Paid: $${total.toFixed(2)}`, 40, y);
  } catch {}

  const bytes = await pdfDoc.save();
  const base64 = bytesToBase64(bytes);
  const dir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
  const out = dir + `Record_EstimatedTaxPayments_${input.taxYear}_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(out, base64, { encoding: 'base64' as any });
  return out;
}

export async function fillPaymentVoucherPDF(input: Irs1040EsInput): Promise<string> {
  let moduleId: any;
  moduleId = require('../../assets/1040ES_PaymentVoucher_2025.pdf');
  const ab = await loadAssetArrayBuffer(moduleId);
  const pdfDoc = await PDFDocument.load(ab);
  const form = pdfDoc.getForm();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const { nextVoucher } = computeFromInput(input);

  // Typical voucher fields
  trySetText(form, 'name', input.name || '');
  trySetText(form, 'ssn', input.ssn || '');
  trySetText(form, 'address1', input.addressLine1 || '');
  trySetText(form, 'address2', input.addressLine2 || '');
  trySetText(form, 'city', input.city || '');
  trySetText(form, 'state', input.state || '');
  trySetText(form, 'zip', input.zip || '');
  trySetText(form, 'amount', nextVoucher.toFixed(2)); // Amount due with this voucher

  // Overlay visible voucher details near top for non-fillable PDFs
  try {
    const page = pdfDoc.getPage(0);
    const draw = (text: string, x: number, y: number, size = 12) =>
      page.drawText(text, { x, y, size, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
    let y = page.getHeight() - 70;
    draw('TaxTrail 1040-ES Voucher (Overlay)', 40, y, 13); y -= 18;
    draw(`Name: ${input.name || ''}`, 40, y); y -= 14;
    if (input.ssn) { draw(`SSN: ${input.ssn}`, 40, y); y -= 14; }
    if (input.addressLine1) { draw(`${input.addressLine1}`, 40, y); y -= 14; }
    if (input.addressLine2) { draw(`${input.addressLine2}`, 40, y); y -= 14; }
    if (input.city || input.state || input.zip) { draw(`${input.city || ''}, ${input.state || ''} ${input.zip || ''}`, 40, y); y -= 14; }
    draw(`Amount: $${nextVoucher.toFixed(2)}`, 40, y);
  } catch {}

  const bytes = await pdfDoc.save();
  const base64 = bytesToBase64(bytes);
  const dir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
  const out = dir + `1040ES_PaymentVoucher_${input.taxYear}_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(out, base64, { encoding: 'base64' as any });
  return out;
}

export async function fillAll1040ESForms(input: Irs1040EsInput): Promise<Irs1040EsOutput> {
  const missing: string[] = [];
  if (!input.name) missing.push('name');
  if (!input.filingStatus) missing.push('filingStatus');
  if (input.expectedAnnualIncome == null) missing.push('expectedAnnualIncome');
  if (input.deductibleExpenses == null) missing.push('deductibleExpenses');

  const worksheetUri = await fillWorksheetPDF(input);
  const recordUri = await fillRecordPaymentsPDF(input);
  const voucherUri = await fillPaymentVoucherPDF(input);

  const { totalTax, quarterlyBase } = ((i) => {
    const c = computeFromInput(i);
    return { totalTax: c.totalTax, quarterlyBase: c.quarterlyBase };
  })(input);

  return {
    worksheetUri,
    recordUri,
    voucherUri,
    computed: { totalTax, quarterlyPayment: quarterlyBase },
    missingPrompts: missing
  };
}
