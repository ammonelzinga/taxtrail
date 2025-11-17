import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { useSettingsStore } from '@/stores/useSettingsStore';

export default function SettingsScreen() {
  const mode = useSettingsStore((s) => s.darkMode);
  const setMode = useSettingsStore((s) => s.setDarkMode);
  return (
    <View style={{ flex: 1, backgroundColor: '#0B0F14', padding: 16 }}>
      <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 12 }}>Settings</Text>
      <Text style={{ color: '#9AA4AE', marginBottom: 8 }}>Appearance</Text>
      {(['system', 'light', 'dark'] as const).map((m) => (
        <Pressable key={m} onPress={() => setMode(m)} style={{ paddingVertical: 12 }}>
          <Text style={{ color: mode === m ? '#2D6AE3' : 'white' }}>{m}</Text>
        </Pressable>
      ))}
      <View style={{ height: 24 }} />
      <Text style={{ color: '#9AA4AE', marginBottom: 8 }}>Developer</Text>
      <Link href="/assistant/pdf-inspector">
        <Text style={{ color: '#2D6AE3', paddingVertical: 12 }}>Open PDF Field Inspector</Text>
      </Link>
    </View>
  );
}
