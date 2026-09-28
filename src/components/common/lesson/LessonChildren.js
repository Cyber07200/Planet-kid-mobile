import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../ui/Icon';
import { colors, fs, layout, s, text } from '../../../theme';
import { getFullName } from '../../../utils/format';

/**
 * Дети в окне занятия: «Уже записаны» с отменой
 * и «Записать ребёнка» с выбором карточками.
 */

const childName = (child) => getFullName(child.firstName, child.lastName) || child.firstName;

export const BookedChildren = ({ items, loading, onCancel }) => (
  <View style={styles.bookedBox}>
    <View style={styles.bookedHeader}>
      <Icon name="check" size={fs(16)} color={colors.primary} />
      <Text style={styles.bookedTitle}>Уже записаны</Text>
    </View>

    {items.map((child) => (
      <View key={child.id} style={styles.bookedRow}>
        <View style={styles.rowLeft}>
          <View style={styles.checkCircle}>
            <Icon name="check" size={fs(14)} color={colors.primary} />
          </View>

          <Text style={styles.bookedName} numberOfLines={1}>
            {childName(child)}
          </Text>
        </View>

        <Pressable
          onPress={() => onCancel?.(child.id)}
          disabled={loading}
          style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.cancelLabel}>Отменить</Text>
        </Pressable>
      </View>
    ))}
  </View>
);

const ChildOption = ({ child, selected, disabled, onToggle }) => (
  <Pressable
    onPress={() => onToggle?.(child.id)}
    disabled={disabled}
    style={({ pressed }) => [
      styles.childRow,
      selected ? styles.childRowSelected : null,
      pressed && styles.pressed,
    ]}
    accessibilityRole="checkbox"
    accessibilityState={{ checked: selected }}
  >
    <View style={styles.rowLeft}>
      <View style={[styles.childAvatar, selected ? styles.childAvatarSelected : null]}>
        <Icon
          name={selected ? 'check' : 'users'}
          size={fs(16)}
          color={selected ? colors.primary : colors.text60}
        />
      </View>

      <View style={styles.childInfo}>
        <Text style={styles.childName} numberOfLines={1}>
          {childName(child)}
        </Text>

        <Text style={styles.childHint}>{selected ? 'Будет записан' : 'Выбрать ребёнка'}</Text>
      </View>
    </View>

    {/* Квадратная галочка справа — как на сайте */}
    <View style={[styles.checkbox, selected ? styles.checkboxSelected : null]}>
      {selected ? <Icon name="check" size={fs(12)} color={colors.white} /> : null}
    </View>
  </Pressable>
);

export const ChildPicker = ({ items, selectedIds, individual, loading, onToggle, titleStyle }) => (
  <>
    <View style={styles.pickHeader}>
      <Text style={titleStyle}>Записать ребёнка</Text>
      <Text style={styles.pickHint}>{individual ? '1 ребёнок' : 'Можно выбрать нескольких'}</Text>
    </View>

    {items.length > 0 ? (
      <View style={styles.childrenList}>
        {items.map((child) => (
          <ChildOption
            key={child.id}
            child={child}
            selected={selectedIds.includes(child.id)}
            disabled={loading}
            onToggle={onToggle}
          />
        ))}
      </View>
    ) : (
      <View style={styles.emptyChildren}>
        <Icon name="users" size={fs(20)} color={colors.text60} />
        <Text style={styles.emptyTitle}>Дети не добавлены</Text>
        <Text style={styles.emptyText}>
          Добавьте ребёнка в профиле, чтобы записываться на занятия.
        </Text>
      </View>
    )}
  </>
);

const styles = StyleSheet.create({
  bookedBox: {
    marginTop: s(18),
    backgroundColor: colors.primary10,
    borderRadius: layout.radius.md,
    padding: s(12),
    gap: s(10),
  },
  bookedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  bookedTitle: {
    ...text.caption,
    color: colors.primary,
  },
  bookedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    flexShrink: 1,
  },
  checkCircle: {
    width: s(32),
    height: s(32),
    borderRadius: s(16),
    backgroundColor: colors.primary20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookedName: {
    ...text.caption,
    color: colors.text80,
    flexShrink: 1,
  },
  cancelButton: {
    borderRadius: layout.radius.sm,
    backgroundColor: 'rgba(255, 87, 58, 0.12)',
    paddingHorizontal: s(12),
    paddingVertical: s(6),
  },
  cancelLabel: {
    ...text.hint,
    color: colors.redAlert,
  },
  pickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
  },
  pickHint: {
    ...text.hint,
    color: colors.text60,
  },
  childrenList: {
    gap: s(10),
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
    padding: s(12),
  },
  childRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary10,
  },
  childAvatar: {
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarSelected: {
    backgroundColor: colors.primary20,
  },
  childInfo: {
    flexShrink: 1,
  },
  childName: {
    ...text.caption,
    color: colors.text,
  },
  childHint: {
    ...text.hint,
    fontSize: fs(11),
    color: colors.text60,
  },
  checkbox: {
    width: s(22),
    height: s(22),
    borderRadius: s(6),
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  emptyChildren: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius.md,
    padding: s(16),
    alignItems: 'center',
    gap: s(6),
  },
  emptyTitle: {
    ...text.caption,
    color: colors.text80,
  },
  emptyText: {
    ...text.hint,
    color: colors.text60,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
