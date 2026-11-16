import express from 'express';
import path from 'node:path';

const PORT = process.env.PORT || 3000;

// Absolute path to public/, based on where THIS file lives (not on the folder
// the server was started from), so `node web-lab8/server.js` works too.
const PUBLIC_DIR = path.join(import.meta.dirname, 'public');

const app = express();

// Number of requests served since the server started.
// Kept in a module variable so we never add properties to req or res
// (objects we did not create).
let requestsServed = 0;

// ---- Middleware (registered before everything else) ----

// 1. Request logger: one line per request, then pass control on.
function requestLogger(req, res, next) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
}

// 2. Request counter: counts every request that reaches the server,
//    including static files and 404s.
function requestCounter(req, res, next) {
  requestsServed += 1;
  next();
}

app.use(requestLogger);
app.use(requestCounter);

// ---- Static files ----
// Serves public/index.html for GET / and the page's CSS and JS.
app.use(express.static(PUBLIC_DIR));

// All data lives here as constants: there is no database.
const COURSES = [
  { id: 1, title: 'Web Programming', credits: 6 },
  { id: 2, title: 'Data Structures', credits: 5 },
  { id: 3, title: 'Operating Systems', credits: 5 },
  { id: 4, title: 'Computer Networks', credits: 4 },
];

const ROBOTS_TXT = `User-agent: *
Disallow: /api/
`;

// ---- Text routes ----

app.get('/hello', (req, res) => {
  res.type('text/plain').send("Hello from Selim's server");
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(ROBOTS_TXT);
});

app.get('/old-page', (req, res) => {
  res.redirect(301, '/hello');
});

// ---- JSON API routes ----

app.get('/api/courses', (req, res) => {
  res.json(COURSES);
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

app.get('/api/headers', (req, res) => {
  res.json({
    userAgent: req.get('User-Agent') ?? null,
    accept: req.get('Accept') ?? null,
  });
});

app.post('/api/subscribe', (req, res) => {
  // 201 Created: the request created something new (a subscription).
  res.status(201).json({ subscribed: true });
});

app.get('/api/admin', (req, res) => {
  // 403 Forbidden: the route exists, but the client is not allowed to use it.
  res.status(403).json({ error: 'Forbidden' });
});

app.get('/api/stats', (req, res) => {
  res.json({ requestsServed });
});

// ---- 404 fallback (must stay LAST) ----
// A path-less app.use() matches every request that no route above answered.
// Express 5 no longer accepts the old app.get('*', ...) wildcard.
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'Not found' });
  } else {
    res.status(404).type('text/plain').send(`Page not found: ${req.path}`);
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
