import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Trip = {
  id: string;
  startedAt: string;
  endedAt?: string;
  distanceMiles: number;
  routePolyline?: string;
  purpose?: 'business' | 'personal';
};

type State = {
  tracking: boolean;
  trips: Trip[];
  startTracking: () => void;
  stopTracking: () => void;
  addTrip: (trip: Omit<Trip, 'id'>) => void;
};

export const useMileageStore = create<State>()(
  persist(
    (set) => ({
      tracking: false,
      trips: [],
      startTracking: () => set({ tracking: true }),
      stopTracking: () => set({ tracking: false }),
      addTrip: (trip) => set((s) => ({ trips: [{ id: String(Date.now()), ...trip }, ...s.trips] }))
    }),
    { name: 'mileage-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);
