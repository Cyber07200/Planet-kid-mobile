import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../ui/Icon';
import { BottomSheet } from '../ui/BottomSheet';
import { colors, fs, layout, s, text } from '../../theme';
import { countActiveFilters } from '../../utils/filters';

/**
 * Фильтры направлений.
 *
 * Ряд «таблеток» под заголовком: на каждой написано, что выбрано.
 * Нажатие открывает список вариантов снизу — так удобнее на телефоне,
 * чем выпадающие меню. Включённый фильтр залит основным цветом,
 * рядом появляется кнопка сброса.
 *
 * Компонент ничего не знает про данные: ему передают готовые
 * наборы вариантов и текущее значение.
 */
export const DirectionFilters = ({ groups, values, onChange, onReset }) => {
  /* Какой фильтр сейчас открыт; null — все закрыты */
  const [openKey, setOpenKey] = useState(null);

  const activeCount = countActiveFilters(values);

  const openGroup = groups.find((group) => group.key === openKey) ?? null;

  /* Выбор варианта: применяем и сразу закрываем список */
  const select = (key, value) => {
    onChange({ ...values, [key]: value });
    setOpenKey(null);
  };

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {groups.map((group) => {
          const isActive = values[group.key] !== 'all';

          /* На таблетке пишем выбранный вариант, иначе — название фильтра */
          const selected = group.options.find(
            (option) => option.value === values[group.key],
          );

          const label = isActive ? selected?.label ?? group.title : group.title;

          return (
            <Pressable
              key={group.key}
              onPress={() => setOpenKey(group.key)}
              style={({ pressed }) => [
                styles.chip,
                isActive ? styles.chipActive : null,
                pressed ? styles.pressed : null,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[styles.chipLabel, isActive ? styles.chipLabelActive : null]}
                numberOfLines={1}
              >
                {label}
              </Text>

              <Icon
                name="chevron-down"
                size={fs(16)}
                color={isActive ? colors.white : colors.text60}
              />
            </Pressable>
          );
        })}

        {/* Сброс появляется только когда есть что сбрасывать */}
        {activeCount > 0 ? (
          <Pressable
            onPress={onReset}
            style={({ pressed }) => [styles.reset, pressed ? styles.pressed : null]}
            accessibilityRole="button"
          >
            <Icon name="x" size={fs(14)} color={colors.redAlert} />
            <Text style={styles.resetLabel}>Сбросить</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* Список вариантов выбранного фильтра */}
      <BottomSheet
        visible={Boolean(openGroup)}
        onClose={() => setOpenKey(null)}
        scrollable={false}
      >
        <Text style={styles.sheetTitle}>{openGroup?.title}</Text>

        <View style={styles.options}>
          {(openGroup?.options ?? []).map((option) => {
            const isSelected = values[openGroup.key] === option.value;

            return (
              <Pressable
                key={String(option.value)}
                onPress={() => select(openGroup.key, option.value)}
                style={({ pressed }) => [
                  styles.option,
                  isSelected ? styles.optionSelected : null,
                  pressed ? styles.pressed : null,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    isSelected ? styles.optionLabelSelected : null,
                  ]}
                >
                  {option.label}
                </Text>

                {isSelected ? (
                  <Icon name="check" size={fs(20)} color={colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: s(10),
    paddingHorizontal: layout.gutter,
    paddingVertical: s(4),
  },
  /* Таблетка фильтра: высота 38, радиус 20 */
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    height: s(38),
    paddingHorizontal: s(16),
    borderRadius: layout.radius.md,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipLabel: {
    ...text.caption,
    color: colors.text80,
  },
  chipLabelActive: {
    color: colors.white,
  },
  reset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    height: s(38),
    paddingHorizontal: s(16),
    borderRadius: layout.radius.md,
    backgroundColor: 'rgba(255, 87, 58, 0.12)',
  },
  resetLabel: {
    ...text.caption,
    color: colors.redAlert,
  },
  sheetTitle: {
    ...text.sectionTitle,
    textAlign: 'center',
    marginBottom: s(20),
  },
  options: {
    gap: s(10),
    paddingBottom: s(10),
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
    minHeight: s(52),
    paddingHorizontal: s(20),
    borderRadius: layout.radius.md,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    backgroundColor: colors.primary10,
  },
  optionLabel: {
    ...text.cardTitle,
    color: colors.text80,
    flexShrink: 1,
  },
  optionLabelSelected: {
    color: colors.primary,
  },
  pressed: {
    opacity: 0.85,
  },
});
