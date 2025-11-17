import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { supabase } from '@/services/supabase';
import { useMileageStore } from '@/stores/useMileageStore';

export const MILEAGE_TASK = 'mileage-tracking-task';

// Sessionization parameters
const SPEED_DRIVING_MPS = 6.7; // ~15 mph
const STOP_SPEED_MPS = 1.0; // ~2 mph
const STOP_DURATION_MS = 60_000; // 1 minute below STOP_SPEED considered stop

let currentSession: { start: number; points: Location.LocationObject[] } | null = null;
let lastLowSpeedAt: number | null = null;

TaskManager.defineTask(MILEAGE_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('Location task error', error);
    return;
  }
  const { locations } = data as any;
  if (!locations || !locations.length) return;

  // Minimal example: you can accumulate points and detect drive sessions.
  // For now we simply store raw points in a temp table if desired.
  // Extend this to sessionize into trips with start/stop detection by speed.
  for (const loc of locations as Location.LocationObject[]) {
    const speed = (loc.coords.speed ?? 0);
    const now = loc.timestamp;
    if (!currentSession) {
      if (speed > SPEED_DRIVING_MPS) {
        currentSession = { start: now, points: [loc] };
        lastLowSpeedAt = null;
      }
      continue;
    }
    // in session
    currentSession.points.push(loc);
    if (speed < STOP_SPEED_MPS) {
      if (!lastLowSpeedAt) lastLowSpeedAt = now;
      if (now - (lastLowSpeedAt || now) > STOP_DURATION_MS) {
        // end session
        const start = currentSession.points[0];
        const end = currentSession.points[currentSession.points.length - 1];
        const distance = computeDistanceMiles(currentSession.points);
        try {
          const userRes = await supabase.auth.getUser();
          const userId = userRes.data.user?.id;
          if (userId && distance > 0.1) {
            await supabase.from('trips').insert({
              user_id: userId,
              started_at: new Date(start.timestamp).toISOString(),
              ended_at: new Date(end.timestamp).toISOString(),
              distance_miles: distance
            });
          }
        } catch {}
        // reset
        currentSession = null;
        lastLowSpeedAt = null;
      }
    } else {
      lastLowSpeedAt = null; // moving again
    }
  }
});

export async function startBackgroundTracking() {
  const started = await TaskManager.isTaskRegisteredAsync(MILEAGE_TASK);
  if (!started) {
    await Location.startLocationUpdatesAsync(MILEAGE_TASK, {
      accuracy: Location.Accuracy.Balanced,
      showsBackgroundLocationIndicator: true,
      timeInterval: 4000,
      distanceInterval: 15,
      pausesUpdatesAutomatically: true,
      foregroundService: {
        notificationTitle: 'TaxTrail Mileage Tracking',
        notificationBody: 'Tracking trips to calculate mileage deduction.'
      }
    });
  }
}

export async function stopBackgroundTracking() {
  const started = await TaskManager.isTaskRegisteredAsync(MILEAGE_TASK);
  if (started) {
    await Location.stopLocationUpdatesAsync(MILEAGE_TASK);
  }
}

// Haversine distance sum in miles
function computeDistanceMiles(points: Location.LocationObject[]) {
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    sum += haversine(
      points[i - 1].coords.latitude,
      points[i - 1].coords.longitude,
      points[i].coords.latitude,
      points[i].coords.longitude
    );
  }
  return sum;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371e3; // meters
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const meters = R * c;
  return meters / 1609.34;
}
