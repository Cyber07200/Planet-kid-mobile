import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../ui/Icon';

import { colors, fs, gradients, layout, s, shadows, text } from '../../theme';

/*
 * setLayoutAnimationEnabledExperimental не нужен: в новой архитектуре
 * (newArchEnabled) LayoutAnimation на Android включён всегда,
 * а вызов только печатал предупреждение.
 */

/** Мягкая «желейная» пружина — общая для всех анимаций панели */
const JELLY = {
  friction: 5,
  tension: 160,
  useNativeDriver: true,
};

/**
 * Одна вкладка панели.
 *
 * Активная вкладка — «таблетка» с иконкой и подписью
 * (как в макете), неактивная — только иконка.
 *
 * Анимация: при выборе вкладка коротко «пружинит» —
 * сжимается и возвращается с лёгким перелётом, иконка
 * подпрыгивает, подпись проявляется. Всё считается
 * на нативной стороне (useNativeDriver), поэтому
 * анимация не тормозит при переключении экранов.
 */
const TabItem = ({ label, iconName, isFocused, onPress, onLongPress }) => {
  /* 0 — вкладка неактивна, 1 — активна */
  const focus = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  /* Отдельное значение для нажатия: сжатие пальцем */
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isFocused) {
      /* Перелёт и возврат — то самое «желе» */
      focus.setValue(0.6);

      Animated.spring(focus, { toValue: 1, ...JELLY }).start();
    } else {
      Animated.timing(focus, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start();
    }
  }, [focus, isFocused]);

  const handlePressIn = () => {
    Animated.spring(press, { toValue: 0.92, ...JELLY }).start();
  };

  const handlePressOut = () => {
    Animated.spring(press, { toValue: 1, ...JELLY }).start();
  };

  /* Узлы анимации создаём один раз, а не на каждом рендере */
  const { scale, iconShift, labelOpacity } = useMemo(
    () => ({
      /* Масштаб таблетки: чуть «раздувается» при появлении */
      scale: Animated.multiply(
        press,
        focus.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.94, 1] }),
      ),
      /* Иконка подпрыгивает вверх и возвращается */
      iconShift: focus.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, s(3), 0] }),
      /* Подпись проявляется вместе с таблеткой */
      labelOpacity: focus.interpolate({
        inputRange: [0.6, 1],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
    }),
    [focus, press],
  );

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
      style={isFocused ? styles.tabActiveArea : styles.tabInactiveArea}
    >
      <Animated.View
        style={[
          styles.tab,
          isFocused ? styles.tabActive : null,
          { transform: [{ scale }] },
        ]}
      >
        <Animated.View style={{ transform: [{ translateY: iconShift }] }}>
          <Icon
            name={iconName}
            size={fs(24)}
            color={isFocused ? colors.white : colors.text}
          />
        </Animated.View>

        {/* Название остаётся у активной вкладки — как и раньше */}
        {isFocused ? (
          <Animated.Text
            style={[styles.label, { opacity: labelOpacity }]}
            numberOfLines={1}
          >
            {label}
          </Animated.Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
};

/**
 * Плавающая нижняя навигация из макета.
 *
 * Frame 12 в Figma:
 *   градиент #F1F1F1 → #ECECEC, прозрачность 80%
 *   обводка #D3D3D3 @10%, радиус 30, высота 54, внутренний отступ 5
 *
 * Активная вкладка — «таблетка» #7599F5 радиусом 40
 * с иконкой и подписью, неактивные — только иконка.
 */
export const FloatingTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  /* Ширина таблетки меняется мягко, а не рывком */
  useEffect(() => {
    LayoutAnimation.configureNext({
      duration: 260,
      update: { type: LayoutAnimation.Types.spring, springDamping: 0.7 },
    });
  }, [state.index]);

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: Math.max(insets.bottom, s(12)) },
      ]}
    >
      <LinearGradient
        colors={gradients.tabBar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bar}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];

          const isFocused = state.index === index;

          const label = options.tabBarLabel ?? options.title ?? route.name;
          const iconName = options.tabBarIconName ?? 'circle';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TabItem
              key={route.key}
              label={label}
              iconName={iconName}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    pointerEvents: 'box-none',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: layout.gutter,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: layout.tabBar,
    borderRadius: layout.radius.lg,
    paddingHorizontal: s(5),
    borderWidth: 1,
    /* В макете обводка #D3D3D3 на 10%, ширина панели 415 из 500 */
    borderColor: 'rgba(211, 211, 211, 0.1)',
    ...shadows.card,
    maxWidth: s(415),
    width: '100%',
    overflow: 'hidden',
  },
  /* Активная вкладка растягивается, неактивные — по содержимому */
  tabActiveArea: {
    flexGrow: 1,
    flexShrink: 1,
  },
  tabInactiveArea: {
    flexGrow: 1,
    flexShrink: 0,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(5),
    height: s(44),
    borderRadius: layout.radius.pill,
  },
  tabActive: {
    backgroundColor: colors.primaryPressed,
    paddingHorizontal: s(20),
  },
  label: {
    ...text.tabLabel,
    flexShrink: 1,
  },
});
