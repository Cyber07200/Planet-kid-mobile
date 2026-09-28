import { useCallback } from 'react';

import { useAuth } from '../context/AuthContext';
import { BookingsService } from '../services/bookings.service';
import { CatalogService } from '../services/catalog.service';
import { UsersService } from '../services/users.service';
import { useAsyncData } from './useAsyncData';

/**
 * Направления со слотами + дети, подписка и записи родителя.
 *
 * Один набор данных нужен «Направлениям», странице направления
 * и «Ближайшим занятиям». Ошибку записей не глушим: без них
 * интерфейс соврал бы пользователю о статусе «Вы записаны».
 */
export const useParentDirectionsData = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const load = useCallback(async () => {
    const [directions, children, subscription] = await Promise.all([
      CatalogService.getDirectionsWithSchedules(),
      UsersService.getChildren(userId),
      UsersService.getActiveSubscription(userId),
    ]);

    const bookings = await BookingsService.getBookingsForChildren(
      userId,
      children.map((child) => child.id),
    );

    return { directions, children, subscription, bookings };
  }, [userId]);

  return { userId, ...useAsyncData(load, [userId], { enabled: Boolean(userId) }) };
};
