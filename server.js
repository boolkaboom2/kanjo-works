require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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
    await pool.query(`CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY, name VARCHAR(255), phone VARCHAR(50), car VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS cars (
      id SERIAL PRIMARY KEY, title VARCHAR(255), spec VARCHAR(255), img VARCHAR(255),
      engine VARCHAR(255), hp VARCHAR(255), weight VARCHAR(255), drive VARCHAR(255), accel VARCHAR(255), description TEXT
    )`);
    
    // Если база пустая, добавляем стартовые машины
    const checkCars = await pool.query('SELECT COUNT(*) FROM cars');
    if (parseInt(checkCars.rows[0].count) === 0) {
      const initialCars = [
        ['NISSAN SILVIA S15', 'SR20DET // 450HP', 'img/car1.jpg', 'SR20DET (2.0L Turbo)', '450 HP', '1240 kg', 'RWD', '4.5 sec', 'Классика дрифта.'],
        ['TOYOTA SUPRA MK4', '2JZ-GTE // 800HP', 'img/car2.jpg', '2JZ-GTE', '800 HP', '1510 kg', 'RWD', '3.8 sec', 'Легенда.'],
        ['MAZDA RX-7 FD3S', '13B-REW // 500HP', 'img/car3.jpg', '13B-REW', '500 HP', '1270 kg', 'RWD', '4.0 sec', 'Роторный двигатель.'],
        ['HONDA NSX NA1', 'C30A // 350HP', 'img/car4.jpg', 'C30A', '350 HP', '1370 kg', 'RWD', '4.8 sec', 'Японский суперкар.'],
        ['SUBARU IMPREZA 22B', 'EJ22 // 400HP', 'img/car5.jpg', 'EJ22', '400 HP', '1270 kg', 'AWD', '4.2 sec', 'Раллийная легенда.']
      ];
      for (let c of initialCars) {
        await pool.query(`INSERT INTO cars (title, spec, img, engine, hp, weight, drive, accel, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, c);
      }
    }
  } catch (err) { console.error('DB Init Error:', err); }
}
initDB();

async function sendTelegramMessage(text) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text, parse_mode: 'Markdown' })
    });
  } catch (error) { console.error('[TG ERROR]', error.message); }
}

// Ограничение для публичных запросов (защита от спама)
const limiter = rateLimit({ windowMs: 60 * 1000, max: 3 });
app.use('/api/book', limiter);

// --- ПУБЛИЧНОЕ API ---
app.get('/api/cars', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cars ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/book', async (req, res) => {
  let { name, phone, car } = req.body;
  if (!name || !phone || !car) return res.status(400).json({ error: 'Заполните все поля' });
  try {
    await pool.query(`INSERT INTO bookings (name, phone, car) VALUES ($1, $2, $3)`, [name, phone, car]);
    res.status(201).json({ message: 'Заявка принята' });
    sendTelegramMessage(`🚨 *НОВАЯ ЗАЯВКА* 🚨\n\n👤 *Имя:* ${name}\n📞 *Тел:* ${phone}\n🚗 *Машина:* ${car}`);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- АДМИН ПАНЕЛЬ (Защищено паролем) ---
const adminAuth = basicAuth({
  users: { [process.env.ADMIN_USER || 'admin']: process.env.ADMIN_PASS || 'kanjo123' },
  challenge: true,
});

// Отдаем HTML файл админки
app.get('/admin', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// API для получения заявок
app.get('/api/admin/bookings', adminAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
  res.json(result.rows);
});

// API для добавления машины
app.post('/api/admin/cars', adminAuth, async (req, res) => {
  const { title, spec, img, engine, hp, weight, drive, accel, description } = req.body;
  await pool.query(`INSERT INTO cars (title, spec, img, engine, hp, weight, drive, accel, description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, 
    [title, spec, img, engine, hp, weight, drive, accel, description]);
  res.status(201).json({ message: 'Car added' });
});

// API для обновления машины
app.put('/api/admin/cars/:id', adminAuth, async (req, res) => {
  const { title, spec, img, engine, hp, weight, drive, accel, description } = req.body;
  await pool.query(
    `UPDATE cars SET title=$1, spec=$2, img=$3, engine=$4, hp=$5, weight=$6, drive=$7, accel=$8, description=$9 WHERE id=$10`,
    [title, spec, img, engine, hp, weight, drive, accel, description, req.params.id]
  );
  res.json({ message: 'Car updated' });
});

// API для удаления машины
app.delete('/api/admin/cars/:id', adminAuth, async (req, res) => {
  await pool.query(`DELETE FROM cars WHERE id = $1`, [req.params.id]);
  res.json({ message: 'Car deleted' });
});

app.listen(PORT, () => console.log(`[SERVER] Запущен на порту ${PORT}`));