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
// Секретный ключ для токенов. В идеале добавить в .env, но для MVP сойдет и так.
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
    // Таблица пользователей
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Обновляем таблицу bookings (добавляем user_id, если её нет)
    await pool.query(`CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY, name VARCHAR(255), phone VARCHAR(50), car VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)`);

    await pool.query(`CREATE TABLE IF NOT EXISTS cars (
      id SERIAL PRIMARY KEY, title VARCHAR(255), spec VARCHAR(255), img VARCHAR(255),
      engine VARCHAR(255), hp VARCHAR(255), weight VARCHAR(255), drive VARCHAR(255), accel VARCHAR(255), description TEXT
    )`);
    
    await pool.query(`CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY, num VARCHAR(10), title VARCHAR(255), short TEXT, full_description TEXT, works TEXT, price VARCHAR(50)
    )`);
    
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

    const checkSrv = await pool.query('SELECT COUNT(*) FROM services');
    if (parseInt(checkSrv.rows[0].count) === 0) {
      const initServices = [
        ['01', 'ENGINE SWAP', 'Установка и настройка двигателей RB, 2JZ, SR20. Полная переборка.', 'Мы специализируемся на свапах легендарных двигателей. Установим 2JZ-GTE в ваш кузов или соберем SR20DET с нуля на кованых поршнях.', 'Снятие и дефектовка старого ДВС\nУстановка нового двигателя с подрамником\nИзготовление кастомного выхлопа\nНастройка ЭБУ и стендовая обкатка', 'от 250 000 ₽'],
        ['02', 'AERO KIT', 'Установка обвесов. Подгонка по миллиметрам. Карбон и стеклопластик.', 'Аэродинамика решает всё. Установим широкие арки, агрессивные бампера и антикрыло.', 'Разметка и подрезка кузова\nУстановка расширителей арок\nМонтаж порогов и сплиттеров\nПокраска и финальная подгонка зазоров', 'от 120 000 ₽'],
        ['03', 'ECU TUNING', 'Настройка топливных карт и зажигания на стенде. Максимальная отдача.', 'Стоковая прошивка — это ограничение. Мы настроим ваш мотор под конкретное топливо.', 'Установка программируемого ЭБУ (Link, Haltech)\nУстановка датчиков (лямбда, давление)\nСтендовые заезды и калибровка\nТест-драйв и логирование данных', 'от 80 000 ₽']
      ];
      for (let s of initServices) {
        await pool.query(`INSERT INTO services (num, title, short, full_description, works, price) VALUES ($1, $2, $3, $4, $5, $6)`, s);
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

// Middleware для проверки JWT (если пользователь авторизован)
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next(); // Если нет токена, пропускаем (для гостей)

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (!err) req.user = decoded; // Сохраняем данные юзера в запрос
    next();
  });
};

// --- АВТОРИЗАЦИЯ ---

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Заполните все поля' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email`,
      [email, hash]
    );
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Этот email уже занят' });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'Неверный email или пароль' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Неверный email или пароль' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ПУБЛИЧНОЕ API ---
app.get('/api/cars', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cars ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/services', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Создание заявки (теперь с проверкой, авторизован ли юзер)
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

// Получить заявки текущего пользователя
app.get('/api/user/bookings', authMiddleware, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Не авторизован' });
  try {
    const result = await pool.query('SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC', [req.user.userId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- АДМИН ПАНЕЛЬ (Без изменений) ---
const adminAuth = basicAuth({
  users: { [process.env.ADMIN_USER || 'admin']: process.env.ADMIN_PASS || 'kanjo123' },
  challenge: true,
});

app.get('/admin', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('/api/admin/bookings', adminAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
  res.json(result.rows);
});

app.post('/api/admin/cars', adminAuth, async (req, res) => { /* ... код без изменений ... */ });
// (Остальные админские маршруты для машин и услуг оставь как были)