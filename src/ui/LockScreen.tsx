/**
 * Tela de bloqueio (overlay). Desbloqueio por PIN e, opcionalmente, biometria.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppText, Button } from '@/ui/components/base';
import { useTheme } from '@/ui/theme';
import { useLockStore } from '@/state/useLockStore';
import { useSettingsStore } from '@/state/useSettingsStore';
import { verifyPin } from '@/security/pin';
import { authenticateBiometric, isBiometricAvailable } from '@/security/biometrics';

const PIN_LENGTH = 4;

export function LockScreen() {
  const t = useTheme();
  const unlock = useLockStore((s) => s.unlock);
  const registerFailure = useLockStore((s) => s.registerFailure);
  const lockedUntil = useLockStore((s) => s.lockedUntil);
  const biometricEnabled = useSettingsStore((s) => s.biometricEnabled);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [nowTs, setNowTs] = useState(0);

  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => setNowTs(Date.now());
    const immediate = setTimeout(tick, 0); // sincroniza já, mas de forma assíncrona
    const id = setInterval(tick, 500);
    return () => {
      clearTimeout(immediate);
      clearInterval(id);
    };
  }, [lockedUntil]);

  const remainingMs = lockedUntil ? Math.max(0, lockedUntil - nowTs) : 0;
  const isLockedOut = remainingMs > 0;

  const tryBiometric = async () => {
    if (isLockedOut) return;
    if (!biometricEnabled) return;
    if (!(await isBiometricAvailable())) return;
    const ok = await authenticateBiometric();
    if (ok) unlock();
  };

  useEffect(() => {
    tryBiometric();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const press = async (digit: string) => {
    if (isLockedOut) return;
    setError(false);
    const next = (pin + digit).slice(0, PIN_LENGTH);
    setPin(next);
    if (next.length === PIN_LENGTH) {
      const ok = await verifyPin(next);
      if (ok) {
        setPin('');
        unlock();
      } else {
        setError(true);
        setPin('');
        registerFailure();
      }
    }
  };

  const backspace = () => setPin((p) => p.slice(0, -1));

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '<'];

  return (
    <View
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: t.colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: t.spacing.xl,
        gap: t.spacing.xl,
      }}
    >
      <View style={{ alignItems: 'center', gap: t.spacing.sm }}>
        <AppText variant="title">Horas do Pioneiro</AppText>
        <AppText variant="muted">Digite seu PIN para desbloquear</AppText>
      </View>

      <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              borderWidth: 2,
              borderColor: error ? t.colors.red : t.colors.primary,
              backgroundColor: i < pin.length ? (error ? t.colors.red : t.colors.primary) : 'transparent',
            }}
          />
        ))}
      </View>
      {isLockedOut ? (
        <AppText color={t.colors.red}>
          Muitas tentativas. Aguarde {Math.ceil(remainingMs / 1000)}s.
        </AppText>
      ) : error ? (
        <AppText color={t.colors.red}>PIN incorreto. Tente novamente.</AppText>
      ) : null}

      <View style={{ width: 260, flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.md }}>
        {keys.map((k, idx) =>
          k === '' ? (
            <View key={idx} style={{ width: 72, height: 72 }} />
          ) : (
            <Pressable
              key={idx}
              disabled={isLockedOut}
              accessibilityRole="button"
              accessibilityLabel={k === '<' ? 'Apagar' : `Dígito ${k}`}
              onPress={() => (k === '<' ? backspace() : press(k))}
              style={{
                width: 72, height: 72, borderRadius: 36,
                alignItems: 'center', justifyContent: 'center',
                opacity: isLockedOut ? 0.4 : 1,
                backgroundColor: t.colors.card, borderWidth: 1, borderColor: t.colors.border,
              }}
            >
              <AppText variant="title">{k === '<' ? '⌫' : k}</AppText>
            </Pressable>
          ),
        )}
      </View>

      {biometricEnabled ? (
        <Button title="Usar biometria" variant="ghost" onPress={tryBiometric} style={{ width: 260 }} />
      ) : null}
    </View>
  );
}
