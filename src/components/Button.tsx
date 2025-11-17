import React from 'react';
import { Pressable, Text } from 'react-native';

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export const Button: React.FC<Props> = ({ title, onPress, disabled, variant = 'primary' }) => {
  const bg = variant === 'primary' ? '#2D6AE3' : variant === 'secondary' ? '#233042' : 'transparent';
  const color = variant === 'ghost' ? '#D6E1EA' : 'white';
  const borderWidth = variant === 'ghost' ? 1 : 0;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: disabled ? '#334155' : bg,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        alignItems: 'center',
        borderColor: '#334155',
        borderWidth
      }}
    >
      <Text style={{ color, fontSize: 16, fontWeight: '600' }}>{title}</Text>
    </Pressable>
  );
};
