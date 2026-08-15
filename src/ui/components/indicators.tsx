/**
 * Indicadores: StatusPill, StatTile, ProgressBar, Chip.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/components/base';
import { useTheme } from '@/ui/theme';
import type { StatusMeta } from '@/utils/format';

export function StatusPill({ meta }: { meta: StatusMeta }) {
  const t = useTheme();
  const color = t.colors[meta.tone];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: color + '22',
        borderColor: color,
        borderWidth: 1,
        borderRadius: t.radius.pill,
        paddingVertical: 6,
        paddingHorizontal: 12,
      }}
    >
      <AppText style={{ fontSize: t.fontSize.sm }}>{meta.emoji}</AppText>
      <AppText style={{ color, fontWeight: '700', fontSize: t.fontSize.sm }}>{meta.label}</AppText>
    </View>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  accent?: string;
}) {
  const t = useTheme();
  const tint = accent ?? t.colors.primary;
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: '46%',
        backgroundColor: t.colors.card,
        borderRadius: t.radius.md,
        borderWidth: 1,
        borderColor: t.colors.border,
        padding: t.spacing.md,
        gap: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon ? (
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: tint + '22',
            }}
          >
            <Ionicons name={icon} size={14} color={tint} />
          </View>
        ) : null}
        <AppText variant="label" style={{ flex: 1 }} numberOfLines={1}>
          {label}
        </AppText>
      </View>
      <AppText variant="heading">{value}</AppText>
      {hint ? <AppText variant="muted" numberOfLines={1}>{hint}</AppText> : null}
    </View>
  );
}

export function ProgressBar({
  ratio,
  color,
  markerRatio,
}: {
  ratio: number; // 0..1+
  color: string;
  markerRatio?: number; // posição da "trajetória ideal"
}) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <View
      style={{
        height: 12,
        borderRadius: t.radius.pill,
        backgroundColor: t.colors.track,
        overflow: 'hidden',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${pct}%`,
          backgroundColor: color,
          borderRadius: t.radius.pill,
        }}
      />
      {markerRatio !== undefined ? (
        <View
          style={{
            position: 'absolute',
            left: `${Math.max(0, Math.min(1, markerRatio)) * 100}%`,
            top: -2,
            bottom: -2,
            width: 2,
            backgroundColor: t.colors.text,
          }}
        />
      ) : null}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  const t = useTheme();
  const accent = color ?? t.colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: t.radius.pill,
        borderWidth: 1,
        borderColor: selected ? accent : t.colors.border,
        backgroundColor: selected ? accent + '22' : t.colors.card,
      }}
    >
      <AppText style={{ color: selected ? accent : t.colors.text, fontWeight: selected ? '700' : '500' }}>
        {label}
      </AppText>
    </Pressable>
  );
}
