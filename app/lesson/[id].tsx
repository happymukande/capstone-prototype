import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Curriculum from '../../src/data/Curriculum';
import { useProgress } from '../../src/context/ProgressContext';

type Step = {
  type: 'note' | 'quiz';
  content: string;
};

export default function LessonPage() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const lessonId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { isHydrated, isLessonUnlocked, markLessonStarted, getLessonProgress } = useProgress();
  const [step, setStep] = useState(0);

  const lesson = useMemo(() => Curriculum.find((l) => l.id === lessonId), [lessonId]);
  const lessonProgress = lessonId ? getLessonProgress(lessonId) : null;

  useEffect(() => {
    if (!lessonId) return;
    markLessonStarted(lessonId);
  }, [lessonId, markLessonStarted]);

  if (!isHydrated) {
    return (
      <View style={styles.fallbackWrap}>
        <Text style={styles.fallbackText}>Loading progress...</Text>
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={styles.fallbackWrap}>
        <Text style={styles.fallbackText}>Lesson not found.</Text>
      </View>
    );
  }

  const isUnlocked = isLessonUnlocked(lesson.id);

  if (!isUnlocked) {
    const lessonIndex = Curriculum.findIndex((l) => l.id === lesson.id);
    const prevLesson = lessonIndex > 0 ? Curriculum[lessonIndex - 1] : null;

    return (
      <View style={styles.lockedContainer}>
        <View style={styles.lockedBox}>
          <Text style={styles.lockedTitle}>Module Locked</Text>
          <Text style={styles.lockedDesc}>Complete the previous module to unlock this content.</Text>
          {prevLesson && <Text style={styles.prevLessonText}>Required: {prevLesson.title}</Text>}
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const noteSteps: Step[] = (lesson.lectureNotes || []).map(
    (note: string): Step => ({ type: 'note', content: note })
  );

  const allSteps: Step[] = [...noteSteps, { type: 'quiz', content: 'Checkpoint quiz' }];

  const isLastStep = step === allSteps.length - 1;
  const isQuizStep = allSteps[step]?.type === 'quiz';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.moduleLabel}>Module</Text>
        <Text style={styles.title}>{lesson.title}</Text>
        <Text style={styles.stepIndicator}>Step {step + 1} of {allSteps.length}</Text>
        <Text style={styles.metaText}>
          Attempts: {lessonProgress?.quizAttempts ?? 0} | Best Score: {lessonProgress?.bestScore ?? 0}%
        </Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((step + 1) / allSteps.length) * 100}%` }]} />
      </View>

      <View style={styles.content}>
        {isQuizStep ? (
          <View style={styles.quizPrompt}>
            <Text style={styles.quizTitle}>Ready for your checkpoint?</Text>
            <Text style={styles.quizDesc}>Take the quiz to score this module and unlock progression.</Text>
            <Pressable
              style={styles.quizBtn}
              onPress={() => router.push({ pathname: '/quiz/[id]', params: { id: lesson.id } })}
            >
              <Text style={styles.quizBtnText}>Start Quiz</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <Text style={styles.noteTitle}>Lecture Note</Text>
            <Text style={styles.noteText}>{allSteps[step]?.content}</Text>
          </View>
        )}
      </View>

      <View style={styles.navigation}>
        <Pressable
          style={[styles.navBtn, step === 0 && styles.navBtnDisabled]}
          onPress={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          <Text style={styles.navBtnText}>Previous</Text>
        </Pressable>

        {!isLastStep && (
          <Pressable style={styles.navBtn} onPress={() => setStep(Math.min(allSteps.length - 1, step + 1))}>
            <Text style={styles.navBtnText}>Next</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fallbackWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  fallbackText: { fontSize: 16, color: '#44546a' },
  lockedContainer: { flex: 1, padding: 20, justifyContent: 'center' },
  lockedBox: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#dbe5f0',
  },
  lockedTitle: { fontSize: 22, fontWeight: '800', marginBottom: 12, color: '#1d3557' },
  lockedDesc: { fontSize: 15, color: '#44546a', marginBottom: 16, textAlign: 'center' },
  prevLessonText: { fontSize: 14, color: '#457b9d', fontWeight: '700', marginBottom: 24 },
  backBtn: { backgroundColor: '#1d3557', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '700' },
  container: { padding: 20, flexGrow: 1, backgroundColor: '#f4f7fb' },
  header: { marginBottom: 16 },
  moduleLabel: { fontSize: 12, color: '#457b9d', fontWeight: '700', textTransform: 'uppercase' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8, color: '#1d3557' },
  stepIndicator: { fontSize: 14, color: '#44546a' },
  metaText: { marginTop: 6, fontSize: 13, color: '#5c708a', fontWeight: '600' },
  progressBar: {
    height: 8,
    backgroundColor: '#e6ebf3',
    borderRadius: 4,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#457b9d' },
  content: {
    minHeight: 240,
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#dbe5f0',
  },
  quizPrompt: { alignItems: 'flex-start' },
  quizTitle: { fontSize: 21, fontWeight: '800', marginBottom: 12, color: '#1d3557' },
  quizDesc: { fontSize: 15, color: '#44546a', marginBottom: 16, lineHeight: 22 },
  quizBtn: { backgroundColor: '#457b9d', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  quizBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  noteTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12, color: '#1d3557' },
  noteText: { fontSize: 15, lineHeight: 24, color: '#2f3f54' },
  navigation: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  navBtn: {
    flex: 1,
    backgroundColor: '#1d3557',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  navBtnDisabled: { backgroundColor: '#93a1b2' },
  navBtnText: { color: '#fff', fontWeight: '700' },
});
