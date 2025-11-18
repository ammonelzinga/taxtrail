import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Card } from '@/components/Card';
import { Link } from 'expo-router';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { Chart } from '@/components/Chart';
import { estimateTaxes } from '@/services/taxes';
import { Screen } from '@/components/Screen';

export default function DashboardScreen() {
  const income = useFinanceStore((s) => s.income);
  const expenses = useFinanceStore((s) => s.expenses);
  const totalIncome = useMemo(() => income.reduce((a, b) => a + b.amount, 0), [income]);
  const totalExpenses = useMemo(() => expenses.reduce((a, b) => a + b.amount, 0), [expenses]);
  const taxEst = useMemo(() => estimateTaxes({ filingStatus: 'single', expectedAnnualIncome: totalIncome, deductibleExpenses: totalExpenses }), [totalIncome, totalExpenses]);
  const taxableIncome = taxEst.taxableIncome;
  const estQuarterlyTaxes = taxEst.quarterlyPayment;
  const monthlyIncome = useMemo(() => {
    const map = new Array(12).fill(0);
    income.forEach((i) => {
      const m = new Date(i.date).getMonth();
      map[m] += i.amount;
    });
    return map;
  }, [income]);

  return (
    <Screen>
      <View style={{ gap: 12 }}>
        <Text style={{ color: 'white', fontSize: 24, fontWeight: '700' }}>Overview</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card title="Total Income" value={`$${totalIncome.toFixed(2)}`} />
          <Card title="Total Expenses" value={`$${totalExpenses.toFixed(2)}`} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card title="Taxable Income" value={`$${taxableIncome.toFixed(2)}`} />
          <Card title="Est. Quarterly" value={`$${estQuarterlyTaxes.toFixed(2)}`} />
        </View>
        <Card title="Monthly Income">
          <Chart values={monthlyIncome} width={340} height={120} />
        </Card>

        <View style={{ marginTop: 16, gap: 8 }}>
          <Link href="/assistant/1040es" style={{ color: '#2D6AE3', fontSize: 16 }}>Open 1040-ES Assistant →</Link>
          <Link href="/(tabs)/settings" style={{ color: '#2D6AE3', fontSize: 16 }}>Settings →</Link>
          <Link href="/(tabs)/receipts/capture" style={{ color: '#8CA0B3', fontSize: 16 }}>Scan a Receipt →</Link>
          <Link href="/(tabs)/mileage/manual" style={{ color: '#8CA0B3', fontSize: 16 }}>Add Mileage Manually →</Link>
          <Link href="/(tabs)/mileage/route" style={{ color: '#8CA0B3', fontSize: 16 }}>Distance by Addresses →</Link>
        </View>
      </View>
    </Screen>
  );
}
