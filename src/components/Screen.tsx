import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard, View, ViewStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  scroll?: boolean; // enable vertical scrolling when content exceeds viewport
  keyboardOffset?: number;
};

export function Screen({ children, style, scroll = true, keyboardOffset = 0 }: Props) {
  const content = (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, padding: 16 }}>{children}</View>
      )}
    </TouchableWithoutFeedback>
  );
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1, backgroundColor: '#0B0F14' }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardOffset}
    >
      {content}
    </KeyboardAvoidingView>
  );
}

// Convenience wrapper for screens with a map footer or other fixed bottom region
export function ScreenWithFooter({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#0B0F14' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
            {children}
          </ScrollView>
          {footer}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}