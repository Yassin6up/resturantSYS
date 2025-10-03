const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());

app.post('/print', async (req, res) => {
  const { printerId, content } = req.body;
  try {
    console.log('Printing on', printerId);
    console.log(content);
    res.json({ ok: true });
  } catch (err) {
    console.error('Print error', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(4000, () => console.log('Printer service running on 4000'));
