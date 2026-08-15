/**
 * Seleção de categoria (chips). Cores fixas por categoria para leitura rápida
 * e consistência com os gráficos.
 */
import React from 'react';
import { View } from 'react-native';
import { Chip } from '@/ui/components/indicators';
import { CATEGORY_KEYS, CATEGORY_SHORT_LABELS, type CategoryKey } from '@/domain/types';
import { useTheme } from '@/ui/theme';

/** Paleta categórica acessível (distinguível em claro e escuro). */
export const CATEGORY_COLORS: Record<CategoryKey, string> = {
  pregacao: '#2563EB',
  estudo: '#7C3AED',
  tpe: '#0891B2',
  tpl: '#059669',
  cartas: '#D97706',
  credito: '#DB2777',
};

export function CategorySelect({
  value,
  onChange,
}: {
  value: CategoryKey;
  onChange: (c: CategoryKey) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
      {CATEGORY_KEYS.map((key) => (
        <Chip
          key={key}
          label={CATEGORY_SHORT_LABELS[key]}
          selected={value === key}
          onPress={() => onChange(key)}
          color={CATEGORY_COLORS[key]}
        />
      ))}
    </View>
  );
}
