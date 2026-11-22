const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({ invitations: {} }, null, 2));
}

const loadDB = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const saveDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

app.post('/api/invite', (req, res) => {
  try {
    const db = loadDB();
    const id = req.body.id || 'und-' + Math.random().toString(36).substring(2, 8);
    const existingMessages = db.invitations[id]?.messages || [];

    db.invitations[id] = {
      ...req.body,
      id,
      updatedAt: new Date().toISOString(),
      messages: existingMessages
    };

    saveDB(db);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menyimpan data undangan' });
  }
});

app.get('/api/invite/:id', (req, res) => {
  const db = loadDB();
  const invite = db.invitations[req.params.id];
  if (!invite) {
    return res.status(404).json({ success: false, message: 'Undangan tidak ditemukan' });
  }
  res.json({ success: true, data: invite });
});

app.post('/api/invite/:id/rsvp', (req, res) => {
  const db = loadDB();
  const invite = db.invitations[req.params.id];
  if (!invite) {
    return res.status(404).json({ success: false, message: 'Undangan tidak ditemukan' });
  }

  const now = new Date();
  const entry = {
    msgId: Date.now(),
    name: String(req.body.name || 'Tamu').trim(),
    status: String(req.body.status || 'Hadir').trim(),
    wish: String(req.body.wish || '').trim(),
    date: now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
    time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  };

  invite.messages.unshift(entry);
  saveDB(db);
  res.json({ success: true, entry, messages: invite.messages });
});

app.listen(PORT, () => {
  console.log(`Server UndanganKu aktif di http://localhost:${PORT}`);
});
