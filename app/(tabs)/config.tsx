/**
 * CONFIGURAÇÕES — meta, tema, histórico multi-ano, segurança e backup.
 */
import React, { useState } from 'react';
import { Alert, Switch, TextInput, View } from 'react-native';
import { AppText, Button, Card, Divider, Row, Screen } from '@/ui/components/base';
import { Chip } from '@/ui/components/indicators';
import { useTheme } from '@/ui/theme';
import { useSettingsStore, type ThemePref } from '@/state/useSettingsStore';
import { useServiceYearStore } from '@/state/useServiceYearStore';
import { useActivityStore } from '@/state/useActivityStore';
import { useLockStore } from '@/state/useLockStore';
import { setPin as savePin } from '@/security/pin';
import { isBiometricAvailable } from '@/security/biometrics';
import { exportActivitiesCsv, exportBackupJson, importBackupJson } from '@/data/backup';
import { formatIsoBr } from '@/utils/format';

const THEME_OPTIONS: { key: ThemePref; label: string }[] = [
  { key: 'system', label: 'Sistema' },
  { key: 'light', label: 'Claro' },
  { key: 'dark', label: 'Escuro' },
];
const TIMEOUTS = [
  { v: 0, label: 'Imediato' },
  { v: 30, label: '30s' },
  { v: 60, label: '1min' },
  { v: 300, label: '5min' },
];

export default function Config() {
  const t = useTheme();
  const s = useSettingsStore();
  const active = useServiceYearStore((st) => st.active);
  const years = useServiceYearStore((st) => st.all);
  const updateConfig = useServiceYearStore((st) => st.updateConfig);
  const setActiveYear = useServiceYearStore((st) => st.setActive);
  const setHasPin = useLockStore((st) => st.setHasPin);
  const hasPin = useLockStore((st) => st.hasPin);

  const [goal, setGoal] = useState(String(active?.goalHours ?? 600));
  const [monthly, setMonthly] = useState(String(active?.monthlyReference ?? 50));
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [showPin, setShowPin] = useState(false);

  const input = {
    backgroundColor: t.colors.card,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.md,
    color: t.colors.text,
    fontSize: t.fontSize.lg,
  } as const;

  const saveMeta = async () => {
    if (!active) return;
    await updateConfig(active.id, {
      goalHours: Math.max(1, Number(goal) || 600),
      monthlyReference: Math.max(1, Number(monthly) || 50),
    });
    Alert.alert('Salvo', 'Meta atualizada.');
  };

  const toggleBiometric = async (v: boolean) => {
    if (v && !(await isBiometricAvailable())) {
      return Alert.alert('Biometria', 'Nenhuma biometria cadastrada no aparelho.');
    }
    await s.setBiometricEnabled(v);
  };

  const savePinFlow = async () => {
    if (pin.length !== 4) return Alert.alert('PIN', 'O PIN deve ter 4 dígitos.');
    if (pin !== pin2) return Alert.alert('PIN', 'Os PINs não coincidem.');
    await savePin(pin);
    setHasPin(true);
    setPin('');
    setPin2('');
    setShowPin(false);
    Alert.alert('PIN', 'PIN atualizado.');
  };

  const doImport = async () => {
    try {
      const res = await importBackupJson();
      if (!res) return;
      await useServiceYearStore.getState().load();
      let act = useServiceYearStore.getState().active;
      // Backups importados chegam inativos; se nenhum ficou ativo, ativa o mais recente.
      if (!act) {
        const all = useServiceYearStore.getState().all;
        if (all.length > 0) {
          await useServiceYearStore.getState().setActive(all[0].id);
          act = useServiceYearStore.getState().active;
        }
      }
      if (act) await useActivityStore.getState().load(act.id);
      Alert.alert('Importado', `${res.years} ano(s) e ${res.activities} atividade(s).`);
    } catch (e) {
      Alert.alert('Erro', 'Arquivo inválido ou não foi possível importar.');
    }
  };

  return (
    <Screen>
      <AppText variant="title">Configurações</AppText>

      {/* Meta */}
      <Card>
        <AppText variant="heading">Meta e referência</AppText>
        {active ? <AppText variant="muted">Ano ativo: {formatIsoBr(active.startDate)} – {formatIsoBr(active.endDate)}</AppText> : null}
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <AppText variant="label">Meta anual (h)</AppText>
            <TextInput style={input} keyboardType="number-pad" value={goal} onChangeText={setGoal} maxLength={4} />
          </View>
          <View style={{ width: t.spacing.md }} />
          <View style={{ flex: 1 }}>
            <AppText variant="label">Referência mensal</AppText>
            <TextInput style={input} keyboardType="number-pad" value={monthly} onChangeText={setMonthly} maxLength={3} />
          </View>
        </Row>
        <Button title="Salvar meta" onPress={saveMeta} variant="secondary" />
      </Card>

      {/* Aparência */}
      <Card>
        <AppText variant="heading">Aparência</AppText>
        <Row style={{ flexWrap: 'wrap' }}>
          {THEME_OPTIONS.map((o) => (
            <Chip key={o.key} label={o.label} selected={s.theme === o.key} onPress={() => s.setTheme(o.key)} />
          ))}
        </Row>
      </Card>

      {/* Dados / histórico */}
      <Card>
        <AppText variant="heading">Histórico</AppText>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <AppText>Manter anos anteriores</AppText>
            <AppText variant="muted">Arquiva e permite consultar anos passados.</AppText>
          </View>
          <Switch value={s.keepHistory} onValueChange={s.setKeepHistory} />
        </Row>
        {years.length > 1 ? (
          <>
            <Divider />
            <AppText variant="label">Trocar ano ativo</AppText>
            {years.map((y) => (
              <Row key={y.id} style={{ justifyContent: 'space-between' }}>
                <AppText>{formatIsoBr(y.startDate)} – {formatIsoBr(y.endDate)}</AppText>
                {y.isActive ? (
                  <AppText variant="label" color={t.colors.primary}>ativo</AppText>
                ) : (
                  <Chip label="Ativar" selected={false} onPress={async () => {
                    await setActiveYear(y.id);
                    await useActivityStore.getState().load(y.id);
                  }} />
                )}
              </Row>
            ))}
          </>
        ) : null}
      </Card>

      {/* Segurança */}
      <Card>
        <AppText variant="heading">Segurança</AppText>
        <Row style={{ justifyContent: 'space-between' }}>
          <AppText>Biometria</AppText>
          <Switch value={s.biometricEnabled} onValueChange={toggleBiometric} />
        </Row>
        <Divider />
        <AppText variant="label">Bloqueio automático após</AppText>
        <Row style={{ flexWrap: 'wrap' }}>
          {TIMEOUTS.map((o) => (
            <Chip key={o.v} label={o.label} selected={s.lockTimeoutSec === o.v} onPress={() => s.setLockTimeoutSec(o.v)} />
          ))}
        </Row>
        <Divider />
        {showPin ? (
          <View style={{ gap: t.spacing.sm }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <AppText variant="label">Novo PIN</AppText>
                <TextInput style={input} keyboardType="number-pad" secureTextEntry value={pin} onChangeText={setPin} maxLength={4} />
              </View>
              <View style={{ width: t.spacing.md }} />
              <View style={{ flex: 1 }}>
                <AppText variant="label">Confirmar</AppText>
                <TextInput style={input} keyboardType="number-pad" secureTextEntry value={pin2} onChangeText={setPin2} maxLength={4} />
              </View>
            </Row>
            <Button title="Salvar PIN" onPress={savePinFlow} variant="secondary" />
          </View>
        ) : (
          <Button title={hasPin ? 'Alterar PIN' : 'Definir PIN'} onPress={() => setShowPin(true)} variant="ghost" />
        )}
      </Card>

      {/* Backup */}
      <Card>
        <AppText variant="heading">Backup</AppText>
        <AppText variant="muted">O arquivo exportado não é criptografado. Guarde em local seguro.</AppText>
        <Button title="Exportar backup (JSON)" onPress={() => exportBackupJson().catch(() => Alert.alert('Erro', 'Falha ao exportar.'))} variant="secondary" />
        <Button title="Exportar atividades (CSV)" onPress={() => exportActivitiesCsv().catch(() => Alert.alert('Erro', 'Falha ao exportar.'))} variant="ghost" />
        <Button title="Importar backup (JSON)" onPress={doImport} variant="ghost" />
      </Card>

      <Card>
        <AppText variant="heading">Sobre</AppText>
        <AppText variant="muted">Horas do Pioneiro · v1.0.0 · dados 100% locais.</AppText>
      </Card>

      <View style={{ height: t.spacing.xl }} />
    </Screen>
  );
}
