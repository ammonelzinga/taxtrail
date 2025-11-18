import React, { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { ScreenWithFooter } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useMileageStore } from '@/stores/useMileageStore';
import { startBackgroundTracking, stopBackgroundTracking } from '@/tasks/background';
import { getPlatformDrivingRoute, decodePolyline } from '@/services/routing';
import MapView, { Polyline } from 'react-native-maps';
import { Link } from 'expo-router';

export default function MileageScreen() {
  const tracking = useMileageStore((s) => s.tracking);
  const start = useMileageStore((s) => s.startTracking);
  const stop = useMileageStore((s) => s.stopTracking);
  const trips = useMileageStore((s) => s.trips);
  const addTrip = useMileageStore((s) => s.addTrip);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      if (tracking) {
        await stopBackgroundTracking();
        stop();
      } else {
        await startBackgroundTracking();
        start();
      }
    } finally {
      setBusy(false);
    }
  };

  // Manual entry state
  const [manualMiles, setManualMiles] = useState('');

  // Address distance state
  const [startAddr, setStartAddr] = useState('');
  const [endAddr, setEndAddr] = useState('');
  const [routePoints, setRoutePoints] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeBusy, setRouteBusy] = useState(false);

  const fetchRoute = async () => {
    if (!startAddr || !endAddr) return;
    try {
      setRouteBusy(true);
      const res = await getPlatformDrivingRoute(startAddr, endAddr);
      setRouteDistance(res.distanceMiles);
      if (res.polyline) setRoutePoints(decodePolyline(res.polyline));
    } catch (e: any) {
      alert(e.message === 'No route found' ? 'No route found. Check addresses or try a more specific location.' : e.message);
    } finally {
      setRouteBusy(false);
    }
  };

  const saveManual = () => {
    const num = parseFloat(manualMiles || '0');
    if (!num) return;
    addTrip({ startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), distanceMiles: num });
    setManualMiles('');
  };

  const saveRouteTrip = () => {
    if (!routeDistance) return;
    addTrip({ startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), distanceMiles: routeDistance, routePolyline: '' });
    setRouteDistance(null);
    setRoutePoints([]);
    setStartAddr('');
    setEndAddr('');
  };

  return (
    <ScreenWithFooter
      footer={
        <MapView style={{ flex: 1 }} initialRegion={{ latitude: 37.7749, longitude: -122.4194, latitudeDelta: 0.2, longitudeDelta: 0.2 }}>
          {routePoints.length > 0 && <Polyline coordinates={routePoints} strokeColor="#2D6AE3" strokeWidth={4} />}
        </MapView>
      }
    >
      <Text style={{ color: 'white', fontSize: 24, fontWeight: '700', marginBottom: 12 }}>Mileage</Text>
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
        <Link href="/(tabs)/mileage/manual" style={{ color: '#2D6AE3', fontSize: 14 }}>Manual Entry →</Link>
        <Link href="/(tabs)/mileage/route" style={{ color: '#2D6AE3', fontSize: 14 }}>Distance by Address →</Link>
      </View>
      <Button title={tracking ? (busy ? 'Stopping…' : 'Stop Automatic Tracking') : busy ? 'Starting…' : 'Start Automatic Tracking'} onPress={toggle} />
      <Text style={{ color: 'white', fontSize: 18, fontWeight: '600', marginTop: 24, marginBottom: 8 }}>Manual Entry</Text>
      <Input placeholder="Miles" keyboardType="decimal-pad" value={manualMiles} onChangeText={setManualMiles} />
      <Button variant="secondary" title="Save Manual" onPress={saveManual} />
      <Text style={{ color: 'white', fontSize: 18, fontWeight: '600', marginTop: 24, marginBottom: 8 }}>Distance by Address</Text>
      <Input placeholder="Start address" value={startAddr} onChangeText={setStartAddr} />
      <Input placeholder="End address" value={endAddr} onChangeText={setEndAddr} />
      <Button title={routeBusy ? 'Fetching…' : 'Get Route'} onPress={fetchRoute} />
      {routeDistance !== null && <Text style={{ color: '#9AA4AE', marginTop: 8 }}>{routeDistance.toFixed(2)} miles</Text>}
      {routeDistance !== null && <Button variant="secondary" title="Save Distance Trip" onPress={saveRouteTrip} />}
      <Text style={{ color: '#9AA4AE', marginVertical: 16 }}>Recent Trips</Text>
      <FlatList
        data={trips}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 10, borderBottomColor: '#162234', borderBottomWidth: 1 }}>
            <Text style={{ color: 'white' }}>{item.distanceMiles.toFixed(2)} mi</Text>
            <Text style={{ color: '#8CA0B3', fontSize: 12 }}>{item.startedAt}</Text>
          </View>
        )}
        style={{ maxHeight: 220 }}
      />
    </ScreenWithFooter>
  );
}
