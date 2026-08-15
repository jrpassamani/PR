/**
 * Primitivos de UI temáticos: Screen, Card, AppText, Button, Row, Divider.
 */
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/ui/theme';

export function Screen({
  children,
  scroll = true,
  padded = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
}) {
  const t = useTheme();
  const inner = (
    <View style={{ padding: padded ? t.spacing.lg : 0, gap: t.spacing.md, paddingBottom: t.spacing.xxl }}>
      {children}
    </View>
  );
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {inner}
          </ScrollView>
        ) : (
          inner
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  alt = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  alt?: boolean;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: alt ? t.colors.cardAlt : t.colors.card,
          borderRadius: t.radius.lg,
          borderWidth: 1,
          borderColor: t.colors.border,
          padding: t.spacing.lg,
          gap: t.spacing.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'muted';

export function AppText({
  children,
  variant = 'body',
  color,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  variant?: TextVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const t = useTheme();
  const map: Record<TextVariant, TextStyle> = {
    display: { fontSize: t.fontSize.display, fontWeight: '800', color: t.colors.text },
    title: { fontSize: t.fontSize.xl, fontWeight: '700', color: t.colors.text },
    heading: { fontSize: t.fontSize.lg, fontWeight: '700', color: t.colors.text },
    body: { fontSize: t.fontSize.md, fontWeight: '400', color: t.colors.text },
    label: { fontSize: t.fontSize.sm, fontWeight: '600', color: t.colors.textMuted },
    muted: { fontSize: t.fontSize.sm, fontWeight: '400', color: t.colors.textMuted },
  };
  return (
    <Text numberOfLines={numberOfLines} style={[map[variant], color ? { color } : null, style]}>
      {children}
    </Text>
  );
}

export function Row({
  children,
  style,
  gap,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}) {
  const t = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: gap ?? t.spacing.sm }, style]}>
      {children}
    </View>
  );
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: 1, backgroundColor: t.colors.border, marginVertical: t.spacing.xs }} />;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const bg =
    variant === 'primary' ? t.colors.primary
    : variant === 'danger' ? t.colors.red
    : variant === 'secondary' ? t.colors.cardAlt
    : 'transparent';
  const fg =
    variant === 'primary' || variant === 'danger' ? t.colors.primaryText
    : t.colors.text;
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          borderRadius: t.radius.md,
          paddingVertical: 14,
          paddingHorizontal: t.spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: t.colors.border,
          minHeight: 50,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={{ color: fg, fontSize: t.fontSize.md, fontWeight: '700' }}>{title}</Text>
      )}
    </Pressable>
  );
}
