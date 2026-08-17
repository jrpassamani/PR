/**
 * Layout raiz: inicializa o app (banco cifrado, settings, ano ativo),
 * controla onboarding, bloqueio (PIN/biometria) e auto-lock por inatividade.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ScreenCapture from 'expo-screen-capture';

import { getRepositories } from '@/data';
import { useSettingsStore } from '@/state/useSettingsStore';
import { useServiceYearStore } from '@/state/useServiceYearStore';
import { useActivityStore } from '@/state/useActivityStore';
import { useLockStore } from '@/state/useLockStore';
import { hasPin as checkHasPin } from '@/security/pin';
import { useTheme } from '@/ui/theme';
import { LockScreen } from '@/ui/LockScreen';

function useBootstrap(): boolean {
  const [ready, setReady] = useState(false);
  const loadSettings = useSettingsStore((s) => s.load);
  const loadYears = useServiceYearStore((s) => s.load);
  const setHasPin = useLockStore((s) => s.setHasPin);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await getRepositories(); // abre o banco cifrado + migrações
        await loadSettings();
        await loadYears();
        const active = useServiceYearStore.getState().active;
        if (active) await useActivityStore.getState().load(active.id);
        const pin = await checkHasPin();
        setHasPin(pin);
        if (pin) {
          await useLockStore.getState().hydrateLockout(); // restaura lockout persistido
          useLockStore.getState().lock(); // inicia bloqueado
        }
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ready;
}

function useAuthRedirect(ready: boolean) {
  const onboarded = useSettingsStore((s) => s.onboarded);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!onboarded && !inOnboarding) router.replace('/onboarding');
    else if (onboarded && inOnboarding) router.replace('/');
  }, [ready, onboarded, segments, router]);
}

/**
 * Proteção de conteúdo sensível (Fase 5, SEC-06): quando o usuário adota PIN,
 * ativa FLAG_SECURE (Android) via expo-screen-capture — bloqueia screenshots e
 * oculta o preview do app na tela de "recentes". Não afeta export/compartilhar.
 */
function useScreenCaptureGuard(hasPin: boolean) {
  useEffect(() => {
    const tag = 'pioneiro-sensitive';
    if (hasPin) {
      ScreenCapture.preventScreenCaptureAsync(tag).catch(() => {});
    } else {
      ScreenCapture.allowScreenCaptureAsync(tag).catch(() => {});
    }
    return () => {
      ScreenCapture.allowScreenCaptureAsync(tag).catch(() => {});
    };
  }, [hasPin]);
}

function useAutoLock() {
  const lockTimeoutSec = useSettingsStore((s) => s.lockTimeoutSec);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        useLockStore.getState().markBackground();
      } else if (state === 'active') {
        useLockStore.getState().resumeFromBackground(lockTimeoutSec);
      }
    });
    return () => sub.remove();
  }, [lockTimeoutSec]);
}

export default function RootLayout() {
  const t = useTheme();
  const ready = useBootstrap();
  useAuthRedirect(ready);
  useAutoLock();

  const locked = useLockStore((s) => s.locked);
  const hasPin = useLockStore((s) => s.hasPin);
  useScreenCaptureGuard(hasPin);

  return (
    <SafeAreaProvider>
      <StatusBar style={t.isDark ? 'light' : 'dark'} />
      {!ready ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.bg }}>
          <ActivityIndicator color={t.colors.primary} size="large" />
        </View>
      ) : (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen
            name="activity/[id]"
            options={{ presentation: 'modal', headerShown: true, title: 'Editar atividade' }}
          />
        </Stack>
      )}
      {ready && hasPin && locked ? <LockScreen /> : null}
    </SafeAreaProvider>
  );
}
