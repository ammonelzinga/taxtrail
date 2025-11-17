import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { getDrivingRoute as getGoogleDrivingRoute, decodePolyline as decodeGooglePolyline } from '@/services/google';

export type RouteResult = { distanceMiles: number; polyline?: string; points?: { latitude: number; longitude: number }[] };

// Public API: attempts native Apple MapKit routing on iOS; falls back to Google (if key) or straight-line distance.
export async function getPlatformDrivingRoute(startAddress: string, endAddress: string): Promise<RouteResult> {
  if (Platform.OS === 'ios') {
    try {
      // Attempt native module first (added via config plugin). We expect a module named MapKitRouting.
      // @ts-ignore
      const native = global?.MapKitRouting || (require('react-native').NativeModules?.MapKitRouting);
      if (native?.getRouteDistance) {
        const res = await native.getRouteDistance(startAddress, endAddress);
        return { distanceMiles: res.distanceMiles, polyline: res.polyline, points: res.points };
      }
    } catch (e) {
      // fall through to geocode + Google fallback
    }
    // Fallback path: geocode both addresses with Apple geocoder (Location.geocodeAsync uses MapKit under the hood).
    const [start] = await Location.geocodeAsync(startAddress);
    const [end] = await Location.geocodeAsync(endAddress);
    if (!start || !end) throw new Error('Geocoding failed');
    try {
      // If Google key exists still leverage driving distance until native MapKit module is available.
      return await getGoogleDrivingRoute(`${start.latitude},${start.longitude}`, `${end.latitude},${end.longitude}`);
    } catch {
      // Approximate straight-line distance (Haversine) as last resort.
      const miles = haversineMiles(start.latitude, start.longitude, end.latitude, end.longitude);
      return { distanceMiles: miles };
    }
  }
  // Android or other: use Google service directly (requires key) else throw.
  return await getGoogleDrivingRoute(startAddress, endAddress);
}

export function decodePolyline(encoded: string) {
  return decodeGooglePolyline(encoded);
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371e3; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const meters = R * c;
  return meters / 1609.34;
}