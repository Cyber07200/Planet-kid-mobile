import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, s } from '../../theme';

/**
 * Базовая обёртка экрана.
 *
 * Берёт на себя всё, что в макете нарисовано «как есть»,
 * но на реальном телефоне зависит от устройства:
 *  - Safe Area сверху и снизу;
 *  - подъём контента над клавиатурой;
 *  - прокрутку длинных экранов;
 *  - запас снизу под плавающий таб-бар.
 */
export const Screen = ({
  children,
  scroll = false,
  keyboardAvoiding = false,
  refreshControl,
  contentContainerStyle,
  style,
  withTabBarSpacing = false,
  edges = ['top'],
  backgroundColor = colors.background,
  keyboardShouldPersistTaps = 'handled',
}) => {
  const insets = useSafeAreaInsets();

  const paddingTop = edges.includes('top') ? insets.top : 0;

  const bottomInset = edges.includes('bottom') ? insets.bottom : 0;

  const paddingBottom =
    bottomInset + (withTabBarSpacing ? layout.tabBar + s(34) : s(16));

  const content = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        { paddingBottom },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, { paddingBottom }, contentContainerStyle]}>
      {children}
    </View>
  );

  const body = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  return (
    <View style={[styles.container, { backgroundColor, paddingTop }, style]}>
      {body}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
});
