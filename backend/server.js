const http = require('http');
const { promises: fs } = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 4000);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'progress.json');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'dev-admin-key';
const TEACHER_API_KEY = process.env.TEACHER_API_KEY || '';

const VALID_STATUSES = new Set(['draft', 'published', 'archived']);
const PASS_THRESHOLD = Number(process.env.LESSON_PASS_THRESHOLD || 80);
const VALID_ACCESS_ROLES = new Set(['teacher', 'admin']);

const ACCESS_TOKENS = new Map();
if (ADMIN_API_KEY) ACCESS_TOKENS.set(ADMIN_API_KEY, 'admin');
if (TEACHER_API_KEY) ACCESS_TOKENS.set(TEACHER_API_KEY, 'teacher');

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  });
  res.end(JSON.stringify(payload));
}

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({ users: {} }, null, 2), 'utf8');
  }

  try {
    await fs.access(CONTENT_FILE);
  } catch {
    await fs.writeFile(CONTENT_FILE, JSON.stringify({ lessons: [] }, null, 2), 'utf8');
  }
}

async function readStore() {
  await ensureStore();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed.users || typeof parsed.users !== 'object') {
    return { users: {} };
  }
  return parsed;
}

async function writeProgressStore(store) {
  await ensureStore();
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

async function readContentStore() {
  await ensureStore();
  const raw = await fs.readFile(CONTENT_FILE, 'utf8');
  const parsed = JSON.parse(raw);

  if (!parsed.lessons || !Array.isArray(parsed.lessons)) {
    return { lessons: [] };
  }
  return parsed;
}

async function writeContentStore(store) {
  await ensureStore();
  await fs.writeFile(CONTENT_FILE, JSON.stringify(store, null, 2), 'utf8');
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }
  if (!body) return {};

  try {
    return JSON.parse(body);
  } catch {
    const error = new Error('Invalid JSON request body.');
    error.statusCode = 400;
    throw error;
  }
}

function getUserIdFromPath(urlPathname) {
  const match = urlPathname.match(/^\/progress\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getLessonIdFromPath(urlPathname) {
  const match = urlPathname.match(/^\/content\/lessons\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function toStringValue(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeQuiz(question, index) {
  if (!question || typeof question !== 'object') {
    return { valid: false, error: `quizzes[${index}] must be an object.` };
  }

  const prompt = toStringValue(question.question);
  if (!prompt) {
    return { valid: false, error: `quizzes[${index}].question is required.` };
  }

  const options = toStringArray(question.options);
  if (options.length < 2) {
    return { valid: false, error: `quizzes[${index}].options must contain at least 2 items.` };
  }

  const answer = Number(question.answer);
  if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
    return { valid: false, error: `quizzes[${index}].answer must be a valid option index.` };
  }

  const explanation = toStringValue(question.explanation);

  return {
    valid: true,
    value: {
      question: prompt,
      options,
      answer,
      explanation,
    },
  };
}

function normalizeLesson(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'Lesson payload must be an object.' };
  }

  const id = toStringValue(payload.id);
  if (!id) {
    return { valid: false, error: 'id is required.' };
  }

  const title = toStringValue(payload.title);
  if (!title) {
    return { valid: false, error: 'title is required.' };
  }

  const statusInput = toStringValue(payload.status, 'draft').toLowerCase();
  const status = VALID_STATUSES.has(statusInput) ? statusInput : null;
  if (!status) {
    return { valid: false, error: 'status must be one of: draft, published, archived.' };
  }

  const duration = Number(payload.duration ?? 20);
  if (!Number.isInteger(duration) || duration <= 0) {
    return { valid: false, error: 'duration must be a positive integer.' };
  }

  const lectureNotes = toStringArray(payload.lectureNotes);
  const quizzes = Array.isArray(payload.quizzes) ? payload.quizzes : [];
  const normalizedQuizzes = [];

  for (let i = 0; i < quizzes.length; i += 1) {
    const item = normalizeQuiz(quizzes[i], i);
    if (!item.valid) {
      return { valid: false, error: item.error };
    }
    normalizedQuizzes.push(item.value);
  }

  return {
    valid: true,
    value: {
      id,
      title,
      description: toStringValue(payload.description),
      status,
      duration,
      audience: toStringValue(payload.audience, 'secondary-school'),
      tags: toStringArray(payload.tags),
      lectureNotes,
      quizzes: normalizedQuizzes,
      createdAt: toStringValue(payload.createdAt) || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

function getAccessToken(req) {
  const fromLegacyHeader = req.headers['x-admin-key'];
  if (typeof fromLegacyHeader === 'string' && fromLegacyHeader.trim()) {
    return fromLegacyHeader.trim();
  }
  if (Array.isArray(fromLegacyHeader) && fromLegacyHeader.length > 0) {
    return String(fromLegacyHeader[0] || '').trim();
  }

  const authorization = req.headers.authorization;
  if (typeof authorization === 'string' && authorization.toLowerCase().startsWith('bearer ')) {
    return authorization.slice('bearer '.length).trim();
  }

  return '';
}

function getAccessRole(req) {
  const token = getAccessToken(req);
  if (!token) return null;
  const role = ACCESS_TOKENS.get(token);
  return VALID_ACCESS_ROLES.has(role) ? role : null;
}

function hasRole(req, allowedRoles) {
  const role = getAccessRole(req);
  return Boolean(role && allowedRoles.includes(role));
}

function requireRole(req, res, allowedRoles) {
  if (hasRole(req, allowedRoles)) return true;
  sendJson(res, 401, {
    error: `Unauthorized. Provide a valid access token in x-admin-key or Authorization Bearer. Allowed roles: ${allowedRoles.join(', ')}`,
  });
  return false;
}

function requireTeacherOrAdmin(req, res) {
  return requireRole(req, res, ['teacher', 'admin']);
}

function requireAdmin(req, res) {
  return requireRole(req, res, ['admin']);
}

function isStarted(progress) {
  if (!progress || typeof progress !== 'object') return false;
  return Boolean(progress.started || Number(progress.progress) > 0 || Number(progress.quizAttempts) > 0);
}

function isCompleted(progress) {
  if (!progress || typeof progress !== 'object') return false;
  if (progress.completed === true) return true;
  return Number(progress.bestScore) >= PASS_THRESHOLD || Number(progress.progress) >= PASS_THRESHOLD;
}

function calculateAnalyticsSnapshot(progressStore, contentStore) {
  const lessons = Array.isArray(contentStore.lessons) ? contentStore.lessons : [];
  const users = progressStore.users && typeof progressStore.users === 'object' ? progressStore.users : {};

  const byLesson = new Map();
  for (const lesson of lessons) {
    byLesson.set(lesson.id, {
      lessonId: lesson.id,
      title: lesson.title || lesson.id,
      status: lesson.status || 'draft',
      learnersStarted: 0,
      learnersCompleted: 0,
      inProgressLearners: 0,
      totalQuizAttempts: 0,
      averageBestScore: 0,
      _bestScoreSum: 0,
      _bestScoreSamples: 0,
    });
  }

  const userIds = Object.keys(users);
  let activeLearners = 0;
  let completedLessonEntries = 0;
  let startedLessonEntries = 0;
  let totalQuizAttempts = 0;
  let scoreSum = 0;
  let scoreSamples = 0;

  for (const userId of userIds) {
    const progressMap = users[userId]?.progressMap ?? {};
    const lessonIds = Object.keys(progressMap);
    let userActive = false;

    for (const lessonId of lessonIds) {
      const progress = progressMap[lessonId];
      const started = isStarted(progress);
      const completed = isCompleted(progress);
      const bestScore = Number(progress?.bestScore || 0);
      const quizAttempts = Number(progress?.quizAttempts || 0);

      if (started) {
        userActive = true;
      }

      if (!byLesson.has(lessonId)) {
        byLesson.set(lessonId, {
          lessonId,
          title: `${lessonId} (Unmapped)`,
          status: 'unmapped',
          learnersStarted: 0,
          learnersCompleted: 0,
          inProgressLearners: 0,
          totalQuizAttempts: 0,
          averageBestScore: 0,
          _bestScoreSum: 0,
          _bestScoreSamples: 0,
        });
      }

      const lessonStats = byLesson.get(lessonId);

      if (started) {
        lessonStats.learnersStarted += 1;
        startedLessonEntries += 1;
      }

      if (completed) {
        lessonStats.learnersCompleted += 1;
        completedLessonEntries += 1;
      } else if (started) {
        lessonStats.inProgressLearners += 1;
      }

      lessonStats.totalQuizAttempts += quizAttempts;
      totalQuizAttempts += quizAttempts;

      if (bestScore > 0) {
        lessonStats._bestScoreSum += bestScore;
        lessonStats._bestScoreSamples += 1;
        scoreSum += bestScore;
        scoreSamples += 1;
      }
    }

    if (userActive) {
      activeLearners += 1;
    }
  }

  const perLesson = Array.from(byLesson.values())
    .map((item) => {
      const completionRate = item.learnersStarted > 0
        ? Math.round((item.learnersCompleted / item.learnersStarted) * 100)
        : 0;
      const averageBestScore = item._bestScoreSamples > 0
        ? Math.round((item._bestScoreSum / item._bestScoreSamples) * 10) / 10
        : 0;

      return {
        lessonId: item.lessonId,
        title: item.title,
        status: item.status,
        learnersStarted: item.learnersStarted,
        learnersCompleted: item.learnersCompleted,
        inProgressLearners: item.inProgressLearners,
        completionRate,
        totalQuizAttempts: item.totalQuizAttempts,
        averageBestScore,
      };
    })
    .sort((a, b) => {
      if (b.completionRate !== a.completionRate) return b.completionRate - a.completionRate;
      return a.lessonId.localeCompare(b.lessonId);
    });

  const publishedLessons = lessons.filter((lesson) => lesson.status === 'published').length;
  const draftLessons = lessons.filter((lesson) => lesson.status === 'draft').length;
  const archivedLessons = lessons.filter((lesson) => lesson.status === 'archived').length;

  return {
    generatedAt: new Date().toISOString(),
    passThreshold: PASS_THRESHOLD,
    overview: {
      totalLearners: userIds.length,
      activeLearners,
      totalLessons: lessons.length,
      publishedLessons,
      draftLessons,
      archivedLessons,
      startedLessonEntries,
      completedLessonEntries,
      completionRate: startedLessonEntries > 0
        ? Math.round((completedLessonEntries / startedLessonEntries) * 100)
        : 0,
      totalQuizAttempts,
      averageBestScore: scoreSamples > 0 ? Math.round((scoreSum / scoreSamples) * 10) / 10 : 0,
    },
    perLesson,
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = reqUrl.pathname;

    if (req.method === 'OPTIONS') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && pathname === '/health') {
      sendJson(res, 200, {
        ok: true,
        service: 'capstone-backend-api',
        now: new Date().toISOString(),
        contentApi: true,
        analyticsApi: true,
        security: {
          bearerTokenSupport: true,
          teacherRoleEnabled: Boolean(TEACHER_API_KEY),
          adminRoleEnabled: Boolean(ADMIN_API_KEY),
        },
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/analytics/summary') {
      if (!requireTeacherOrAdmin(req, res)) return;

      const progressStore = await readStore();
      const contentStore = await readContentStore();
      const summary = calculateAnalyticsSnapshot(progressStore, contentStore);

      sendJson(res, 200, summary);
      return;
    }

    if (req.method === 'GET' && pathname === '/content/lessons') {
      const includeDraft = reqUrl.searchParams.get('includeDraft') === 'true';
      const store = await readContentStore();

      const lessons = includeDraft && hasRole(req, ['teacher', 'admin'])
        ? store.lessons
        : store.lessons.filter((lesson) => lesson.status === 'published');

      sendJson(res, 200, { lessons, count: lessons.length });
      return;
    }

    if (req.method === 'GET' && pathname.startsWith('/content/lessons/')) {
      const lessonId = getLessonIdFromPath(pathname);
      if (!lessonId) {
        sendJson(res, 400, { error: 'Invalid lesson id path.' });
        return;
      }

      const store = await readContentStore();
      const lesson = store.lessons.find((item) => item.id === lessonId);

      if (!lesson) {
        sendJson(res, 404, { error: 'Lesson not found.' });
        return;
      }

      if (lesson.status !== 'published' && !hasRole(req, ['teacher', 'admin'])) {
        sendJson(res, 404, { error: 'Lesson not found.' });
        return;
      }

      sendJson(res, 200, { lesson });
      return;
    }

    if (req.method === 'POST' && pathname === '/content/lessons') {
      if (!requireTeacherOrAdmin(req, res)) return;

      const payload = await readBody(req);
      const normalized = normalizeLesson(payload);
      if (!normalized.valid) {
        sendJson(res, 400, { error: normalized.error });
        return;
      }

      const store = await readContentStore();
      const exists = store.lessons.some((lesson) => lesson.id === normalized.value.id);
      if (exists) {
        sendJson(res, 409, { error: 'A lesson with this id already exists.' });
        return;
      }

      store.lessons.push(normalized.value);
      await writeContentStore(store);

      sendJson(res, 201, { ok: true, lesson: normalized.value });
      return;
    }

    if (req.method === 'PUT' && pathname.startsWith('/content/lessons/')) {
      if (!requireTeacherOrAdmin(req, res)) return;

      const lessonId = getLessonIdFromPath(pathname);
      if (!lessonId) {
        sendJson(res, 400, { error: 'Invalid lesson id path.' });
        return;
      }

      const payload = await readBody(req);
      const store = await readContentStore();
      const index = store.lessons.findIndex((lesson) => lesson.id === lessonId);

      if (index === -1) {
        sendJson(res, 404, { error: 'Lesson not found.' });
        return;
      }

      const normalized = normalizeLesson({
        ...store.lessons[index],
        ...payload,
        id: lessonId,
        createdAt: store.lessons[index].createdAt,
      });

      if (!normalized.valid) {
        sendJson(res, 400, { error: normalized.error });
        return;
      }

      store.lessons[index] = normalized.value;
      await writeContentStore(store);

      sendJson(res, 200, { ok: true, lesson: normalized.value });
      return;
    }

    if (req.method === 'DELETE' && pathname.startsWith('/content/lessons/')) {
      if (!requireAdmin(req, res)) return;

      const lessonId = getLessonIdFromPath(pathname);
      if (!lessonId) {
        sendJson(res, 400, { error: 'Invalid lesson id path.' });
        return;
      }

      const store = await readContentStore();
      const before = store.lessons.length;
      store.lessons = store.lessons.filter((lesson) => lesson.id !== lessonId);

      if (store.lessons.length === before) {
        sendJson(res, 404, { error: 'Lesson not found.' });
        return;
      }

      await writeContentStore(store);
      sendJson(res, 200, { ok: true, deletedId: lessonId });
      return;
    }

    if (req.method === 'GET' && pathname.startsWith('/progress/')) {
      const userId = getUserIdFromPath(pathname);
      if (!userId) {
        sendJson(res, 400, { error: 'Invalid userId path.' });
        return;
      }

      const store = await readStore();
      const progressMap = store.users[userId]?.progressMap ?? {};
      sendJson(res, 200, { userId, progressMap });
      return;
    }

    if (req.method === 'POST' && pathname === '/progress/sync') {
      const payload = await readBody(req);
      const userId = typeof payload.userId === 'string' ? payload.userId : '';
      const progressMap = payload.progressMap;

      if (!userId) {
        sendJson(res, 400, { error: 'userId is required.' });
        return;
      }
      if (!progressMap || typeof progressMap !== 'object' || Array.isArray(progressMap)) {
        sendJson(res, 400, { error: 'progressMap must be an object.' });
        return;
      }

      const store = await readStore();
      store.users[userId] = {
        progressMap,
        updatedAt: new Date().toISOString(),
      };
      await writeProgressStore(store);

      sendJson(res, 200, { ok: true, userId, updatedAt: store.users[userId].updatedAt });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    sendJson(res, statusCode, { error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend API listening on http://0.0.0.0:${PORT}`);
});
