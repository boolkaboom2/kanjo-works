const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// --- НАСТРОЙКИ TELEGRAM ---
const TELEGRAM_TOKEN = '8882698122:AAEnvB5ypMBIJ-p7Vg-86RT3YNPZbFGUIb0';
const TELEGRAM_CHAT_ID = '2062562654';
// ---------------------------

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 

const db = new sqlite3.Database('./database.db');

db.run(`CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  phone TEXT,
  car TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Функция отправки в Telegram
async function sendTelegramMessage(text) {
  if (TELEGRAM_TOKEN === 'ТВОЙ_ТОКЕН_БОТА' || TELEGRAM_CHAT_ID === 'ТВОЙ_CHAT_ID') {
    console.log('[TELEGRAM] Ошибка: Вы не указали токен или Chat ID.');
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'Markdown'
      })
    });
    
    const data = await response.json();
    if (!data.ok) console.log('[TELEGRAM ERROR]', data.description);
    else console.log('[TELEGRAM] Уведомление успешно отправлено');
  } catch (error) {
    console.error('[TELEGRAM FETCH ERROR]', error.message);
  }
}

app.post('/api/book', (req, res) => {
  console.log('[API] Получен запрос:', req.body);
  
  const { name, phone, car } = req.body;
  
  if (!name || !phone || !car) {
    return res.status(400).json({ error: 'Заполните все поля' });
  }

  const query = `INSERT INTO bookings (name, phone, car) VALUES (?, ?, ?)`;
  db.run(query, [name, phone, car], function(err) {
    if (err) {
      console.log('[API] Ошибка БД:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    console.log('[API] Заявка сохранена, ID:', this.lastID);
    res.status(201).json({ id: this.lastID, message: 'Заявка принята' });

    // Отправляем уведомление в Telegram
    const message = `🚨 *НОВАЯ ЗАЯВКА* 🚨\n\n👤 *Имя:* ${name}\n📞 *Телефон:* ${phone}\n🚗 *Машина:* ${car}`;
    sendTelegramMessage(message);
  });
});

app.get('/admin', (req, res) => {
  db.all(`SELECT * FROM bookings ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).send(err.message);
    let html = `
      <style>body{background:#0a0a0a;color:#fff;font-family:monospace;padding:20px;} 
      table{width:100%;border-collapse:collapse;} th,td{border:1px solid #333;padding:10px;text-align:left;}
      th{color:#ff0033;}</style>
      <h1>KANJO_WORKS // TERMINAL</h1>
      <table><tr><th>ID</th><th>ИМЯ</th><th>ТЕЛЕФОН</th><th>МАШИНА</th><th>ДАТА</th></tr>`;
    rows.forEach(r => {
      html += `<tr><td>${r.id}</td><td>${r.name}</td><td>${r.phone}</td><td>${r.car}</td><td>${r.created_at}</td></tr>`;
    });
    html += '</table>';
    res.send(html);
  });
});

app.listen(PORT, () => {
  console.log(`[SERVER] Запущен на http://localhost:${PORT}`);
});