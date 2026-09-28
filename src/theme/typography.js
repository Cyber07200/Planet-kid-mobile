import { fs } from './layout';
import { colors } from './colors';

/**
 * В макете используются два семейства:
 *   Comfortaa  — основной шрифт интерфейса
 *   Montserrat — поля ввода и часть кнопок
 */

export const fonts = {
  regular: 'Comfortaa_400Regular',
  medium: 'Comfortaa_500Medium',
  semibold: 'Comfortaa_600SemiBold',
  bold: 'Comfortaa_700Bold',

  inputRegular: 'Montserrat_400Regular',
  inputMedium: 'Montserrat_500Medium',
  inputSemibold: 'Montserrat_600SemiBold',
  inputBold: 'Montserrat_700Bold',
};

/**
 * Готовые текстовые стили.
 * Размеры — прямо из Figma (font=NN в макете).
 */
export const text = {
  /* Заголовок экрана: font=32 Comfortaa Bold */
  screenTitle: {
    fontFamily: fonts.bold,
    fontSize: fs(32),
    color: colors.text,
    lineHeight: fs(32) * 1.1,
  },

  /* Заголовок в шапке: font=24 Comfortaa SemiBold */
  headerTitle: {
    fontFamily: fonts.semibold,
    fontSize: fs(24),
    color: colors.text,
    lineHeight: fs(24) * 1.1,
  },

  /* Крупный заголовок блока: font=24 Comfortaa Bold */
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: fs(24),
    color: colors.text,
    lineHeight: fs(24) * 1.1,
  },

  /* Подзаголовок списка: font=20 Comfortaa Medium */
  sectionLabel: {
    fontFamily: fonts.medium,
    fontSize: fs(20),
    color: colors.text,
    lineHeight: fs(20) * 1.1,
  },

  /* Заголовок группы в ленте («Сегодня»): font=20 Comfortaa SemiBold */
  sectionHeading: {
    fontFamily: fonts.semibold,
    fontSize: fs(20),
    color: colors.text,
    lineHeight: fs(20) * 1.1,
  },

  /* Название карточки: font=20 Comfortaa Medium */
  cardTitle: {
    fontFamily: fonts.medium,
    fontSize: fs(20),
    color: colors.text,
    lineHeight: fs(20) * 1.15,
  },

  /* Подпись в карточке: font=15 Comfortaa Medium */
  cardBody: {
    fontFamily: fonts.medium,
    fontSize: fs(15),
    color: colors.text70,
    lineHeight: fs(15) * 1.35,
  },

  /* Основной текст: font=16 Comfortaa Medium */
  body: {
    fontFamily: fonts.medium,
    fontSize: fs(16),
    color: colors.text,
    lineHeight: fs(16) * 1.35,
  },

  /* Мелкая подпись: font=13 Comfortaa SemiBold */
  caption: {
    fontFamily: fonts.semibold,
    fontSize: fs(13),
    color: colors.text80,
    lineHeight: fs(13) * 1.25,
  },

  /* Совсем мелкая подпись: font=12 Comfortaa Medium */
  hint: {
    fontFamily: fonts.medium,
    fontSize: fs(12),
    color: colors.text80,
    lineHeight: fs(12) * 1.3,
  },

  /* Текст кнопки: font=24 Comfortaa Bold */
  button: {
    fontFamily: fonts.bold,
    fontSize: fs(24),
    color: colors.white,
    lineHeight: fs(24) * 1.15,
  },

  /* Маленькая кнопка: font=20 Comfortaa Bold */
  buttonSmall: {
    fontFamily: fonts.bold,
    fontSize: fs(20),
    color: colors.white,
    lineHeight: fs(20) * 1.15,
  },

  /* Подпись поля: font=24 Comfortaa SemiBold */
  label: {
    fontFamily: fonts.semibold,
    fontSize: fs(24),
    color: colors.text,
    lineHeight: fs(24) * 1.15,
  },

  /* Значение поля ввода: font=22 Montserrat Medium */
  input: {
    fontFamily: fonts.inputMedium,
    fontSize: fs(22),
    color: colors.text,
  },

  /* Ссылка внизу экрана: font=16 Montserrat Regular */
  link: {
    fontFamily: fonts.inputRegular,
    fontSize: fs(16),
    color: colors.text,
    lineHeight: fs(16) * 1.4,
  },

  /* Ярлык дня недели: font=12 Comfortaa Bold */
  dayChip: {
    fontFamily: fonts.bold,
    fontSize: fs(12),
    color: colors.white,
    lineHeight: fs(12) * 1.1,
  },

  /* Цифра в календаре: font=23 Comfortaa SemiBold */
  dayNumber: {
    fontFamily: fonts.semibold,
    fontSize: fs(23),
    lineHeight: fs(23) * 1.05,
  },

  /* Название дня в календаре: font=13 Comfortaa Regular */
  dayName: {
    fontFamily: fonts.regular,
    fontSize: fs(13),
    lineHeight: fs(13) * 1.2,
  },

  /* Крупная цифра статистики: font=40 Comfortaa SemiBold */
  stat: {
    fontFamily: fonts.semibold,
    fontSize: fs(40),
    color: colors.text,
    lineHeight: fs(40) * 1.1,
  },

  /* Итоговая сумма: font=40 Comfortaa Bold */
  amount: {
    fontFamily: fonts.bold,
    fontSize: fs(40),
    color: colors.primary,
    lineHeight: fs(40) * 1.15,
  },

  /* Подпись в табе: font=16 Comfortaa Bold */
  tabLabel: {
    fontFamily: fonts.bold,
    fontSize: fs(16),
    color: colors.white,
    lineHeight: fs(16) * 1.1,
  },
};
