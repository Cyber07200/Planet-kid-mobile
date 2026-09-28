/**
 * Тексты уведомлений о записи на занятие.
 *
 * Формулировки взяты с сайта (components/app/NotificationsPage.tsx),
 * где уведомление о записи выглядит так:
 *   «Сегодня Миша записан на занятие «Рисование» в 18:00».
 *
 * Здесь тот же стиль, но текст собирается из реальных данных
 * записи, а не из статичного списка.
 */

import {
  formatDayMonth,
  formatTime,
  getStartOfDay,
  parseDateKey,
} from './date';

/** «Миша», «Миша и Аня», «Миша, Аня и Петя» */
export const joinNames = (names = []) => {
  const list = names.filter(Boolean);

  if (list.length === 0) {
    return 'Ребёнок';
  }

  if (list.length === 1) {
    return list[0];
  }

  return `${list.slice(0, -1).join(', ')} и ${list[list.length - 1]}`;
};

/**
 * Приставка дня: «Сегодня», «Завтра» или «18 сентября».
 * Сегодня и завтра пишем словом — так же, как на сайте.
 */
const getDayPart = (lessonDate) => {
  const date = parseDateKey(lessonDate);

  if (!date) {
    return '';
  }

  const today = getStartOfDay(new Date());

  const diffDays = Math.round((date - today) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return 'сегодня';
  }

  if (diffDays === 1) {
    return 'завтра';
  }

  return formatDayMonth(date);
};

/**
 * Текст уведомления об успешной записи.
 *
 * @param {object} params
 * @param {string[]} params.childNames имена записанных детей
 * @param {string} params.lessonName название занятия
 * @param {string} params.lessonDate дата занятия, YYYY-MM-DD
 * @param {string} params.time время начала
 * @param {boolean} [params.once] разовая запись (без подписки)
 */
export const buildBookingNotification = ({
  childNames = [],
  lessonName = 'занятие',
  lessonDate = null,
  time = '',
  once = false,
}) => {
  const who = joinNames(childNames);

  /* «записан» / «записаны» — по количеству детей */
  const verb = childNames.filter(Boolean).length > 1 ? 'записаны' : 'записан';

  const dayPart = getDayPart(lessonDate);
  const timePart = time ? ` в ${formatTime(time)}` : '';

  const when = dayPart ? ` ${dayPart}` : '';

  const message = `${who} ${verb} на занятие «${lessonName}»${when}${timePart}.`;

  if (once) {
    return {
      title: 'Разовая запись на занятие',
      message: `${message} Занятие оплачивается отдельно, без подписки.`,
      type: 'info',
    };
  }

  return {
    title: 'Запись на занятие',
    message,
    type: 'info',
  };
};

/** Текст уведомления об отмене записи */
export const buildCancelNotification = ({
  childName = 'Ребёнок',
  lessonName = 'занятие',
  lessonDate = null,
}) => {
  const dayPart = getDayPart(lessonDate);

  const when = dayPart ? ` ${dayPart}` : '';

  /*
   * Имя ставим перед двоеточием: так не приходится склонять его
   * по падежам («для Миша» звучало бы неправильно).
   */
  return {
    title: 'Запись отменена',
    message: `${childName}: запись на занятие «${lessonName}»${when} отменена.`,
    type: 'info',
  };
};
