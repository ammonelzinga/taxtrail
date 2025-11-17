export type FilingStatus = 'single' | 'married_joint' | 'married_separate' | 'head';

export type TaxInputs = {
  filingStatus: FilingStatus;
  expectedAnnualIncome: number; // gross
  deductibleExpenses: number; // total deductible expenses
  otherDeductions?: number; // e.g., SEP IRA, HSA
};

export type TaxEstimate = {
  taxableIncome: number;
  federalTax: number;
  selfEmploymentTax: number;
  quarterlyPayment: number;
};

// Simplified 2024-ish brackets placeholder for demonstration only
const BRACKETS_SINGLE = [
  { upTo: 11000, rate: 0.1 },
  { upTo: 44725, rate: 0.12 },
  { upTo: 95375, rate: 0.22 },
  { upTo: 182100, rate: 0.24 },
  { upTo: 231250, rate: 0.32 },
  { upTo: 578125, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 }
];

function calcFederal(taxable: number, brackets = BRACKETS_SINGLE) {
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    const amt = Math.min(taxable, b.upTo) - prev;
    if (amt > 0) tax += amt * b.rate;
    if (taxable <= b.upTo) break;
    prev = b.upTo;
  }
  return Math.max(0, tax);
}

export function estimateTaxes(input: TaxInputs): TaxEstimate {
  const seNet = Math.max(0, input.expectedAnnualIncome - input.deductibleExpenses - (input.otherDeductions || 0));
  // Self-employment tax approx: 92.35% of SE net * 15.3%
  const seTax = Math.max(0, seNet * 0.9235 * 0.153);
  const taxableIncome = Math.max(0, seNet - seTax * 0.5); // deduct half SE tax
  const federal = calcFederal(taxableIncome);
  const total = federal + seTax;
  const quarterly = total / 4;
  return { taxableIncome, federalTax: federal, selfEmploymentTax: seTax, quarterlyPayment: quarterly };
}
