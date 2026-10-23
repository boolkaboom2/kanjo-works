require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 

// Подключение к БД (Render сам подставит DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Создание таблицы
pool.query(`CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  phone VARCHAR(50),
  car VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`).catch(err => console.error('DB Init Error:', err));

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

app.post('/api/book', async (req, res) => {
  const { name, phone, car } = req.body;
  if (!name || !phone || !car) return res.status(400).json({ error: 'Заполните все поля' });

  try {
    const result = await pool.query(
      `INSERT INTO bookings (name, phone, car) VALUES ($1, $2, $3) RETURNING id`,
      [name, phone, car]
    );
    res.status(201).json({ id: result.rows[0].id, message: 'Заявка принята' });
    
    const message = `🚨 *НОВАЯ ЗАЯВКА* 🚨\n\n👤 *Имя:* ${name}\n📞 *Телефон:* ${phone}\n🚗 *Машина:* ${car}`;
    sendTelegramMessage(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/admin', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM bookings ORDER BY created_at DESC`);
    let html = `
      <style>body{background:#0a0a0a;color:#fff;font-family:monospace;padding:20px;} 
      table{width:100%;border-collapse:collapse;} th,td{border:1px solid #333;padding:10px;text-align:left;}
      th{color:#ff0033;}</style>
      <h1>KANJO_WORKS // TERMINAL</h1>
      <table><tr><th>ID</th><th>ИМЯ</th><th>ТЕЛЕФОН</th><th>МАШИНА</th><th>ДАТА</th></tr>`;
    result.rows.forEach(r => {
      html += `<tr><td>${r.id}</td><td>${r.name}</td><td>${r.phone}</td><td>${r.car}</td><td>${r.created_at}</td></tr>`;
    });
    html += '</table>';
    res.send(html);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.listen(PORT, () => console.log(`[SERVER] Запущен на порту ${PORT}`));