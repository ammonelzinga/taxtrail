import React, { useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/services/supabase';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { processQueue, subscribeConnectivityAndSync } from '@/services/sync';

export const DataProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { user } = useAuth();
  const setAllIncome = useFinanceStore((s) => s.setAllIncome);
  const setAllExpenses = useFinanceStore((s) => s.setAllExpenses);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;
    (async () => {
      if (!user) return;
      // process any pending writes upon mount if online
      try { await processQueue(user.id); } catch {}
      // subscribe to connectivity changes for ongoing reconciliation
      unsub = subscribeConnectivityAndSync(user.id);
      const { data: income } = await supabase.from('income').select('*').order('date', { ascending: false });
      const { data: expenses } = await supabase.from('expenses').select('*').order('date', { ascending: false });
      if (!cancelled) {
        setAllIncome((income || []).map((r: any) => ({ id: r.id, amount: Number(r.amount), date: r.date })));
        setAllExpenses((expenses || []).map((r: any) => ({ id: r.id, amount: Number(r.amount), date: r.date, merchant: r.merchant || undefined })));
      }
    })();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [user, setAllIncome, setAllExpenses]);

  return <>{children}</>;
};
