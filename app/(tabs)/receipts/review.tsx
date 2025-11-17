import React, { useMemo, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Screen } from '@/components/Screen';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useFinanceStore } from '@/stores/useFinanceStore';

export default function ReceiptReviewScreen() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const parsed = useMemo(() => {
    try {
      return JSON.parse(data || '{}');
    } catch {
      return {};
    }
  }, [data]);
  const addExpense = useFinanceStore((s) => s.addExpense);
  const router = useRouter();

  const [merchant, setMerchant] = useState(parsed?.parsed?.merchant || '');
  const [date, setDate] = useState(parsed?.parsed?.date || new Date().toISOString().slice(0, 10));
  const [total, setTotal] = useState(String(parsed?.parsed?.total || ''));
  const [businessPct, setBusinessPct] = useState('100');

  const onSave = () => {
    const amount = parseFloat(total || '0');
    if (!amount) {
      Alert.alert('Enter total amount');
      return;
    }
    addExpense({ amount, date, merchant, businessPct: parseFloat(businessPct) || 100, receiptUrl: parsed?.receiptPath });
    router.replace('/(tabs)/expenses/index');
  };

  return (
    <Screen>
      <View style={{ gap: 12 }}>
        <Text style={{ color: 'white', fontSize: 20, fontWeight: '700' }}>Review Receipt</Text>
        <Input placeholder="Merchant" value={merchant} onChangeText={setMerchant} />
        <Input placeholder="Date" value={date} onChangeText={setDate} />
        <Input placeholder="Total" value={total} onChangeText={setTotal} keyboardType="decimal-pad" />
        <Input placeholder="Business %" value={businessPct} onChangeText={setBusinessPct} keyboardType="numeric" />
        <Button title="Save Expense" onPress={onSave} />
      </View>
    </Screen>
  );
}
