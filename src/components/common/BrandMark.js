import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fs, s, text } from '../../theme';

/**
 * Логотип «Дети на планете» — Frame 35 из макетов
 * Authorization и Registration: синий круг 123x123 @20%
 * и надпись в две строки поверх него.
 */
export const BrandMark = ({ style }) => (
  <View style={[styles.container, style]}>
    <View style={styles.circle} />

    <Text style={styles.title}>{'Дети\nна планете'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: s(156),
    height: s(123),
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  circle: {
    position: 'absolute',
    width: s(123),
    height: s(123),
    borderRadius: s(62),
    backgroundColor: colors.primary20,
  },
  title: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(24),
    lineHeight: fs(24) * 1.15,
    color: colors.primary,
    textAlign: 'center',
  },
});
