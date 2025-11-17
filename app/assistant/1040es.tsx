import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { fillAll1040ESForms, Irs1040EsInput } from '@/services/irs1040es';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/services/supabase';

export default function Assistant1040ES() {
  const [name, setName] = useState('');
  const [ssn, setSsn] = useState('');
  const [income, setIncome] = useState('');
  const [deductions, setDeductions] = useState('');
  const [credits, setCredits] = useState('0');
  const [priorYearTotalTax, setPriorYearTotalTax] = useState('');
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
        credits: parseFloat(credits || '0'),
        priorYearTotalTax: priorYearTotalTax ? parseFloat(priorYearTotalTax) : undefined
      };
      const result = await fillAll1040ESForms(input);
      if (!user) return;
      const upload = async (uri: string, key: string) => {
        const resp = await fetch(uri);
        const blob = (await resp.blob()) as Blob;
        const path = `${user.id}/forms/${key}_${Date.now()}.pdf`;
        const { error } = await supabase.storage.from('forms').upload(path, blob, { contentType: 'application/pdf' });
        if (error) throw error;
        return path;
      };
      const p1 = await upload(result.worksheetUri, '1040ES_Worksheet');
      const p2 = await upload(result.recordUri, 'Record_EstimatedTaxPayments');
      const p3 = await upload(result.voucherUri, '1040ES_PaymentVoucher');
      const prompts = result.missingPrompts?.length ? `\nMissing details to review: \n- ${result.missingPrompts.join('\n- ')}` : '';
      Alert.alert(
        'Generated',
        `Total est. tax: $${result.computed.totalTax.toFixed(2)}\nQuarterly: $${result.computed.quarterlyPayment.toFixed(2)}\nSaved: ${[p1, p2, p3].map((s) => s.split('/').pop()).join(', ')}${prompts}`
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
      <Input placeholder="Credits (optional)" keyboardType="decimal-pad" value={credits} onChangeText={setCredits} />
      <Input placeholder="Prior-year total tax (optional)" keyboardType="decimal-pad" value={priorYearTotalTax} onChangeText={setPriorYearTotalTax} />
      <Button title={loading ? 'Generating…' : 'Generate & Save PDF'} onPress={onGenerate} />
    </View>
  );
}
