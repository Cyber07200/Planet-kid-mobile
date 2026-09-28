import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon } from './Icon';

import { colors, fs, layout, s, text } from '../../theme';
import { formatDateKey, formatDotDate, parseDateKey } from '../../utils/date';
import { AppButton } from './AppButton';

/**
 * Поле даты рождения ребёнка.
 *
 * Выглядит как обычное поле из макета (иконка календаря справа),
 * но открывает нативный выбор даты — на телефоне это удобнее,
 * чем ручной ввод.
 */
export const DatePickerField = ({
  label,
  value,
  onChange,
  placeholder = '01.01.2016',
  error = null,
  maximumDate = new Date(),
  minimumDate = new Date(1990, 0, 1),
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const [draftDate, setDraftDate] = useState(
    () => parseDateKey(value) ?? new Date(2016, 0, 1),
  );

  const open = () => {
    setDraftDate(parseDateKey(value) ?? new Date(2016, 0, 1));
    setIsOpen(true);
  };

  /*
   * В @react-native-community/datetimepicker 9 колбэк onChange помечен
   * устаревшим: вместо него onValueChange (значение выбрано)
   * и onDismiss (выбор закрыт без результата).
   */
  const handleAndroidValue = (event, selectedDate) => {
    setIsOpen(false);

    if (selectedDate) {
      onChange(formatDateKey(selectedDate));
    }
  };

  const handleIosConfirm = () => {
    onChange(formatDateKey(draftDate));
    setIsOpen(false);
  };

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        onPress={open}
        style={[styles.field, error ? styles.fieldError : null]}
        accessibilityRole="button"
        accessibilityLabel={label || 'Выбрать дату'}
      >
        <Text style={[styles.value, !value ? styles.placeholder : null]}>
          {value ? formatDotDate(value) : placeholder}
        </Text>

        <Icon name="calendar" size={fs(20)} color={colors.primary} />
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isOpen && Platform.OS === 'android' ? (
        <DateTimePicker
          value={parseDateKey(value) ?? new Date(2016, 0, 1)}
          mode="date"
          display="spinner"
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onValueChange={handleAndroidValue}
          onDismiss={() => setIsOpen(false)}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal
          visible={isOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setIsOpen(false)}
            />

            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>{label || 'Дата рождения'}</Text>

              <DateTimePicker
                value={draftDate}
                mode="date"
                display="spinner"
                locale="ru-RU"
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                onValueChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setDraftDate(selectedDate);
                  }
                }}
                style={styles.iosPicker}
              />

              <AppButton title="Готово" onPress={handleIosConfirm} />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    ...text.label,
    marginBottom: s(12),
  },
  field: {
    height: layout.input,
    borderRadius: layout.radius.md,
    backgroundColor: colors.primary20,
    paddingHorizontal: s(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fieldError: {
    borderColor: colors.red50,
  },
  value: {
    ...text.input,
    flex: 1,
  },
  placeholder: {
    color: colors.primary60,
  },
  error: {
    ...text.caption,
    color: colors.red50,
    marginTop: s(8),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: layout.radius.lg,
    borderTopRightRadius: layout.radius.lg,
    padding: layout.gutter,
    paddingBottom: s(34),
    gap: s(10),
  },
  modalTitle: {
    ...text.sectionTitle,
    textAlign: 'center',
  },
  iosPicker: {
    alignSelf: 'stretch',
  },
});
