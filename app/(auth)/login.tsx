import React, { useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
import { supabase } from '@/services/supabase';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (e: any) {
      Alert.alert('Login failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    try {
      setLoading(true);
      const redirectTo = Linking.createURL('/auth/callback');
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
    } catch (e: any) {
      Alert.alert('OAuth failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, gap: 16, backgroundColor: '#0B0F14' }}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ color: 'white', fontSize: 32, fontWeight: '700', marginBottom: 24 }}>TaxTrail</Text>
        <Input placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Input placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button title={loading ? 'Signing in…' : 'Sign In'} onPress={onLogin} disabled={loading} />
        <Button variant="secondary" title="Continue with Google" onPress={onGoogle} disabled={loading} />
        <Text style={{ color: '#9AA4AE', marginTop: 12 }}>
          No account? <Link href="/(auth)/register">Register</Link>
        </Text>
      </View>
      <Text style={{ color: '#6C7783', textAlign: 'center', marginBottom: 24 }}>self employed quarterly estimated taxes helper</Text>
    </View>
  );
}
