import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, Linking, Alert } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { listUserForms, getSignedFormUrl, FormFile } from '@/services/forms';
import { Button } from '@/components/Button';

export default function FormsListScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<FormFile[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const list = await listUserForms(user.id);
      setItems(list);
    } catch (e: any) {
      Alert.alert('Load failed', e.message);
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const open = async (item: FormFile) => {
    try {
      const url = await getSignedFormUrl(item.path, 600);
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('No browser available to open PDF');
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert('Open failed', e.message);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0F14', padding: 16 }}>
      <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 12 }}>My Forms</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.path}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#2D6AE3" />}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 12, borderBottomColor: '#162234', borderBottomWidth: 1 }}>
            <Text style={{ color: 'white' }}>{item.name}</Text>
            {item.updatedAt && <Text style={{ color: '#8CA0B3', fontSize: 12 }}>{item.updatedAt}</Text>}
            <View style={{ height: 8 }} />
            <Button variant="secondary" title="Open" onPress={() => open(item)} />
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={{ color: '#6C7783' }}>No forms yet. Generate one from the 1040‑ES Assistant.</Text> : null}
      />
    </View>
  );
}
