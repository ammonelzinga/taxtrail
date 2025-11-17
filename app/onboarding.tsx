import React from 'react';
import { View, Text } from 'react-native';
import { Link } from 'expo-router';

export default function Onboarding() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0B0F14', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ color: 'white', fontSize: 32, fontWeight: '800', marginBottom: 8 }}>Welcome to TaxTrail</Text>
      <Text style={{ color: '#9AA4AE', textAlign: 'center', marginBottom: 16 }}>
        self employed quarterly estimated taxes helper
      </Text>
      <Link href="/(auth)/login" style={{ color: '#2D6AE3', fontSize: 18 }}>Get Started →</Link>
    </View>
  );
}
