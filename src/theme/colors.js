/**
 * Палитра вытащена напрямую из Figma-макета
 * (Childrens cnent.fig, страница Page 1).
 *
 * Значения не выдуманы — это точные HEX из макета,
 * отсортированные по частоте использования.
 */

const withAlpha = (hex, alpha) => {
  const value = hex.replace('#', '');

  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const base = {
  primary: '#6E94F5',
  primaryPressed: '#7599F5',
  primaryLight: '#82A8FF',
  primarySoft: '#7FA1F5',

  text: '#323232',
  white: '#FFFFFF',

  background: '#FAFAFA',
  surface: '#F6F6F6',

  orange: '#FFB33A',
  orangeDeep: '#FAA51D',

  green: '#64F651',
  red: '#FF0000',
  redSoft: '#F06E58',
  redAlert: '#FF573A',

  purple: '#8166E4',
  violet: '#A187FF',
  sand: '#EA9952',

  /* Цвета карточек тарифов из онбординга */
  planPremium: '#749CFF',
  planStandard: '#A187FF',
  planStart: '#EA9952',

  statusBar: '#1D1E20',
  tabBarFrom: '#F1F1F1',
  tabBarTo: '#ECECEC',
  tabBarBorder: '#D3D3D3',
  divider: '#D9D9D9',
};

export const colors = {
  ...base,

  /* Прозрачные варианты — тоже из макета */
  primary10: withAlpha(base.primary, 0.1),
  primary20: withAlpha(base.primary, 0.2),
  primary30: withAlpha(base.primary, 0.3),
  primary50: withAlpha(base.primary, 0.5),
  primary60: withAlpha(base.primary, 0.6),
  primary80: withAlpha(base.primary, 0.8),

  primaryPressed10: withAlpha(base.primaryPressed, 0.1),

  text10: withAlpha(base.text, 0.1),
  text40: withAlpha(base.text, 0.4),
  text60: withAlpha(base.text, 0.6),
  text70: withAlpha(base.text, 0.7),
  text80: withAlpha(base.text, 0.8),
  text90: withAlpha(base.text, 0.9),

  white10: withAlpha(base.white, 0.1),
  white20: withAlpha(base.white, 0.2),
  white30: withAlpha(base.white, 0.3),
  white40: withAlpha(base.white, 0.4),
  white60: withAlpha(base.white, 0.6),
  white70: withAlpha(base.white, 0.7),
  white80: withAlpha(base.white, 0.8),

  orange80: withAlpha(base.orange, 0.8),
  orange70: withAlpha(base.orangeDeep, 0.7),

  red50: withAlpha(base.red, 0.5),
  redAlert80: withAlpha(base.redAlert, 0.8),

  overlay: withAlpha(base.text, 0.4),
  shadow: withAlpha('#000000', 0.15),
};

export const gradients = {
  /* Frame 17 / Frame 4 из макета Home */
  primary: ['#6E94F5', '#82A8FF'],
  primarySoft: ['#6E94F5', '#7FA1F5'],

  /* Карточка «Подписка не оформлена» — Frame 17 из макета Home */
  inactive: ['rgba(50, 50, 50, 0.8)', 'rgba(70, 70, 70, 0.8)'],

  /* BottomTabBar — Frame 12 */
  tabBar: ['#F1F1F1', '#ECECEC'],

  /* Затухание фона под нижней навигацией */
  fade: ['rgba(250,250,250,0)', '#FAFAFA'],
  fadeDown: ['#FAFAFA', 'rgba(250,250,250,0)'],
};

export { withAlpha };
