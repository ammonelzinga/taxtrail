import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addIncomeDb, addExpenseDb } from '@/services/db';
import { useAuth } from '@/providers/AuthProvider';

type QueueItem =
  | { type: 'income'; payload: { amount: number; date: string } }
  | { type: 'expense'; payload: { amount: number; date: string; merchant?: string; businessPct?: number; receiptUrl?: string } };

const KEY = 'pending-queue-v1';

export async function enqueue(item: QueueItem) {
  const raw = (await AsyncStorage.getItem(KEY)) || '[]';
  const list: QueueItem[] = JSON.parse(raw);
  list.push(item);
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function dequeueAll() {
  const raw = (await AsyncStorage.getItem(KEY)) || '[]';
  const list: QueueItem[] = JSON.parse(raw);
  await AsyncStorage.setItem(KEY, '[]');
  return list;
}

export async function processQueue(userId: string) {
  const items = await dequeueAll();
  const failed: QueueItem[] = [];
  for (const it of items) {
    try {
      if (it.type === 'income') await addIncomeDb(userId, it.payload);
      if (it.type === 'expense') await addExpenseDb(userId, it.payload as any);
    } catch {
      failed.push(it);
    }
  }
  if (failed.length) await AsyncStorage.setItem(KEY, JSON.stringify(failed));
}

export function subscribeConnectivityAndSync(userId?: string) {
  const unsub = NetInfo.addEventListener(async (state) => {
    if (userId && state.isConnected) {
      await processQueue(userId);
    }
  });
  return () => unsub();
}

export async function saveIncome(userId: string | undefined, payload: { amount: number; date: string }) {
  if (!userId) {
    await enqueue({ type: 'income', payload });
    return;
  }
  try {
    await addIncomeDb(userId, payload);
  } catch {
    await enqueue({ type: 'income', payload });
  }
}

export async function saveExpense(userId: string | undefined, payload: { amount: number; date: string; merchant?: string; businessPct?: number; receiptUrl?: string }) {
  if (!userId) {
    await enqueue({ type: 'expense', payload });
    return;
  }
  try {
    await addExpenseDb(userId, payload as any);
  } catch {
    await enqueue({ type: 'expense', payload });
  }
}
