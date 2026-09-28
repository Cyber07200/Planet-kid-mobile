import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../ui/Avatar';
import { BottomSheet } from '../ui/BottomSheet';
import { LoadingState } from '../ui/States';
import { colors, layout, s, text } from '../../theme';
import { calculateAge, formatDayMonth, formatTime } from '../../utils/date';
import { getFullName, plural } from '../../utils/format';

/**
 * Дети, записанные на занятие в выбранную дату:
 * возраст, родитель и пометка разовой записи.
 */

const describeParticipant = (participant) => {
  const age = calculateAge(participant.birthDate);

  return [
    age !== null ? `${age} ${plural(age, 'год', 'года', 'лет')}` : null,
    participant.parentName ? `родитель: ${participant.parentName}` : null,
    participant.isOneOff ? 'разовое занятие' : null,
  ]
    .filter(Boolean)
    .join(' · ');
};

const ParticipantsBody = ({ loading, error, participants }) => {
  if (loading) {
    return <LoadingState label="Загружаем список..." />;
  }

  if (error) {
    return <Text style={[styles.message, styles.error]}>{error}</Text>;
  }

  if (participants.length === 0) {
    return <Text style={styles.message}>Пока никто не записался на этот день.</Text>;
  }

  return (
    <>
      <Text style={styles.section}>
        Записаны: {participants.length}{' '}
        {plural(participants.length, 'ребёнок', 'ребёнка', 'детей')}
      </Text>

      <View style={styles.list}>
        {participants.map((participant) => (
          <View key={participant.bookingId} style={styles.row}>
            <Avatar firstName={participant.firstName} lastName={participant.lastName} size={44} />

            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {getFullName(participant.firstName, participant.lastName)}
              </Text>

              <Text style={styles.meta} numberOfLines={1}>
                {describeParticipant(participant)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
};

export const ParticipantsSheet = ({ lesson, date, loading, error, participants, onClose }) => (
  <BottomSheet visible={Boolean(lesson)} onClose={onClose}>
    <Text style={styles.title}>{lesson?.name}</Text>

    <Text style={styles.subtitle}>
      {lesson
        ? `${formatDayMonth(date)} · ${formatTime(lesson.startTime)}–${formatTime(lesson.endTime)}`
        : ''}
    </Text>

    <ParticipantsBody loading={loading} error={error} participants={participants} />
  </BottomSheet>
);

const styles = StyleSheet.create({
  title: {
    ...text.sectionTitle,
    textAlign: 'center',
  },
  subtitle: {
    ...text.cardBody,
    textAlign: 'center',
    marginTop: s(6),
  },
  section: {
    ...text.sectionLabel,
    marginTop: s(20),
    marginBottom: s(12),
  },
  list: {
    gap: s(10),
    paddingBottom: s(10),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    backgroundColor: colors.surface,
    borderRadius: layout.radius.md,
    padding: s(12),
  },
  info: {
    flex: 1,
  },
  name: {
    ...text.caption,
    color: colors.text,
  },
  meta: {
    ...text.hint,
    color: colors.text60,
    marginTop: s(2),
  },
  message: {
    ...text.cardBody,
    textAlign: 'center',
    marginTop: s(30),
    marginBottom: s(20),
  },
  error: {
    color: colors.redAlert,
  },
});
