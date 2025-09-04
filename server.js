// server.js
const express = require('express');
const fetch = require('node-fetch'); // npm i node-fetch@2
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // serve HTML from ./public

// helper: kirim pesan ke telegram
async function sendToTelegram(token, chatId, text, options = {}) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: options.parse_mode || 'HTML',
    disable_web_page_preview: options.disable_web_page_preview || false
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

// endpoint kirim ke 1 user
app.post('/api/send', async (req, res) => {
  try {
    const { token, userId, message } = req.body;
    if (!token || !userId || !message) return res.status(400).json({ error: 'token, userId, message required' });

    const result = await sendToTelegram(token, userId, message);
    res.json({ ok: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// endpoint broadcast (All Alert) - menerima list userId dipisah koma atau array
app.post('/api/broadcast', async (req, res) => {
  try {
    const { token, userIds, message } = req.body;
    if (!token || !userIds || !message) return res.status(400).json({ error: 'token, userIds, message required' });

    // support string "123,456" atau array [123,456]
    let ids = Array.isArray(userIds) ? userIds : String(userIds).split(',').map(s => s.trim()).filter(Boolean);
    const results = [];

    for (const id of ids) {
      try {
        const r = await sendToTelegram(token, id, message, { parse_mode: 'HTML' });
        results.push({ id, ok: true, result: r });
      } catch (e) {
        results.push({ id, ok: false, error: e.message });
      }
    }

    res.json({ ok: true, summary: { total: ids.length, successes: results.filter(r => r.ok).length }, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));