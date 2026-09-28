import { DAY_FULL } from './date';
import { extractAgeLabel } from './format';

/**
 * Фильтры направлений.
 *
 * Здесь только чистые функции — без React и без запросов,
 * поэтому их легко проверить тестами. Набор фильтров
 * намеренно минимальный: фильтруем только по тем полям,
 * которые реально есть в базе.
 */

/** Значения фильтров по умолчанию — «ничего не выбрано» */
export const EMPTY_FILTERS = {
  age: 'all',
  plan: 'all',
  day: 'all',
  format: 'all',
  teacher: 'all',
};

/**
 * Возраст берётся из названия направления («Гитара 7+»),
 * отдельного поля в базе нет.
 *
 * Значение — это минимальный возраст: «7+» значит «от 7 лет».
 * Поэтому фильтр «До 6 лет» показывает направления,
 * куда примут ребёнка шести лет и младше.
 */
export const AGE_FILTERS = [
  { value: 'all', label: 'Все возраста' },
  { value: 'preschool', label: 'До 6 лет', maxAge: 5 },
  { value: 'junior', label: '6–9 лет', maxAge: 9 },
  { value: 'senior', label: '10 лет и старше', maxAge: 99 },
];

/** Формат занятия: групповое или индивидуальное */
export const FORMAT_FILTERS = [
  { value: 'all', label: 'Любой формат' },
  { value: 'group', label: 'Групповые' },
  { value: 'individual', label: 'Индивидуальные' },
];

/** Дни недели: 1 — понедельник, 7 — воскресенье */
export const DAY_FILTERS = [
  { value: 'all', label: 'Любой день' },
  ...[1, 2, 3, 4, 5, 6, 7].map((day) => ({
    value: day,
    label: DAY_FULL[day],
  })),
];

/**
 * Минимальный возраст направления или null, если он не указан.
 * «Гитара 7+» → 7, «Театр» → null.
 */
export const getDirectionMinAge = (direction) => {
  const label = extractAgeLabel(direction?.name);

  if (!label) {
    return null;
  }

  const value = parseInt(label, 10);

  return Number.isFinite(value) ? value : null;
};

/**
 * Список тарифов, которые реально встречаются у направлений.
 * Пустых вариантов в фильтре быть не должно.
 */
export const buildPlanFilters = (directions = []) => {
  const plans = new Map();

  directions.forEach((direction) => {
    const plan = direction?.subscriptionType;

    if (plan?.id && !plans.has(plan.id)) {
      plans.set(plan.id, { value: plan.id, label: plan.name });
    }
  });

  return [{ value: 'all', label: 'Все тарифы' }, ...plans.values()];
};

/**
 * Список преподавателей, которые реально ведут занятия.
 * Собирается из слотов направлений — выдуманных имён нет.
 */
export const buildTeacherFilters = (directions = []) => {
  const teachers = new Map();

  directions.forEach((direction) => {
    (direction?.schedules ?? []).forEach((schedule) => {
      const teacher = schedule?.teacher;

      if (!teacher?.id || teachers.has(teacher.id)) {
        return;
      }

      const name = [teacher.firstName, teacher.lastName]
        .filter(Boolean)
        .join(' ');

      teachers.set(teacher.id, {
        value: teacher.id,
        label: name || 'Преподаватель',
      });
    });
  });

  return [{ value: 'all', label: 'Все преподаватели' }, ...teachers.values()];
};

/** Сколько фильтров сейчас включено — для подписи «Сбросить» */
export const countActiveFilters = (filters = EMPTY_FILTERS) => {
  return Object.keys(EMPTY_FILTERS).filter(
    (key) => filters[key] !== EMPTY_FILTERS[key],
  ).length;
};

/**
 * Применение фильтров к списку направлений.
 *
 * Направления без указанного возраста («Театр») подходят
 * под любой возрастной фильтр — их не прячем.
 */
export const filterDirections = (directions = [], filters = EMPTY_FILTERS) => {
  const age = AGE_FILTERS.find((item) => item.value === filters.age);

  return directions.filter((direction) => {
    /* Возраст: минимальный возраст направления не выше выбранного */
    if (age?.maxAge !== undefined) {
      const minAge = getDirectionMinAge(direction);

      if (minAge !== null && minAge > age.maxAge) {
        return false;
      }
    }

    /* Тариф: сравниваем с подпиской, к которой привязано направление */
    if (filters.plan !== 'all' && direction.subscriptionTypeId !== filters.plan) {
      return false;
    }

    const schedules = direction.schedules ?? [];

    /* День недели: хотя бы один слот в выбранный день */
    if (filters.day !== 'all') {
      const hasDay = schedules.some((item) => item.dayOfWeek === filters.day);

      if (!hasDay) {
        return false;
      }
    }

    /* Формат: хотя бы один слот нужного вида */
    if (filters.format !== 'all') {
      const hasFormat = schedules.some((item) => item.kind === filters.format);

      if (!hasFormat) {
        return false;
      }
    }

    /* Преподаватель: хотя бы один слот ведёт выбранный педагог */
    if (filters.teacher !== 'all') {
      const hasTeacher = schedules.some(
        (item) => item.teacher?.id === filters.teacher,
      );

      if (!hasTeacher) {
        return false;
      }
    }

    return true;
  });
};
