import React, { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Link } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { saveExpense } from '@/services/sync';
import { useRouter } from 'expo-router';

export default function ExpensesScreen() {
  const expenses = useFinanceStore((s) => s.expenses);
  const addExpense = useFinanceStore((s) => s.addExpense);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { user } = useAuth();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0F14', padding: 16 }}>
      <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 12 }}>Add Expense</Text>
      <Input placeholder="Amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
      <Input placeholder="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      <Button title="Add" onPress={async () => {
        const num = parseFloat(amount || '0');
        if (!num) return;
        addExpense({ amount: num, date });
        try { if (user) await addExpenseDb(user.id, { amount: num, date }); } catch { /* offline */ }
        setAmount('');
      }} />
      <View style={{ marginVertical: 12 }}>
        <Link href="/(tabs)/receipts/capture" style={{ color: '#2D6AE3' }}>
          Scan Receipt →
        </Link>
      </View>
      <FlatList
        data={expenses}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={{ padding: 12, borderBottomColor: '#162234', borderBottomWidth: 1 }}>
            <Text style={{ color: 'white' }}>${item.amount.toFixed(2)} {item.merchant ? `· ${item.merchant}` : ''}</Text>
            <Text style={{ color: '#8CA0B3', fontSize: 12 }}>{item.date}</Text>
            {item.receiptUrl && (
              <Text style={{ color: '#2D6AE3', marginTop: 6 }} onPress={() => router.push(`/ (tabs)/expenses/${item.id}`.replace(' ', ''))}>
                View receipt →
              </Text>
            )}
          </View>
        )}
      />
    </View>
  );
}
