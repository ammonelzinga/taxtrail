import React from 'react';
import { View, Text } from 'react-native';
import { Link } from 'expo-router';
import { Screen } from '@/components/Screen';

export default function ReceiptsHome() {
  return (
    <Screen>
      <View style={{ gap: 12 }}>
        <Text style={{ color: 'white', fontSize: 20, fontWeight: '700' }}>Receipts</Text>
        <Link href="/(tabs)/receipts/capture" style={{ color: '#2D6AE3', fontSize: 16 }}>
          Capture with AI Parser →
        </Link>
        <Link href="/(tabs)/receipts/capture?mode=ocr" style={{ color: '#8CA0B3', fontSize: 16 }}>
          Capture with OCR (non‑AI) →
        </Link>
      </View>
    </Screen>
  );
}
