import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { describeSupabaseError } from '../utils/errors';
import { logWarn } from '../utils/logger';

/**
 * Загрузка данных с состояниями loading / error / refreshing.
 *
 * Используется всеми экранами, чтобы одинаково обрабатывать
 * загрузку, пустые состояния, ошибки и pull-to-refresh.
 *
 * Две вещи, которые экраны получают бесплатно:
 *
 *  - ответы более старых запросов не перезаписывают более новые
 *    (например, быстрый pull-to-refresh поверх незавершённой загрузки);
 *  - при возврате на экран данные тихо обновляются, если они
 *    старше STALE_AFTER — иначе после записи на занятие в календаре
 *    профиль показывал бы устаревший остаток занятий.
 */

/** Через сколько данные считаются устаревшими, мс */
const STALE_AFTER = 30000;

export const useAsyncData = (loader, deps = [], options = {}) => {
  const {
    enabled = true,
    initialData = null,
    refreshOnFocus = true,
    staleAfter = STALE_AFTER,
  } = options;

  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  const loaderRef = useRef(loader);

  /* Номер последнего запроса — чтобы отбрасывать устаревшие ответы */
  const requestIdRef = useRef(0);

  /* Когда данные были получены в последний раз */
  const loadedAtRef = useRef(0);

  const firstFocusRef = useRef(true);

  loaderRef.current = loader;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(
    async ({ silent = false, quiet = false } = {}) => {
      if (!enabled) {
        setIsLoading(false);
        return null;
      }

      requestIdRef.current += 1;

      const requestId = requestIdRef.current;

      if (!quiet) {
        if (silent) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
      }

      setError(null);

      try {
        const result = await loaderRef.current();

        /* Пока ждали ответ, начался более свежий запрос */
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return null;
        }

        loadedAtRef.current = Date.now();

        setData(result);

        return result;
      } catch (loadError) {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return null;
        }

        logWarn('загрузка данных', loadError);

        setError(describeSupabaseError(loadError, 'Не удалось загрузить данные'));

        return null;
      } finally {
        if (!quiet && mountedRef.current && requestId === requestIdRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [enabled],
  );

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(
    useCallback(() => {
      /* Первый фокус — это монтирование, данные уже загружаются */
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }

      if (!refreshOnFocus || !enabled) {
        return;
      }

      if (Date.now() - loadedAtRef.current < staleAfter) {
        return;
      }

      /* Тихо: без индикатора pull-to-refresh */
      run({ silent: true, quiet: true });
    }, [enabled, refreshOnFocus, run, staleAfter]),
  );

  const refresh = useCallback(() => run({ silent: true }), [run]);

  const retry = useCallback(() => run({ silent: false }), [run]);

  return {
    data,
    setData,
    isLoading,
    isRefreshing,
    error,
    refresh,
    retry,
  };
};
