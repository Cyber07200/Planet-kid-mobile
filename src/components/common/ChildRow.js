import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../ui/Icon';

import { Avatar } from '../ui/Avatar';
import { colors, fs, layout, s, text } from '../../theme';

/**
 * Строка ребёнка в профиле — Frame 160 из макета Profile.
 *
 * Слева круглый аватар и имя, справа кнопка редактирования
 * и стрелка раскрытия списка занятий.
 */
export const ChildRow = ({
  child,
  expanded = false,
  onToggle,
  onEdit,
  onDelete,
  subtitle = null,
  style,
}) => {
  return (
    <View style={style}>
      <View style={styles.row}>
        <Pressable
          style={styles.left}
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
        >
          <Avatar firstName={child.firstName} lastName={child.lastName} size={52} />

          <View style={styles.labels}>
            <Text style={styles.name} numberOfLines={1}>
              {child.firstName}
            </Text>

            {subtitle ? (
              <Text style={styles.meta} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </Pressable>

        <View style={styles.actions}>
          <Pressable
            onPress={onEdit}
            style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Изменить данные: ${child.firstName}`}
          >
            <Icon name="edit-3" size={fs(24)} color={colors.white} />
          </Pressable>

          <Pressable
            onPress={onToggle}
            hitSlop={s(10)}
            style={({ pressed }) => [styles.caret, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Icon
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={fs(28)}
              color={colors.text}
            />
          </Pressable>
        </View>
      </View>

      {expanded && onDelete ? (
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [styles.deleteRow, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Icon name="trash-2" size={fs(18)} color={colors.redAlert} />
          <Text style={styles.deleteLabel}>Удалить ребёнка</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: s(52),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    flex: 1,
  },
  labels: {
    flex: 1,
  },
  name: {
    fontFamily: text.caption.fontFamily,
    fontSize: fs(24),
    color: colors.text,
  },
  meta: {
    ...text.hint,
    color: colors.text60,
    marginTop: s(2),
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(14),
  },
  editButton: {
    width: s(44),
    height: s(44),
    borderRadius: layout.radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caret: {
    width: s(32),
    height: s(44),
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    paddingVertical: s(12),
    paddingLeft: s(62),
  },
  deleteLabel: {
    ...text.caption,
    color: colors.redAlert,
  },
  pressed: {
    opacity: 0.85,
  },
});
