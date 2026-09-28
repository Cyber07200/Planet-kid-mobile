import React, { useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Icon } from '../../components/ui/Icon';

import { Screen } from '../../components/ui/Screen';
import { AppButton } from '../../components/ui/AppButton';
import { useAuth } from '../../context/AuthContext';
import { colors, fs, layout, s, text, withAlpha } from '../../theme';

/**
 * Онбординг после регистрации — фреймы «Add Child»
 * [92:949], [92:1452] и [92:1537].
 *
 * Иллюстрация в макете — это «сцена» 500x450, внутри которой
 * элементы стоят на своих координатах: размытый круг, карточки
 * и таблетки с подписями. Здесь сделано так же: координаты
 * взяты из макета и прогоняются через s(), поэтому композиция
 * не разъезжается на любом экране.
 */

/** Высота сцены из макета */
const STAGE_HEIGHT = 450;

/* Таблетка из макета: 46 в высоту, радиус 20, заливка 10% */
const Pill = ({ label, left, top, width }) => (
  <View style={[styles.pill, { left: s(left), top: s(top), width: s(width) }]}>
    <Text style={styles.pillLabel} numberOfLines={1} adjustsFontSizeToFit>
      {label}
    </Text>
  </View>
);

/* Карточка тарифа: 280x114, повёрнута на -15°, с тенью */
const PlanCard = ({ title, subtitle, color, left, top }) => (
  <View
    style={[
      styles.planCard,
      { backgroundColor: color, left: s(left), top: s(top) },
    ]}
  >
    <View style={styles.planHeader}>
      <Icon name="credit-card" size={fs(35)} color={colors.white} />
      <Text style={styles.planTitle} numberOfLines={1}>
        {title}
      </Text>
    </View>

    <Text style={styles.planSubtitle} numberOfLines={1}>
      {subtitle}
    </Text>
  </View>
);

/* ------------------------- Слайд 1 ------------------------- */

const AboutStage = () => (
  <>
    <View style={styles.aboutBlob} />

    {/* Телефон в макете наклонён на -17° */}
    <Icon
      name="smartphone"
      size={fs(216)}
      color={colors.primary}
      style={styles.aboutPhone}
    />

    <Pill label="Удобно записываться" left={202} top={5} width={287} />
    <Pill label="Узнавать о занятиях" left={10} top={69} width={278} />
    <Pill label="Быть в курсе нового" left={220} top={342} width={269} />
    <Pill label="И получать уведомления" left={58} top={399} width={317} />
  </>
);

/* ------------------------- Слайд 2 ------------------------- */

const PlansStage = () => (
  <>
    <View style={styles.plansBlob} />

    {/*
      В макете карточки лежат внахлёст и повёрнуты на -15°.
      left/top — это центр повёрнутой карточки из макета,
      пересчитанный в левый верхний угол: RN вращает
      относительно центра, Figma — относительно угла.
    */}
    <PlanCard
      title="Премиум"
      subtitle="Все направления"
      color={colors.planPremium}
      left={35}
      top={105.8}
    />

    <PlanCard
      title="Стандарт"
      subtitle="50% направлений"
      color={colors.planStandard}
      left={110}
      top={178.8}
    />

    <PlanCard
      title="Стартовая"
      subtitle="30% направлений"
      color={colors.planStart}
      left={185}
      top={229.8}
    />

    <Pill label="Удобно продлить" left={259} top={17} width={239} />
    <Pill label="Быстро пополнить" left={-1} top={57} width={260} />
    <Pill label="Одна подписка" left={8} top={310} width={209} />
    <Pill label="Много направлений" left={225} top={341} width={263} />
  </>
);

/* ------------------------- Слайд 3 ------------------------- */

const ControlStage = () => (
  <>
    <View style={styles.controlBlob} />

    {/* Карточка занятия — лежит ниже и наклонена на -5° */}
    <View style={styles.controlLesson}>
      <View style={styles.controlLessonRow}>
        <View style={styles.controlLessonTitleRow}>
          <Text style={styles.controlLessonName}>Робототехника</Text>
          <Text style={styles.controlLessonAge}>7+</Text>
        </View>

        <Text style={styles.controlLessonTime}>17:00</Text>
      </View>

      <Text style={styles.controlLessonBooked}>Вы записаны!</Text>
    </View>

    {/* Уведомление — наклонено на +5° и слегка перекрывает карточку */}
    <View style={styles.controlNotice}>
      <Icon name="bell" size={fs(32)} color={colors.white} />

      <Text style={styles.controlNoticeText}>
        Сегодня Миша записан на занятие «Робототехника» в 17:00
      </Text>
    </View>
  </>
);

const SLIDES = [
  {
    key: 'about',
    header: 'Немного о приложении',
    title: 'Всё для развития в одном месте',
    description:
      'Рисование, робототехника, театр, шахматы, программирование и пластилинография. Десятки направлений для детей от 1 до 14 лет.',
    Stage: AboutStage,
  },
  {
    key: 'subscription',
    title: 'Одна подписка - много направлений',
    description:
      'Ходите на разные занятия без лишних абонементов. Три тарифа — доступ ко всем направлениям. Пробуйте новое, не переплачивая.',
    Stage: PlansStage,
  },
  {
    key: 'control',
    title: 'Всё под контролем',
    description:
      'Записывайте детей за минуту, следите за расписанием в календаре, получайте напоминания и копите баллы. Один аккаунт — все ваши дети.',
    Stage: ControlStage,
  },
];

const Slide = ({ slide, width }) => {
  const { Stage } = slide;

  return (
    <View style={[styles.slide, { width }]}>
      {slide.header ? <Text style={styles.header}>{slide.header}</Text> : null}

      <View style={styles.stage}>
        <Stage />
      </View>

      <View style={styles.textBlock}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>
    </View>
  );
};

export const OnboardingScreen = () => {
  const { width } = useWindowDimensions();
  const { completeOnboarding } = useAuth();

  const listRef = useRef(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  const goNext = () => {
    if (isLast) {
      completeOnboarding();
      return;
    }

    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  const handleScroll = (event) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);

    if (nextIndex !== index) {
      setIndex(nextIndex);
    }
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => <Slide slide={item} width={width} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        getItemLayout={(_, itemIndex) => ({
          length: width,
          offset: width * itemIndex,
          index: itemIndex,
        })}
      />

      <View style={styles.dots}>
        {SLIDES.map((slide, dotIndex) => (
          <View
            key={slide.key}
            style={[styles.dot, dotIndex === index ? styles.dotActive : null]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <AppButton title={isLast ? 'Начать' : 'Далее'} onPress={goNext} />

        {!isLast ? (
          <Pressable
            onPress={completeOnboarding}
            style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.skipLabel}>Пропустить</Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  slide: {
    flex: 1,
    paddingTop: s(20),
  },
  header: {
    ...text.screenTitle,
    color: colors.text80,
    textAlign: 'center',
    paddingHorizontal: layout.gutter,
  },
  stage: {
    height: s(STAGE_HEIGHT),
    marginTop: s(30),
  },

  /* ---------------------- общие элементы ---------------------- */

  pill: {
    position: 'absolute',
    height: s(46),
    borderRadius: layout.radius.md,
    backgroundColor: colors.primary10,
    borderWidth: 1,
    borderColor: colors.white30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(20),
  },
  pillLabel: {
    fontFamily: text.caption.fontFamily,
    fontSize: fs(20),
    color: colors.primary,
  },

  /* ------------------------- слайд 1 -------------------------- */

  aboutBlob: {
    position: 'absolute',
    left: s(64),
    top: s(39),
    width: s(372),
    height: s(372),
    borderRadius: s(186),
    backgroundColor: colors.primary30,
  },
  /*
   * left/top — центр повёрнутой иконки из макета, пересчитанный
   * в левый верхний угол: RN вращает относительно центра,
   * а Figma — относительно угла.
   */
  aboutPhone: {
    position: 'absolute',
    left: s(142),
    top: s(117),
    transform: [{ rotate: '-17.09deg' }],
  },

  /* ------------------------- слайд 2 -------------------------- */

  plansBlob: {
    position: 'absolute',
    left: s(78),
    top: s(53),
    width: s(344),
    height: s(344),
    borderRadius: s(172),
    backgroundColor: withAlpha('#6E94F5', 0.4),
  },
  planCard: {
    position: 'absolute',
    width: s(280),
    height: s(114),
    borderRadius: s(23),
    borderTopRightRadius: s(35),
    padding: s(23),
    gap: s(18),
    transform: [{ rotate: '-15deg' }],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
  },
  planTitle: {
    fontFamily: text.caption.fontFamily,
    fontSize: fs(28),
    color: colors.white,
    flexShrink: 1,
  },
  planSubtitle: {
    fontFamily: text.caption.fontFamily,
    fontSize: fs(19),
    color: colors.white80,
  },

  /* ------------------------- слайд 3 -------------------------- */

  controlBlob: {
    position: 'absolute',
    left: s(35),
    top: s(64),
    width: s(429),
    height: s(315),
    borderRadius: s(215),
    backgroundColor: withAlpha('#E2E2E2', 0.5),
  },
  controlNotice: {
    position: 'absolute',
    /* центр повёрнутой карточки из макета, пересчитанный в угол */
    left: s(23.5),
    top: s(124),
    transform: [{ rotate: '5deg' }],
    width: s(460),
    height: s(78),
    borderRadius: layout.radius.md,
    backgroundColor: colors.orange,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    paddingHorizontal: s(20),
  },
  controlNoticeText: {
    fontFamily: text.cardBody.fontFamily,
    fontSize: fs(20),
    lineHeight: fs(20) * 1.2,
    color: colors.white,
    flex: 1,
  },
  controlLesson: {
    position: 'absolute',
    left: s(16),
    top: s(179),
    transform: [{ rotate: '-5deg' }],
    width: s(460),
    height: s(92),
    borderRadius: layout.radius.md,
    backgroundColor: withAlpha('#F6F6F6', 0.7),
    borderWidth: 1,
    borderColor: colors.primary,
    padding: s(20),
    gap: s(20),
  },
  controlLessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlLessonTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
  },
  controlLessonName: {
    ...text.cardTitle,
  },
  controlLessonAge: {
    ...text.cardTitle,
    color: colors.primary,
  },
  controlLessonTime: {
    ...text.cardTitle,
    color: colors.text70,
  },
  controlLessonBooked: {
    ...text.cardTitle,
    color: colors.primary,
  },

  /* ---------------------- текст под сценой -------------------- */

  textBlock: {
    marginTop: s(50),
    paddingHorizontal: layout.gutter,
    gap: s(25),
  },
  title: {
    ...text.sectionTitle,
    color: colors.text80,
  },
  description: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(20),
    lineHeight: fs(20) * 1.4,
    color: colors.text60,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: s(8),
    paddingVertical: s(16),
  },
  dot: {
    width: s(8),
    height: s(8),
    borderRadius: s(4),
    backgroundColor: colors.text10,
  },
  dotActive: {
    width: s(24),
    backgroundColor: colors.primary,
  },
  footer: {
    paddingHorizontal: s(50),
    paddingBottom: s(20),
    gap: s(14),
  },
  skip: {
    alignSelf: 'center',
  },
  skipLabel: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(20),
    color: colors.text80,
  },
  pressed: {
    opacity: 0.85,
  },
});
