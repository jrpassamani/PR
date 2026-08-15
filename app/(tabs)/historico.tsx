/**
 * HISTÓRICO — lista por mês (com subtotal), filtros por período e categoria,
 * editar e excluir.
 */
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, Divider, Row, Screen } from '@/ui/components/base';
import { Chip } from '@/ui/components/indicators';
import { CATEGORY_COLORS } from '@/ui/components/CategorySelect';
import { useTheme } from '@/ui/theme';
import { CATEGORY_KEYS, CATEGORY_SHORT_LABELS, type CategoryKey } from '@/domain/types';
import { useActivityStore } from '@/state/useActivityStore';
import { hoursLabel } from '@/utils/format';
import { formatHM } from '@/utils/duration';
import { formatIsoBr, formatYearMonthBr } from '@/utils/format';
import { addDays, isoYearMonth } from '@/utils/datecore';
import { todayIso } from '@/utils/today';

type Period = 'all' | 'month' | 'last30';

export default function Historico() {
  const t = useTheme();
  const router = useRouter();
  const items = useActivityStore((s) => s.items);
  const remove = useActivityStore((s) => s.remove);

  const [category, setCategory] = useState<CategoryKey | 'all'>('all');
  const [period, setPeriod] = useState<Period>('all');

  const filtered = useMemo(() => {
    const today = todayIso();
    const from =
      period === 'month' ? today.slice(0, 7) + '-01'
      : period === 'last30' ? addDays(today, -29)
      : null;
    return items.filter((a) => {
      if (category !== 'all' && a.category !== category) return false;
      if (from && a.activityDate < from) return false;
      return true;
    });
  }, [items, category, period]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const a of filtered) {
      const ym = isoYearMonth(a.activityDate);
      const arr = map.get(ym) ?? [];
      arr.push(a);
      map.set(ym, arr);
    }
    return Array.from(map.entries()).sort((x, y) => (x[0] < y[0] ? 1 : -1));
  }, [filtered]);

  const confirmDelete = (id: string) => {
    Alert.alert('Excluir', 'Deseja excluir esta atividade? Isso recalcula seus totais.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => remove(id) },
    ]);
  };

  return (
    <Screen>
      <AppText variant="title">Histórico</AppText>

      <View style={{ gap: t.spacing.sm }}>
        <AppText variant="label">Período</AppText>
        <Row style={{ flexWrap: 'wrap' }}>
          <Chip label="Ano todo" selected={period === 'all'} onPress={() => setPeriod('all')} />
          <Chip label="Mês atual" selected={period === 'month'} onPress={() => setPeriod('month')} />
          <Chip label="Últimos 30 dias" selected={period === 'last30'} onPress={() => setPeriod('last30')} />
        </Row>
        <AppText variant="label">Atividade</AppText>
        <Row style={{ flexWrap: 'wrap' }}>
          <Chip label="Todas" selected={category === 'all'} onPress={() => setCategory('all')} />
          {CATEGORY_KEYS.map((k) => (
            <Chip
              key={k}
              label={CATEGORY_SHORT_LABELS[k]}
              selected={category === k}
              onPress={() => setCategory(k)}
              color={CATEGORY_COLORS[k]}
            />
          ))}
        </Row>
      </View>

      {groups.length === 0 ? (
        <Card>
          <AppText variant="muted">Nenhuma atividade neste filtro.</AppText>
        </Card>
      ) : null}

      {groups.map(([ym, arr]) => {
        const subtotal = arr.reduce((s, a) => s + a.durationMinutes, 0);
        return (
          <Card key={ym}>
            <Row style={{ justifyContent: 'space-between' }}>
              <AppText variant="heading" style={{ textTransform: 'capitalize' }}>
                {formatYearMonthBr(ym)}
              </AppText>
              <AppText variant="label">{hoursLabel(subtotal)}</AppText>
            </Row>
            <Divider />
            {arr.map((a) => (
              <Pressable
                key={a.id}
                onPress={() => router.push({ pathname: '/activity/[id]', params: { id: a.id } })}
                style={{ paddingVertical: t.spacing.sm }}
              >
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row gap={t.spacing.sm}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: CATEGORY_COLORS[a.category] }} />
                    <View>
                      <AppText>{CATEGORY_SHORT_LABELS[a.category]} · {formatHM(a.durationMinutes)}</AppText>
                      <AppText variant="muted">
                        {formatIsoBr(a.activityDate)}{a.note ? ` · ${a.note}` : ''}
                      </AppText>
                    </View>
                  </Row>
                  <Pressable
                    onPress={() => confirmDelete(a.id)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Excluir atividade"
                  >
                    <Ionicons name="trash-outline" size={20} color={t.colors.textMuted} />
                  </Pressable>
                </Row>
              </Pressable>
            ))}
          </Card>
        );
      })}
    </Screen>
  );
}
