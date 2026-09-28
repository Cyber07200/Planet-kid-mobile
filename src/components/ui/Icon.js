import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

import { ICON_PATHS, ICON_VIEWBOX } from './iconPaths';
import { colors } from '../../theme/colors';
import { fs } from '../../theme/layout';

/**
 * Иконка из макета.
 *
 * Контуры лежат в iconPaths.js — они выгружены прямо из Figma,
 * поэтому это ровно те иконки, что нарисованы в макете,
 * а не похожий набор из сторонней библиотеки.
 *
 * Имена совпадают с привычными (feather-подобными), чтобы
 * не заводить второй словарь на стороне экранов.
 */

/* Часть иконок в макете — это одна и та же фигура под поворотом */
const ALIASES = {
  'arrow-up': { icon: 'arrowUp' },
  'arrow-down': { icon: 'arrowUp', rotate: 180 },
  'arrow-left': { icon: 'arrowUp', rotate: -90 },
  'arrow-right': { icon: 'arrowRight' },
  'arrow-up-right': { icon: 'arrowUpRight' },
  'arrow-down-left': { icon: 'arrowUpRight', rotate: 180 },

  'chevron-left': { icon: 'chevronLeft' },
  'chevron-right': { icon: 'chevronRight' },
  'chevron-down': { icon: 'caretDown' },
  'chevron-up': { icon: 'caretDown', rotate: 180 },

  'check-circle': { icon: 'checkCircle' },
  'check-all': { icon: 'checkAll' },
  'stop-sign': { icon: 'stopSign' },
  'credit-card': { icon: 'creditCard' },
  'help-circle': { icon: 'help' },
  'message-circle': { icon: 'chat' },
  'external-link': { icon: 'externalLink' },
  'book-open': { icon: 'book' },
  'bar-chart-2': { icon: 'chart' },
  'eye-off': { icon: 'eyeOff' },
  'edit-3': { icon: 'edit' },
  'trash-2': { icon: 'trash' },
  'plus-circle': { icon: 'plusCircle' },
  'phone-call': { icon: 'phoneCall' },
  'log-out': { icon: 'arrowUpRight' },

  /* В макете нет отдельной иконки предупреждения — используется «i» */
  'alert-circle': { icon: 'info' },
  inbox: { icon: 'bell' },
  users: { icon: 'user' },
  smartphone: { icon: 'mobile' },
  x: { icon: 'close' },
};

export const Icon = ({ name, size = 24, color = colors.text, style, rotate }) => {
  const alias = ALIASES[name] || { icon: name };

  const path = ICON_PATHS[alias.icon] || ICON_PATHS[name];

  if (!path) {
    return null;
  }

  const dimension = typeof size === 'number' ? size : fs(24);

  const rotation = rotate ?? alias.rotate ?? 0;

  const half = ICON_VIEWBOX / 2;

  return (
    <Svg
      width={dimension}
      height={dimension}
      viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
      style={style}
    >
      {rotation ? (
        <G transform={`rotate(${rotation} ${half} ${half})`}>
          <Path d={path} fill={color} />
        </G>
      ) : (
        <Path d={path} fill={color} />
      )}
    </Svg>
  );
};

