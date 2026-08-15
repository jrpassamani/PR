/**
 * ANÁLISES — horas/mês, acumulado, ideal×realizado, distribuição por categoria,
 * maior/menor mês, dias com atividade, médias e projeção.
 */
import React from 'react';
import { Dimensions, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { AppText, Card, Divider, Row, Screen } from '@/ui/components/base';
import { StatTile } from '@/ui/components/indicators';
import { TrajectoryChart } from '@/ui/components/TrajectoryChart';
import { CATEGORY_COLORS } from '@/ui/components/CategorySelect';
import { useTheme } from '@/ui/theme';
import { useAnalytics, useDashboard } from '@/hooks/useMetrics';
import { CATEGORY_SHORT_LABELS } from '@/domain/types';
import { hoursLabel, paceLabel, percentLabel } from '@/utils/format';

export default function Analises() {
  const t = useTheme();
  const a = useAnalytics();
  const d = useDashboard();
  const width = Dimensions.get('window').width - t.spacing.lg * 4;

  if (!a || !d) {
    return (
      <Screen>
        <Card><AppText variant="muted">Sem dados ainda.</AppText></Card>
      </Screen>
    );
  }

  const barData = a.months.map((m) => {
    const isMax = a.maxMonth && m.monthIndex === a.maxMonth.monthIndex && m.minutes > 0;
    const isMin = a.minMonth && m.monthIndex === a.minMonth.monthIndex && m.minutes > 0 && a.maxMonth?.monthIndex !== m.monthIndex;
    return {
      value: m.minutes / 60,
      label: m.label,
      frontColor: isMax ? t.colors.primary : isMin ? t.colors.yellow : t.colors.neutral,
    };
  });

  const pieData = a.categories
    .filter((c) => c.minutes > 0)
    .map((c) => ({ value: c.minutes, color: CATEGORY_COLORS[c.category] }));

  return (
    <Screen>
      <AppText variant="title">Análises</AppText>

      {a.totalMinutes === 0 ? (
        <Card>
          <AppText variant="muted">
            Nenhuma atividade registrada ainda. Os gráficos se preenchem conforme você lança horas.
          </AppText>
        </Card>
      ) : null}

      <Card>
        <AppText variant="heading">Trajetória (ideal × realizado)</AppText>
        <Divider />
        <TrajectoryChart months={a.months} goalHours={d.effectiveGoalMinutes / 60} />
      </Card>

      <Card>
        <AppText variant="heading">Horas por mês</AppText>
        <AppText variant="muted">Verde = maior mês · Amarelo = menor mês (decorrido)</AppText>
        <Divider />
        <BarChart
          data={barData}
          width={width}
          height={180}
          barWidth={14}
          spacing={10}
          noOfSections={4}
          frontColor={t.colors.neutral}
          yAxisTextStyle={{ color: t.colors.textMuted, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: t.colors.textMuted, fontSize: 9 }}
          rulesColor={t.colors.border}
          yAxisColor={t.colors.border}
          xAxisColor={t.colors.border}
          yAxisLabelSuffix="h"
        />
      </Card>

      <Card>
        <AppText variant="heading">Distribuição por atividade</AppText>
        <Divider />
        {pieData.length > 0 ? (
          <Row style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <PieChart data={pieData} donut radius={80} innerRadius={50} innerCircleColor={t.colors.card} />
            <View style={{ gap: 6, flex: 1, minWidth: 140 }}>
              {a.categories
                .filter((c) => c.minutes > 0)
                .map((c) => (
                  <Row key={c.category} style={{ justifyContent: 'space-between' }}>
                    <Row gap={6}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: CATEGORY_COLORS[c.category] }} />
                      <AppText variant="muted">{CATEGORY_SHORT_LABELS[c.category]}</AppText>
                    </Row>
                    <AppText variant="muted">{hoursLabel(c.minutes)} · {percentLabel(c.percent)}</AppText>
                  </Row>
                ))}
            </View>
          </Row>
        ) : (
          <AppText variant="muted">Sem atividades registradas.</AppText>
        )}
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.md }}>
        <StatTile label="Maior mês" value={a.maxMonth ? hoursLabel(a.maxMonth.minutes) : '—'} hint={a.maxMonth?.label} />
        <StatTile label="Menor mês" value={a.minMonth ? hoursLabel(a.minMonth.minutes) : '—'} hint={a.minMonth?.label} />
        <StatTile label="Dias com atividade" value={`${a.daysWithActivity}`} />
        <StatTile label="Média por dia ativo" value={hoursLabel(a.avgPerActiveDayMinutes)} />
        <StatTile label="Média mensal" value={`${hoursLabel(a.avgMonthlyMinutes)}/mês`} />
        <StatTile label="Projeção final" value={hoursLabel(d.projectedMinutes)} hint={d.willReachGoal ? 'atinge a meta' : 'abaixo da meta'} />
      </View>
    </Screen>
  );
}
