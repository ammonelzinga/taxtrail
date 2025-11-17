import React from 'react';
import { View, Text } from 'react-native';

export const Card: React.FC<{ title: string; value?: string | number; children?: React.ReactNode }> = ({ title, value, children }) => {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#0F1520',
        borderRadius: 16,
        padding: 16,
        borderColor: '#162234',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12
      }}
    >
      <Text style={{ color: '#8CA0B3', fontSize: 12, marginBottom: 6 }}>{title}</Text>
      {value !== undefined ? (
        <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>{value}</Text>
      ) : (
        children
      )}
    </View>
  );
};
