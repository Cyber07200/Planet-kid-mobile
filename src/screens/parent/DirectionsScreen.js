import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { DirectionCard } from '../../components/common/DirectionCard';
import { DirectionFilters } from '../../components/common/DirectionFilters';
import { AppButton } from '../../components/ui/AppButton';
import { ListSeparator, refreshControl } from '../../components/ui/ListParts';
import { EmptyState, ScreenStatus } from '../../components/ui/States';
import { useAsyncData } from '../../hooks/useAsyncData';
import { CatalogService } from '../../services/catalog.service';
import { colors, layout, s, text } from '../../theme';
import {
  AGE_FILTERS,
  DAY_FILTERS,
  EMPTY_FILTERS,
  FORMAT_FILTERS,
  buildPlanFilters,
  buildTeacherFilters,
  countActiveFilters,
  filterDirections,
} from '../../utils/filters';

/**
 * Направления — макеты «Directions» и «Directions (Modal)».
 *
 * Список карточек направлений; по нажатию открывается модалка
 * с описанием, преподавателем, расписанием и выбором ребёнка.
 *
 * Логика записи — из DirectionsPage.tsx (веб): дата занятия
 * считается как ближайший день недели выбранного слота.
 */
const loadDirections = async () => ({
  directions: await CatalogService.getDirectionsWithSchedules(),
});

export const DirectionsScreen = ({ navigation, route }) => {
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  /*
   * Списку нужны только направления: запись и статус «Вы записаны»
   * живут на странице направления, которая грузит их сама.
   */
  const { data, isLoading, isRefreshing, error, refresh, retry } = useAsyncData(
    loadDirections,
    [],
  );

  /* Варианты тарифов берём из самих направлений — пустых не будет */
  const filterGroups = useMemo(
    () => [
      { key: 'age', title: 'Возраст', options: AGE_FILTERS },
      { key: 'plan', title: 'Тариф', options: buildPlanFilters(data?.directions) },
      { key: 'day', title: 'День недели', options: DAY_FILTERS },
      { key: 'format', title: 'Формат', options: FORMAT_FILTERS },
      {
        key: 'teacher',
        title: 'Преподаватель',
        options: buildTeacherFilters(data?.directions),
      },
    ],
    [data?.directions],
  );

  /* Список после применения фильтров */
  const visibleDirections = useMemo(
    () => filterDirections(data?.directions ?? [], filters),
    [data?.directions, filters],
  );

  const activeFilterCount = countActiveFilters(filters);

  /*
   * С главной можно прийти сразу к нужному направлению:
   * туда передаётся directionId, здесь открываем карточку.
   */
  const requestedDirectionId = route?.params?.directionId ?? null;

  useEffect(() => {
    if (!requestedDirectionId) {
      return;
    }

    /* Параметр одноразовый — иначе страница открывалась бы снова */
    navigation.setParams({ directionId: undefined });

    navigation.navigate('Direction', { directionId: requestedDirectionId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedDirectionId]);

  if (isLoading || (error && !data)) {
    return (
      <ScreenStatus
        header={<ScreenHeader title="Направления" />}
        loading={isLoading}
        error={error}
        onRetry={retry}
        loadingLabel="Загружаем направления..."
        withTabBarSpacing
      />
    );
  }

  const hasDirections = (data?.directions ?? []).length > 0;

  return (
    <Screen withTabBarSpacing>
      <ScreenHeader title="Направления" />

      {/* Фильтры показываем, только когда есть что фильтровать */}
      {hasDirections ? (
        <View style={styles.filters}>
          <DirectionFilters
            groups={filterGroups}
            values={filters}
            onChange={setFilters}
            onReset={() => setFilters(EMPTY_FILTERS)}
          />
        </View>
      ) : null}

      <FlatList
        data={visibleDirections}
        keyExtractor={(item) => item.id}
        style={styles.flex}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl(isRefreshing, refresh)}
        ListEmptyComponent={
          activeFilterCount > 0 ? (
            /* Пусто из-за фильтров — предлагаем их сбросить */
            <View style={styles.emptyFiltered}>
              <Text style={styles.emptyFilteredText}>
                По выбранным параметрам занятий не найдено.
              </Text>

              <AppButton
                title="Сбросить фильтры"
                variant="outline"
                size="small"
                onPress={() => setFilters(EMPTY_FILTERS)}
              />
            </View>
          ) : (
            <EmptyState
              icon="globe"
              title="Направлений пока нет"
              description="Новые направления появятся здесь автоматически."
            />
          )
        }
        renderItem={({ item }) => (
          /* Карточка открывает страницу направления с его занятиями */
          <DirectionCard
            direction={item}
            onPress={() =>
              navigation.navigate('Direction', { directionId: item.id })
            }
          />
        )}
        ItemSeparatorComponent={ListSeparator}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  filters: {
    paddingTop: s(16),
  },
  list: {
    paddingHorizontal: layout.gutter,
    paddingTop: s(16),
    paddingBottom: s(20),
  },
  /* Сообщение, когда фильтры ничего не нашли */
  emptyFiltered: {
    alignItems: 'center',
    gap: s(16),
    paddingVertical: s(40),
    paddingHorizontal: s(20),
  },
  emptyFilteredText: {
    ...text.cardTitle,
    color: colors.text70,
    textAlign: 'center',
  },
});
