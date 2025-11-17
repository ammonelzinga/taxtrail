import React from 'react';
import { TextInput, TextInputProps } from 'react-native';

export const Input: React.FC<TextInputProps> = (props) => {
  return (
    <TextInput
      placeholderTextColor="#6C7783"
      {...props}
      style={[
        {
          backgroundColor: '#0F1520',
          borderColor: '#1F2937',
          borderWidth: 1,
          color: 'white',
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 12,
          marginBottom: 12
        },
        props.style
      ]}
    />
  );
};
