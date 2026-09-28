import { Dimensions, PixelRatio, Platform } from 'react-native';

/**
 * Макет в Figma нарисован во фрейме шириной 500 (высота 1033).
 *
 * Чтобы приложение выглядело одинаково на маленьких
 * и больших телефонах, все размеры из макета прогоняются
 * через scale(), который пересчитывает их
 * относительно ширины реального экрана.
 */

const DESIGN_WIDTH = 500;

const { width, height } = Dimensions.get('window');

export const screenWidth = width;
export const screenHeight = height;

/*
 * На планшетах не даём макету бесконечно растягиваться:
 * ограничиваем эффективную ширину.
 */
const effectiveWidth = Math.min(width, 560);

const ratio = effectiveWidth / DESIGN_WIDTH;

/**
 * Основная функция масштабирования размеров из макета.
 */
export const s = (size) => {
  return Math.round(size * ratio * 100) / 100;
};

/**
 * Масштабирование шрифтов.
 *
 * Отдельная функция, потому что для текста мы
 * немного сглаживаем коэффициент — иначе на очень
 * маленьких экранах текст становится нечитаемым.
 */
export const fs = (size) => {
  const scaled = size * (1 + (ratio - 1) * 0.85);

  return Math.round(PixelRatio.roundToNearestPixel(scaled) * 100) / 100;
};


export const layout = {
  /* Горизонтальный отступ контента: 20 из 500 в макете */
  gutter: s(20),

  /* Радиусы из макета */
  radius: {
    xs: s(5),
    sm: s(10),
    md: s(20),
    lg: s(30),
    pill: s(40),
    round: s(100),
  },

  /* Высоты элементов из макета */
  input: s(60),
  button: s(60),
  buttonSmall: s(46),
  tabBar: s(54),
  card: s(92),

  /* Универсальные отступы */
  gap: {
    xs: s(5),
    sm: s(10),
    md: s(15),
    lg: s(20),
    xl: s(25),
  },
};

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#6E94F5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
    },
    android: {
      elevation: 3,
    },
    default: {},
  }),

  elevated: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
    },
    android: {
      elevation: 8,
    },
    default: {},
  }),

  sheet: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: {
      elevation: 16,
    },
    default: {},
  }),
};
