import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Screen } from '@/components/Screen';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { pickReceiptImage, uploadReceiptToStorage, parseReceiptAIFromLocal, parseReceiptOCR } from '@/services/receipts';
import { useAuth } from '@/providers/AuthProvider';

export default function CaptureReceiptScreen() {
  const { user } = useAuth();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isOCR = mode === 'ocr';

  const onCapture = async () => {
    try {
      setLoading(true);
      const asset = await pickReceiptImage();
      if (!asset || !user) return;
      const uploaded = await uploadReceiptToStorage(user.id, asset.uri);
      const parsed = isOCR ? await parseReceiptOCR(asset.uri) : await parseReceiptAIFromLocal(asset.uri);
      router.push({ pathname: '/(tabs)/receipts/review', params: { data: JSON.stringify({ parsed, receiptPath: uploaded.path }) } });
    } catch (e: any) {
      Alert.alert('Capture failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll={false}>
      <View style={{ gap: 12, flex: 1, justifyContent: 'center' }}>
        <Text style={{ color: 'white', fontSize: 24, fontWeight: '700' }}>Capture Receipt</Text>
        <Text style={{ color: '#9AA4AE' }}>{isOCR ? 'Using on-device OCR (non‑AI).' : 'Using AI-based parser for best accuracy.'}</Text>
        <Button title={loading ? 'Processing…' : 'Open Camera'} onPress={onCapture} disabled={loading} />
      </View>
    </Screen>
  );
}
