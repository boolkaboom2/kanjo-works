require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const basicAuth = require('express-basic-auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const JWT_SECRET = process.env.JWT_SECRET || 'kanjo_super_secret_key_123';

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); 

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Инициализация БД
async function initDB() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY, name VARCHAR(255), phone VARCHAR(50), car VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    // Добавляем связь с пользователем и СТАТУС
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Новая'`);

    await pool.query(`CREATE TABLE IF NOT EXISTS cars (
      id SERIAL PRIMARY KEY, title VARCHAR(255), spec VARCHAR(255), img VARCHAR(255),
      engine VARCHAR(255), hp VARCHAR(255), weight VARCHAR(255), drive VARCHAR(255), accel VARCHAR(255), description TEXT
    )`);
    
    await pool.query(`CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY, num VARCHAR(10), title VARCHAR(255), short TEXT, full_description TEXT, works TEXT, price VARCHAR(50)
    )`);
    
    // (Код заполнения дефолтными машинами и услугами оставь как был, он не меняется)
    const checkCars = await pool.query('SELECT COUNT(*) FROM cars');
    if (parseInt(checkCars.rows[0].count) === 0) { /* ... */ }
    const checkSrv = await pool.query('SELECT COUNT(*) FROM services');
    if (parseInt(checkSrv.rows[0].count) === 0) { /* ... */ }

  } catch (err) { console.error('DB Init Error:', err); }
}
initDB();

async function sendTelegramMessage(text) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text, parse_mode: 'Markdown' })
    });
  } catch (error) { console.error('[TG ERROR]', error.message); }
}

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next();
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (!err) req.user = decoded;
    next();
  });
};

// --- АВТОРИЗАЦИЯ (без изменений) ---
app.post('/api/auth/register', async (req, res) => { /* ... */ });
app.post('/api/auth/login', async (req, res) => { /* ... */ });

// --- ПУБЛИЧНОЕ API (без изменений) ---
app.get('/api/cars', async (req, res) => { /* ... */ });
app.get('/api/services', async (req, res) => { /* ... */ });

const limiter = rateLimit({ windowMs: 60 * 1000, max: 3 });
app.post('/api/book', limiter, authMiddleware, async (req, res) => {
  let { name, phone, car } = req.body;
  if (!name || !phone || !car) return res.status(400).json({ error: 'Заполните все поля' });
  const userId = req.user ? req.user.userId : null;
  try {
    await pool.query(`INSERT INTO bookings (name, phone, car, user_id) VALUES ($1, $2, $3, $4)`, [name, phone, car, userId]);
    res.status(201).json({ message: 'Заявка принята' });
    sendTelegramMessage(`🚨 *НОВАЯ ЗАЯВКА* 🚨\n\n👤 *Имя:* ${name}\n📞 *Тел:* ${phone}\n🚗 *Проект:* ${car}`);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/user/bookings', authMiddleware, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Не авторизован' });
  try {
    const result = await pool.query('SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC', [req.user.userId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- АДМИН ПАНЕЛЬ ---
const adminAuth = basicAuth({
  users: { [process.env.ADMIN_USER || 'admin']: process.env.ADMIN_PASS || 'kanjo123' },
  challenge: true,
});

app.get('/admin', adminAuth, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html')); });

app.get('/api/admin/bookings', adminAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
  res.json(result.rows);
});

// НОВЫЙ МАРШРУТ: Изменение статуса заявки
app.put('/api/admin/bookings/:id/status', adminAuth, async (req, res) => {
  const { status } = req.body;
  try {
    await pool.query(`UPDATE bookings SET status = $1 WHERE id = $2`, [status, req.params.id]);
    res.json({ message: 'Status updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// (Остальные админские маршруты для машин и услуг оставь как были)
app.post('/api/admin/cars', adminAuth, async (req, res) => { /* ... */ });
// ...

app.listen(PORT, () => console.log(`[SERVER] Запущен на порту ${PORT}`));