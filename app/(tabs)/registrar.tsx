/**
 * REGISTRAR — lançamento rápido (poucos toques). Categoria, duração H:MM,
 * data (retroativo permitido; futuro bloqueado) e observação opcional.
 */
import React, { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText, Button, Card, Row, Screen } from '@/ui/components/base';
import { Chip } from '@/ui/components/indicators';
import { CategorySelect } from '@/ui/components/CategorySelect';
import { DurationField } from '@/ui/components/DurationField';
import { DateField } from '@/ui/components/DateField';
import { useTheme } from '@/ui/theme';
import type { CategoryKey } from '@/domain/types';
import { useActivityStore } from '@/state/useActivityStore';
import { todayIso } from '@/utils/today';
import { addDays } from '@/utils/datecore';
import { formatHM } from '@/utils/duration';
import { formatIsoBrShort } from '@/utils/format';

export default function Registrar() {
  const t = useTheme();
  const router = useRouter();
  const add = useActivityStore((s) => s.add);

  const [category, setCategory] = useState<CategoryKey>('pregacao');
  const [minutes, setMinutes] = useState(60);
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (minutes <= 0) return Alert.alert('Duração', 'Informe uma duração maior que zero.');
    setSaving(true);
    try {
      await add({ category, activityDate: date, durationMinutes: minutes, note: note.trim() || null });
      Alert.alert('Registrado', `${formatHM(minutes)} em ${formatIsoBrShort(date)}.`);
      // Reset mínimo (mantém a categoria para lançamentos em sequência).
      setMinutes(60);
      setNote('');
      setDate(todayIso());
      router.push('/');
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar a atividade.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <AppText variant="title">Registrar</AppText>

      <Card>
        <AppText variant="label">Atividade</AppText>
        <CategorySelect value={category} onChange={setCategory} />
      </Card>

      <Card>
        <AppText variant="label">Duração</AppText>
        <DurationField minutes={minutes} onChange={setMinutes} />
      </Card>

      <Card>
        <DateField value={date} onChange={setDate} />
        <Row style={{ flexWrap: 'wrap' }}>
          <Chip label="Hoje" selected={date === todayIso()} onPress={() => setDate(todayIso())} />
          <Chip label="Ontem" selected={date === addDays(todayIso(), -1)} onPress={() => setDate(addDays(todayIso(), -1))} />
        </Row>
      </Card>

      <Card>
        <AppText variant="label">Observação (opcional)</AppText>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Ex.: revisita, território X..."
          placeholderTextColor={t.colors.textMuted}
          multiline
          style={{
            backgroundColor: t.colors.card,
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: t.colors.border,
            padding: t.spacing.md,
            color: t.colors.text,
            minHeight: 64,
            textAlignVertical: 'top',
          }}
        />
      </Card>

      <Button title="Salvar atividade" onPress={save} loading={saving} />
      <View style={{ height: t.spacing.xl }} />
    </Screen>
  );
}
