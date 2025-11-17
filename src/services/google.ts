import Constants from 'expo-constants';
import polyline from 'polyline';

export type DirectionsResult = {
  distanceMiles: number;
  polyline: string; // encoded polyline
};

export async function getDrivingRoute(startAddress: string, endAddress: string): Promise<DirectionsResult> {
  const extra = (Constants.expoConfig?.extra || {}) as any;
  const key = extra.GOOGLE_MAPS_API_KEY as string;
  if (!key) throw new Error('Missing GOOGLE_MAPS_API_KEY');
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
    startAddress
  )}&destination=${encodeURIComponent(endAddress)}&mode=driving&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Directions API error');
  const json = await res.json();
  if (json.status === 'ZERO_RESULTS') {
    throw new Error('No route found');
  }
  const route = json.routes?.[0];
  if (!route) throw new Error('No route found');
  const leg = route.legs?.[0];
  const meters = leg?.distance?.value || 0;
  return { distanceMiles: meters / 1609.34, polyline: route.overview_polyline.points };
}

export function decodePolyline(p: string) {
  return polyline.decode(p).map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
}
