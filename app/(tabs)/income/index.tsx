import React, { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/providers/AuthProvider';
import { saveIncome } from '@/services/sync';

export default function IncomeScreen() {
  const income = useFinanceStore((s) => s.income);
  const addIncome = useFinanceStore((s) => s.addIncome);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { user } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0F14', padding: 16 }}>
      <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 12 }}>Add Income</Text>
      <Input placeholder="Amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
      <Input placeholder="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      <Button title="Add" onPress={async () => {
        const num = parseFloat(amount || '0');
        if (!num) return;
        addIncome({ amount: num, date });
        await saveIncome(user?.id, { amount: num, date });
        setAmount('');
      }} />

      <Text style={{ color: '#9AA4AE', marginVertical: 12 }}>Recent</Text>
      <FlatList
        data={income}
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
