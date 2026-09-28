import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fs, gradients, layout, s, text } from '../../theme';

/**
 * Кнопка из макета.
 *
 * Варианты соответствуют состояниям в Figma:
 *  primary   — сплошная #6E94F5, радиус 20, высота 60
 *  soft      — #6E94F5 @50% (вторичное действие, «Добавить ребенка»)
 *  danger    — #FF0000 @50% («Выйти из аккаунта»)
 *  ghost     — прозрачная с текстом основного цвета
 *  gradient  — градиент #6E94F5 → #82A8FF
 */
export const AppButton = ({
  title,
  subtitle,
  onPress,
  variant = 'primary',
  size = 'large',
  loading = false,
  /* Подпись во время загрузки: «Записываем...» */
  loadingTitle = null,
  disabled = false,
  icon = null,
  iconRight = null,
  style,
  textStyle,
  fullWidth = true,
}) => {
  const isDisabled = disabled || loading;

  const height = size === 'small' ? layout.buttonSmall : layout.button;

  const labelStyle = size === 'small' ? text.buttonSmall : text.button;

  const palette = {
    primary: { background: colors.primary, color: colors.white },
    soft: { background: colors.primary50, color: colors.white },
    danger: { background: colors.red50, color: colors.white },
    ghost: { background: 'transparent', color: colors.primary },
    outline: { background: colors.primary10, color: colors.primary },
    dark: { background: colors.text, color: colors.white },
  }[variant] ?? { background: colors.primary, color: colors.white };

  const body = (
    <>
      {loading ? (
        /* Во время запроса показываем спиннер и, если задан, текст «Записываем...» */
        <View style={styles.row}>
          <ActivityIndicator color={palette.color} />

          {loadingTitle ? (
            <Text style={[labelStyle, { color: palette.color }, textStyle]}>
              {loadingTitle}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.row}>
          {icon ? <View style={styles.iconLeft}>{icon}</View> : null}

          <View style={styles.labels}>
            <Text
              style={[labelStyle, { color: palette.color }, textStyle]}
              numberOfLines={1}
            >
              {title}
            </Text>

            {subtitle ? (
              <Text style={[styles.subtitle, { color: colors.white70 }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          {iconRight ? <View style={styles.iconRight}>{iconRight}</View> : null}
        </View>
      )}
    </>
  );

  const containerStyle = [
    styles.base,
    {
      height: subtitle ? height + s(16) : height,
      backgroundColor: variant === 'gradient' ? 'transparent' : palette.background,
      opacity: isDisabled ? 0.55 : 1,
      alignSelf: fullWidth ? 'stretch' : 'flex-start',
    },
    style,
  ];

  if (variant === 'gradient') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          containerStyle,
          pressed && !isDisabled ? styles.pressed : null,
        ]}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {body}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        containerStyle,
        pressed && !isDisabled ? styles.pressed : null,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {body}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: layout.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: s(16),
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(10),
  },
  labels: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
  },
  /* Подпись под названием кнопки: в макете Comfortaa Medium 14 */
  subtitle: {
    fontFamily: text.cardBody.fontFamily,
    fontSize: fs(14),
    lineHeight: fs(14) * 1.2,
    marginTop: s(4),
  },
  iconLeft: {
    marginRight: 0,
  },
  iconRight: {
    marginLeft: 0,
  },
});
