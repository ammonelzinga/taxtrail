import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/providers/AuthProvider';
import { DataProvider } from '@/providers/DataProvider';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DataProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="assistant/1040es" options={{ title: '1040-ES Assistant' }} />
            <Stack.Screen name="onboarding" options={{ title: 'Welcome' }} />
          </Stack>
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
