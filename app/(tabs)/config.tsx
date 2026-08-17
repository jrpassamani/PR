/**
 * CONFIGURAÇÕES — meta, tema, histórico multi-ano, segurança e backup.
 */
import React, { useState } from 'react';
import { Alert, Modal, Switch, TextInput, View } from 'react-native';
import { AppText, Button, Card, Divider, Row, Screen } from '@/ui/components/base';
import { Chip } from '@/ui/components/indicators';
import { useTheme } from '@/ui/theme';
import { useSettingsStore, type ThemePref } from '@/state/useSettingsStore';
import { useServiceYearStore } from '@/state/useServiceYearStore';
import { useActivityStore } from '@/state/useActivityStore';
import { useLockStore } from '@/state/useLockStore';
import { setPin as savePin } from '@/security/pin';
import { isBiometricAvailable } from '@/security/biometrics';
import { exportActivitiesCsv, exportEncryptedBackup, importEncryptedBackup } from '@/data/backup';
import { visibleServiceYears } from '@/domain/serviceYears';
import { formatIsoBr } from '@/utils/format';

const MIN_BACKUP_PASSWORD = 6;

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

  // Fluxo de senha do backup (independente do PIN).
  const [backupMode, setBackupMode] = useState<'export' | 'import' | null>(null);
  const [backupPwd, setBackupPwd] = useState('');
  const [busy, setBusy] = useState(false);

  const shownYears = visibleServiceYears(years, s.keepHistory);

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

  const openBackup = (mode: 'export' | 'import') => {
    setBackupPwd('');
    setBackupMode(mode);
  };

  const confirmBackup = async () => {
    if (backupPwd.length < MIN_BACKUP_PASSWORD) {
      return Alert.alert('Senha', `A senha do backup deve ter ao menos ${MIN_BACKUP_PASSWORD} caracteres.`);
    }
    const mode = backupMode;
    const pwd = backupPwd;
    setBusy(true);
    try {
      if (mode === 'export') {
        await exportEncryptedBackup(pwd);
        setBackupMode(null);
        setBackupPwd('');
      } else {
        const res = await importEncryptedBackup(pwd);
        setBackupMode(null);
        setBackupPwd('');
        if (!res) return; // usuário cancelou o seletor
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
        const y = res.years;
        const a = res.activities;
        Alert.alert(
          'Importação concluída',
          `Anos: ${y.inserted} novo(s), ${y.ignored} já existente(s), ${y.rejected} rejeitado(s).\n` +
            `Atividades: ${a.inserted} nova(s), ${a.ignored} já existente(s), ${a.rejected} rejeitada(s).`,
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha na operação de backup.';
      Alert.alert('Erro', msg);
    } finally {
      setBusy(false);
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
            <AppText variant="muted">Mostra e permite consultar/reativar anos passados. Desligado, só o ano atual aparece (os dados não são apagados).</AppText>
          </View>
          <Switch value={s.keepHistory} onValueChange={s.setKeepHistory} />
        </Row>
        {shownYears.length > 1 ? (
          <>
            <Divider />
            <AppText variant="label">Trocar ano ativo</AppText>
            {shownYears.map((y) => (
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
        <AppText variant="muted">O backup JSON é criptografado com uma senha própria (não é o seu PIN). Guarde a senha: sem ela o backup não pode ser restaurado.</AppText>
        <Button title="Exportar backup (cifrado)" onPress={() => openBackup('export')} variant="secondary" />
        <Button title="Importar backup (cifrado)" onPress={() => openBackup('import')} variant="ghost" />
        <Divider />
        <AppText variant="muted">O CSV é texto simples (para planilha).</AppText>
        <Button title="Exportar atividades (CSV)" onPress={() => exportActivitiesCsv().catch(() => Alert.alert('Erro', 'Falha ao exportar.'))} variant="ghost" />
      </Card>

      {/* Modal de senha do backup */}
      <Modal visible={backupMode !== null} transparent animationType="fade" onRequestClose={() => !busy && setBackupMode(null)}>
        <View style={{ flex: 1, backgroundColor: '#0009', alignItems: 'center', justifyContent: 'center', padding: t.spacing.xl }}>
          <Card style={{ width: '100%', maxWidth: 420, gap: t.spacing.md }}>
            <AppText variant="heading">
              {backupMode === 'export' ? 'Senha do novo backup' : 'Senha do backup'}
            </AppText>
            <AppText variant="muted">
              {backupMode === 'export'
                ? 'Escolha uma senha forte para cifrar o arquivo. Você precisará dela para restaurar.'
                : 'Digite a senha usada quando este backup foi criado.'}
            </AppText>
            <TextInput
              style={input}
              secureTextEntry
              autoFocus
              placeholder={`Senha (mín. ${MIN_BACKUP_PASSWORD})`}
              placeholderTextColor={t.colors.textMuted}
              value={backupPwd}
              onChangeText={setBackupPwd}
              editable={!busy}
            />
            <Row style={{ justifyContent: 'flex-end' }}>
              <Button title="Cancelar" variant="ghost" disabled={busy} onPress={() => { setBackupMode(null); setBackupPwd(''); }} />
              <View style={{ width: t.spacing.md }} />
              <Button
                title={busy ? 'Processando…' : backupMode === 'export' ? 'Exportar' : 'Importar'}
                variant="secondary"
                disabled={busy}
                loading={busy}
                onPress={confirmBackup}
              />
            </Row>
          </Card>
        </View>
      </Modal>

      <Card>
        <AppText variant="heading">Sobre</AppText>
        <AppText variant="muted">Horas do Pioneiro · v1.0.0 · dados 100% locais.</AppText>
      </Card>

      <View style={{ height: t.spacing.xl }} />
    </Screen>
  );
}
