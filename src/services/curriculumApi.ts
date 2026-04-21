import AsyncStorage from '@react-native-async-storage/async-storage';
import { LessonContent, LessonStatus, QuizQuestion } from '../types/curriculum';
import { LOCAL_CURRICULUM } from '../data/localCurriculum';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const LOCAL_CURRICULUM_STORAGE_KEY = 'capstone.curriculum.local.v1';

function hasRestBackendConfig() {
  return Boolean(API_BASE_URL && API_BASE_URL.trim());
}

function shouldPreferRest(adminKey?: string) {
  return Boolean(hasRestBackendConfig() && adminKey);
}

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
  const typed = payload as Record<string, unknown>;

  const id = typeof typed.id === 'string' ? typed.id.trim() : '';
  const title = typeof typed.title === 'string' ? typed.title.trim() : '';
  if (!id || !title) return null;

  const status = isLessonStatus(typed.status) ? typed.status : 'draft';
  const duration = Number(typed.duration);

  return {
    id,
    title,
    description: typeof typed.description === 'string' ? typed.description.trim() : '',
    status,
    duration: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 20,
    audience: typeof typed.audience === 'string' ? typed.audience.trim() : 'secondary-school',
    tags: toStringArray(typed.tags),
    lectureNotes: toStringArray(typed.lectureNotes),
    quizzes: toQuizzes(typed.quizzes),
    createdAt: typeof typed.createdAt === 'string' ? typed.createdAt : undefined,
    updatedAt: typeof typed.updatedAt === 'string' ? typed.updatedAt : undefined,
  };
}

function getAdminHeaders(adminKey?: string) {
  const headers: Record<string, string> = {};
  if (adminKey) {
    headers['x-admin-key'] = adminKey;
    headers.Authorization = `Bearer ${adminKey}`;
  }
  return headers;
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

async function createLessonLocal(lesson: LessonContent): Promise<LessonContent> {
  const lessons = await getLocalCurriculum(true);
  if (lessons.some((item) => item.id === lesson.id)) {
    throw new Error(`Lesson "${lesson.id}" already exists locally.`);
  }
  const now = new Date().toISOString();
  const next = ensureLessonDates({ ...lesson, createdAt: lesson.createdAt ?? now, updatedAt: now });
  const updated = [...lessons, next];
  await saveLocalCurriculumStore(updated);
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
  return cloneLesson(lessons[index]);
}

async function deleteLessonLocal(lessonId: string): Promise<void> {
  const lessons = await getLocalCurriculum(true);
  const next = lessons.filter((lesson) => lesson.id !== lessonId);
  await saveLocalCurriculumStore(next);
}

export async function fetchCurriculum(includeDraft = false, adminKey?: string): Promise<LessonContent[] | null> {
  if (shouldPreferRest(adminKey)) {
    const search = includeDraft ? '?includeDraft=true' : '';
    const response = await fetch(`${API_BASE_URL}/content/lessons${search}`, {
      headers: getAdminHeaders(adminKey),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch curriculum (${response.status})`);
    }

    const payload = (await response.json()) as { lessons?: unknown[] };
    const lessons = Array.isArray(payload.lessons) ? payload.lessons : [];

    return lessons
      .map((lesson) => normalizeLesson(lesson))
      .filter((lesson): lesson is LessonContent => Boolean(lesson));
  }

  if (!hasRestBackendConfig()) {
    return await getLocalCurriculum(includeDraft);
  }

  const search = includeDraft ? '?includeDraft=true' : '';
  const response = await fetch(`${API_BASE_URL}/content/lessons${search}`, {
    headers: getAdminHeaders(adminKey),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch curriculum (${response.status})`);
  }

  const payload = (await response.json()) as { lessons?: unknown[] };
  const lessons = Array.isArray(payload.lessons) ? payload.lessons : [];

  return lessons
    .map((lesson) => normalizeLesson(lesson))
    .filter((lesson): lesson is LessonContent => Boolean(lesson));
}

export async function createLessonRemote(lesson: LessonContent, adminKey?: string): Promise<LessonContent> {
  if (shouldPreferRest(adminKey)) {
    const response = await fetch(`${API_BASE_URL}/content/lessons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminHeaders(adminKey),
      },
      body: JSON.stringify(lesson),
    });

    if (!response.ok) {
      throw new Error(`Failed to create lesson (${response.status})`);
    }

    const payload = (await response.json()) as { lesson?: unknown };
    const normalized = normalizeLesson(payload.lesson);
    if (!normalized) {
      throw new Error('Backend returned an invalid lesson payload.');
    }
    return normalized;
  }

  if (!hasRestBackendConfig()) {
    return await createLessonLocal(lesson);
  }

  const response = await fetch(`${API_BASE_URL}/content/lessons`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAdminHeaders(adminKey),
    },
    body: JSON.stringify(lesson),
  });

  if (!response.ok) {
    throw new Error(`Failed to create lesson (${response.status})`);
  }

  const payload = (await response.json()) as { lesson?: unknown };
  const normalized = normalizeLesson(payload.lesson);
  if (!normalized) {
    throw new Error('Backend returned an invalid lesson payload.');
  }
  return normalized;
}

export async function updateLessonRemote(
  lessonId: string,
  patch: Partial<LessonContent>,
  adminKey?: string
): Promise<LessonContent> {
  if (shouldPreferRest(adminKey)) {
    const response = await fetch(`${API_BASE_URL}/content/lessons/${encodeURIComponent(lessonId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminHeaders(adminKey),
      },
      body: JSON.stringify(patch),
    });

    if (!response.ok) {
      throw new Error(`Failed to update lesson (${response.status})`);
    }

    const payload = (await response.json()) as { lesson?: unknown };
    const normalized = normalizeLesson(payload.lesson);
    if (!normalized) {
      throw new Error('Backend returned an invalid lesson payload.');
    }
    return normalized;
  }

  if (!hasRestBackendConfig()) {
    return await updateLessonLocal(lessonId, patch);
  }

  const response = await fetch(`${API_BASE_URL}/content/lessons/${encodeURIComponent(lessonId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAdminHeaders(adminKey),
    },
    body: JSON.stringify(patch),
  });

  if (!response.ok) {
    throw new Error(`Failed to update lesson (${response.status})`);
  }

  const payload = (await response.json()) as { lesson?: unknown };
  const normalized = normalizeLesson(payload.lesson);
  if (!normalized) {
    throw new Error('Backend returned an invalid lesson payload.');
  }
  return normalized;
}

export async function deleteLessonRemote(lessonId: string, adminKey?: string): Promise<void> {
  if (shouldPreferRest(adminKey)) {
    const response = await fetch(`${API_BASE_URL}/content/lessons/${encodeURIComponent(lessonId)}`, {
      method: 'DELETE',
      headers: getAdminHeaders(adminKey),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete lesson (${response.status})`);
    }
    return;
  }

  if (!hasRestBackendConfig()) {
    await deleteLessonLocal(lessonId);
    return;
  }

  const response = await fetch(`${API_BASE_URL}/content/lessons/${encodeURIComponent(lessonId)}`, {
    method: 'DELETE',
    headers: getAdminHeaders(adminKey),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete lesson (${response.status})`);
  }
}
