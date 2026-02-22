import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Curriculum from '../src/data/Curriculum';
import { useProgress } from '../src/context/ProgressContext';

export default function Index() {
  const { progressMap, isHydrated, isLessonUnlocked, syncFromBackend, syncToBackend } = useProgress();
  const router = useRouter();
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const getStatusColor = (progress: number, isUnlocked: boolean) => {
    if (!isUnlocked) return '#8d99ae';
    if (progress >= 80) return '#4caf50';
    if (progress >= 50) return '#ff9800';
    if (progress > 0) return '#f4a261';
    return '#457b9d';
  };

  const handlePull = async () => {
    try {
      await syncFromBackend();
      setSyncMessage('Pulled progress from backend.');
    } catch (error) {
      setSyncMessage(`Pull failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handlePush = async () => {
    try {
      await syncToBackend();
      setSyncMessage('Pushed progress to backend.');
    } catch (error) {
      setSyncMessage(`Push failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!isHydrated) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.loadingText}>Loading progress...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.eyebrow}>Academy</Text>
        <Text style={styles.title}>Learning Dashboard</Text>
        <Text style={styles.subtitle}>Continue your pathway and unlock the next module.</Text>
        <View style={styles.syncRow}>
          <Pressable style={styles.syncBtn} onPress={handlePull}>
            <Text style={styles.syncBtnText}>Pull Progress</Text>
          </Pressable>
          <Pressable style={styles.syncBtn} onPress={handlePush}>
            <Text style={styles.syncBtnText}>Push Progress</Text>
          </Pressable>
        </View>
        {syncMessage && <Text style={styles.syncMessage}>{syncMessage}</Text>}
      </View>

      {Curriculum.map((lesson, index) => {
        const progress = progressMap[lesson.id]?.progress ?? 0;
        const isCompleted = progress >= 100;
        const isStarted = progress > 0;
        const isUnlocked = isLessonUnlocked(lesson.id);
        const statusColor = getStatusColor(progress, isUnlocked);

        return (
          <Pressable
            key={lesson.id}
            style={[
              styles.lessonCard,
              isCompleted && styles.lessonCardCompleted,
              !isUnlocked && styles.lessonCardLocked,
            ]}
            onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}
          >
            <View style={styles.cardHeader}>
              <View style={styles.lessonInfo}>
                <Text style={styles.lessonNumber}>Module {index + 1}</Text>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                <Text style={styles.lessonDesc}>{lesson.description}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: statusColor }]}>
                <Text style={styles.badgeText}>{isUnlocked ? `${progress}%` : 'LOCK'}</Text>
              </View>
            </View>

            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress}%`, backgroundColor: statusColor },
                ]}
              />
            </View>

            {!isUnlocked && <Text style={styles.lockedLabel}>Locked: complete previous module</Text>}
            {isCompleted && <Text style={styles.completedLabel}>Completed</Text>}
            {!isCompleted && isStarted && isUnlocked && (
              <Text style={styles.inProgressLabel}>In Progress</Text>
            )}
            {!isStarted && isUnlocked && <Text style={styles.notStartedLabel}>Not Started</Text>}
          </Pressable>
        );
      })}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Tap a module to view notes and launch the checkpoint quiz.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f7fb' },
  loadingText: { fontSize: 16, color: '#44546a' },
  container: { padding: 20, paddingTop: 40, backgroundColor: '#f4f7fb', flexGrow: 1 },
  headerSection: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dbe5f0',
  },
  eyebrow: {
    fontSize: 12,
    color: '#457b9d',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#1d3557', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#44546a' },
  syncRow: { marginTop: 12, flexDirection: 'row', gap: 10 },
  syncBtn: {
    backgroundColor: '#1d3557',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  syncMessage: { marginTop: 8, fontSize: 12, color: '#5c708a', fontWeight: '600' },
  lessonCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#457b9d',
    shadowColor: '#1d3557',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  lessonCardCompleted: { borderLeftColor: '#4caf50', backgroundColor: '#f4fbf5' },
  lessonCardLocked: { borderLeftColor: '#8d99ae', backgroundColor: '#f8f9fb' },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  lessonInfo: { flex: 1, marginRight: 12 },
  lessonNumber: {
    fontSize: 12,
    color: '#5c708a',
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  lessonTitle: { fontSize: 16, fontWeight: '800', color: '#1d3557', marginBottom: 4 },
  lessonDesc: { fontSize: 13, color: '#4a5d75' },
  badge: {
    minWidth: 62,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  badgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  progressBar: {
    height: 6,
    backgroundColor: '#e6ebf3',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: { height: '100%' },
  lockedLabel: { fontSize: 12, color: '#8d99ae', fontWeight: '700' },
  completedLabel: { fontSize: 12, color: '#4caf50', fontWeight: '700' },
  inProgressLabel: { fontSize: 12, color: '#f4a261', fontWeight: '700' },
  notStartedLabel: { fontSize: 12, color: '#457b9d', fontWeight: '700' },
  footer: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#dbe5f0',
    alignItems: 'center',
  },
  footerText: { fontSize: 13, color: '#4a5d75' },
});
