/**
 * Desbloqueio por biometria (Face ID / Touch ID / impressão digital).
 * Sempre há o PIN como alternativa.
 */
import * as LocalAuthentication from 'expo-local-authentication';

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && enrolled;
}

export async function authenticateBiometric(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Desbloquear Horas do Pioneiro',
    cancelLabel: 'Usar PIN',
    disableDeviceFallback: true,
  });
  return result.success;
}
