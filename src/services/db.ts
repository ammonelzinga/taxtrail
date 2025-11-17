import { supabase, DbIncome, DbExpense } from '@/services/supabase';

export async function addIncomeDb(userId: string, payload: Omit<DbIncome, 'id' | 'user_id' | 'created_at'>) {
  const { data, error } = await supabase.from('income').insert({ ...payload, user_id: userId }).select('*').single();
  if (error) throw error;
  return data as DbIncome;
}

export async function addExpenseDb(userId: string, payload: Omit<DbExpense, 'id' | 'user_id' | 'created_at'>) {
  const { data, error } = await supabase.from('expenses').insert({ ...payload, user_id: userId }).select('*').single();
  if (error) throw error;
  return data as DbExpense;
}
