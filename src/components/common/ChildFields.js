import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppInput } from '../ui/AppInput';
import { DatePickerField } from '../ui/DatePickerField';
import { SegmentedControl } from '../ui/SegmentedControl';
import { s, text } from '../../theme';
import { NAME_MAX_LENGTH } from '../../utils/validation';

/**
 * Поля ребёнка: имя, (фамилия), дата рождения, пол.
 * Одна форма для регистрации и для профиля.
 */

const GENDER_OPTIONS = [
  { value: 'male', label: 'Мальчик' },
  { value: 'female', label: 'Девочка' },
];

export const createEmptyChild = () => ({
  firstName: '',
  lastName: '',
  birthDate: '',
  gender: 'male',
});

/**
 * @param {object} props.value данные ребёнка
 * @param {Function} props.onChange (field, value)
 * @param {object} [props.errors] ошибки по полям
 * @param {boolean} [props.withLastName] показывать фамилию
 */
export const ChildFields = ({ value, onChange, errors = {}, withLastName = false }) => (
  <>
    <AppInput
      label="Имя:"
      value={value.firstName}
      onChangeText={(next) => onChange('firstName', next)}
      placeholder="Иван"
      autoCapitalize="words"
      maxLength={NAME_MAX_LENGTH}
      error={errors.firstName}
    />

    {withLastName ? (
      <AppInput
        label="Фамилия:"
        value={value.lastName}
        onChangeText={(next) => onChange('lastName', next)}
        placeholder="Иванов"
        autoCapitalize="words"
        maxLength={NAME_MAX_LENGTH}
      />
    ) : null}

    <DatePickerField
      label="Дата рождения:"
      value={value.birthDate}
      onChange={(next) => onChange('birthDate', next)}
      error={errors.birthDate}
    />

    <View>
      <Text style={styles.label}>Пол</Text>

      <SegmentedControl
        options={GENDER_OPTIONS}
        value={value.gender}
        onChange={(next) => onChange('gender', next)}
      />
    </View>
  </>
);

const styles = StyleSheet.create({
  label: {
    ...text.label,
    marginBottom: s(12),
  },
});
