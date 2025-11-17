import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { ScreenWithFooter } from '@/components/Screen';
import MapView, { Polyline } from 'react-native-maps';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { getPlatformDrivingRoute, decodePolyline } from '@/services/routing';
import { useMileageStore } from '@/stores/useMileageStore';
import { useRouter } from 'expo-router';

export default function RouteDistanceScreen() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [points, setPoints] = useState<{ latitude: number; longitude: number }[]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const addTrip = useMileageStore((s) => s.addTrip);
  const router = useRouter();

  const onFetch = async () => {
    try {
      setLoading(true);
      const res = await getPlatformDrivingRoute(start, end);
      setDistance(res.distanceMiles);
      if (res.polyline) setPoints(decodePolyline(res.polyline));
    } catch (e: any) {
      Alert.alert('Directions error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const onSave = () => {
    if (!distance) return;
    addTrip({ startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), distanceMiles: distance, routePolyline: '' });
    router.back();
  };

  return (
    <ScreenWithFooter
      footer={
        <MapView style={{ flex: 1 }} initialRegion={{ latitude: 37.7749, longitude: -122.4194, latitudeDelta: 0.2, longitudeDelta: 0.2 }}>
          {points.length > 0 && <Polyline coordinates={points} strokeColor="#2D6AE3" strokeWidth={4} />}
        </MapView>
      }
    >
      <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 12 }}>Address Distance</Text>
      <Input placeholder="Start address" value={start} onChangeText={setStart} />
      <Input placeholder="End address" value={end} onChangeText={setEnd} />
      <Button title={loading ? 'Fetching…' : 'Get Route'} onPress={onFetch} />
      {distance !== null && <Text style={{ color: '#9AA4AE', marginTop: 12 }}>{distance.toFixed(2)} miles</Text>}
      {distance !== null && <Button variant="secondary" title="Save Mileage" onPress={onSave} />}
    </ScreenWithFooter>
  );
}
