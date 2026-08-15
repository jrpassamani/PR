/**
 * Edição de atividade (modal). Alterar categoria, duração, data (recalcula) ou
 * excluir. Editar a data para outro mês é permitido (R9/R11).
 */
import React, { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppText, Button, Card, Screen } from '@/ui/components/base';
import { CategorySelect } from '@/ui/components/CategorySelect';
import { DurationField } from '@/ui/components/DurationField';
import { DateField } from '@/ui/components/DateField';
import { useTheme } from '@/ui/theme';
import type { CategoryKey } from '@/domain/types';
import { useActivityStore } from '@/state/useActivityStore';
import { formatIsoBr } from '@/utils/format';

export default function EditActivity() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const items = useActivityStore((s) => s.items);
  const edit = useActivityStore((s) => s.edit);
  const remove = useActivityStore((s) => s.remove);

  const activity = items.find((a) => a.id === id);

  const [category, setCategory] = useState<CategoryKey>(activity?.category ?? 'pregacao');
  const [minutes, setMinutes] = useState(activity?.durationMinutes ?? 60);
  const [date, setDate] = useState(activity?.activityDate ?? '');
  const [note, setNote] = useState(activity?.note ?? '');
  const [saving, setSaving] = useState(false);

  if (!activity) {
    return (
      <Screen>
        <Card>
          <AppText variant="heading">Atividade não encontrada</AppText>
          <Button title="Voltar" variant="ghost" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  const save = async () => {
    if (minutes <= 0) return Alert.alert('Duração', 'Informe uma duração maior que zero.');
    setSaving(true);
    try {
      await edit(activity.id, {
        category,
        durationMinutes: minutes,
        activityDate: date,
        note: note.trim() || null,
      });
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Erro', 'Não foi possível salvar.');
    }
  };

  const confirmDelete = () => {
    Alert.alert('Excluir', 'Deseja excluir esta atividade?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await remove(activity.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen>
      <AppText variant="muted">Lançado em {formatIsoBr(activity.createdAt.slice(0, 10))}</AppText>
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
      </Card>
      <Card>
        <AppText variant="label">Observação</AppText>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          placeholderTextColor={t.colors.textMuted}
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
      <Button title="Salvar alterações" onPress={save} loading={saving} />
      <Button title="Excluir atividade" variant="danger" onPress={confirmDelete} />
      <View style={{ height: t.spacing.xl }} />
    </Screen>
  );
}
