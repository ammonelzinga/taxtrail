import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { Pressable, Text } from 'react-native';
import { supabase } from '@/services/supabase';

export default function TabsLayout() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0B0F14' },
        headerTintColor: 'white',
        tabBarStyle: { backgroundColor: '#0B0F14', borderTopColor: '#13202F' },
        tabBarActiveTintColor: '#2D6AE3',
        tabBarInactiveTintColor: '#8CA0B3'
      }}
    >
      {/* Core four tabs */}
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="finance/index" options={{ title: 'Finance' }} />
      <Tabs.Screen name="receipts/index" options={{ title: 'Receipts' }} />
      <Tabs.Screen
        name="mileage/index"
        options={{
          title: 'Mileage',
          headerRight: () => (
            <Pressable onPress={() => supabase.auth.signOut()} style={{ paddingRight: 12 }}>
              <Text style={{ color: '#8CA0B3' }}>Sign out</Text>
            </Pressable>
          )
        }}
      />

      {/* Hide all other routes from the tab bar but allow navigation via Links/router */}
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="expenses/index" options={{ href: null }} />
      <Tabs.Screen name="expenses/[id]" options={{ href: null }} />
      <Tabs.Screen name="income/index" options={{ href: null }} />
      <Tabs.Screen name="finance/forms" options={{ href: null }} />
      <Tabs.Screen name="mileage/manual" options={{ href: null }} />
      <Tabs.Screen name="mileage/route" options={{ href: null }} />
      <Tabs.Screen name="receipts/capture" options={{ href: null }} />
      <Tabs.Screen name="receipts/review" options={{ href: null }} />
    </Tabs>
  );
}
