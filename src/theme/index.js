/**
 * Точка сборки темы: цвета, типографика, отступы и масштаб.
 *
 * Экраны импортируют всё отсюда одной строкой,
 * поэтому размеры и цвета макета лежат в одном месте.
 */
export { colors, gradients, withAlpha } from './colors';
export { fonts, text } from './typography';
export { s, fs, layout, shadows, screenWidth, screenHeight } from './layout';
