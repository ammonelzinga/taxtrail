import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';

export default function AuthLayout() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Redirect href="/(tabs)/dashboard" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
