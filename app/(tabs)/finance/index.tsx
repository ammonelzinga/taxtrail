import React, { useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { useAuth } from '@/providers/AuthProvider';
import { saveIncome, saveExpense } from '@/services/sync';

type Mode = 'income' | 'expenses';

export default function FinanceScreen() {
  const [mode, setMode] = useState<Mode>('income');
  const income = useFinanceStore((s) => s.income);
  const expenses = useFinanceStore((s) => s.expenses);
  const addIncome = useFinanceStore((s) => s.addIncome);
  const addExpense = useFinanceStore((s) => s.addExpense);
  const { user } = useAuth();

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const onAdd = async () => {
    const num = parseFloat(amount || '0');
    if (!num) return;
    if (mode === 'income') {
      addIncome({ amount: num, date });
      await saveIncome(user?.id, { amount: num, date });
    } else {
      addExpense({ amount: num, date });
      await saveExpense(user?.id, { amount: num, date });
    }
    setAmount('');
  };

  const data = mode === 'income' ? income : expenses;

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0F14', padding: 16 }}>
      <Text style={{ color: 'white', fontSize: 24, fontWeight: '700', marginBottom: 12 }}>Finance</Text>
      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        {(['income', 'expenses'] as Mode[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 16,
              backgroundColor: mode === m ? '#2D6AE3' : '#152536',
              borderRadius: 20,
              marginRight: 8
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>{m}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ color: 'white', fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Add {mode === 'income' ? 'Income' : 'Expense'}</Text>
      <Input placeholder="Amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
      <Input placeholder="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      <Button title={`Add ${mode === 'income' ? 'Income' : 'Expense'}`} onPress={onAdd} />

      <Text style={{ color: '#9AA4AE', marginVertical: 12 }}>Recent {mode}</Text>
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={{ padding: 12, borderBottomColor: '#162234', borderBottomWidth: 1 }}>
            <Text style={{ color: 'white' }}>${item.amount.toFixed(2)}</Text>
            <Text style={{ color: '#8CA0B3', fontSize: 12 }}>{item.date}</Text>
          </View>
        )}
      />
    </View>
  );
}
