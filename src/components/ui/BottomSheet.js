import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';

import { colors, fs, layout, s, screenHeight, shadows, text } from '../../theme';

/**
 * Модальное окно снизу — как в макетах
 * «Directions (Modal)» и «Calendar (Modal)».
 *
 * Структура из Figma:
 *   затемнение #323232 @40%
 *   кнопка «Закрыть» над листом (белая @30%, радиус 40)
 *   лист #FAFAFA со скруглением 30 сверху
 *   короткая полоска-«ручка» #000000 @10%
 */
export const BottomSheet = ({
  visible,
  onClose,
  children,
  maxHeightRatio = 0.9,
  scrollable = true,
  footer = null,
}) => {
  const insets = useSafeAreaInsets();

  const maxHeight = screenHeight * maxHeightRatio;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.wrapper}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Icon name="x" size={fs(16)} color={colors.white} />
            <Text style={styles.closeLabel}>Закрыть</Text>
          </Pressable>

          <View
            style={[
              styles.sheet,
              { maxHeight, paddingBottom: Math.max(insets.bottom, s(20)) },
            ]}
          >
            <View style={styles.handle} />

            {scrollable ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
              >
                {children}
              </ScrollView>
            ) : (
              <View style={styles.content}>{children}</View>
            )}

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};

/**
 * Компактное подтверждение — макет «Notification (Modal)»:
 * «Вы уверены что хотите очистить уведомления?» + Да / Отмена
 */
export const ConfirmDialog = ({
  visible,
  title,
  /* Пояснение под заголовком — например что будет с занятием */
  description = null,
  confirmLabel = 'Да',
  cancelLabel = 'Отмена',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} />

        <View style={styles.confirmWrapper}>
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Icon name="x" size={fs(16)} color={colors.white} />
            <Text style={styles.closeLabel}>Закрыть</Text>
          </Pressable>

          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>{title}</Text>

            {description ? (
              <Text style={styles.confirmDescription}>{description}</Text>
            ) : null}

            <View style={styles.confirmRow}>
              <Pressable
                onPress={onConfirm}
                disabled={loading}
                style={({ pressed }) => [
                  styles.confirmButton,
                  styles.confirmPrimary,
                  pressed && styles.pressed,
                  loading && styles.disabled,
                ]}
              >
                <Text style={styles.confirmLabel}>{confirmLabel}</Text>
              </Pressable>

              <Pressable
                onPress={onCancel}
                disabled={loading}
                style={({ pressed }) => [
                  styles.confirmButton,
                  styles.confirmDanger,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.confirmLabel}>{cancelLabel}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  wrapper: {
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
    height: s(34),
    paddingHorizontal: s(15),
    borderRadius: layout.radius.pill,
    backgroundColor: colors.white30,
    marginBottom: s(15),
  },
  closeLabel: {
    fontFamily: text.caption.fontFamily,
    fontSize: fs(16),
    color: colors.white,
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.background,
    borderTopLeftRadius: layout.radius.lg,
    borderTopRightRadius: layout.radius.lg,
    paddingTop: s(10),
    ...shadows.sheet,
  },
  handle: {
    alignSelf: 'center',
    width: s(120),
    height: s(5),
    borderRadius: s(20),
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginBottom: s(10),
  },
  content: {
    paddingHorizontal: layout.gutter,
    paddingBottom: s(10),
  },
  footer: {
    paddingHorizontal: layout.gutter,
    paddingTop: s(10),
  },
  confirmWrapper: {
    pointerEvents: 'box-none',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.gutter,
  },
  confirmCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: layout.radius.lg,
    padding: s(20),
    gap: s(20),
  },
  confirmTitle: {
    ...text.sectionTitle,
    color: colors.text80,
    textAlign: 'center',
  },
  confirmDescription: {
    ...text.cardBody,
    color: colors.text60,
    textAlign: 'center',
  },
  confirmRow: {
    flexDirection: 'row',
    gap: s(10),
  },
  confirmButton: {
    flex: 1,
    height: s(49),
    borderRadius: layout.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmPrimary: {
    backgroundColor: colors.primary,
  },
  confirmDanger: {
    backgroundColor: colors.redSoft,
  },
  confirmLabel: {
    ...text.button,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
});
