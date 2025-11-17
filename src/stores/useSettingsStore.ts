import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type State = {
  darkMode: 'system' | 'light' | 'dark';
  filingStatus?: 'single' | 'married_joint' | 'married_separate' | 'head';
  setDarkMode: (v: State['darkMode']) => void;
  setFilingStatus: (v: NonNullable<State['filingStatus']>) => void;
};

export const useSettingsStore = create<State>()(
  persist(
    (set) => ({
      darkMode: 'system',
      setDarkMode: (v) => set({ darkMode: v }),
      setFilingStatus: (v) => set({ filingStatus: v })
    }),
    { name: 'settings-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);
