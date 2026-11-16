import express from 'express';

const PORT = process.env.PORT || 3000;

const app = express();

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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
