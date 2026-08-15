/**
 * Seletor de duração H:MM (Q8). Retorna minutos. Stepper simples + presets,
 * para lançar com pouquíssimos toques.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText, Row } from '@/ui/components/base';
import { Chip } from '@/ui/components/indicators';
import { useTheme } from '@/ui/theme';
import { formatHM, minutesToHM, hoursMinutesToMinutes, MAX_DURATION_MINUTES } from '@/utils/duration';

const PRESETS = [15, 30, 45, 60, 90, 120];

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        borderRadius: t.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.cardAlt,
        borderWidth: 1,
        borderColor: t.colors.border,
      }}
    >
      <AppText variant="heading">{label}</AppText>
    </Pressable>
  );
}

export function DurationField({
  minutes,
  onChange,
}: {
  minutes: number;
  onChange: (minutes: number) => void;
}) {
  const t = useTheme();
  const { hours, minutes: mins } = minutesToHM(minutes);

  const clamp = (v: number) => Math.max(0, Math.min(MAX_DURATION_MINUTES, v));
  const setH = (h: number) => onChange(clamp(hoursMinutesToMinutes(Math.max(0, h), mins)));

  return (
    <View style={{ gap: t.spacing.md }}>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: t.colors.card,
          borderRadius: t.radius.lg,
          borderWidth: 1,
          borderColor: t.colors.border,
          paddingVertical: t.spacing.md,
        }}
      >
        <AppText variant="display">{formatHM(minutes)}</AppText>
        <AppText variant="muted">horas : minutos</AppText>
      </View>

      <Row style={{ justifyContent: 'space-between' }}>
        <Row>
          <StepButton label="−" onPress={() => setH(hours - 1)} />
          <AppText variant="heading" style={{ width: 56, textAlign: 'center' }}>{hours}h</AppText>
          <StepButton label="+" onPress={() => setH(hours + 1)} />
        </Row>
        <Row>
          <StepButton label="−" onPress={() => onChange(clamp(minutes - 5))} />
          <AppText variant="heading" style={{ width: 64, textAlign: 'center' }}>
            {String(mins).padStart(2, '0')}m
          </AppText>
          <StepButton label="+" onPress={() => onChange(clamp(minutes + 5))} />
        </Row>
      </Row>

      <Row style={{ flexWrap: 'wrap' }}>
        {PRESETS.map((p) => (
          <Chip key={p} label={formatHM(p)} selected={minutes === p} onPress={() => onChange(p)} />
        ))}
      </Row>
    </View>
  );
}
