const http = require('http');
const { promises: fs } = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 4000);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'progress.json');

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
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

async function writeStore(store) {
  await ensureStore();
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }
  if (!body) return {};
  return JSON.parse(body);
}

function getUserIdFromPath(urlPathname) {
  const match = urlPathname.match(/^\/progress\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
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
      sendJson(res, 200, { ok: true, service: 'capstone-progress-api', now: new Date().toISOString() });
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
      await writeStore(store);

      sendJson(res, 200, { ok: true, userId, updatedAt: store.users[userId].updatedAt });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Progress API listening on http://0.0.0.0:${PORT}`);
});
