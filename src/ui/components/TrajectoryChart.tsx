/**
 * Gráfico principal: Trajetória Ideal × Realizado (acumulado, 12 marcos mensais).
 */
import React from 'react';
import { Dimensions, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { AppText, Row } from '@/ui/components/base';
import { useTheme } from '@/ui/theme';
import type { MonthBucket } from '@/domain/analytics';

function Legend({ color, label }: { color: string; label: string }) {
  const t = useTheme();
  return (
    <Row gap={6}>
      <View style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: color }} />
      <AppText variant="muted">{label}</AppText>
    </Row>
  );
}

export function TrajectoryChart({ months, goalHours }: { months: MonthBucket[]; goalHours: number }) {
  const t = useTheme();
  const width = Dimensions.get('window').width - t.spacing.lg * 2 - t.spacing.lg * 2;

  const realized = months.map((m) => ({
    value: m.cumulativeMinutes / 60,
    label: m.label,
  }));
  const ideal = months.map((m) => ({ value: m.idealCumulativeMinutes / 60 }));

  const maxValue = Math.max(goalHours, ...realized.map((r) => r.value)) * 1.05;

  return (
    <View style={{ gap: t.spacing.sm }}>
      <Row gap={t.spacing.lg}>
        <Legend color={t.colors.primary} label="Realizado" />
        <Legend color={t.colors.neutral} label="Trajetória ideal" />
      </Row>
      <LineChart
        data={realized}
        data2={ideal}
        width={width}
        height={200}
        maxValue={maxValue}
        noOfSections={4}
        spacing={Math.max(24, width / 13)}
        initialSpacing={16}
        thickness={3}
        thickness2={2}
        color={t.colors.primary}
        color2={t.colors.neutral}
        dataPointsColor={t.colors.primary}
        hideDataPoints2
        yAxisTextStyle={{ color: t.colors.textMuted, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: t.colors.textMuted, fontSize: 10 }}
        rulesColor={t.colors.border}
        yAxisColor={t.colors.border}
        xAxisColor={t.colors.border}
        yAxisLabelSuffix="h"
        curved
      />
    </View>
  );
}
