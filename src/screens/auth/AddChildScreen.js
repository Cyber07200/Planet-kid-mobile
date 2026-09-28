import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/ui/Icon';

import { Screen } from '../../components/ui/Screen';
import { AppButton } from '../../components/ui/AppButton';
import { InlineError } from '../../components/ui/States';
import { ChildFields, createEmptyChild } from '../../components/common/ChildFields';
import { describeSupabaseError } from '../../utils/errors';
import { useAuth } from '../../context/AuthContext';
import { colors, fs, layout, s, text } from '../../theme';
import { isValidBirthDate, isValidName } from '../../utils/validation';

/**
 * Добавление детей при регистрации — макет «Add Child».
 *
 * Можно добавить нескольких детей (в макете второй блок
 * появляется под первым), можно пропустить шаг —
 * ровно как на сайте (кнопка «Пропустить добавление детей»).
 */

let nextKey = 0;

/* key — только для списка на экране, в базу не уходит */
const createChildDraft = () => {
  nextKey += 1;

  return { key: String(nextKey), ...createEmptyChild() };
};

const hasAnyValue = (child) => Boolean(child.firstName.trim() || child.birthDate);

export const AddChildScreen = ({ route }) => {
  const draft = route.params?.draft ?? {};

  const { registerParent } = useAuth();

  const [children, setChildren] = useState(() => [createChildDraft()]);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(false);

  const updateChild = (key, field, value) => {
    setChildren((current) =>
      current.map((child) =>
        child.key === key ? { ...child, [field]: value } : child,
      ),
    );

    setErrors((current) => ({
      ...current,
      [key]: { ...current[key], [field]: undefined },
    }));
  };

  const addChild = () => {
    setChildren((current) => [...current, createChildDraft()]);
  };

  const removeChild = (key) => {
    setChildren((current) => current.filter((child) => child.key !== key));
  };

  const validate = () => {
    const nextErrors = {};

    children.filter(hasAnyValue).forEach((child) => {
      const childErrors = {};

      if (!isValidName(child.firstName)) {
        childErrors.firstName = 'Введите имя ребёнка';
      }

      if (!isValidBirthDate(child.birthDate)) {
        childErrors.birthDate = 'Укажите дату рождения';
      }

      if (Object.keys(childErrors).length > 0) {
        nextErrors[child.key] = childErrors;
      }
    });

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (childrenToSave) => {
    setLoading(true);
    setFormError(null);

    try {
      await registerParent({
        phone: draft.phone,
        firstName: draft.firstName,
        lastName: draft.lastName,
        children: childrenToSave,
      });

      /*
       * После успешной регистрации роль в контексте
       * меняется на parent, и корневая навигация сама
       * переключает стек на онбординг.
       */
    } catch (registerError) {
      setFormError(
        describeSupabaseError(registerError, 'Не удалось создать аккаунт. Попробуйте ещё раз.'),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!validate()) {
      return;
    }

    submit(children.filter(hasAnyValue));
  };

  const handleSkip = () => {
    submit([]);
  };

  return (
    <Screen scroll keyboardAvoiding contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        Теперь добавим информацию о ваших маленьких героях
      </Text>

      <View style={styles.form}>
        {children.map((child, index) => (
          <View key={child.key} style={styles.childBlock}>
            {children.length > 1 ? (
              <View style={styles.childHeader}>
                <Text style={styles.childIndex}>Ребёнок {index + 1}</Text>

                <Pressable
                  onPress={() => removeChild(child.key)}
                  hitSlop={s(10)}
                  style={({ pressed }) => pressed && styles.pressed}
                  accessibilityRole="button"
                  accessibilityLabel={`Удалить ребёнка ${index + 1}`}
                >
                  <Icon name="trash-2" size={fs(20)} color={colors.redAlert} />
                </Pressable>
              </View>
            ) : null}

            <ChildFields
              value={child}
              onChange={(field, value) => updateChild(child.key, field, value)}
              errors={errors[child.key]}
            />
          </View>
        ))}

        <AppButton
          title="Добавить ребенка"
          variant="soft"
          size="small"
          onPress={addChild}
        />

        <InlineError message={formError} />
      </View>

      <View style={styles.footer}>
        <AppButton title="Продолжить" onPress={handleContinue} loading={loading} />

        <Pressable
          onPress={handleSkip}
          disabled={loading}
          style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.skipLabel}>Пропустить</Text>
        </Pressable>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: layout.gutter,
    paddingTop: s(20),
  },
  title: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: text.sectionLabel.fontSize,
    lineHeight: text.sectionLabel.fontSize * 1.35,
    color: colors.text90,
    textAlign: 'center',
    paddingHorizontal: s(5),
  },
  form: {
    marginTop: s(30),
    gap: s(20),
  },
  childBlock: {
    gap: s(20),
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  childIndex: {
    ...text.caption,
    color: colors.text60,
  },
  /* В макете кнопка занимает 360 из 500 — отступ 70 от края экрана */
  footer: {
    marginTop: 'auto',
    paddingTop: s(30),
    paddingBottom: s(20),
    paddingHorizontal: s(50),
    gap: s(16),
  },
  skip: {
    alignSelf: 'center',
    paddingVertical: s(6),
  },
  skipLabel: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: text.sectionLabel.fontSize,
    color: colors.text80,
  },
  pressed: {
    opacity: 0.85,
  },
});
