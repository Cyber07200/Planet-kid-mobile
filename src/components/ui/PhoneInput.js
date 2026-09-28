import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fs, layout, s, text } from '../../theme';
import { formatPhoneBody } from '../../utils/phone';

/**
 * Поле телефона из макета Authorization:
 * слева блок «+7» с флагом-разделителем, справа маска (999) 999-99-99.
 */
export const PhoneInput = ({ value, onChangeText, autoFocus = false, error }) => {
  const handleChange = (raw) => {
    onChangeText(formatPhoneBody(raw));
  };

  return (
    <View>
      <View style={[styles.container, error ? styles.containerError : null]}>
        <View style={styles.prefix}>
          <View style={styles.flag}>
            <View style={styles.flagWhite} />
            <View style={styles.flagBlue} />
            <View style={styles.flagRed} />
          </View>

          <Text style={styles.prefixText}>+7</Text>

          <View style={styles.divider} />
        </View>

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChange}
          placeholder="(999) 999-99-99"
          placeholderTextColor={colors.primary60}
          keyboardType="phone-pad"
          autoFocus={autoFocus}
          maxLength={15}
          textContentType="telephoneNumber"
          underlineColorAndroid="transparent"
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: layout.input,
    borderRadius: layout.radius.md,
    backgroundColor: colors.primary20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(20),
    borderWidth: 1,
    borderColor: 'transparent',
  },
  containerError: {
    borderColor: colors.red50,
  },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
  },
  flag: {
    width: s(30),
    height: s(22),
    borderRadius: s(2),
    overflow: 'hidden',
  },
  flagWhite: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flagBlue: {
    flex: 1,
    backgroundColor: '#0039A6',
  },
  flagRed: {
    flex: 1,
    backgroundColor: '#D52B1E',
  },
  prefixText: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(24),
    color: colors.primary,
  },
  divider: {
    width: s(2),
    height: s(40),
    borderRadius: s(2),
    backgroundColor: colors.primary,
    marginLeft: s(4),
  },
  input: {
    flex: 1,
    marginLeft: s(14),
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(24),
    color: colors.primary,
    padding: 0,
    height: '100%',
  },
  error: {
    ...text.caption,
    color: colors.red50,
    marginTop: s(8),
  },
});
