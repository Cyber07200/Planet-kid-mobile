import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fs, layout, s, text } from '../../theme';

/**
 * Ввод кода из смс.
 *
 * По макету: 6 ячеек 52x60, радиус 10, фон #6E94F5 @20%,
 * цифра — Comfortaa Medium 32 цветом #6E94F5.
 *
 * Реализовано одним скрытым TextInput поверх ячеек:
 * так корректно работает автоподстановка кода из смс
 * и не «прыгает» фокус между полями.
 */
export const OtpInput = ({
  value,
  onChangeText,
  length = 6,
  autoFocus = true,
  error = false,
  onComplete,
}) => {
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (value.length === length && onComplete) {
      onComplete(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, length]);

  const handleChange = (raw) => {
    const digits = String(raw || '')
      .replace(/\D/g, '')
      .slice(0, length);

    onChangeText(digits);
  };

  const cells = Array.from({ length });

  return (
    <Pressable
      style={styles.container}
      onPress={() => inputRef.current?.focus()}
      accessibilityRole="none"
    >
      {cells.map((_, index) => {
        const char = value[index] ?? '';

        const isActive = isFocused && index === Math.min(value.length, length - 1);

        return (
          <View
            key={index}
            style={[
              styles.cell,
              /* В макете заполненная ячейка обведена основным цветом */
              char || isActive ? styles.cellActive : null,
              error ? styles.cellError : null,
            ]}
          >
            <Text style={styles.cellText}>{char}</Text>
          </View>
        );
      })}

      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        autoFocus={autoFocus}
        maxLength={length}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        caretHidden
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: s(8),
  },
  cell: {
    flex: 1,
    maxWidth: s(58),
    height: s(60),
    borderRadius: layout.radius.sm,
    backgroundColor: colors.primary20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cellActive: {
    borderColor: colors.primary,
  },
  cellError: {
    borderColor: colors.red50,
  },
  cellText: {
    fontFamily: text.cardTitle.fontFamily,
    fontSize: fs(32),
    color: colors.primary,
    lineHeight: fs(32) * 1.1,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    fontSize: 1,
  },
});
