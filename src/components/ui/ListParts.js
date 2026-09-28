import React from 'react';
import { RefreshControl, View } from 'react-native';

import { colors, s } from '../../theme';

/**
 * Мелкие общие части списков.
 *
 * Разделитель объявлен на уровне модуля: стрелочная функция
 * в ItemSeparatorComponent создаётся на каждом рендере, и React
 * пересоздаёт все разделители списка.
 */
const separatorStyle = { height: s(10) };

export const ListSeparator = () => <View style={separatorStyle} />;

/** Pull-to-refresh в цветах приложения */
export const refreshControl = (refreshing, onRefresh) => (
  <RefreshControl
    refreshing={refreshing}
    onRefresh={onRefresh}
    tintColor={colors.primary}
    colors={[colors.primary]}
  />
);
