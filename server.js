require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 

// Подключение к БД
let db;
try {
  // Если есть DATABASE_URL (на Render), используем Postgres (пока оставим SQLite для локального теста)
  // Для полноценного деплоя мы перейдем на Postgres позже, но сейчас, чтобы Render запустился:
  if (process.env.DATABASE_URL) {
    console.log("Render DB detected. Ignoring SQLite for now."); // Заглушка
  } else {
    db = new Database('./database.db');
    db.exec(`CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      phone TEXT,
      car TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }
} catch(e) {
  console.log(e);
}

async function sendTelegramMessage(text) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text, parse_mode: 'Markdown' })
    });
  } catch (error) {
    console.error('[TELEGRAM ERROR]', error.message);
  }
}

app.post('/api/book', (req, res) => {
  const { name, phone, car } = req.body;
  if (!name || !phone || !car) return res.status(400).json({ error: 'Заполните все поля' });

  try {
    // Для деплоя мы временно просто отправляем в телеграм, чтобы проверить, что сервер живой
    res.status(201).json({ message: 'Заявка принята' });
    const message = `🚨 *НОВАЯ ЗАЯВКА* 🚨\n\n👤 *Имя:* ${name}\n📞 *Телефон:* ${phone}\n🚗 *Машина:* ${car}`;
    sendTelegramMessage(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`[SERVER] Запущен на порту ${PORT}`));