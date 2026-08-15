/**
 * INÍCIO / DASHBOARD — responde rapidamente: quanto fiz, quanto falta, % da meta,
 * acima/abaixo da trajetória, ritmo atual, ritmo necessário e projeção.
 */
import React from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText, Button, Card, Divider, Row, Screen } from '@/ui/components/base';
import { ProgressRing } from '@/ui/components/ProgressRing';
import { ProgressBar, StatTile, StatusPill } from '@/ui/components/indicators';
import { TrajectoryChart } from '@/ui/components/TrajectoryChart';
import { useTheme } from '@/ui/theme';
import { useDashboard, useAnalytics } from '@/hooks/useMetrics';
import { useServiceYearStore } from '@/state/useServiceYearStore';
import { useActivityStore } from '@/state/useActivityStore';
import {
  hoursLabel,
  paceLabel,
  percentLabel,
  signedHoursLabel,
  statusMeta,
  formatIsoBr,
} from '@/utils/format';
import { serviceYearBoundsFor } from '@/utils/datecore';
import { todayIso } from '@/utils/today';

export default function Dashboard() {
  const t = useTheme();
  const router = useRouter();
  const d = useDashboard();
  const a = useAnalytics();
  const active = useServiceYearStore((s) => s.active);
  const needsRollover = useServiceYearStore((s) => s.needsRollover);
  const createForStart = useServiceYearStore((s) => s.createForStart);

  if (!d || !active) {
    return (
      <Screen>
        <Card>
          <AppText variant="heading">Sem ano de serviço ativo</AppText>
          <AppText variant="muted">Configure em Configurações.</AppText>
        </Card>
      </Screen>
    );
  }

  const meta = statusMeta(d.status);
  const statusColor = t.colors[meta.tone];
  const monthsRemaining = (d.daysRemaining / 30.4375).toFixed(1).replace('.', ',');

  const doRollover = () => {
    const bounds = serviceYearBoundsFor(todayIso());
    Alert.alert(
      'Novo Ano de Serviço',
      `Iniciar ${formatIsoBr(bounds.startDate)} a ${formatIsoBr(bounds.endDate)}? O ano anterior será arquivado.`,
      [
        { text: 'Agora não', style: 'cancel' },
        {
          text: 'Iniciar',
          onPress: async () => {
            const year = await createForStart(bounds.startDate, active.goalHours, active.monthlyReference);
            await useActivityStore.getState().load(year.id);
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <AppText variant="title">Início</AppText>
          <AppText variant="muted">
            {formatIsoBr(active.startDate)} – {formatIsoBr(active.endDate)}
          </AppText>
        </View>
        <StatusPill meta={meta} />
      </Row>

      {needsRollover() ? (
        <Card alt>
          <AppText variant="heading">Começou um novo Ano de Serviço 🎉</AppText>
          <AppText variant="muted">Deseja iniciar o novo ano e arquivar o atual?</AppText>
          <Button title="Iniciar novo ano" onPress={doRollover} />
        </Card>
      ) : null}

      {d.realizedMinutes === 0 ? (
        <Card alt>
          <AppText variant="heading">Vamos começar? 🚀</AppText>
          <AppText variant="muted">Você ainda não registrou horas neste ano. Toque em “+ Registrar”.</AppText>
        </Card>
      ) : null}

      {/* Card-herói */}
      <Card style={{ alignItems: 'center', gap: t.spacing.md, backgroundColor: statusColor + '0F', borderColor: statusColor + '55' }}>
        <ProgressRing
          percent={d.percentOfGoal}
          color={statusColor}
          centerTop={hoursLabel(d.realizedMinutes)}
          centerMain={percentLabel(d.percentOfGoal)}
          centerBottom={`de ${hoursLabel(d.effectiveGoalMinutes)}`}
        />
        <AppText color={statusColor} style={{ fontWeight: '700' }}>
          {d.deltaMinutes >= 0 ? 'Acima da trajetória' : 'Abaixo da trajetória'}: {signedHoursLabel(d.deltaMinutes)}
        </AppText>
        <View style={{ width: '100%', gap: 4 }}>
          <ProgressBar
            ratio={d.realizedMinutes / d.effectiveGoalMinutes}
            color={statusColor}
            markerRatio={d.idealMinutesToday / d.effectiveGoalMinutes}
          />
          <Row style={{ justifyContent: 'space-between' }}>
            <AppText variant="muted">Ideal hoje: {hoursLabel(d.idealMinutesToday)}</AppText>
            <AppText variant="muted">Meta: {hoursLabel(d.effectiveGoalMinutes)}</AppText>
          </Row>
        </View>
      </Card>

      {/* Métricas-chave */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.md }}>
        <StatTile icon="time-outline" accent={t.colors.primary} label="Realizado" value={hoursLabel(d.realizedMinutes)} hint={percentLabel(d.percentOfGoal) + ' da meta'} />
        <StatTile icon="flag-outline" accent={t.colors.neutral} label="Falta para a meta" value={hoursLabel(d.remainingMinutes)} hint={`${monthsRemaining} meses restantes`} />
        <StatTile
          icon="speedometer-outline"
          accent={t.colors.yellow}
          label="Ritmo necessário"
          value={`${paceLabel(d.requiredPacePerMonthHours)}/mês`}
          hint="para fechar a meta"
        />
        <StatTile
          icon="pulse-outline"
          accent={t.colors.primary}
          label="Ritmo atual"
          value={`${paceLabel(d.currentPacePerMonthHours)}/mês`}
          hint={d.paceBasis === 'last30' ? 'últimos 30 dias' : 'desde o início'}
        />
        <StatTile
          icon="trending-up-outline"
          accent={d.willReachGoal ? t.colors.green : t.colors.red}
          label="Projeção final"
          value={hoursLabel(d.projectedMinutes)}
          hint={d.willReachGoal ? 'atinge a meta 👍' : 'abaixo da meta'}
        />
        <StatTile icon="calendar-outline" accent={t.colors.neutral} label="Dias decorridos" value={`${d.elapsedDays}`} hint={`de ${d.serviceDays} dias`} />
      </View>

      {/* Gráfico */}
      {a ? (
        <Card>
          <AppText variant="heading">Trajetória</AppText>
          <Divider />
          <TrajectoryChart months={a.months} goalHours={d.effectiveGoalMinutes / 60} />
        </Card>
      ) : null}

      <Button title="+ Registrar atividade" onPress={() => router.push('/registrar')} />
    </Screen>
  );
}
