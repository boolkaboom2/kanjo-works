require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const basicAuth = require('express-basic-auth');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// 1. Защита HTTP-заголовков
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false
}));

// 2. Ограничение количества запросов (1 запрос в минуту)
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 минута
  max: 1, // 1 запрос в минуту с одного IP
  message: { error: 'Слишком много запросов. Подождите минуту.' }
});
app.use('/api/book', limiter);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 

// Подключение к БД
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

// Отправка в Telegram
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

// API Заявки
app.post('/api/book', async (req, res) => {
  let { name, phone, car } = req.body;
  
  // Валидация длины
  if (!name || !phone || !car || name.length > 50 || phone.length > 20 || car.length > 100) {
    return res.status(400).json({ error: 'Некорректные данные' });
  }

  // Очистка от HTML-тегов (Anti-XSS)
  const sanitize = (str) => String(str).replace(/<[^>]*>?/gm, '');
  name = sanitize(name);
  phone = sanitize(phone);
  car = sanitize(car);

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

// 3. Защита админки паролем (Basic Auth)
const adminAuth = basicAuth({
  users: { [process.env.ADMIN_USER || 'admin']: process.env.ADMIN_PASS || 'kanjo123' },
  challenge: true,
  realm: 'KANJO_ADMIN'
});

// Админка
app.get('/admin', adminAuth, async (req, res) => {
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