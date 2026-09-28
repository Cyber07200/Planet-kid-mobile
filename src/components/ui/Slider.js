import React, { useCallback, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { colors, s } from '../../theme';

/* Высота блока: дорожка + число под ней (Frame 205 из макета) */
const valueHeight = s(69);

/**
 * Ползунок выбора количества занятий (экран «Подписка»).
 *
 * В макете: дорожка высотой 4 на фоне #323232 @10%,
 * заполнение #6E94F5, кружок 20x20.
 *
 * Написан на PanResponder, чтобы не тянуть в проект
 * дополнительную нативную зависимость.
 */
export const Slider = ({
  value,
  minimumValue = 0,
  maximumValue = 10,
  step = 1,
  onValueChange,
  disabled = false,
  valueLabel = null,
  style,
}) => {
  const [trackWidth, setTrackWidth] = useState(0);

  const trackWidthRef = useRef(0);
  const valueRef = useRef(value);

  valueRef.current = value;

  const range = Math.max(maximumValue - minimumValue, 1);

  const clamp = useCallback(
    (next) => Math.min(Math.max(next, minimumValue), maximumValue),
    [minimumValue, maximumValue],
  );

  const updateFromPosition = useCallback(
    (positionX) => {
      const width = trackWidthRef.current;

      if (!width) {
        return;
      }

      const ratio = Math.min(Math.max(positionX / width, 0), 1);

      const raw = minimumValue + ratio * range;

      const stepped = Math.round(raw / step) * step;

      const next = clamp(stepped);

      if (next !== valueRef.current) {
        onValueChange?.(next);
      }
    },
    [clamp, minimumValue, onValueChange, range, step],
  );

  const startPositionRef = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        startPositionRef.current = event.nativeEvent.locationX;

        updateFromPosition(event.nativeEvent.locationX);
      },
      onPanResponderMove: (event, gestureState) => {
        updateFromPosition(startPositionRef.current + gestureState.dx);
      },
    }),
  ).current;

  const progress = Math.min(
    Math.max((value - minimumValue) / range, 0),
    1,
  );

  const thumbSize = s(20);

  const thumbLeft = Math.max(
    0,
    Math.min(progress * trackWidth - thumbSize / 2, trackWidth - thumbSize),
  );

  return (
    <View
      style={[styles.container, disabled ? styles.disabled : null, style]}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;

        trackWidthRef.current = width;
        setTrackWidth(width);
      }}
      {...(disabled ? {} : panResponder.panHandlers)}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>

      <View
        style={[
          styles.thumb,
          {
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            left: thumbLeft,
          },
        ]}
      />

      {/* В макете выбранное число стоит ровно под кружком */}
      {valueLabel ? (
        <View
          style={[
            styles.valueLabel,
            { left: thumbLeft + thumbSize / 2 - s(40) },
          ]}
        >
          {valueLabel}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: valueHeight,
    justifyContent: 'flex-start',
    paddingTop: s(13),
  },
  track: {
    height: s(4),
    borderRadius: s(20),
    backgroundColor: colors.text10,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: s(30),
    backgroundColor: colors.primary,
  },
  thumb: {
    position: 'absolute',
    top: s(5),
    backgroundColor: colors.primary,
  },
  valueLabel: {
    pointerEvents: 'none',
    position: 'absolute',
    top: s(34),
    width: s(80),
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
