import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from './Icon';

import { colors, fs, layout, s, text } from '../../theme';

/**
 * Поле ввода по макету:
 *   фон  — #6E94F5 @20%
 *   радиус 20, высота 60, горизонтальный отступ 20
 *   текст — Montserrat Medium 22
 *   плейсхолдер — #6E94F5 @60%
 *
 * Ошибка подсвечивается обводкой #FF0000 @50%
 * (состояние «Пароли не совпадают» в макете Registration).
 */
export const AppInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = false,
  editable = true,
  error = null,
  maxLength,
  rightIcon = null,
  onRightIconPress,
  onPress,
  readOnly = false,
  style,
  inputStyle,
  textContentType,
  returnKeyType,
  onSubmitEditing,
}) => {
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  const showPasswordToggle = secureTextEntry;

  const fieldBody = (
    <View
      style={[
        styles.field,
        error ? styles.fieldError : null,
        !editable ? styles.fieldDisabled : null,
      ]}
    >
      <TextInput
        style={[styles.input, inputStyle]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.primary60}
        secureTextEntry={isSecure}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        editable={editable && !readOnly}
        maxLength={maxLength}
        textContentType={textContentType}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        underlineColorAndroid="transparent"
      />

      {showPasswordToggle ? (
        <Pressable
          onPress={() => setIsSecure((current) => !current)}
          hitSlop={s(12)}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel={isSecure ? 'Показать пароль' : 'Скрыть пароль'}
        >
          <Icon
            name={isSecure ? 'eye' : 'eye-off'}
            size={fs(20)}
            color={colors.primary}
          />
        </Pressable>
      ) : null}

      {!showPasswordToggle && rightIcon ? (
        <Pressable
          onPress={onRightIconPress}
          hitSlop={s(12)}
          disabled={!onRightIconPress}
          style={styles.iconButton}
        >
          {rightIcon}
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      {onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button">
          {fieldBody}
        </Pressable>
      ) : (
        fieldBody
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
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
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fieldError: {
    borderColor: colors.red50,
  },
  fieldDisabled: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    ...text.input,
    padding: 0,
    height: '100%',
  },
  iconButton: {
    marginLeft: s(10),
    width: s(28),
    height: s(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    ...text.caption,
    color: colors.red50,
    marginTop: s(8),
  },
});
