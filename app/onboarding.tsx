/**
 * Onboarding (1ª execução): início do serviço, meta, segurança (PIN/biometria).
 * Ao concluir, cria o Ano de Serviço e libera o app.
 */
import React, { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { AppText, Button, Card, Row, Screen } from '@/ui/components/base';
import { Chip } from '@/ui/components/indicators';
import { DateField } from '@/ui/components/DateField';
import { useTheme } from '@/ui/theme';
import { serviceYearBoundsFor } from '@/utils/datecore';
import { todayIso } from '@/utils/today';
import { formatIsoBr } from '@/utils/format';
import { useServiceYearStore } from '@/state/useServiceYearStore';
import { useActivityStore } from '@/state/useActivityStore';
import { useSettingsStore } from '@/state/useSettingsStore';
import { useLockStore } from '@/state/useLockStore';
import { setPin as savePin } from '@/security/pin';
import { isBiometricAvailable } from '@/security/biometrics';

export default function Onboarding() {
  const t = useTheme();
  const bounds = serviceYearBoundsFor(todayIso());

  const [startDate, setStartDate] = useState(bounds.startDate);
  const [goal, setGoal] = useState('600');
  const [monthly, setMonthly] = useState('50');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [saving, setSaving] = useState(false);

  const createForStart = useServiceYearStore((s) => s.createForStart);
  const setOnboarded = useSettingsStore((s) => s.setOnboarded);
  const setBiometricEnabled = useSettingsStore((s) => s.setBiometricEnabled);
  const setHasPin = useLockStore((s) => s.setHasPin);

  const isProrated = startDate > bounds.startDate;

  const finish = async () => {
    const goalNum = Math.max(1, Number(goal) || 600);
    const monthlyNum = Math.max(1, Number(monthly) || 50);

    if (pin.length > 0) {
      if (pin.length !== 4) return Alert.alert('PIN', 'O PIN deve ter 4 dígitos.');
      if (pin !== pin2) return Alert.alert('PIN', 'Os PINs não coincidem.');
    }

    setSaving(true);
    try {
      const year = await createForStart(startDate, goalNum, monthlyNum);
      await useActivityStore.getState().load(year.id);

      if (pin.length === 4) {
        await savePin(pin);
        setHasPin(true);
        const bioAvailable = await isBiometricAvailable();
        if (bioAvailable) await setBiometricEnabled(true);
      }
      await setOnboarded(true);
      // O gate no _layout redireciona para a Home.
    } catch (e) {
      setSaving(false);
      Alert.alert('Erro', 'Não foi possível concluir a configuração.');
    }
  };

  const inputStyle = {
    backgroundColor: t.colors.card,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.md,
    color: t.colors.text,
    fontSize: t.fontSize.lg,
  } as const;

  return (
    <Screen>
      <View style={{ gap: t.spacing.xs, marginTop: t.spacing.lg }}>
        <AppText variant="title">Bem-vindo 👋</AppText>
        <AppText variant="muted">
          Vamos configurar seu Ano de Serviço ({formatIsoBr(bounds.startDate)} a {formatIsoBr(bounds.endDate)}).
        </AppText>
      </View>

      <Card>
        <AppText variant="heading">Início do serviço neste ano</AppText>
        <AppText variant="muted">
          Se você é pioneiro desde o começo do ano, mantenha 01/09. Se começou depois, a meta é
          ajustada proporcionalmente.
        </AppText>
        <Row style={{ flexWrap: 'wrap' }}>
          <Chip label="Desde 01/09" selected={startDate === bounds.startDate} onPress={() => setStartDate(bounds.startDate)} />
          <Chip label="Comecei depois" selected={isProrated} onPress={() => setStartDate(todayIso())} />
        </Row>
        {isProrated ? <DateField value={startDate} onChange={setStartDate} label="Data de início" /> : null}
      </Card>

      <Card>
        <AppText variant="heading">Meta</AppText>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <AppText variant="label">Meta anual (horas)</AppText>
            <TextInput style={inputStyle} keyboardType="number-pad" value={goal} onChangeText={setGoal} maxLength={4} />
          </View>
          <View style={{ width: t.spacing.md }} />
          <View style={{ flex: 1 }}>
            <AppText variant="label">Referência mensal</AppText>
            <TextInput style={inputStyle} keyboardType="number-pad" value={monthly} onChangeText={setMonthly} maxLength={3} />
          </View>
        </Row>
        <AppText variant="muted">A referência mensal é apenas uma régua de ritmo, não uma obrigação.</AppText>
      </Card>

      <Card>
        <AppText variant="heading">Segurança (opcional)</AppText>
        <AppText variant="muted">Defina um PIN de 4 dígitos para proteger seus dados. Se o aparelho tiver biometria, ela também será ativada.</AppText>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <AppText variant="label">PIN</AppText>
            <TextInput style={inputStyle} keyboardType="number-pad" secureTextEntry value={pin} onChangeText={setPin} maxLength={4} />
          </View>
          <View style={{ width: t.spacing.md }} />
          <View style={{ flex: 1 }}>
            <AppText variant="label">Confirmar</AppText>
            <TextInput style={inputStyle} keyboardType="number-pad" secureTextEntry value={pin2} onChangeText={setPin2} maxLength={4} />
          </View>
        </Row>
      </Card>

      <Button title="Concluir e começar" onPress={finish} loading={saving} />
    </Screen>
  );
}
