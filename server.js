import express from 'express';

const PORT = process.env.PORT || 3000;

const app = express();

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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
