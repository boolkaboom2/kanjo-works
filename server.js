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
      id SERIAL PRIMARY KEY, 
      title VARCHAR(255), 
      spec VARCHAR(255), 
      img VARCHAR(255),
      engine VARCHAR(255),
      hp VARCHAR(255),
      weight VARCHAR(255),
      drive VARCHAR(255),
      accel VARCHAR(255),
      description TEXT
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
  } catch (err) {
    console.error('DB Init Error:', err);
  }
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

const limiter = rateLimit({ windowMs: 60 * 1000, max: 3 });
app.use('/api/book', limiter);

// API ДЛЯ ФРОНТЕНДА
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

// АДМИН ПАНЕЛЬ
const adminAuth = basicAuth({
  users: { [process.env.ADMIN_USER || 'admin']: process.env.ADMIN_PASS || 'kanjo123' },
  challenge: true,
});

app.get('/admin', adminAuth, async (req, res) => {
  const bookings = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
  const cars = await pool.query('SELECT * FROM cars ORDER BY id ASC');
  
  let html = `
    <html><head><meta charset="utf-8"><title>KANJO ADMIN</title>
    <style>
      body{background:#0a0a0a;color:#fff;font-family:monospace;padding:20px;}
      table{width:100%;border-collapse:collapse;margin-bottom:40px;} 
      th,td{border:1px solid #333;padding:10px;text-align:left;}
      th{color:#ff0033;}
      input, textarea, select {background:#111; color:#fff; border:1px solid #333; padding:5px; width:100%; margin-bottom:5px; font-family:monospace;}
      button {background:#ff0033; color:#fff; border:none; padding:10px 20px; cursor:pointer; font-weight:bold; margin-top:10px;}
      .grid {display:grid; grid-template-columns: 1fr 1fr; gap:20px;}
      a {color: #ff0033; text-decoration: none;}
      a:hover {text-decoration: underline;}
    </style></head><body>
    <h1>KANJO_WORKS // TERMINAL</h1>
    
    <h2>ЗАЯВКИ</h2>
    <table><tr><th>ID</th><th>ИМЯ</th><th>ТЕЛЕФОН</th><th>МАШИНА</th><th>ДАТА</th></tr>`;
  bookings.rows.forEach(r => {
    html += `<tr><td>${r.id}</td><td>${r.name}</td><td>${r.phone}</td><td>${r.car}</td><td>${r.created_at}</td></tr>`;
  });
  html += `</table>

    <h2>УПРАВЛЕНИЕ МАШИНАМИ</h2>
    <div class="grid">
      <div>
        <h3>Добавить машину</h3>
        <form action="/admin/add-car" method="POST">
          <input type="text" name="title" placeholder="Название (NISSAN SILVIA)" required>
          <input type="text" name="spec" placeholder="Краткий спек (SR20DET // 450HP)" required>
          <input type="text" name="img" placeholder="Ссылка на фото (img/car1.jpg)" required>
          <input type="text" name="engine" placeholder="Двигатель">
          <input type="text" name="hp" placeholder="Мощность (450 HP)">
          <input type="text" name="weight" placeholder="Масса (1240 kg)">
          <input type="text" name="drive" placeholder="Привод (RWD)">
          <input type="text" name="accel" placeholder="Разгон (4.5 sec)">
          <textarea name="description" placeholder="Описание"></textarea>
          <button type="submit">ДОБАВИТЬ</button>
        </form>
      </div>
      <div>
        <h3>Список машин</h3>
        <table><tr><th>ID</th><th>Фото</th><th>Название</th><th>Действия</th></tr>`;
  cars.rows.forEach(c => {
    html += `<tr>
      <td>${c.id}</td><td><img src="${c.img}" width="50"></td><td>${c.title}</td>
      <td>
        <a href="/admin/edit-car/${c.id}">РЕДАКТИРОВАТЬ</a> | 
        <a href="/admin/delete-car/${c.id}" style="color:gray;">УДАЛИТЬ</a>
      </td>
    </tr>`;
  });
  html += `</table></div></div></body></html>`;
  res.send(html);
});

// --- ДОБАВЛЕНИЕ, РЕДАКТИРОВАНИЕ И УДАЛЕНИЕ МАШИН ---

// Добавление
app.post('/admin/add-car', adminAuth, async (req, res) => {
  const { title, spec, img, engine, hp, weight, drive, accel, description } = req.body;
  await pool.query(`INSERT INTO cars (title, spec, img, engine, hp, weight, drive, accel, description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, 
    [title, spec, img, engine, hp, weight, drive, accel, description]);
  res.redirect('/admin');
});

// Удаление
app.get('/admin/delete-car/:id', adminAuth, async (req, res) => {
  await pool.query(`DELETE FROM cars WHERE id = $1`, [req.params.id]);
  res.redirect('/admin');
});

// Форма редактирования (GET)
app.get('/admin/edit-car/:id', adminAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM cars WHERE id = $1', [req.params.id]);
  const car = result.rows[0];
  if (!car) return res.status(404).send('Car not found');

  let html = `
    <html><head><meta charset="utf-8"><title>EDIT CAR</title>
    <style>
      body{background:#0a0a0a;color:#fff;font-family:monospace;padding:20px;}
      input, textarea {background:#111; color:#fff; border:1px solid #333; padding:10px; width:100%; max-width:600px; margin-bottom:15px; font-family:monospace;}
      button {background:#ff0033; color:#fff; border:none; padding:10px 20px; cursor:pointer; font-weight:bold;}
      a {color: #888; text-decoration: none; margin-left: 10px;}
    </style></head><body>
    <h1>РЕДАКТИРОВАТЬ МАШИНУ #${car.id}</h1>
    <form action="/admin/edit-car/${car.id}" method="POST">
      <label>Название:</label><br>
      <input type="text" name="title" value="${car.title}" required><br>
      
      <label>Краткий спек:</label><br>
      <input type="text" name="spec" value="${car.spec}" required><br>
      
      <label>Фото (URL):</label><br>
      <input type="text" name="img" value="${car.img}" required><br>
      
      <label>Двигатель:</label><br>
      <input type="text" name="engine" value="${car.engine || ''}"><br>
      
      <label>Мощность:</label><br>
      <input type="text" name="hp" value="${car.hp || ''}"><br>
      
      <label>Масса:</label><br>
      <input type="text" name="weight" value="${car.weight || ''}"><br>
      
      <label>Привод:</label><br>
      <input type="text" name="drive" value="${car.drive || ''}"><br>
      
      <label>Разгон:</label><br>
      <input type="text" name="accel" value="${car.accel || ''}"><br>
      
      <label>Описание:</label><br>
      <textarea name="description" rows="5">${car.description || ''}</textarea><br>
      
      <button type="submit">СОХРАНИТЬ</button>
      <a href="/admin">ОТМЕНА</a>
    </form>
    </body></html>
  `;
  res.send(html);
});

// Сохранение изменений (POST)
app.post('/admin/edit-car/:id', adminAuth, async (req, res) => {
  const { title, spec, img, engine, hp, weight, drive, accel, description } = req.body;
  await pool.query(
    `UPDATE cars SET title=$1, spec=$2, img=$3, engine=$4, hp=$5, weight=$6, drive=$7, accel=$8, description=$9 WHERE id=$10`,
    [title, spec, img, engine, hp, weight, drive, accel, description, req.params.id]
  );
  res.redirect('/admin');
});

app.listen(PORT, () => console.log(`[SERVER] Запущен на порту ${PORT}`));