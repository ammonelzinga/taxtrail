import React, { useState } from 'react';
import { View, Text, Alert, Pressable } from 'react-native';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { fillAll1040ESForms, Irs1040EsInput, fillAll1040ESFromUnified } from '@/services/irs1040es';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/services/supabase';
import { uploadFromUri } from '@/services/storage';

export default function Assistant1040ES() {
  const [name, setName] = useState('');
  const [ssn, setSsn] = useState('');
  const [income, setIncome] = useState('');
  const [deductions, setDeductions] = useState('');
  const [nonRefCredits, setNonRefCredits] = useState('0');
  const [refCredits, setRefCredits] = useState('0');
  const [withheld, setWithheld] = useState('0');
  const [amt, setAmt] = useState('0');
  const [otherTaxes, setOtherTaxes] = useState('0');
  const [priorYearTotalTax, setPriorYearTotalTax] = useState('');
  const [addMedicare, setAddMedicare] = useState('0');
  const [aboveLineAdj, setAboveLineAdj] = useState('0');
  const [overpayFirst, setOverpayFirst] = useState('0');
  const [ssBase, setSsBase] = useState('');
  const [hiIncome, setHiIncome] = useState(false);
  const [farmer, setFarmer] = useState(false);
  const [saveMode, setSaveMode] = useState<'combined'|'separate'>('combined');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const onGenerate = async () => {
    try {
      setLoading(true);
      const input: Irs1040EsInput = {
        taxYear: 2025,
        name,
        ssn,
        filingStatus: 'single',
        expectedAnnualIncome: parseFloat(income || '0'),
        deductibleExpenses: parseFloat(deductions || '0'),
        // Worksheet-aligned fields
        above_line_adjustments: parseFloat(aboveLineAdj || '0') || 0,
        expected_nonrefundable_credits_2025: parseFloat(nonRefCredits || '0') || 0,
        expected_refundable_credits_2025: parseFloat(refCredits || '0') || 0,
        expected_2025_income_tax_withheld: parseFloat(withheld || '0') || 0,
        expected_AMT_2025: parseFloat(amt || '0') || 0,
        expected_other_taxes_2025: parseFloat(otherTaxes || '0') || 0,
        additional_medicare_withholding: parseFloat(addMedicare || '0') || 0,
        overpayment_2024_applied_first_installment: parseFloat(overpayFirst || '0') || 0,
        ssWageBase: ssBase ? parseFloat(ssBase) : undefined,
        was_high_income_prior_year: hiIncome,
        farmer_or_fisher: farmer,
        // Legacy compatibility
        credits: parseFloat(nonRefCredits || '0') || 0,
        priorYearTotalTax: priorYearTotalTax ? parseFloat(priorYearTotalTax) : undefined
      };
      // Prefer the new unified fillable PDF; fallback to legacy separate templates
      let combinedPath: string | null = null;
      let parts: { worksheetUri: string; recordUri: string; voucherUri: string } | null = null;
      let totalTax = 0;
      let quarterlyPayment = 0;
      let unmatched: string[] = [];
      try {
        const unified = await fillAll1040ESFromUnified(input, { output: saveMode });
        combinedPath = unified.combinedUri || null;
        parts = unified.parts || null;
        totalTax = unified.computed.totalTax;
        quarterlyPayment = unified.computed.quarterlyPayment;
        unmatched = unified.unmatched || [];
      } catch {
        const legacy = await fillAll1040ESForms(input);
        totalTax = legacy.computed.totalTax;
        quarterlyPayment = legacy.computed.quarterlyPayment;
        if (user) {
          const upload = async (uri: string, key: string) => {
            const path = `${user.id}/forms/${key}_${Date.now()}.pdf`;
            await uploadFromUri('forms', path, uri, 'application/pdf');
            return path;
          };
          await upload(legacy.worksheetUri, '1040ES_Worksheet');
          await upload(legacy.recordUri, 'Record_EstimatedTaxPayments');
          await upload(legacy.voucherUri, '1040ES_PaymentVoucher');
        }
      }

      if (!user) return;
      let savedMsg = '';
      if (combinedPath) {
        const path = `${user.id}/forms/1040ES_Combined_${Date.now()}.pdf`;
        await uploadFromUri('forms', path, combinedPath, 'application/pdf');
        savedMsg = `Saved: ${path.split('/').pop()}`;
      } else if (parts) {
        const p1 = `${user.id}/forms/1040ES_Worksheet_${Date.now()}.pdf`;
        const p2 = `${user.id}/forms/Record_EstimatedTaxPayments_${Date.now()}.pdf`;
        const p3 = `${user.id}/forms/1040ES_PaymentVoucher_${Date.now()}.pdf`;
        await uploadFromUri('forms', p1, parts.worksheetUri, 'application/pdf');
        await uploadFromUri('forms', p2, parts.recordUri, 'application/pdf');
        await uploadFromUri('forms', p3, parts.voucherUri, 'application/pdf');
        savedMsg = `Saved: ${[p1,p2,p3].map(p=>p.split('/').pop()).join(', ')}`;
      }

      const unmatchedMsg = unmatched.length ? `\nUnmatched fields: ${unmatched.length} (see console for names)` : '';
      if (unmatched.length) {
        try { console.warn('Unmatched PDF fields (first 30):', unmatched.slice(0,30)); } catch {}
      }
      Alert.alert(
        'Generated',
        `Total est. tax: $${totalTax.toFixed(2)}\nQuarterly: $${quarterlyPayment.toFixed(2)}${savedMsg ? `\n${savedMsg}` : ''}${unmatchedMsg}`
      );
    } catch (e: any) {
      Alert.alert('Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0F14', padding: 16 }}>
      <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 12 }}>1040‑ES Assistant</Text>
      <Input placeholder="Name" value={name} onChangeText={setName} />
      <Input placeholder="SSN (optional)" value={ssn} onChangeText={setSsn} />
      <Input placeholder="Expected annual income" keyboardType="decimal-pad" value={income} onChangeText={setIncome} />
      <Input placeholder="Deductible expenses" keyboardType="decimal-pad" value={deductions} onChangeText={setDeductions} />
      <Input placeholder="Above-the-line adjustments (optional)" keyboardType="decimal-pad" value={aboveLineAdj} onChangeText={setAboveLineAdj} />
      <Input placeholder="Nonrefundable credits (line 7)" keyboardType="decimal-pad" value={nonRefCredits} onChangeText={setNonRefCredits} />
      <Input placeholder="Refundable credits (line 11b)" keyboardType="decimal-pad" value={refCredits} onChangeText={setRefCredits} />
      <Input placeholder="Expected 2025 withholding (line 13)" keyboardType="decimal-pad" value={withheld} onChangeText={setWithheld} />
      <Input placeholder="AMT (line 5)" keyboardType="decimal-pad" value={amt} onChangeText={setAmt} />
      <Input placeholder="Other taxes (lines 6/10)" keyboardType="decimal-pad" value={otherTaxes} onChangeText={setOtherTaxes} />
      <Input placeholder="Additional Medicare withholding (optional)" keyboardType="decimal-pad" value={addMedicare} onChangeText={setAddMedicare} />
      <Input placeholder="Prior-year total tax (optional)" keyboardType="decimal-pad" value={priorYearTotalTax} onChangeText={setPriorYearTotalTax} />
      <Input placeholder="Apply 2024 overpayment to first installment (line 15 adj)" keyboardType="decimal-pad" value={overpayFirst} onChangeText={setOverpayFirst} />
      <Input placeholder="2025 Social Security wage base (for SE calc)" keyboardType="decimal-pad" value={ssBase} onChangeText={setSsBase} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 8 }}>
        <Pressable onPress={() => setHiIncome(false)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: !hiIncome ? '#2D6AE3' : '#233042' }}>
          <Text style={{ color: 'white', fontWeight: '600' }}>High-income 110%: No</Text>
        </Pressable>
        <Pressable onPress={() => setHiIncome(true)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: hiIncome ? '#2D6AE3' : '#233042' }}>
          <Text style={{ color: 'white', fontWeight: '600' }}>Yes</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <Pressable onPress={() => setFarmer(false)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: !farmer ? '#2D6AE3' : '#233042' }}>
          <Text style={{ color: 'white', fontWeight: '600' }}>Farmer/Fisher: No</Text>
        </Pressable>
        <Pressable onPress={() => setFarmer(true)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: farmer ? '#2D6AE3' : '#233042' }}>
          <Text style={{ color: 'white', fontWeight: '600' }}>Yes</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <Pressable onPress={() => setSaveMode('combined')} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: saveMode==='combined' ? '#2D6AE3' : '#233042' }}>
          <Text style={{ color: 'white', fontWeight: '600' }}>Save Combined</Text>
        </Pressable>
        <Pressable onPress={() => setSaveMode('separate')} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: saveMode==='separate' ? '#2D6AE3' : '#233042' }}>
          <Text style={{ color: 'white', fontWeight: '600' }}>Save Separate</Text>
        </Pressable>
      </View>
      <Button title={loading ? 'Generating…' : 'Generate & Save PDF'} onPress={onGenerate} />
    </View>
  );
}
