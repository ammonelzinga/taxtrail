import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra || Constants.manifest?.extra || {}) as any;

const SUPABASE_URL = extra.SUPABASE_URL as string;
const SUPABASE_ANON_KEY = extra.SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials are missing. Add them to app.config.ts extra or .env.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

export type DbIncome = {
  id: string;
  user_id: string;
  amount: number;
  date: string; // ISO
  category?: string | null;
  notes?: string | null;
  created_at: string;
};

export type DbExpense = {
  id: string;
  user_id: string;
  amount: number;
  date: string; // ISO
  merchant?: string | null;
  business_pct?: number | null; // 0-100
  category?: string | null;
  receipt_url?: string | null;
  created_at: string;
};

export type DbTrip = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  distance_miles: number;
  route_polyline?: string | null;
  start_address?: string | null;
  end_address?: string | null;
  purpose?: 'business' | 'personal' | null;
  created_at: string;
};

export type DbTaxSettings = {
  id: string;
  user_id: string;
  filing_status: 'single' | 'married_joint' | 'married_separate' | 'head';
  state?: string | null;
  estimated_annual_income?: number | null;
  other_deductions?: number | null;
  safe_harbor?: '90_percent_current' | '100_percent_prior' | '110_percent_high_income' | null;
  created_at: string;
};
