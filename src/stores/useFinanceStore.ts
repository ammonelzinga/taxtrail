import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type IncomeItem = {
  id: string;
  amount: number;
  date: string;
  category?: string;
  notes?: string;
};

export type ExpenseItem = {
  id: string;
  amount: number;
  date: string;
  merchant?: string;
  businessPct?: number; // 0-100
  category?: string;
  receiptUrl?: string;
};

type State = {
  income: IncomeItem[];
  expenses: ExpenseItem[];
  addIncome: (item: Omit<IncomeItem, 'id'>) => void;
  addExpense: (item: Omit<ExpenseItem, 'id'>) => void;
  removeIncome: (id: string) => void;
  removeExpense: (id: string) => void;
  setAllIncome: (items: IncomeItem[]) => void;
  setAllExpenses: (items: ExpenseItem[]) => void;
};

export const useFinanceStore = create<State>()(
  persist(
    (set) => ({
      income: [],
      expenses: [],
      addIncome: (item) => set((s) => ({ income: [{ id: String(Date.now()), ...item }, ...s.income] })),
      addExpense: (item) => set((s) => ({ expenses: [{ id: String(Date.now()), ...item }, ...s.expenses] })),
      removeIncome: (id) => set((s) => ({ income: s.income.filter((i) => i.id !== id) })),
        removeExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
        setAllIncome: (items) => set({ income: items }),
        setAllExpenses: (items) => set({ expenses: items })
    }),
    { name: 'finance-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);
