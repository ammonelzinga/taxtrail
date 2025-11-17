import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '@/services/supabase';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      Alert.alert('Check your email', 'Confirm your email to finish signup.');
    } catch (e: any) {
      Alert.alert('Registration failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, gap: 16, backgroundColor: '#0B0F14' }}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ color: 'white', fontSize: 28, fontWeight: '700', marginBottom: 24 }}>Create account</Text>
        <Input placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Input placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button title={loading ? 'Creating…' : 'Create Account'} onPress={onRegister} disabled={loading} />
        <Text style={{ color: '#9AA4AE', marginTop: 12 }}>
          Have an account? <Link href="/(auth)/login">Sign in</Link>
        </Text>
      </View>
    </View>
  );
}
