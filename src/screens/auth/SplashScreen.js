import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors, fs, layout, s, screenHeight, screenWidth, text } from '../../theme';

/**
 * Стартовый экран — макет «Splash».
 *
 * В Figma: большой синий круг по центру, надпись
 * «Дети на планете» 48pt, вокруг — «реплики» детей
 * в синих таблетках, снизу большой эллипс с текстом.
 *
 * Анимация появления (лёгкая, без сторонних библиотек):
 *   круг за логотипом мягко «дышит»;
 *   логотип всплывает и слегка увеличивается;
 *   реплики детей появляются по очереди сверху вниз;
 *   нижний эллипс выезжает снизу.
 * Всё считается нативно (useNativeDriver), поэтому
 * заставка не подтормаживает на слабых телефонах.
 */

const BUBBLES = [
  { text: 'Было интересно?', left: 6, top: 104, width: 169 },
  { text: 'Мам, это я сам сделал!', left: 259, top: 126, width: 212 },
  { text: 'А что сегодня делали на занятии?', left: 51, top: 176, width: 309 },
  { text: 'Мам, а завтра будет урок?', left: 16, top: 240, width: 248 },
  { text: 'Может попробуем это?', left: 219, top: 304, width: 219 },
];

export const SplashScreen = ({ onFinish }) => {
  /* Общее появление логотипа: 0 — скрыт, 1 — на месте */
  const logo = useRef(new Animated.Value(0)).current;

  /* Пульсация круга за логотипом */
  const pulse = useRef(new Animated.Value(0)).current;

  /* Выезд нижнего эллипса */
  const bottom = useRef(new Animated.Value(0)).current;

  /* По одному значению на каждую реплику — появляются по очереди */
  const bubbleValues = useMemo(
    () => BUBBLES.map(() => new Animated.Value(0)),
    [],
  );

  useEffect(() => {
    /* Логотип и эллипс появляются сразу, реплики — лесенкой */
    Animated.parallel([
      Animated.spring(logo, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(bottom, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.stagger(
        90,
        bubbleValues.map((value) =>
          Animated.spring(value, {
            toValue: 1,
            friction: 7,
            tension: 70,
            useNativeDriver: true,
          }),
        ),
      ),
    ]).start();

    /* Круг «дышит» до самого перехода дальше */
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    breathing.start();

    return () => breathing.stop();
  }, [bottom, bubbleValues, logo, pulse]);

  useEffect(() => {
    /* Даём анимации доиграть: заставка живёт чуть дольше */
    const timer = setTimeout(() => {
      onFinish?.();
    }, 2200);

    return () => clearTimeout(timer);
  }, [onFinish]);

  /* Пропорции макета: 500 x 1033 */
  const scaleX = screenWidth / 500;
  const scaleY = screenHeight / 1033;

  return (
    <View style={styles.container}>
      {BUBBLES.map((bubble, index) => (
        <Animated.View
          key={bubble.text}
          style={[
            styles.bubble,
            {
              left: bubble.left * scaleX,
              top: bubble.top * scaleY,
              maxWidth: bubble.width * scaleX,
              opacity: bubbleValues[index],
              transform: [
                { scale: bubbleValues[index] },
                {
                  translateY: bubbleValues[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [s(12), 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text
            style={styles.bubbleText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {bubble.text}
          </Text>
        </Animated.View>
      ))}

      <View style={styles.center}>
        <Animated.View
          style={[
            styles.circle,
            {
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.12],
                  }),
                },
              ],
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.25, 0.35],
              }),
            },
          ]}
        />

        <Animated.Text
          style={[
            styles.logo,
            {
              opacity: logo,
              transform: [
                {
                  translateY: logo.interpolate({
                    inputRange: [0, 1],
                    outputRange: [s(24), 0],
                  }),
                },
                {
                  scale: logo.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {'Дети\nна планете'}
        </Animated.Text>
      </View>

      <Animated.View
        style={[
          styles.bottomEllipse,
          {
            opacity: bottom,
            transform: [
              {
                translateY: bottom.interpolate({
                  inputRange: [0, 1],
                  outputRange: [s(120), 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.tagline}>
          Мобильное приложение, в котором есть все, чтобы ваш ребенок каждый день
          узнавал что-то новое!
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bubble: {
    position: 'absolute',
    /* В макете таблетки реплик — основной цвет на 80% */
    backgroundColor: colors.primary80,
    borderRadius: layout.radius.md,
    paddingHorizontal: s(10),
    paddingVertical: s(10),
  },
  bubbleText: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(15),
    color: colors.white,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    width: s(246),
    height: s(246),
    borderRadius: s(123),
    backgroundColor: colors.primary,
  },
  logo: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(48),
    lineHeight: fs(48) * 1.1,
    color: colors.primary,
    textAlign: 'center',
  },
  bottomEllipse: {
    height: s(220),
    backgroundColor: colors.primary,
    borderTopLeftRadius: s(400),
    borderTopRightRadius: s(400),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(45),
    paddingTop: s(50),
    marginHorizontal: -s(90),
  },
  tagline: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(16),
    lineHeight: fs(16) * 1.2,
    color: colors.white80,
    textAlign: 'center',
  },
});
