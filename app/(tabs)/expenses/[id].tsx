import React, { useEffect, useState } from 'react';
import { View, Text, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { getSignedReceiptUrl } from '@/services/storage';

export default function ExpenseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const expense = useFinanceStore((s) => s.expenses.find((e) => e.id === id));
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!expense?.receiptUrl) return;
      setLoading(true);
      try {
        const signed = await getSignedReceiptUrl(expense.receiptUrl);
        setUrl(signed);
      } finally {
        setLoading(false);
      }
    })();
  }, [expense?.receiptUrl]);

  if (!expense) return (
    <View style={{ flex: 1, backgroundColor: '#0B0F14', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: 'white' }}>Not found</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0F14', padding: 16 }}>
      <Text style={{ color: 'white', fontSize: 20, fontWeight: '700' }}>Expense</Text>
      <Text style={{ color: '#9AA4AE', marginTop: 6 }}>{expense.date} · ${expense.amount.toFixed(2)}</Text>
      {loading && <ActivityIndicator style={{ marginTop: 16 }} />}
      {url && (
        <Image source={{ uri: url }} resizeMode="contain" style={{ width: '100%', height: 400, marginTop: 16, borderRadius: 12 }} />
      )}
      {!url && !loading && (
        <Text style={{ color: '#6C7783', marginTop: 16 }}>No receipt image</Text>
      )}
    </View>
  );
}
