import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

export default function LessonCardNative({ lesson, onPress }) {
  const { title, description, duration, timeSpent, progress } = lesson;
  const cta = progress > 0 && progress < 100 ? 'Continue' : progress === 100 ? 'Review' : 'Start';
  return (
    <Pressable style={styles.card} onPress={() => onPress && onPress(lesson)}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>{timeSpent}/{duration} min</Text>
      </View>
      <Text style={styles.desc}>{description}</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <View style={styles.cta}><Text style={styles.ctaText}>{cta}</Text></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 16, marginBottom: 12, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { color: '#666' },
  desc: { marginTop: 8, color: '#444' },
  progressBar: { height: 8, backgroundColor: '#eee', borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4caf50' },
  cta: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: '#1976d2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  ctaText: { color: '#fff' },
});
