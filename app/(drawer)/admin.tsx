import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  createLessonRemote,
  deleteLessonRemote,
  fetchCurriculum,
  updateLessonRemote,
} from '../../src/services/curriculumApi';
import { AppThemeColors } from '../../src/constants/theme';
import { fetchTeacherAnalytics, TeacherAnalyticsSummary } from '../../src/services/analyticsApi';
import { LessonContent, LessonStatus, QuizQuestion } from '../../src/types/curriculum';
import { useRole } from '../../src/context/RoleContext';
import { useAppTheme } from '../../src/context/ThemeContext';
import { ThemePalette, getThemePalette } from '../../src/utils/themePalette';

const ACCESS_TOKEN =
  process.env.EXPO_PUBLIC_ADMIN_API_KEY ?? process.env.EXPO_PUBLIC_TEACHER_API_KEY ?? 'dev-admin-key';

function createAdminPalette(colors: AppThemeColors, palette: ThemePalette) {
  return {
    background: colors.screenBackground,
    heroBackground: colors.heroBackground,
    heroEyebrow: colors.heroEyebrow,
    heroText: colors.onStrong,
    heroSubtle: colors.heroSubtle,
    card: colors.surface,
    cardAlt: palette.mutedSurface,
    border: colors.border,
    text: colors.textPrimary,
    muted: colors.textSecondary,
    subtle: colors.textMuted,
    primary: colors.primaryStrong,
    primaryAlt: colors.primary,
    onPrimary: colors.onStrong,
    onAccent: colors.onPrimary,
    accentSurface: palette.selectedSurface,
    danger: colors.danger,
    dangerSoft: palette.dangerSoft,
    successSoft: palette.successSoft,
    inputBackground: palette.inputBackground,
    inputDisabled: palette.inputDisabled,
    actionMuted: palette.actionMuted,
  };
}

type QuizDraft = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

type LessonFormState = {
  id: string;
  title: string;
  description: string;
  status: LessonStatus;
  duration: string;
  audience: string;
  tagsCsv: string;
  lectureNotesText: string;
  quizzes: QuizDraft[];
};

function createEmptyQuiz(): QuizDraft {
  return {
    question: '',
    options: ['', ''],
    answer: 0,
    explanation: '',
  };
}

const DEFAULT_FORM: LessonFormState = {
  id: '',
  title: '',
  description: '',
  status: 'draft',
  duration: '20',
  audience: 'secondary-school',
  tagsCsv: '',
  lectureNotesText: '',
  quizzes: [],
};

function getOrderFromLessonId(lessonId: string) {
  const match = lessonId.match(/(\d+)$/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]);
}

function sortLessons(lessons: LessonContent[]) {
  return [...lessons].sort((a, b) => {
    const aOrder = getOrderFromLessonId(a.id);
    const bOrder = getOrderFromLessonId(b.id);
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.title.localeCompare(b.title);
  });
}

function lessonToForm(lesson: LessonContent): LessonFormState {
  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    status: lesson.status,
    duration: String(lesson.duration),
    audience: lesson.audience,
    tagsCsv: lesson.tags.join(', '),
    lectureNotesText: lesson.lectureNotes.join('\n'),
    quizzes: lesson.quizzes.map((quiz) => {
      const normalizedOptions = quiz.options.length >= 2 ? [...quiz.options] : [...quiz.options, '', ''].slice(0, 2);
      return {
        question: quiz.question,
        options: normalizedOptions,
        answer:
          Number.isInteger(quiz.answer) && quiz.answer >= 0 && quiz.answer < normalizedOptions.length
            ? quiz.answer
            : 0,
        explanation: quiz.explanation ?? '',
      };
    }),
  };
}

function parseTags(tagsCsv: string) {
  return tagsCsv
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseLectureNotes(lectureNotesText: string) {
  return lectureNotesText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseQuizzes(quizzes: QuizDraft[]): QuizQuestion[] {
  return quizzes.map((quiz, index) => {
    const question = quiz.question.trim();
    if (!question) {
      throw new Error(`Question ${index + 1}: question text is required.`);
    }

    if (quiz.options.length < 2) {
      throw new Error(`Question ${index + 1}: at least 2 options are required.`);
    }

    const options = quiz.options.map((option) => option.trim());
    if (options.some((option) => !option)) {
      throw new Error(`Question ${index + 1}: all options must be filled.`);
    }

    if (!Number.isInteger(quiz.answer) || quiz.answer < 0 || quiz.answer >= options.length) {
      throw new Error(`Question ${index + 1}: select a valid correct answer.`);
    }

    return {
      question,
      options,
      answer: quiz.answer,
      explanation: quiz.explanation.trim(),
    };
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unknown error.';
}

export default function AdminScreen() {
  const { role } = useRole();
  const { colors, isDarkMode } = useAppTheme();
  const palette = useMemo(() => getThemePalette(colors, isDarkMode), [colors, isDarkMode]);
  const adminPalette = useMemo(() => createAdminPalette(colors, palette), [colors, palette]);
  const styles = useMemo(() => createStyles(adminPalette), [adminPalette]);
  const placeholderTextColor = colors.textMuted;
  const [lessons, setLessons] = useState<LessonContent[]>([]);
  const [form, setForm] = useState<LessonFormState>(DEFAULT_FORM);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<TeacherAnalyticsSummary | null>(null);

  const isEditing = Boolean(selectedLessonId);

  const loadLessons = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const remoteLessons = await fetchCurriculum(true, ACCESS_TOKEN);
      if (!remoteLessons) {
        throw new Error(
          'No backend configured. Set EXPO_PUBLIC_API_BASE_URL or Supabase keys before using admin.'
        );
      }
      setLessons(sortLessons(remoteLessons));
    } catch (err) {
      setError(getErrorMessage(err));
      setLessons([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setIsAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const summary = await fetchTeacherAnalytics(ACCESS_TOKEN);
      if (!summary) {
        throw new Error('No analytics backend configured. Set EXPO_PUBLIC_API_BASE_URL or Supabase keys.');
      }
      setAnalytics(summary);
    } catch (err) {
      setAnalyticsError(getErrorMessage(err));
      setAnalytics(null);
    } finally {
      setIsAnalyticsLoading(false);
    }
  }, []);

  const refreshAdminData = useCallback(async () => {
    await Promise.all([loadLessons(), loadAnalytics()]);
  }, [loadLessons, loadAnalytics]);

  useEffect(() => {
    void refreshAdminData();
  }, [refreshAdminData]);

  const topLessonStats = useMemo(() => {
    if (!analytics) return [];
    return [...analytics.perLesson]
      .sort((a, b) => {
        if (b.learnersStarted !== a.learnersStarted) return b.learnersStarted - a.learnersStarted;
        return b.completionRate - a.completionRate;
      })
      .slice(0, 4);
  }, [analytics]);

  const resetForm = useCallback(() => {
    setForm(DEFAULT_FORM);
    setSelectedLessonId(null);
    setMessage(null);
  }, []);

  const selectLesson = useCallback((lesson: LessonContent) => {
    setSelectedLessonId(lesson.id);
    setForm(lessonToForm(lesson));
    setMessage(null);
  }, []);

  const updateFormField = useCallback(
    <K extends keyof LessonFormState>(field: K, value: LessonFormState[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const updateQuizField = useCallback(
    <K extends keyof QuizDraft>(quizIndex: number, field: K, value: QuizDraft[K]) => {
      setForm((prev) => ({
        ...prev,
        quizzes: prev.quizzes.map((quiz, index) =>
          index === quizIndex
            ? {
                ...quiz,
                [field]: value,
              }
            : quiz
        ),
      }));
    },
    []
  );

  const updateQuizOption = useCallback((quizIndex: number, optionIndex: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      quizzes: prev.quizzes.map((quiz, index) => {
        if (index !== quizIndex) return quiz;
        return {
          ...quiz,
          options: quiz.options.map((option, i) => (i === optionIndex ? value : option)),
        };
      }),
    }));
  }, []);

  const addQuizQuestion = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      quizzes: [...prev.quizzes, createEmptyQuiz()],
    }));
  }, []);

  const removeQuizQuestion = useCallback((quizIndex: number) => {
    setForm((prev) => ({
      ...prev,
      quizzes: prev.quizzes.filter((_, index) => index !== quizIndex),
    }));
  }, []);

  const addQuizOption = useCallback((quizIndex: number) => {
    setForm((prev) => ({
      ...prev,
      quizzes: prev.quizzes.map((quiz, index) => {
        if (index !== quizIndex) return quiz;
        return {
          ...quiz,
          options: [...quiz.options, ''],
        };
      }),
    }));
  }, []);

  const removeQuizOption = useCallback((quizIndex: number, optionIndex: number) => {
    setForm((prev) => ({
      ...prev,
      quizzes: prev.quizzes.map((quiz, index) => {
        if (index !== quizIndex) return quiz;
        if (quiz.options.length <= 2) return quiz;

        const nextOptions = quiz.options.filter((_, i) => i !== optionIndex);
        let nextAnswer = quiz.answer;

        if (optionIndex < nextAnswer) {
          nextAnswer -= 1;
        } else if (optionIndex === nextAnswer) {
          nextAnswer = 0;
        }

        if (nextAnswer >= nextOptions.length) {
          nextAnswer = nextOptions.length - 1;
        }

        return {
          ...quiz,
          options: nextOptions,
          answer: Math.max(0, nextAnswer),
        };
      }),
    }));
  }, []);

  const setCorrectAnswer = useCallback((quizIndex: number, optionIndex: number) => {
    updateQuizField(quizIndex, 'answer', optionIndex);
  }, [updateQuizField]);

  const buildLessonPayload = useCallback((): LessonContent => {
    const id = form.id.trim();
    const title = form.title.trim();
    const duration = Number(form.duration);

    if (!id) throw new Error('Lesson ID is required.');
    if (!title) throw new Error('Title is required.');
    if (!Number.isInteger(duration) || duration <= 0) {
      throw new Error('Duration must be a positive integer.');
    }

    return {
      id,
      title,
      description: form.description.trim(),
      status: form.status,
      duration,
      audience: form.audience.trim() || 'secondary-school',
      tags: parseTags(form.tagsCsv),
      lectureNotes: parseLectureNotes(form.lectureNotesText),
      quizzes: parseQuizzes(form.quizzes),
    };
  }, [form]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload = buildLessonPayload();

      let saved: LessonContent;
      if (isEditing && selectedLessonId) {
        saved = await updateLessonRemote(selectedLessonId, payload, ACCESS_TOKEN);
        setMessage(`Updated "${saved.title}".`);
      } else {
        saved = await createLessonRemote(payload, ACCESS_TOKEN);
        setMessage(`Created "${saved.title}".`);
      }

      await refreshAdminData();
      setSelectedLessonId(saved.id);
      setForm(lessonToForm(saved));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }, [buildLessonPayload, isEditing, refreshAdminData, selectedLessonId]);

  const handleTogglePublished = useCallback(async () => {
    if (!selectedLessonId) return;

    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const nextStatus: LessonStatus = form.status === 'published' ? 'draft' : 'published';
      const updated = await updateLessonRemote(selectedLessonId, { status: nextStatus }, ACCESS_TOKEN);
      await refreshAdminData();
      setSelectedLessonId(updated.id);
      setForm(lessonToForm(updated));
      setMessage(
        nextStatus === 'published' ? `Published "${updated.title}".` : `Moved "${updated.title}" to draft.`
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }, [form.status, refreshAdminData, selectedLessonId]);

  const handleDelete = useCallback(async () => {
    if (!selectedLessonId) return;

    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      await deleteLessonRemote(selectedLessonId, ACCESS_TOKEN);
      await refreshAdminData();
      setMessage(`Deleted "${selectedLessonId}".`);
      resetForm();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }, [refreshAdminData, resetForm, selectedLessonId]);

  if (role === 'student') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Teacher Admin</Text>
          <Text style={styles.smallText}>This area is available for teacher and admin roles only.</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Teacher</Text>
        <Text style={styles.title}>Lesson Admin</Text>
        <Text style={styles.subtitle}>Create, edit, publish, and delete lesson content from the backend.</Text>
        <View style={styles.headerRow}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => void refreshAdminData()}
            disabled={isLoading || isAnalyticsLoading || isSaving}
          >
            <Text style={styles.actionBtnText}>Reload</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={resetForm} disabled={isSaving}>
            <Text style={styles.actionBtnText}>New Lesson</Text>
          </Pressable>
        </View>
        <Text style={styles.helper}>
          Access token: x-admin-key or Bearer token. Teacher/Admin can create and edit; Admin is required to delete.
        </Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {message && (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.analyticsHeaderRow}>
          <Text style={styles.cardTitle}>Teacher Analytics Snapshot</Text>
          {analytics?.generatedAt && (
            <Text style={styles.analyticsTimestamp}>
              Updated: {new Date(analytics.generatedAt).toLocaleString()}
            </Text>
          )}
        </View>

        {isAnalyticsLoading && <Text style={styles.smallText}>Loading analytics...</Text>}
        {analyticsError && !isAnalyticsLoading && <Text style={styles.errorText}>{analyticsError}</Text>}

        {analytics && !isAnalyticsLoading && (
          <>
            <View style={styles.metricsGrid}>
              <View style={styles.metricTile}>
                <Text style={styles.metricLabel}>Learners</Text>
                <Text style={styles.metricValue}>{analytics.overview.totalLearners}</Text>
              </View>
              <View style={styles.metricTile}>
                <Text style={styles.metricLabel}>Active</Text>
                <Text style={styles.metricValue}>{analytics.overview.activeLearners}</Text>
              </View>
              <View style={styles.metricTile}>
                <Text style={styles.metricLabel}>Published</Text>
                <Text style={styles.metricValue}>{analytics.overview.publishedLessons}</Text>
              </View>
              <View style={styles.metricTile}>
                <Text style={styles.metricLabel}>Drafts</Text>
                <Text style={styles.metricValue}>{analytics.overview.draftLessons}</Text>
              </View>
              <View style={styles.metricTile}>
                <Text style={styles.metricLabel}>Completions</Text>
                <Text style={styles.metricValue}>{analytics.overview.completionRate}%</Text>
              </View>
              <View style={styles.metricTile}>
                <Text style={styles.metricLabel}>Quiz Attempts</Text>
                <Text style={styles.metricValue}>{analytics.overview.totalQuizAttempts}</Text>
              </View>
              <View style={styles.metricTile}>
                <Text style={styles.metricLabel}>Avg Score</Text>
                <Text style={styles.metricValue}>{analytics.overview.averageBestScore}%</Text>
              </View>
              <View style={styles.metricTile}>
                <Text style={styles.metricLabel}>Threshold</Text>
                <Text style={styles.metricValue}>{analytics.passThreshold}%</Text>
              </View>
            </View>

            <Text style={styles.analyticsSubTitle}>Top Lessons By Engagement</Text>
            {topLessonStats.length === 0 && <Text style={styles.smallText}>No engagement data yet.</Text>}
            {topLessonStats.map((item) => (
              <View key={item.lessonId} style={styles.lessonAnalyticsRow}>
                <View style={styles.lessonAnalyticsTextWrap}>
                  <Text style={styles.lessonAnalyticsTitle}>{item.title}</Text>
                  <Text style={styles.lessonAnalyticsMeta}>
                    Started {item.learnersStarted} | Completed {item.learnersCompleted} | Attempts {item.totalQuizAttempts}
                  </Text>
                </View>
                <View style={styles.lessonAnalyticsPill}>
                  <Text style={styles.lessonAnalyticsPillText}>{item.completionRate}%</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{isEditing ? 'Edit Lesson' : 'Create Lesson'}</Text>

        <Text style={styles.label}>Lesson ID</Text>
        <TextInput
          style={[styles.input, isEditing && styles.inputDisabled]}
          value={form.id}
          editable={!isEditing}
          onChangeText={(value) => updateFormField('id', value)}
          placeholder="lesson-1"
          placeholderTextColor={placeholderTextColor}
        />

        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={form.title}
          onChangeText={(value) => updateFormField('title', value)}
          placeholder="Energy Basics"
          placeholderTextColor={placeholderTextColor}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          multiline
          value={form.description}
          onChangeText={(value) => updateFormField('description', value)}
          placeholder="Short lesson summary"
          placeholderTextColor={placeholderTextColor}
        />

        <View style={styles.inlineRow}>
          <View style={styles.inlineField}>
            <Text style={styles.label}>Duration (min)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={form.duration}
              onChangeText={(value) => updateFormField('duration', value)}
              placeholder="20"
              placeholderTextColor={placeholderTextColor}
            />
          </View>
          <View style={styles.inlineField}>
            <Text style={styles.label}>Audience</Text>
            <TextInput
              style={styles.input}
              value={form.audience}
              onChangeText={(value) => updateFormField('audience', value)}
              placeholder="secondary-school"
              placeholderTextColor={placeholderTextColor}
            />
          </View>
        </View>

        <Text style={styles.label}>Status</Text>
        <View style={styles.statusRow}>
          {(['draft', 'published', 'archived'] as LessonStatus[]).map((status) => (
            <Pressable
              key={status}
              style={[styles.statusBtn, form.status === status && styles.statusBtnActive]}
              onPress={() => updateFormField('status', status)}
            >
              <Text style={[styles.statusBtnText, form.status === status && styles.statusBtnTextActive]}>
                {status}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Tags (comma-separated)</Text>
        <TextInput
          style={styles.input}
          value={form.tagsCsv}
          onChangeText={(value) => updateFormField('tagsCsv', value)}
          placeholder="energy, conservation, schools"
          placeholderTextColor={placeholderTextColor}
        />

        <Text style={styles.label}>Lecture Notes (one per line)</Text>
        <TextInput
          style={[styles.input, styles.largeMultiline]}
          multiline
          value={form.lectureNotesText}
          onChangeText={(value) => updateFormField('lectureNotesText', value)}
          placeholder="Type one note per line..."
          placeholderTextColor={placeholderTextColor}
        />

        <View style={styles.quizHeaderRow}>
          <Text style={styles.label}>Quiz Questions</Text>
          <Pressable style={styles.miniActionBtn} onPress={addQuizQuestion}>
            <Text style={styles.miniActionBtnText}>Add Question</Text>
          </Pressable>
        </View>

        {form.quizzes.length === 0 && (
          <Text style={styles.smallText}>No questions yet. Add at least one quiz question if needed.</Text>
        )}

        {form.quizzes.map((quiz, quizIndex) => (
          <View key={`quiz-${quizIndex}`} style={styles.quizCard}>
            <View style={styles.quizCardHeader}>
              <Text style={styles.quizCardTitle}>Question {quizIndex + 1}</Text>
              <Pressable style={styles.removeQuestionBtn} onPress={() => removeQuizQuestion(quizIndex)}>
                <Text style={styles.removeQuestionBtnText}>Remove</Text>
              </Pressable>
            </View>

            <TextInput
               style={styles.input}
               value={quiz.question}
               onChangeText={(value) => updateQuizField(quizIndex, 'question', value)}
               placeholder="Enter the quiz question"
               placeholderTextColor={placeholderTextColor}
             />

            <Text style={styles.subLabel}>Options (tap Correct on the right answer)</Text>
            {quiz.options.map((option, optionIndex) => (
              <View key={`quiz-${quizIndex}-option-${optionIndex}`} style={styles.optionRow}>
                <TextInput
                  style={[styles.input, styles.optionInput]}
                   value={option}
                   onChangeText={(value) => updateQuizOption(quizIndex, optionIndex, value)}
                   placeholder={`Option ${optionIndex + 1}`}
                   placeholderTextColor={placeholderTextColor}
                 />
                <Pressable
                  style={[
                    styles.correctBtn,
                    quiz.answer === optionIndex && styles.correctBtnActive,
                  ]}
                  onPress={() => setCorrectAnswer(quizIndex, optionIndex)}
                >
                  <Text
                    style={[
                      styles.correctBtnText,
                      quiz.answer === optionIndex && styles.correctBtnTextActive,
                    ]}
                  >
                    Correct
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.removeOptionBtn,
                    quiz.options.length <= 2 && styles.disabledBtn,
                  ]}
                  onPress={() => removeQuizOption(quizIndex, optionIndex)}
                  disabled={quiz.options.length <= 2}
                >
                  <Text style={styles.removeOptionBtnText}>X</Text>
                </Pressable>
              </View>
            ))}

            <Pressable style={styles.addOptionBtn} onPress={() => addQuizOption(quizIndex)}>
              <Text style={styles.addOptionBtnText}>Add Option</Text>
            </Pressable>

            <Text style={styles.subLabel}>Explanation</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              multiline
              value={quiz.explanation}
              onChangeText={(value) => updateQuizField(quizIndex, 'explanation', value)}
              placeholder="Explain why the correct answer is right"
              placeholderTextColor={placeholderTextColor}
            />
          </View>
        ))}

        <View style={styles.formActions}>
          <Pressable style={styles.primaryBtn} onPress={() => void handleSave()} disabled={isSaving}>
            <Text style={styles.primaryBtnText}>{isEditing ? 'Save Changes' : 'Create Lesson'}</Text>
          </Pressable>

          {isEditing && (
            <>
              <Pressable style={styles.secondaryBtn} onPress={() => void handleTogglePublished()} disabled={isSaving}>
                <Text style={styles.secondaryBtnText}>{form.status === 'published' ? 'Move to Draft' : 'Publish'}</Text>
              </Pressable>
              <Pressable style={styles.deleteBtn} onPress={() => void handleDelete()} disabled={isSaving}>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Existing Lessons</Text>
        {isLoading && <Text style={styles.smallText}>Loading lessons...</Text>}
        {!isLoading && lessons.length === 0 && <Text style={styles.smallText}>No lessons available.</Text>}

        {lessons.map((lesson) => {
          const selected = selectedLessonId === lesson.id;
          return (
            <Pressable
              key={lesson.id}
              style={[styles.lessonItem, selected && styles.lessonItemSelected]}
              onPress={() => selectLesson(lesson)}
            >
              <View style={styles.lessonItemRow}>
                <Text style={styles.lessonItemTitle}>{lesson.title}</Text>
                <Text style={styles.lessonItemStatus}>{lesson.status}</Text>
              </View>
              <Text style={styles.lessonItemMeta}>
                {lesson.id} | {lesson.duration} min | {lesson.quizzes.length} quiz item(s)
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function createStyles(theme: ReturnType<typeof createAdminPalette>) {
  return StyleSheet.create({
    container: {
      padding: 16,
      backgroundColor: theme.background,
      flexGrow: 1,
    },
    header: {
      marginBottom: 14,
      backgroundColor: theme.heroBackground,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 18,
    },
    eyebrow: {
      fontSize: 12,
      textTransform: 'uppercase',
      color: theme.heroEyebrow,
      fontWeight: '700',
      letterSpacing: 1,
      marginBottom: 8,
    },
    title: {
      fontSize: 28,
      color: theme.heroText,
      fontWeight: '800',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: theme.heroSubtle,
      marginBottom: 12,
      lineHeight: 22,
    },
    headerRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10,
      flexWrap: 'wrap',
    },
    actionBtn: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    actionBtnText: {
      color: theme.onPrimary,
      fontWeight: '700',
      fontSize: 13,
    },
    helper: {
      fontSize: 12,
      color: theme.heroSubtle,
      lineHeight: 18,
    },
    errorBox: {
      backgroundColor: theme.dangerSoft,
      borderLeftWidth: 4,
      borderLeftColor: theme.danger,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
    },
    errorText: {
      color: theme.danger,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 20,
    },
    messageBox: {
      backgroundColor: theme.successSoft,
      borderLeftWidth: 4,
      borderLeftColor: theme.primaryAlt,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
    },
    messageText: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 20,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 14,
    },
    cardTitle: {
      fontSize: 18,
      color: theme.text,
      fontWeight: '800',
      marginBottom: 10,
    },
    analyticsHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
      gap: 8,
    },
    analyticsTimestamp: {
      fontSize: 11,
      color: theme.subtle,
      fontWeight: '600',
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    metricTile: {
      minWidth: '23%',
      flexGrow: 1,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.cardAlt,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 10,
    },
    metricLabel: {
      fontSize: 11,
      color: theme.subtle,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    metricValue: {
      fontSize: 18,
      color: theme.text,
      fontWeight: '800',
      marginTop: 3,
    },
    analyticsSubTitle: {
      fontSize: 12,
      color: theme.subtle,
      fontWeight: '800',
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    lessonAnalyticsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      backgroundColor: theme.cardAlt,
      gap: 10,
    },
    lessonAnalyticsTextWrap: {
      flex: 1,
      paddingRight: 10,
    },
    lessonAnalyticsTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 2,
    },
    lessonAnalyticsMeta: {
      fontSize: 12,
      color: theme.muted,
      lineHeight: 18,
    },
    lessonAnalyticsPill: {
      minWidth: 56,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: theme.primaryAlt,
      alignItems: 'center',
    },
    lessonAnalyticsPillText: {
      color: theme.onAccent,
      fontWeight: '800',
      fontSize: 12,
    },
    label: {
      fontSize: 12,
      color: theme.subtle,
      fontWeight: '700',
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    subLabel: {
      fontSize: 12,
      color: theme.muted,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.text,
      marginBottom: 10,
      backgroundColor: theme.inputBackground,
    },
    inputDisabled: {
      backgroundColor: theme.inputDisabled,
      color: theme.subtle,
    },
    multiline: {
      minHeight: 68,
      textAlignVertical: 'top',
    },
    largeMultiline: {
      minHeight: 110,
      textAlignVertical: 'top',
    },
    inlineRow: {
      flexDirection: 'row',
      gap: 8,
    },
    inlineField: {
      flex: 1,
    },
    statusRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10,
      flexWrap: 'wrap',
    },
    statusBtn: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.cardAlt,
    },
    statusBtnActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    statusBtnText: {
      color: theme.text,
      fontWeight: '700',
      fontSize: 12,
      textTransform: 'capitalize',
    },
    statusBtnTextActive: {
      color: theme.onPrimary,
    },
    quizHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
      gap: 8,
    },
    miniActionBtn: {
      backgroundColor: theme.accentSurface,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.primaryAlt,
    },
    miniActionBtnText: {
      color: theme.text,
      fontSize: 12,
      fontWeight: '700',
    },
    quizCard: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
      backgroundColor: theme.cardAlt,
    },
    quizCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
      gap: 8,
    },
    quizCardTitle: {
      fontSize: 14,
      color: theme.text,
      fontWeight: '800',
    },
    removeQuestionBtn: {
      backgroundColor: theme.danger,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    removeQuestionBtnText: {
      color: theme.onPrimary,
      fontSize: 11,
      fontWeight: '700',
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    optionInput: {
      flex: 1,
      marginBottom: 0,
    },
    correctBtn: {
      borderWidth: 1,
      borderColor: theme.primaryAlt,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 8,
      backgroundColor: theme.accentSurface,
    },
    correctBtnActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    correctBtnText: {
      fontSize: 11,
      color: theme.text,
      fontWeight: '700',
    },
    correctBtnTextActive: {
      color: theme.onPrimary,
    },
    removeOptionBtn: {
      borderWidth: 1,
      borderColor: theme.danger,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 8,
      backgroundColor: theme.dangerSoft,
    },
    removeOptionBtnText: {
      color: theme.danger,
      fontWeight: '800',
      fontSize: 11,
    },
    disabledBtn: {
      opacity: 0.45,
    },
    addOptionBtn: {
      alignSelf: 'flex-start',
      backgroundColor: theme.primary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 8,
    },
    addOptionBtnText: {
      color: theme.onPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    formActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 6,
      flexWrap: 'wrap',
    },
    primaryBtn: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    primaryBtnText: {
      color: theme.onPrimary,
      fontWeight: '700',
    },
    secondaryBtn: {
      backgroundColor: theme.accentSurface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.primaryAlt,
    },
    secondaryBtnText: {
      color: theme.text,
      fontWeight: '700',
    },
    deleteBtn: {
      backgroundColor: theme.danger,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    deleteBtnText: {
      color: theme.onPrimary,
      fontWeight: '700',
    },
    lessonItem: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      backgroundColor: theme.cardAlt,
    },
    lessonItemSelected: {
      borderColor: theme.primaryAlt,
      backgroundColor: theme.accentSurface,
    },
    lessonItemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
      gap: 8,
    },
    lessonItemTitle: {
      color: theme.text,
      fontWeight: '700',
      fontSize: 14,
      flexShrink: 1,
      paddingRight: 8,
    },
    lessonItemStatus: {
      color: theme.primaryAlt,
      fontWeight: '700',
      fontSize: 12,
      textTransform: 'uppercase',
    },
    lessonItemMeta: {
      color: theme.muted,
      fontSize: 12,
      lineHeight: 18,
    },
    smallText: {
      color: theme.muted,
      fontSize: 13,
      marginBottom: 8,
      lineHeight: 20,
    },
  });
}
