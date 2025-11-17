import * as FileSystem from 'expo-file-system';
import * as Asset from 'expo-asset';
import { PDFDocument } from 'pdf-lib';
import { estimateTaxes, FilingStatus } from '@/services/taxes';

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
  otherAdjustments?: number; // IRA/HSA etc.
  credits?: number; // total nonrefundable credits expected
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

export async function fillWorksheetPDF(input: Irs1040EsInput): Promise<string> {
  let moduleId: any;
  moduleId = require('../../assets/1040ES_Worksheet_2025.pdf');
  const ab = await loadAssetArrayBuffer(moduleId);
  const pdfDoc = await PDFDocument.load(ab);
  const form = pdfDoc.getForm();

  const { se, totalTax, quarterlyBase } = computeFromInput(input);

  // Map to lines (approximate mapping — adjust names to your PDF field names):
  // Line 1: Expected adjusted gross income in 2025
  trySetText(form, 'line1_agib', input.expectedAnnualIncome);
  // Line 2: Estimated deductions (Schedule C, etc.)
  trySetText(form, 'line2_deductions', input.deductibleExpenses + (input.otherAdjustments || 0));
  // Line 3: Taxable income estimate (from service)
  trySetText(form, 'line3_taxable_income', se.taxableIncome.toFixed(0));
  // Line 4: Income tax from tax tables (federal tax)
  trySetText(form, 'line4_income_tax', se.federalTax.toFixed(0));
  // Line 5: Self-employment tax
  trySetText(form, 'line5_se_tax', se.selfEmploymentTax.toFixed(0));
  // Line 6: Total estimated tax
  trySetText(form, 'line6_total_tax', (se.federalTax + se.selfEmploymentTax).toFixed(0));
  // Line 7: Credits
  trySetText(form, 'line7_credits', (input.credits || 0).toFixed(0));
  // Line 8: Total after credits
  trySetText(form, 'line8_total_after_credits', totalTax.toFixed(0));
  // Line 9: Divide by 4
  trySetText(form, 'line9_quarterly', quarterlyBase.toFixed(2));

  const base64 = await pdfDoc.saveAsBase64({ dataUri: false });
  const out = FileSystem.cacheDirectory + `1040ES_Worksheet_${input.taxYear}_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(out, base64, { encoding: FileSystem.EncodingType.Base64 });
  return out;
}

export async function fillRecordPaymentsPDF(input: Irs1040EsInput): Promise<string> {
  let moduleId: any;
  moduleId = require('../../assets/Record_EstimatedTaxPayments_2025.pdf');
  const ab = await loadAssetArrayBuffer(moduleId);
  const pdfDoc = await PDFDocument.load(ab);
  const form = pdfDoc.getForm();

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

  const base64 = await pdfDoc.saveAsBase64({ dataUri: false });
  const out = FileSystem.cacheDirectory + `Record_EstimatedTaxPayments_${input.taxYear}_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(out, base64, { encoding: FileSystem.EncodingType.Base64 });
  return out;
}

export async function fillPaymentVoucherPDF(input: Irs1040EsInput): Promise<string> {
  let moduleId: any;
  moduleId = require('../../assets/1040ES_PaymentVoucher_2025.pdf');
  const ab = await loadAssetArrayBuffer(moduleId);
  const pdfDoc = await PDFDocument.load(ab);
  const form = pdfDoc.getForm();

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

  const base64 = await pdfDoc.saveAsBase64({ dataUri: false });
  const out = FileSystem.cacheDirectory + `1040ES_PaymentVoucher_${input.taxYear}_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(out, base64, { encoding: FileSystem.EncodingType.Base64 });
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
