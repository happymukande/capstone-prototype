import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase, { hasSupabaseConfig } from '../../lib/supabaseClient';
import { LOCAL_CURRICULUM } from '../data/localCurriculum';
import { LessonContent, LessonStatus, QuizQuestion } from '../types/curriculum';

const LOCAL_CURRICULUM_STORAGE_KEY = 'capstone.curriculum.local.v1';
const REMOTE_CURRICULUM_CACHE_KEY = 'capstone.curriculum.supabase.v1';
const REMOTE_PUBLISHED_CURRICULUM_CACHE_KEY = 'capstone.curriculum.supabase.published.v1';
const LESSON_TABLE = process.env.EXPO_PUBLIC_SUPABASE_LESSONS_TABLE || 'lesson_content';

type SupabaseLessonRow = {
  id: string;
  title: string;
  description?: string | null;
  status?: LessonStatus | null;
  duration_minutes?: number | null;
  duration?: number | null;
  audience?: string | null;
  tags?: string[] | null;
  lecture_notes?: unknown;
  lectureNotes?: unknown;
  quizzes?: unknown;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
};

function isLessonStatus(value: unknown): value is LessonStatus {
  return value === 'draft' || value === 'published' || value === 'archived';
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toQuizzes(value: unknown): QuizQuestion[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const typed = item as Record<string, unknown>;
      const question = typeof typed.question === 'string' ? typed.question.trim() : '';
      const options = toStringArray(typed.options);
      const answer = Number(typed.answer);
      const explanation = typeof typed.explanation === 'string' ? typed.explanation.trim() : '';

      if (!question || options.length < 2) return null;
      if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) return null;

      return {
        question,
        options,
        answer,
        explanation,
      };
    })
    .filter((quiz): quiz is QuizQuestion => Boolean(quiz));
}

function normalizeLesson(payload: unknown): LessonContent | null {
  if (!payload || typeof payload !== 'object') return null;
  const typed = payload as SupabaseLessonRow;

  const id = typeof typed.id === 'string' ? typed.id.trim() : '';
  const title = typeof typed.title === 'string' ? typed.title.trim() : '';
  if (!id || !title) return null;

  const status = isLessonStatus(typed.status) ? typed.status : 'draft';
  const duration = Number(typed.duration_minutes ?? typed.duration);
  const lectureNotes = typed.lecture_notes ?? typed.lectureNotes;
  const createdAt = typed.created_at ?? typed.createdAt ?? undefined;
  const updatedAt = typed.updated_at ?? typed.updatedAt ?? undefined;

  return {
    id,
    title,
    description: typeof typed.description === 'string' ? typed.description.trim() : '',
    status,
    duration: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 20,
    audience: typeof typed.audience === 'string' ? typed.audience.trim() : 'secondary-school',
    tags: toStringArray(typed.tags),
    lectureNotes: toStringArray(lectureNotes),
    quizzes: toQuizzes(typed.quizzes),
    createdAt: typeof createdAt === 'string' ? createdAt : undefined,
    updatedAt: typeof updatedAt === 'string' ? updatedAt : undefined,
  };
}

function toSupabaseLessonRow(lesson: LessonContent) {
  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    status: lesson.status,
    duration_minutes: lesson.duration,
    audience: lesson.audience,
    tags: lesson.tags,
    lecture_notes: lesson.lectureNotes,
    quizzes: lesson.quizzes,
  };
}

function cloneLesson(lesson: LessonContent): LessonContent {
  return {
    ...lesson,
    tags: [...lesson.tags],
    lectureNotes: [...lesson.lectureNotes],
    quizzes: lesson.quizzes.map((quiz) => ({
      ...quiz,
      options: [...quiz.options],
    })),
  };
}

function ensureLessonDates(lesson: LessonContent, now = new Date().toISOString()): LessonContent {
  return {
    ...lesson,
    createdAt: lesson.createdAt ?? now,
    updatedAt: lesson.updatedAt ?? now,
  };
}

function getCacheKey(includeDraft: boolean) {
  return includeDraft ? REMOTE_CURRICULUM_CACHE_KEY : REMOTE_PUBLISHED_CURRICULUM_CACHE_KEY;
}

async function loadCachedCurriculum(includeDraft: boolean): Promise<LessonContent[] | null> {
  try {
    const raw = await AsyncStorage.getItem(getCacheKey(includeDraft));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed
      .map((lesson) => normalizeLesson(lesson))
      .filter((lesson): lesson is LessonContent => Boolean(lesson))
      .filter((lesson) => includeDraft || lesson.status === 'published')
      .map((lesson) => ensureLessonDates(lesson));
  } catch {
    return null;
  }
}

async function saveCachedCurriculum(lessons: LessonContent[], includeDraft: boolean): Promise<void> {
  const normalized = lessons.map((lesson) => ensureLessonDates(cloneLesson(lesson)));
  try {
    await AsyncStorage.setItem(getCacheKey(includeDraft), JSON.stringify(normalized));
    if (includeDraft) {
      const published = normalized.filter((lesson) => lesson.status === 'published');
      await AsyncStorage.setItem(REMOTE_PUBLISHED_CURRICULUM_CACHE_KEY, JSON.stringify(published));
    }
  } catch {
    // Cache writes are best-effort; never block the learner on storage pressure.
  }
}

async function loadLocalCurriculumStore(): Promise<LessonContent[] | null> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_CURRICULUM_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed
      .map((lesson) => normalizeLesson(lesson))
      .filter((lesson): lesson is LessonContent => Boolean(lesson))
      .map((lesson) => ensureLessonDates(lesson));
  } catch {
    return null;
  }
}

async function saveLocalCurriculumStore(lessons: LessonContent[]): Promise<void> {
  const payload = lessons.map((lesson) => ensureLessonDates(cloneLesson(lesson)));
  try {
    await AsyncStorage.setItem(LOCAL_CURRICULUM_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore persistence errors and continue with in-memory data.
  }
}

async function getLocalCurriculum(includeDraft: boolean): Promise<LessonContent[]> {
  const stored = await loadLocalCurriculumStore();
  const base = stored ?? LOCAL_CURRICULUM;
  return base.filter((lesson) => includeDraft || lesson.status === 'published').map((lesson) => cloneLesson(lesson));
}

async function getCachedOrBundledCurriculum(includeDraft: boolean): Promise<LessonContent[]> {
  const cached = await loadCachedCurriculum(includeDraft);
  if (cached?.length) return cached.map((lesson) => cloneLesson(lesson));
  return await getLocalCurriculum(includeDraft);
}

async function createLessonLocal(lesson: LessonContent): Promise<LessonContent> {
  const lessons = await getLocalCurriculum(true);
  if (lessons.some((item) => item.id === lesson.id)) {
    throw new Error(`Lesson "${lesson.id}" already exists locally.`);
  }
  const now = new Date().toISOString();
  const next = ensureLessonDates({ ...lesson, createdAt: lesson.createdAt ?? now, updatedAt: now });
  const updated = [...lessons, next];
  await saveLocalCurriculumStore(updated);
  await saveCachedCurriculum(updated, true);
  return cloneLesson(next);
}

async function updateLessonLocal(lessonId: string, patch: Partial<LessonContent>): Promise<LessonContent> {
  const lessons = await getLocalCurriculum(true);
  const index = lessons.findIndex((item) => item.id === lessonId);
  if (index === -1) {
    throw new Error(`Lesson "${lessonId}" not found locally.`);
  }
  const now = new Date().toISOString();
  const merged: LessonContent = {
    ...lessons[index],
    ...patch,
    id: lessons[index].id,
    createdAt: lessons[index].createdAt,
    updatedAt: now,
  };
  lessons[index] = ensureLessonDates(merged, now);
  await saveLocalCurriculumStore(lessons);
  await saveCachedCurriculum(lessons, true);
  return cloneLesson(lessons[index]);
}

async function deleteLessonLocal(lessonId: string): Promise<void> {
  const lessons = await getLocalCurriculum(true);
  const next = lessons.filter((lesson) => lesson.id !== lessonId);
  await saveLocalCurriculumStore(next);
  await saveCachedCurriculum(next, true);
}

async function refreshCachesFromSupabase(): Promise<void> {
  if (!hasSupabaseConfig || !supabase) return;

  const { data, error } = await supabase.from(LESSON_TABLE).select('*');
  if (error) return;

  const lessons = (Array.isArray(data) ? data : [])
    .map((lesson) => normalizeLesson(lesson))
    .filter((lesson): lesson is LessonContent => Boolean(lesson));
  await saveCachedCurriculum(lessons, true);
}

export async function fetchCurriculum(includeDraft = false, _adminKey?: string): Promise<LessonContent[] | null> {
  if (!hasSupabaseConfig || !supabase) {
    return await getCachedOrBundledCurriculum(includeDraft);
  }

  try {
    let query = supabase.from(LESSON_TABLE).select('*').order('updated_at', { ascending: false });
    if (!includeDraft) {
      query = query.eq('status', 'published');
    }

    const { data, error } = await query;
    if (error) throw error;

    const lessons = (Array.isArray(data) ? data : [])
      .map((lesson) => normalizeLesson(lesson))
      .filter((lesson): lesson is LessonContent => Boolean(lesson));

    await saveCachedCurriculum(lessons, includeDraft);
    return lessons.map((lesson) => cloneLesson(lesson));
  } catch (error) {
    const fallback = await getCachedOrBundledCurriculum(includeDraft);
    if (fallback.length) return fallback;
    throw error instanceof Error ? error : new Error('Unable to load lessons from Supabase.');
  }
}

export async function createLessonRemote(lesson: LessonContent, _adminKey?: string): Promise<LessonContent> {
  if (!hasSupabaseConfig || !supabase) {
    return await createLessonLocal(lesson);
  }

  try {
    const { data, error } = await supabase
      .from(LESSON_TABLE)
      .insert(toSupabaseLessonRow(lesson))
      .select('*')
      .single();

    if (error) throw error;
    const normalized = normalizeLesson(data);
    if (!normalized) throw new Error('Supabase returned an invalid lesson payload.');
    await refreshCachesFromSupabase();
    return normalized;
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to create lesson in Supabase.');
  }
}

export async function updateLessonRemote(
  lessonId: string,
  patch: Partial<LessonContent>,
  _adminKey?: string
): Promise<LessonContent> {
  if (!hasSupabaseConfig || !supabase) {
    return await updateLessonLocal(lessonId, patch);
  }

  const updatePayload = toSupabaseLessonRow({
    id: lessonId,
    title: patch.title ?? '',
    description: patch.description ?? '',
    status: patch.status ?? 'draft',
    duration: patch.duration ?? 20,
    audience: patch.audience ?? 'secondary-school',
    tags: patch.tags ?? [],
    lectureNotes: patch.lectureNotes ?? [],
    quizzes: patch.quizzes ?? [],
  });
  delete (updatePayload as Partial<typeof updatePayload>).id;

  for (const key of Object.keys(updatePayload) as (keyof typeof updatePayload)[]) {
    const sourceKey = key === 'duration_minutes' ? 'duration' : key === 'lecture_notes' ? 'lectureNotes' : key;
    if (!(sourceKey in patch)) {
      delete updatePayload[key];
    }
  }

  try {
    const { data, error } = await supabase
      .from(LESSON_TABLE)
      .update(updatePayload)
      .eq('id', lessonId)
      .select('*')
      .single();

    if (error) throw error;
    const normalized = normalizeLesson(data);
    if (!normalized) throw new Error('Supabase returned an invalid lesson payload.');
    await refreshCachesFromSupabase();
    return normalized;
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to update lesson in Supabase.');
  }
}

export async function deleteLessonRemote(lessonId: string, _adminKey?: string): Promise<void> {
  if (!hasSupabaseConfig || !supabase) {
    await deleteLessonLocal(lessonId);
    return;
  }

  try {
    const { error } = await supabase.from(LESSON_TABLE).delete().eq('id', lessonId);
    if (error) throw error;
    await refreshCachesFromSupabase();
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to delete lesson in Supabase.');
  }
}
