import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';

import { colors, fs, s, text } from '../../theme';
import { getInitials } from '../../utils/format';

/**
 * Аватар: изображение из базы, иначе инициалы, иначе иконка.
 * В макете это круг с фото или серый круг с иконкой пользователя.
 */
export const Avatar = ({
  uri,
  firstName,
  lastName,
  size = 52,
  variant = 'muted',
  style,
}) => {
  const dimension = s(size);

  const backgroundColor =
    variant === 'primary' ? colors.primary : colors.text10;

  const iconColor = variant === 'primary' ? colors.white : colors.text60;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.image,
          { width: dimension, height: dimension, borderRadius: dimension / 2 },
          style,
        ]}
        resizeMode="cover"
      />
    );
  }

  const initials = getInitials(firstName, lastName);

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor,
        },
        style,
      ]}
    >
      {initials && initials !== '?' ? (
        <Text
          style={[
            styles.initials,
            { color: iconColor, fontSize: fs(size * 0.36) },
          ]}
        >
          {initials}
        </Text>
      ) : (
        <Icon name="user" size={fs(size * 0.5)} color={iconColor} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.text10,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: text.sectionTitle.fontFamily,
  },
});
