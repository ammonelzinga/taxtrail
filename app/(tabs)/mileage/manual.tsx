import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useMileageStore } from '@/stores/useMileageStore';
import { useRouter } from 'expo-router';

export default function ManualMilesScreen() {
  const addTrip = useMileageStore((s) => s.addTrip);
  const [miles, setMiles] = useState('');
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: '#0B0F14', padding: 16 }}>
      <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 12 }}>Manual Entry</Text>
      <Input placeholder="Miles" keyboardType="decimal-pad" value={miles} onChangeText={setMiles} />
      <Button
        title="Save"
        onPress={() => {
          const distance = parseFloat(miles || '0');
          if (!distance) return;
          addTrip({ distanceMiles: distance, startedAt: new Date().toISOString(), endedAt: new Date().toISOString() });
          router.back();
        }}
      />
    </View>
  );
}
