import express from 'express';

const PORT = process.env.PORT || 3000;

const app = express();

app.get('/hello', (req, res) => {
  res.send("Hello from Selim's server");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
