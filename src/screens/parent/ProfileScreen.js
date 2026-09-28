import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../components/ui/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { ConfirmDialog } from '../../components/ui/BottomSheet';
import { refreshControl } from '../../components/ui/ListParts';
import { InlineError, InlineSuccess, ScreenStatus } from '../../components/ui/States';
import { SubscriptionChips } from '../../components/common/SubscriptionChips';
import { createEmptyChild } from '../../components/common/ChildFields';
import { ProfileChildren } from '../../components/profile/ProfileChildren';
import { ChildEditSheet, ProfileEditSheet } from '../../components/profile/ProfileSheets';
import { describeSupabaseError } from '../../utils/errors';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useFlashMessage } from '../../hooks/useFlashMessage';
import { useLogoutConfirm } from '../../hooks/useLogoutConfirm';
import { BookingsService } from '../../services/bookings.service';
import { UsersService } from '../../services/users.service';
import { colors, fs, gradients, layout, s, text, withAlpha } from '../../theme';
import { getFullName } from '../../utils/format';
import { isActiveBooking } from '../../utils/status';

/**
 * Профиль — макеты «Profile» [0:1488] и [0:1545].
 *
 * Шапка с аватаром и именем, виджеты подписки и баллов,
 * список детей с редактированием и записями, «Добавить ребенка»,
 * «Выйти из аккаунта».
 */

const EMPTY_PROFILE_FORM = { firstName: '', lastName: '' };

/* Записи, разложенные по детям, — для раскрывающегося списка */
const groupBookingsByChild = (bookings = []) => {
  const map = {};

  bookings.forEach((booking) => {
    if (isActiveBooking(booking.status)) {
      (map[booking.childId] ??= []).push(booking);
    }
  });

  return map;
};

export const ProfileScreen = ({ navigation }) => {
  const { user, refreshUser } = useAuth();
  const userId = user?.id;

  const insets = useSafeAreaInsets();

  const { requestLogout, dialogProps } = useLogoutConfirm();

  const [expandedChildId, setExpandedChildId] = useState(null);

  const [profileSheetVisible, setProfileSheetVisible] = useState(false);
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM);

  const [childSheetVisible, setChildSheetVisible] = useState(false);
  const [editingChildId, setEditingChildId] = useState(null);
  const [childForm, setChildForm] = useState(createEmptyChild);

  /* Ребёнок, удаление которого ждёт подтверждения */
  const [childToDelete, setChildToDelete] = useState(null);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [message, showMessage] = useFlashMessage();

  const loadProfile = useCallback(async () => {
    const [profile, children, subscription] = await Promise.all([
      UsersService.getProfile(userId),
      UsersService.getChildren(userId),
      UsersService.getActiveSubscription(userId),
    ]);

    /* Ошибку записей не глушим: иначе профиль соврал бы «нет записей» */
    const bookings = await BookingsService.getBookingsForChildren(
      userId,
      children.map((child) => child.id),
    );

    return { profile, children, subscription, bookings };
  }, [userId]);

  const { data, isLoading, isRefreshing, error, refresh, retry } = useAsyncData(
    loadProfile,
    [userId],
    { enabled: Boolean(userId) },
  );

  const bookingsByChild = useMemo(() => groupBookingsByChild(data?.bookings), [data?.bookings]);

  /**
   * Сохранение с общей обработкой: блокировка, обновление данных
   * экрана и контекста, сообщение об успехе или ошибке.
   */
  const save = async (action, successMessage, fallbackError) => {
    setSaving(true);
    setFormError(null);

    try {
      await action();
      await Promise.all([refresh(), refreshUser().catch(() => null)]);
      showMessage(successMessage);

      return true;
    } catch (saveError) {
      showMessage(null);
      setFormError(describeSupabaseError(saveError, fallbackError));

      return false;
    } finally {
      setSaving(false);
    }
  };

  const openProfileSheet = () => {
    setProfileForm({
      firstName: data?.profile?.firstName ?? '',
      lastName: data?.profile?.lastName ?? '',
    });
    setFormError(null);
    setProfileSheetVisible(true);
  };

  const saveProfile = async () => {
    if (!profileForm.firstName.trim()) {
      setFormError('Введите имя');
      return;
    }

    const saved = await save(
      () => UsersService.updateProfile(userId, profileForm),
      'Данные профиля обновлены',
      'Не удалось сохранить данные профиля',
    );

    if (saved) {
      setProfileSheetVisible(false);
    }
  };

  const openChildSheet = (child = null) => {
    setEditingChildId(child?.id ?? null);
    setChildForm(
      child
        ? {
            firstName: child.firstName ?? '',
            lastName: child.lastName ?? '',
            birthDate: child.birthDate ?? '',
            gender: child.gender ?? 'male',
          }
        : createEmptyChild(),
    );
    setFormError(null);
    setChildSheetVisible(true);
  };

  /* Одна форма и на добавление, и на правку */
  const saveChild = async () => {
    if (!childForm.firstName.trim()) {
      setFormError('Введите имя ребёнка');
      return;
    }

    if (!childForm.birthDate) {
      setFormError('Укажите дату рождения ребёнка');
      return;
    }

    const saved = await save(
      () =>
        editingChildId
          ? UsersService.updateChild(userId, editingChildId, childForm)
          : UsersService.addChild(userId, childForm),
      editingChildId ? 'Данные ребёнка обновлены' : 'Ребёнок добавлен',
      'Не удалось сохранить данные ребёнка',
    );

    if (saved) {
      setChildSheetVisible(false);
    }
  };

  /* База не даст удалить ребёнка, у которого есть записи */
  const confirmDeleteChild = async () => {
    const deleted = await save(
      () => UsersService.deleteChild(userId, childToDelete.id),
      'Ребёнок удалён из профиля',
      'Не удалось удалить ребёнка',
    );

    if (deleted) {
      setExpandedChildId(null);
    }

    setChildToDelete(null);
  };

  if (isLoading || (error && !data)) {
    return (
      <ScreenStatus
        loading={isLoading}
        error={error}
        onRetry={retry}
        loadingLabel="Загружаем профиль..."
      />
    );
  }

  const profile = data?.profile;
  const fullName = getFullName(profile?.firstName, profile?.lastName) || 'Пользователь';

  return (
    <View style={styles.root}>
      {/* Фон-фотография 500x500 с затуханием в фон экрана */}
      <View style={styles.heroWrapper}>
        {profile?.avatar ? (
          <Image
            source={{ uri: profile.avatar }}
            style={styles.heroImage}
            resizeMode="cover"
            blurRadius={2}
          />
        ) : (
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroImage}
          />
        )}

        <LinearGradient
          colors={[withAlpha('#FAFAFA', 0.2), colors.background]}
          style={styles.heroImage}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + s(10), paddingBottom: insets.bottom + s(20) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl(isRefreshing, refresh)}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={s(12)}
            style={({ pressed }) => [styles.backPill, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Icon name="arrow-left" size={fs(24)} color={colors.text60} />
            <Text style={styles.backLabel}>Профиль</Text>
          </Pressable>

          <Pressable
            onPress={openProfileSheet}
            style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Редактировать профиль"
          >
            <Icon name="edit-3" size={fs(24)} color={colors.white} />
          </Pressable>
        </View>

        {/* Круглое фото 185 и имя под ним */}
        <View style={styles.identity}>
          <Avatar
            uri={profile?.avatar}
            firstName={profile?.firstName}
            lastName={profile?.lastName}
            size={185}
            style={styles.bigAvatar}
          />

          <Text style={styles.name} numberOfLines={2}>
            {fullName}
          </Text>
        </View>

        {/* «Шторка» со скруглением 30 — Frame 157 из макета */}
        <View style={styles.sheet}>
          <InlineSuccess message={message} style={styles.success} />

          <SubscriptionChips
            style={styles.chips}
            subscription={data?.subscription}
            points={profile?.bonusPoints ?? 0}
            onPressSubscription={() => navigation.navigate('Subscribe')}
            onPressAction={() => navigation.navigate('Subscribe')}
            actionIcon={data?.subscription ? 'arrow-up-right' : 'plus-circle'}
          />

          <Text style={styles.paymentNote}>
            Подписку необходимо будет оплатить заранее! Сделать это можно написав в поддержку
            или лично по адресу Ясная 14к2
          </Text>

          <Text style={styles.sectionTitle}>Дети</Text>

          <ProfileChildren
            items={data?.children ?? []}
            bookingsByChild={bookingsByChild}
            expandedId={expandedChildId}
            onToggle={(childId) =>
              setExpandedChildId((current) => (current === childId ? null : childId))
            }
            onEdit={openChildSheet}
            onDelete={setChildToDelete}
          />

          {/* Frame 162: 460x46, основной цвет на 50% */}
          <Pressable
            onPress={() => openChildSheet()}
            style={({ pressed }) => [styles.addChild, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.addChildLabel}>Добавить ребенка</Text>
          </Pressable>

          <InlineError message={!childSheetVisible && !profileSheetVisible ? formError : null} />

          {/* Frame 165: 460x54, красный на 50% */}
          <Pressable
            onPress={requestLogout}
            style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.logoutLabel}>Выйти из аккаунта</Text>
            <Icon name="trash-2" size={fs(24)} color={colors.white} />
          </Pressable>
        </View>
      </ScrollView>

      <ConfirmDialog {...dialogProps} />

      <ConfirmDialog
        visible={Boolean(childToDelete)}
        title="Удалить ребёнка?"
        description={
          childToDelete
            ? `${childToDelete.firstName} будет удалён из профиля. Это действие нельзя отменить.`
            : null
        }
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        loading={saving}
        onConfirm={confirmDeleteChild}
        onCancel={() => !saving && setChildToDelete(null)}
      />

      <ProfileEditSheet
        visible={profileSheetVisible}
        form={profileForm}
        onChange={(field, value) => setProfileForm((current) => ({ ...current, [field]: value }))}
        saving={saving}
        error={formError}
        onClose={() => setProfileSheetVisible(false)}
        onSave={saveProfile}
      />

      <ChildEditSheet
        visible={childSheetVisible}
        isEditing={Boolean(editingChildId)}
        form={childForm}
        onChange={(field, value) => setChildForm((current) => ({ ...current, [field]: value }))}
        saving={saving}
        error={formError}
        onClose={() => setChildSheetVisible(false)}
        onSave={saveChild}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: s(20),
  },
  /* Фон 500x500 из макета — уходит под статус-бар */
  heroWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: s(500),
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
  },
  /* Frame 156: белая на 50%, обводка #D9D9D9 на 60% */
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    height: s(44),
    paddingHorizontal: s(20),
    borderRadius: layout.radius.pill,
    backgroundColor: colors.white60,
    borderWidth: 1,
    borderColor: withAlpha('#D9D9D9', 0.6),
  },
  backLabel: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(20),
    color: colors.text60,
  },
  editButton: {
    width: s(44),
    height: s(44),
    borderRadius: layout.radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    alignItems: 'center',
    marginTop: s(18),
    gap: s(10),
  },
  bigAvatar: {
    shadowColor: '#323232',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  name: {
    ...text.screenTitle,
    textAlign: 'center',
    paddingHorizontal: layout.gutter,
  },
  /* Frame 157: шторка со скруглением 30 сверху */
  sheet: {
    marginTop: s(20),
    minHeight: s(560),
    backgroundColor: withAlpha('#FAFAFA', 0.92),
    borderTopLeftRadius: layout.radius.lg,
    borderTopRightRadius: layout.radius.lg,
    borderWidth: 1,
    borderColor: withAlpha('#FAFAFA', 0.5),
    paddingVertical: layout.gutter,
    gap: s(10),
  },
  success: {
    marginHorizontal: layout.gutter,
  },
  chips: {
    paddingRight: layout.gutter,
  },
  paymentNote: {
    ...text.hint,
    color: colors.text80,
    textAlign: 'center',
    paddingHorizontal: s(50),
    marginTop: s(6),
  },
  sectionTitle: {
    ...text.sectionTitle,
    color: colors.text80,
    marginHorizontal: layout.gutter,
    marginTop: s(8),
  },
  addChild: {
    height: s(46),
    marginHorizontal: layout.gutter,
    borderRadius: layout.radius.md,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: s(6),
  },
  addChildLabel: {
    ...text.buttonSmall,
  },
  logout: {
    height: s(54),
    marginHorizontal: layout.gutter,
    borderRadius: layout.radius.md,
    backgroundColor: colors.red50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(10),
    marginTop: s(6),
    marginBottom: s(10),
  },
  logoutLabel: {
    ...text.buttonSmall,
  },
  pressed: {
    opacity: 0.85,
  },
});
