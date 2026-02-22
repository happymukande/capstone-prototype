import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, StyleProp, ViewStyle } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Curriculum from '../../src/data/Curriculum';
import { useProgress } from '../../src/context/ProgressContext';

export default function QuizPage() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const lessonId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { isHydrated, recordQuizAttempt } = useProgress();

  const lesson = useMemo(() => Curriculum.find((l) => l.id === lessonId), [lessonId]);

  const [qIndex, setQIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [userChoice, setUserChoice] = useState<number | null>(null);
  const [quizComplete, setQuizComplete] = useState(false);
  const [finalPercent, setFinalPercent] = useState(0);

  if (!lesson) {
    return (
      <View style={styles.fallbackWrap}>
        <Text style={styles.fallbackText}>Lesson not found.</Text>
      </View>
    );
  }

  if (!isHydrated) {
    return (
      <View style={styles.fallbackWrap}>
        <Text style={styles.fallbackText}>Loading progress...</Text>
      </View>
    );
  }

  const quizzes = lesson.quizzes || [];

  const handleSelect = (choice: number) => {
    setUserChoice(choice);
    setShowFeedback(true);
  };

  const handleContinue = () => {
    const current = quizzes[qIndex];
    const answeredCorrect = userChoice === current.answer;
    const nextCorrect = answeredCorrect ? correct + 1 : correct;

    if (qIndex + 1 < quizzes.length) {
      setCorrect(nextCorrect);
      setQIndex((i) => i + 1);
      setShowFeedback(false);
      setUserChoice(null);
      return;
    }

    const scorePct = Math.round((nextCorrect / quizzes.length) * 100);
    setCorrect(nextCorrect);
    setFinalPercent(scorePct);
    recordQuizAttempt(lesson.id, scorePct);
    setQuizComplete(true);
  };

  if (quizComplete) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.completionBox}>
          <Text style={styles.completionTitle}>Quiz Complete</Text>
          <View style={styles.scoreBox}>
            <Text style={styles.scorePct}>{finalPercent}%</Text>
            <Text style={styles.scoreText}>Final Score</Text>
          </View>
          <Text style={styles.resultText}>
            {finalPercent >= 80
              ? 'Strong result. You are ready for the next module.'
              : finalPercent >= 60
              ? 'Good attempt. Review key notes before moving on.'
              : 'Needs improvement. Revisit the module and retake the quiz.'}
          </Text>
          <Pressable style={styles.finishBtn} onPress={() => router.replace('/')}>
            <Text style={styles.btnText}>Return to Dashboard</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  if (quizzes.length === 0) {
    return (
      <View style={styles.fallbackWrap}>
        <Text style={styles.fallbackText}>No quiz is configured for this module.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quiz: {lesson.title}</Text>
        <Text style={styles.progressText}>Question {qIndex + 1} of {quizzes.length}</Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((qIndex + 1) / quizzes.length) * 100}%` }]} />
      </View>

      <View style={styles.qbox}>
        <Text style={styles.question}>{quizzes[qIndex].question}</Text>
        {quizzes[qIndex].options.map((option: string, i: number) => {
          const isSelected = userChoice === i;
          const isCorrect = i === quizzes[qIndex].answer;

          let optionStyle: StyleProp<ViewStyle> = styles.option;
          if (showFeedback) {
            if (isSelected && isCorrect) optionStyle = [styles.option, styles.optionCorrect];
            else if (isSelected && !isCorrect) optionStyle = [styles.option, styles.optionWrong];
            else if (!isSelected && isCorrect) optionStyle = [styles.option, styles.optionCorrect];
          }

          return (
            <Pressable
              key={i}
              style={optionStyle}
              onPress={() => !showFeedback && handleSelect(i)}
              disabled={showFeedback}
            >
              <Text style={showFeedback && isSelected ? styles.optionTextHighlight : styles.optionText}>{option}</Text>
            </Pressable>
          );
        })}

        {showFeedback && (
          <View
            style={[
              styles.feedback,
              userChoice === quizzes[qIndex].answer ? styles.feedbackCorrect : styles.feedbackWrong,
            ]}
          >
            <Text style={styles.feedbackLabel}>
              {userChoice === quizzes[qIndex].answer ? 'Correct' : 'Incorrect'}
            </Text>
            <Text style={styles.feedbackExplanation}>{quizzes[qIndex].explanation}</Text>
            <Pressable style={styles.continueBtn} onPress={handleContinue}>
              <Text style={styles.btnText}>{qIndex + 1 === quizzes.length ? 'View Results' : 'Next Question'}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fallbackWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  fallbackText: { fontSize: 16, color: '#44546a' },
  container: { padding: 20, flexGrow: 1, backgroundColor: '#f4f7fb' },
  header: { marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8, color: '#1d3557' },
  progressText: { fontSize: 14, color: '#44546a' },
  progressBar: {
    height: 8,
    backgroundColor: '#e6ebf3',
    borderRadius: 4,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#457b9d' },
  qbox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#dbe5f0',
  },
  question: { fontWeight: '800', fontSize: 16, marginBottom: 16, color: '#1d3557' },
  option: {
    padding: 14,
    borderWidth: 2,
    borderColor: '#e0e7f0',
    borderRadius: 8,
    marginTop: 10,
    backgroundColor: '#f8fafc',
  },
  optionCorrect: { borderColor: '#4caf50', backgroundColor: '#e9f8eb' },
  optionWrong: { borderColor: '#f44336', backgroundColor: '#fdeeee' },
  optionText: { color: '#2f3f54' },
  optionTextHighlight: { fontWeight: '700', color: '#1d3557' },
  feedback: { marginTop: 16, padding: 14, borderRadius: 8, borderLeftWidth: 4 },
  feedbackCorrect: { backgroundColor: '#e9f8eb', borderLeftColor: '#4caf50' },
  feedbackWrong: { backgroundColor: '#fdeeee', borderLeftColor: '#f44336' },
  feedbackLabel: { fontWeight: '800', fontSize: 16, marginBottom: 8, color: '#1d3557' },
  feedbackExplanation: { fontSize: 14, color: '#44546a', marginBottom: 12, lineHeight: 20 },
  continueBtn: {
    backgroundColor: '#1d3557',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
  completionBox: { alignItems: 'center', marginTop: 40, marginBottom: 40 },
  completionTitle: { fontSize: 30, fontWeight: '800', marginBottom: 24, color: '#1d3557' },
  scoreBox: { alignItems: 'center', marginBottom: 24 },
  scorePct: { fontSize: 64, fontWeight: '800', color: '#457b9d' },
  scoreText: { fontSize: 16, color: '#44546a', marginTop: 8 },
  resultText: { fontSize: 15, color: '#44546a', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  finishBtn: { backgroundColor: '#457b9d', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
});
