import React from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { ink, radius, space, surface } from '@/theme/tokens';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  tint?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'secondary',
  tint,
  disabled = false,
  style,
}: ButtonProps) {
  const accent = tint ?? ink.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && { backgroundColor: accent },
        variant === 'secondary' && { borderWidth: 1, borderColor: ink.axis },
        variant === 'ghost' && { paddingHorizontal: space.sm },
        pressed && { opacity: 0.7 },
        disabled && { opacity: 0.35 },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === 'primary' ? { color: surface.page } : { color: ink.secondary },
          variant === 'primary' && { fontWeight: '700' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 15 },
});
