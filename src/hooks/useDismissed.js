import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { logWarn } from '../utils/logger';

/**
 * Флаг «пользователь это уже закрыл».
 *
 * Нужен для баннеров, которые показываются один раз:
 * закрыли — больше не появляется даже после перезапуска
 * приложения, потому что отметка лежит в AsyncStorage.
 *
 * @param {string} key ключ хранения, например 'promo-subscription'
 */
export const useDismissed = (key) => {
  /* true — баннер уже закрывали */
  const [isDismissed, setIsDismissed] = useState(false);

  /* Пока читаем хранилище, баннер не показываем — чтобы он не мигал */
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const read = async () => {
      try {
        const saved = await AsyncStorage.getItem(`dismissed:${key}`);

        if (!cancelled) {
          setIsDismissed(saved === '1');
        }
      } catch (error) {
        /* Не смогли прочитать — считаем, что не закрывали */
        logWarn('баннер: чтение флага', error);
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    };

    read();

    return () => {
      cancelled = true;
    };
  }, [key]);

  /** Закрыть навсегда */
  const dismiss = useCallback(async () => {
    setIsDismissed(true);

    try {
      await AsyncStorage.setItem(`dismissed:${key}`, '1');
    } catch (error) {
      logWarn('баннер: сохранение флага', error);
    }
  }, [key]);

  return { isDismissed, isReady, dismiss };
};
