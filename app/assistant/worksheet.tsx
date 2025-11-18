import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useAuth } from '@/providers/AuthProvider';
import { uploadFromUri } from '@/services/storage';
import { computeEstimatedTaxWorksheet, generateFilledWorksheetPdf, WorksheetInputs, FilingStatus } from '@/services/worksheet2025';

const statuses: FilingStatus[] = ['single','married_filing_jointly','married_filing_separately','head_of_household','qualifying_surviving_spouse'];

export default function Worksheet2025Screen() {
  const { user } = useAuth();
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('single');
  const [useStd, setUseStd] = useState(true);

  const [state, setState] = useState<Record<string,string>>({});
  const num = (k: string) => (state[k] ? parseFloat(state[k]) : undefined);

  const inputs: WorksheetInputs = useMemo(() => ({
    taxYear: 2025,
    filingStatus,
    projected_2025_gross_income: num('gross'),
    above_line_adjustments: num('aboveLineAdj') || 0,
    expected_self_employment_net_profit_2025: num('seNet'),
    useStandardDeduction: useStd,
    projected_2025_itemized_deductions: useStd ? undefined : num('itemized'),
    expects_QBI_deduction: !!num('qbi') && num('qbi')! > 0,
    projected_QBI_amount: num('qbi') || 0,
    expected_AMT_2025: num('amt') || 0,
    expected_other_taxes_2025: num('otherTaxes') || 0,
    expected_nonrefundable_credits_2025: num('nonRefCred') || 0,
    expected_refundable_credits_2025: num('refCred') || 0,
    expected_2025_income_tax_withheld: num('withheld') || 0,
    additional_medicare_withholding: num('addMedicare') || 0,
    prior_year_total_tax_2024: num('tax2024') || 0,
    was_high_income_prior_year: state['hiIncome'] === '1',
    farmer_or_fisher: state['farmer'] === '1',
    overpayment_2024_applied_first_installment: num('overpayFirst') || 0,
    ssWageBase: num('ssBase')
  }), [state, filingStatus, useStd]);

  const result = useMemo(() => computeEstimatedTaxWorksheet(inputs), [inputs]);

  const set = (k: string) => (v: string) => setState((s) => ({ ...s, [k]: v }));

  const onGenerate = async () => {
    try {
      const uri = await generateFilledWorksheetPdf(inputs);
      if (!user) { Alert.alert('Generated', `Saved locally at ${uri}`); return; }
      const path = `${user.id}/forms/Worksheet2025_${Date.now()}.pdf`;
      await uploadFromUri('forms', path, uri, 'application/pdf');
      Alert.alert('Uploaded', `Saved to forms bucket as ${path.split('/').pop()}`);
    } catch (e: any) {
      Alert.alert('Failed', e.message);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0B0F14' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 12 }}>2025 Estimated Tax Worksheet</Text>
      <View style={{ gap: 8 }}>
        <Text style={{ color: '#9AA4AE' }}>Filing Status</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {statuses.map(s => (
            <Button key={s} title={s} variant={filingStatus===s?'primary':'secondary'} onPress={() => setFilingStatus(s)} />
          ))}
        </View>
        <View style={{ height: 8 }} />
        <Text style={{ color: '#9AA4AE' }}>Deductions</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="Standard" variant={useStd?'primary':'secondary'} onPress={() => setUseStd(true)} />
          <Button title="Itemized" variant={!useStd?'primary':'secondary'} onPress={() => setUseStd(false)} />
        </View>
        {!useStd && <Input placeholder="Itemized deductions" keyboardType="decimal-pad" value={state.itemized||''} onChangeText={set('itemized')} />}
        <Input placeholder="Projected 2025 gross income" keyboardType="decimal-pad" value={state.gross||''} onChangeText={set('gross')} />
        <Input placeholder="Above-the-line adjustments (excl. 1/2 SE)" keyboardType="decimal-pad" value={state.aboveLineAdj||''} onChangeText={set('aboveLineAdj')} />
        <Input placeholder="Self-employment net profit (if any)" keyboardType="decimal-pad" value={state.seNet||''} onChangeText={set('seNet')} />
        <Input placeholder="QBI deduction (if any)" keyboardType="decimal-pad" value={state.qbi||''} onChangeText={set('qbi')} />
        <Input placeholder="AMT (if any)" keyboardType="decimal-pad" value={state.amt||''} onChangeText={set('amt')} />
        <Input placeholder="Other taxes (line 10, if any)" keyboardType="decimal-pad" value={state.otherTaxes||''} onChangeText={set('otherTaxes')} />
        <Input placeholder="Nonrefundable credits (line 7)" keyboardType="decimal-pad" value={state.nonRefCred||''} onChangeText={set('nonRefCred')} />
        <Input placeholder="Refundable credits (line 11b)" keyboardType="decimal-pad" value={state.refCred||''} onChangeText={set('refCred')} />
        <Input placeholder="Expected 2025 withholding (line 13)" keyboardType="decimal-pad" value={state.withheld||''} onChangeText={set('withheld')} />
        <Input placeholder="Additional Medicare withholding (if any)" keyboardType="decimal-pad" value={state.addMedicare||''} onChangeText={set('addMedicare')} />
        <Input placeholder="2024 total tax (for 12b)" keyboardType="decimal-pad" value={state.tax2024||''} onChangeText={set('tax2024')} />
        <Input placeholder="Apply 2024 overpayment to first installment" keyboardType="decimal-pad" value={state.overpayFirst||''} onChangeText={set('overpayFirst')} />
        <Input placeholder="2025 Social Security wage base (for SE calc)" keyboardType="decimal-pad" value={state.ssBase||''} onChangeText={set('ssBase')} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="High-income 110% rule: No" variant={state.hiIncome==='1'?'secondary':'primary'} onPress={() => set('hiIncome')('0')} />
          <Button title="Yes" variant={state.hiIncome==='1'?'primary':'secondary'} onPress={() => set('hiIncome')('1')} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="Farmer/Fisher: No" variant={state.farmer==='1'?'secondary':'primary'} onPress={() => set('farmer')('0')} />
          <Button title="Yes" variant={state.farmer==='1'?'primary':'secondary'} onPress={() => set('farmer')('1')} />
        </View>
      </View>

      <View style={{ height: 12 }} />
      <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Computed Lines</Text>
      {(['line1','line2a','line2b','line2c','line3','line4','line5','line6','line7','line8','line9','line10','line11a','line11b','line11c','line12a','line12b','line12c','line13','line14a','line14b','line15'] as const).map((k) => (
        <Text key={k} style={{ color: '#9AA4AE' }}>{k}: <Text style={{ color: 'white' }}>${(result as any)[k]}</Text></Text>
      ))}
      <View style={{ height: 8 }} />
      {result.missingInputs.length > 0 && (
        <Text style={{ color: '#FFB020' }}>Missing: {result.missingInputs.join(', ')}</Text>
      )}
      <View style={{ height: 12 }} />
      <Button title="Fill PDF & Save" onPress={onGenerate} />
    </ScrollView>
  );
}
