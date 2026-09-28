import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../ui/AppButton';
import { AppInput } from '../ui/AppInput';
import { BottomSheet } from '../ui/BottomSheet';
import { InlineError } from '../ui/States';
import { ChildFields } from '../common/ChildFields';
import { s, text } from '../../theme';
import { NAME_MAX_LENGTH } from '../../utils/validation';

/**
 * Окна редактирования в профиле: данные родителя и данные ребёнка.
 * Пока идёт сохранение, окно не закрывается.
 */

const FormSheet = ({ visible, title, saveLabel, saving, error, onClose, onSave, children }) => (
  <BottomSheet
    visible={visible}
    onClose={() => !saving && onClose()}
    footer={<AppButton title={saveLabel} onPress={onSave} loading={saving} />}
  >
    <Text style={styles.title}>{title}</Text>

    <View style={styles.form}>
      {children}
      <InlineError message={error} />
    </View>
  </BottomSheet>
);

export const ProfileEditSheet = ({ form, onChange, ...sheet }) => (
  <FormSheet {...sheet} title="Редактировать профиль" saveLabel="Сохранить">
    <AppInput
      label="Имя:"
      value={form.firstName}
      onChangeText={(value) => onChange('firstName', value)}
      placeholder="Владимир"
      autoCapitalize="words"
      maxLength={NAME_MAX_LENGTH}
    />

    <AppInput
      label="Фамилия:"
      value={form.lastName}
      onChangeText={(value) => onChange('lastName', value)}
      placeholder="Иванов"
      autoCapitalize="words"
      maxLength={NAME_MAX_LENGTH}
    />
  </FormSheet>
);

export const ChildEditSheet = ({ form, onChange, isEditing, ...sheet }) => (
  <FormSheet
    {...sheet}
    title={isEditing ? 'Данные ребёнка' : 'Новый ребёнок'}
    saveLabel={isEditing ? 'Сохранить' : 'Добавить ребенка'}
  >
    <ChildFields value={form} onChange={onChange} withLastName />
  </FormSheet>
);

const styles = StyleSheet.create({
  title: {
    ...text.sectionTitle,
    textAlign: 'center',
    marginBottom: s(20),
  },
  form: {
    gap: s(20),
    paddingBottom: s(10),
  },
});
