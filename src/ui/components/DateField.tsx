/**
 * Campo de data (apenas data — Q12). Bloqueia datas futuras (Q10/R9).
 */
import React, { useState } from 'react';
import { Platform, Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AppText, Row } from '@/ui/components/base';
import { useTheme } from '@/ui/theme';
import { formatIsoBr } from '@/utils/format';
import { toLocalIsoDate, todayIso } from '@/utils/today';

export function DateField({
  value,
  onChange,
  label = 'Data da atividade',
}: {
  value: string; // YYYY-MM-DD
  onChange: (iso: string) => void;
  label?: string;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);

  const asDate = () => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  return (
    <>
      <AppText variant="label">{label}</AppText>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: t.colors.card,
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: t.colors.border,
          padding: t.spacing.md,
        }}
      >
        <Row style={{ justifyContent: 'space-between' }}>
          <AppText variant="heading">{formatIsoBr(value)}</AppText>
          <AppText variant="muted">alterar</AppText>
        </Row>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={asDate()}
          mode="date"
          maximumDate={new Date()}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, selected) => {
            if (Platform.OS === 'android') setOpen(false);
            if (event.type === 'dismissed') return;
            if (selected) {
              const iso = toLocalIsoDate(selected);
              // Trava de segurança extra: nunca aceitar futuro.
              onChange(iso > todayIso() ? todayIso() : iso);
            }
            if (Platform.OS === 'ios') setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
