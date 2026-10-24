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

async function initDB() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, 
      name VARCHAR(255), phone VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code VARCHAR(10)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE`);

    await pool.query(`CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY, name VARCHAR(255), phone VARCHAR(50), car VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Новая'`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price INTEGER`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancel_reason TEXT`);

    await pool.query(`CREATE TABLE IF NOT EXISTS saved_builds (
      id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), car_name VARCHAR(255), build_text TEXT, total_hp INTEGER, total_price INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    await pool.query(`CREATE TABLE IF NOT EXISTS cars (
      id SERIAL PRIMARY KEY, title VARCHAR(255), spec VARCHAR(255), img VARCHAR(255), engine VARCHAR(255), hp VARCHAR(255), weight VARCHAR(255), drive VARCHAR(255), accel VARCHAR(255), description TEXT
    )`);
    
    await pool.query(`CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY, num VARCHAR(10), title VARCHAR(255), short TEXT, full_description TEXT, works TEXT, price VARCHAR(50)
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), name VARCHAR(255), text TEXT, rating INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS booking_id INTEGER REFERENCES bookings(id)`);

    const checkCars = await pool.query('SELECT COUNT(*) FROM cars');
    if (parseInt(checkCars.rows[0].count) === 0) {
      const initialCars = [
        ['NISSAN SILVIA S15', 'SR20DET // 450HP', 'img/car1.jpg', 'SR20DET', '450 HP', '1240 kg', 'RWD', '4.5 sec', 'Классика дрифта.'],
        ['TOYOTA SUPRA MK4', '2JZ-GTE // 800HP', 'img/car2.jpg', '2JZ-GTE', '800 HP', '1510 kg', 'RWD', '3.8 sec', 'Легенда.'],
        ['MAZDA RX-7 FD3S', '13B-REW // 500HP', 'img/car3.jpg', '13B-REW', '500 HP', '1270 kg', 'RWD', '4.0 sec', 'Роторный.'],
        ['HONDA NSX NA1', 'C30A // 350HP', 'img/car4.jpg', 'C30A', '350 HP', '1370 kg', 'RWD', '4.8 sec', 'Суперкар.'],
        ['SUBARU IMPREZA 22B', 'EJ22 // 400HP', 'img/car5.jpg', 'EJ22', '400 HP', '1270 kg', 'AWD', '4.2 sec', 'Ралли.']
      ];
      for (let c of initialCars) await pool.query(`INSERT INTO cars (title, spec, img, engine, hp, weight, drive, accel, description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, c);
    }
    
    const checkSrv = await pool.query('SELECT COUNT(*) FROM services');
    if (parseInt(checkSrv.rows[0].count) === 0) {
      await pool.query(`INSERT INTO services (num, title, short, full_description, works, price) VALUES ('01', 'ENGINE SWAP', 'Свап двигателей.', 'Свапы.', 'Снятие\nУстановка', 'от 250 000 ₽')`);
      await pool.query(`INSERT INTO services (num, title, short, full_description, works, price) VALUES ('02', 'AERO KIT', 'Обвесы.', 'Аэродинамика.', 'Разметка\nПокраска', 'от 120 000 ₽')`);
      await pool.query(`INSERT INTO services (num, title, short, full_description, works, price) VALUES ('03', 'ECU TUNING', 'Прошивка.', 'Настройка.', 'Стенд\nТест', 'от 80 000 ₽')`);
    }
  } catch (err) { console.error('DB Init Error:', err); }
}
initDB();

async function sendTelegramMessage(text, bookingId) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const body = { chat_id: TELEGRAM_CHAT_ID, text: text, parse_mode: 'Markdown' };
    if (bookingId) {
      body.reply_markup = {
        inline_keyboard: [[
          { text: '✅ Выполнено', callback_data: `done_${bookingId}` },
          { text: '💬 Написать', url: 'https://t.me/Bool2Dr' }
        ]]
      };
    }
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
  } catch (error) { }
}

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next();
  jwt.verify(token, JWT_SECRET, (err, decoded) => { if (!err) req.user = decoded; next(); });
};

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, phone } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const check = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (check.rows.length > 0) {
      if (check.rows[0].is_verified) return res.status(400).json({ error: 'Этот email уже зарегистрирован. Попробуйте войти.' });
      else {
        await pool.query(`UPDATE users SET password_hash = $1, name = $2, phone = $3, verification_code = $4 WHERE email = $5`, [hash, name, phone, code, email]);
        res.status(201).json({ message: 'Новый код отправлен', email, code });
        return;
      }
    }
    await pool.query(`INSERT INTO users (email, password_hash, name, phone, verification_code, is_verified) VALUES ($1, $2, $3, $4, $5, FALSE)`, [email, hash, name, phone, code]);
    res.status(201).json({ message: 'Код отправлен', email, code });
  } catch (err) { if (!res.headersSent) res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/verify', async (req, res) => {
  const { email, code } = req.body;
  try {
    const result = await pool.query(`SELECT * FROM users WHERE email = $1 AND verification_code = $2`, [email, code]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'Неверный код' });
    const user = result.rows[0];
    await pool.query(`UPDATE users SET is_verified = TRUE, verification_code = NULL WHERE id = $1`, [user.id]);
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, phone: user.phone } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'Неверный email или пароль' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Неверный пароль' });
    if (!user.is_verified) return res.status(403).json({ error: 'Аккаунт не подтвержден', needsVerify: true, email });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, phone: user.phone } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'Пользователь не найден' });
    const newPass = Math.random().toString(36).slice(-8);
    const hash = await bcrypt.hash(newPass, 10);
    await pool.query(`UPDATE users SET password_hash = $1 WHERE email = $2`, [hash, email]);
    res.json({ message: `Новый пароль: ${newPass}`, pass: newPass });
  } catch (err) { if (!res.headersSent) res.status(500).json({ error: err.message }); }
});

app.get('/api/user/profile', authMiddleware, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Не авторизован' });
  const result = await pool.query('SELECT id, email, name, phone FROM users WHERE id = $1', [req.user.userId]);
  res.json(result.rows[0]);
});

app.get('/api/cars', async (req, res) => { const r = await pool.query('SELECT * FROM cars ORDER BY id ASC'); res.json(r.rows); });
app.get('/api/services', async (req, res) => { const r = await pool.query('SELECT * FROM services ORDER BY id ASC'); res.json(r.rows); });

// ОТЗЫВЫ С НАЗВАНИЕМ МАШИНЫ
app.get('/api/reviews', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT r.*, b.car as target_car 
      FROM reviews r 
      LEFT JOIN bookings b ON r.booking_id = b.id 
      ORDER BY r.created_at DESC
    `);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/user/reviews', authMiddleware, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Не авторизован' });
  const { text, rating, booking_id } = req.body;
  if (!text || !rating || !booking_id) return res.status(400).json({ error: 'Заполните все поля' });
  
  try {
    const checkBooking = await pool.query(`SELECT * FROM bookings WHERE id = $1 AND user_id = $2 AND status = 'Выполнена'`, [booking_id, req.user.userId]);
    if (checkBooking.rows.length === 0) return res.status(400).json({ error: 'Можно оставлять отзыв только на выполненные заказы' });
    
    const checkReview = await pool.query(`SELECT * FROM reviews WHERE booking_id = $1`, [booking_id]);
    if (checkReview.rows.length > 0) return res.status(400).json({ error: 'Вы уже оставили отзыв на этот заказ' });

    const user = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.userId]);
    await pool.query(
      `INSERT INTO reviews (user_id, booking_id, name, text, rating) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.userId, booking_id, user.rows[0].name || 'Клиент', text, parseInt(rating)]
    );
    res.status(201).json({ message: 'Отзыв добавлен' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const limiter = rateLimit({
  windowMs: 60 * 1000, max: 5,
  handler: function (req, res, next, options) { res.status(options.statusCode).json({ error: options.message.error }); },
  message: { error: 'Слишком много запросов. Подождите минуту.' }
});

app.post('/api/book', limiter, authMiddleware, async (req, res) => {
  let { name, phone, car, price } = req.body;
  if (!name || !phone || !car) return res.status(400).json({ error: 'Заполните все поля' });
  const userId = req.user ? req.user.userId : null;
  
  if (userId) {
    const checkDup = await pool.query(`SELECT * FROM bookings WHERE user_id = $1 AND car = $2 AND status != 'Отменена'`, [userId, car]);
    if (checkDup.rows.length > 0) return res.status(400).json({ error: 'У вас уже есть активная заявка на это.' });
  }

  let finalPrice = parseInt(price) || null;
  let discountText = '';
  
  if (userId && finalPrice) {
    const checkOrders = await pool.query('SELECT COUNT(*) FROM bookings WHERE user_id = $1', [userId]);
    if (parseInt(checkOrders.rows[0].count) === 0) {
      finalPrice = Math.round(finalPrice * 0.95);
      discountText = '\n💸 *Скидка 5% применена (Первый проект)*';
    }
  }

  try {
    const result = await pool.query(`INSERT INTO bookings (name, phone, car, user_id, price) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [name, phone, car, userId, finalPrice]);
    const bookingId = result.rows[0].id;
    res.status(201).json({ message: 'Заявка принята' });
    sendTelegramMessage(`🚨 *НОВАЯ ЗАЯВКА* 🚨\n\n👤 *Имя:* ${name}\n📞 *Тел:* ${phone}\n🚗 *Проект:* ${car}${finalPrice ? `\n💰 *Цена:* ${finalPrice} ₽` : ''}${discountText}`, bookingId);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/user/bookings', authMiddleware, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Не авторизован' });
  const r = await pool.query('SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC', [req.user.userId]);
  res.json(r.rows);
});

app.put('/api/user/bookings/:id/cancel', authMiddleware, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Не авторизован' });
  const { reason } = req.body;
  try {
    await pool.query(`UPDATE bookings SET status = 'Отменена', cancel_reason = $1 WHERE id = $2 AND user_id = $3`, [reason || 'Не указана', req.params.id, req.user.userId]);
    res.json({ message: 'Заявка отменена' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/user/save-build', authMiddleware, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Не авторизован' });
  const { car_name, build_text, total_hp, total_price } = req.body;
  try {
    const check = await pool.query(`SELECT * FROM saved_builds WHERE user_id = $1 AND car_name = $2 AND build_text = $3 AND total_hp = $4`, [req.user.userId, car_name, build_text, total_hp]);
    if (check.rows.length > 0) return res.status(400).json({ error: 'Эта сборка уже есть в гараже' });
    await pool.query(`INSERT INTO saved_builds (user_id, car_name, build_text, total_hp, total_price) VALUES ($1, $2, $3, $4, $5)`, [req.user.userId, car_name, build_text, total_hp, total_price]);
    res.status(201).json({ message: 'Сборка сохранена' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/user/builds', authMiddleware, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Не авторизован' });
  const r = await pool.query('SELECT * FROM saved_builds WHERE user_id = $1 ORDER BY created_at DESC', [req.user.userId]);
  res.json(r.rows);
});

app.delete('/api/user/builds/:id', authMiddleware, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Не авторизован' });
  await pool.query(`DELETE FROM saved_builds WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.userId]);
  res.json({ message: 'Удалено' });
});

// --- АДМИНКА ---
const adminAuth = basicAuth({ users: { [process.env.ADMIN_USER || 'admin']: process.env.ADMIN_PASS || 'kanjo123' }, challenge: true });
app.get('/admin', adminAuth, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html')); });
app.get('/api/admin/bookings', adminAuth, async (req, res) => { const r = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC'); res.json(r.rows); });
app.put('/api/admin/bookings/:id/status', adminAuth, async (req, res) => { await pool.query(`UPDATE bookings SET status = $1 WHERE id = $2`, [req.body.status, req.params.id]); res.json({ message: 'OK' }); });
app.delete('/api/admin/bookings/:id', adminAuth, async (req, res) => { await pool.query(`DELETE FROM bookings WHERE id = $1`, [req.params.id]); res.json({ message: 'Заявка удалена' }); });
app.get('/api/admin/clients', adminAuth, async (req, res) => { const r = await pool.query('SELECT id, email, name, phone, created_at FROM users ORDER BY id DESC'); res.json(r.rows); });
app.delete('/api/admin/clients/:id', adminAuth, async (req, res) => {
  try {
    const clientId = req.params.id;
    await pool.query('DELETE FROM bookings WHERE user_id = $1', [clientId]);
    await pool.query('DELETE FROM saved_builds WHERE user_id = $1', [clientId]);
    await pool.query('DELETE FROM reviews WHERE user_id = $1', [clientId]);
    await pool.query('DELETE FROM users WHERE id = $1', [clientId]);
    res.json({ message: 'Client deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/reviews', adminAuth, async (req, res) => {
  const r = await pool.query(`
    SELECT r.*, b.car as target_car 
    FROM reviews r 
    LEFT JOIN bookings b ON r.booking_id = b.id 
    ORDER BY r.created_at DESC
  `);
  res.json(r.rows);
});
app.delete('/api/admin/reviews/:id', adminAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM reviews WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Отзыв удален' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/cars', adminAuth, async (req, res) => { const { title, spec, img, engine, hp, weight, drive, accel, description } = req.body; await pool.query(`INSERT INTO cars (title, spec, img, engine, hp, weight, drive, accel, description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [title, spec, img, engine, hp, weight, drive, accel, description]); res.status(201).json({ message: 'OK' }); });
app.put('/api/admin/cars/:id', adminAuth, async (req, res) => { const { title, spec, img, engine, hp, weight, drive, accel, description } = req.body; await pool.query(`UPDATE cars SET title=$1, spec=$2, img=$3, engine=$4, hp=$5, weight=$6, drive=$7, accel=$8, description=$9 WHERE id=$10`, [title, spec, img, engine, hp, weight, drive, accel, description, req.params.id]); res.json({ message: 'OK' }); });
app.delete('/api/admin/cars/:id', adminAuth, async (req, res) => { await pool.query(`DELETE FROM cars WHERE id = $1`, [req.params.id]); res.json({ message: 'OK' }); });
app.post('/api/admin/services', adminAuth, async (req, res) => { const { num, title, short, full_description, works, price } = req.body; await pool.query(`INSERT INTO services (num, title, short, full_description, works, price) VALUES ($1,$2,$3,$4,$5,$6)`, [num, title, short, full_description, works, price]); res.status(201).json({ message: 'OK' }); });
app.put('/api/admin/services/:id', adminAuth, async (req, res) => { const { num, title, short, full_description, works, price } = req.body; await pool.query(`UPDATE services SET num=$1, title=$2, short=$3, full_description=$4, works=$5, price=$6 WHERE id=$7`, [num, title, short, full_description, works, price, req.params.id]); res.json({ message: 'OK' }); });
app.delete('/api/admin/services/:id', adminAuth, async (req, res) => { await pool.query(`DELETE FROM services WHERE id = $1`, [req.params.id]); res.json({ message: 'OK' }); });

app.post('/api/telegram-webhook', async (req, res) => {
  const { callback_query } = req.body;
  if (!callback_query) return res.sendStatus(200);

  const data = callback_query.data;
  const chatId = callback_query.message.chat.id;
  const messageId = callback_query.message.message_id;

  if (data.startsWith('done_')) {
    const bookingId = data.split('_')[1];
    try {
      await pool.query(`UPDATE bookings SET status = 'Выполнена' WHERE id = $1`, [bookingId]);
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callback_query.id, text: 'Заявка выполнена!' })
      });
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId, message_id: messageId,
          text: callback_query.message.text + '\n\n✅ *СТАТУС: ВЫПОЛНЕНО*', parse_mode: 'Markdown'
        })
      });
    } catch (err) { console.error(err); }
  }
  res.sendStatus(200);
});

app.listen(PORT, () => console.log(`[SERVER] Запущен на порту ${PORT}`));