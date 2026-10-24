document.addEventListener('DOMContentLoaded', () => {
  
  // --- ЛОГИКА ВКЛАДОК ---
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  // --- ЗАГРУЗКА ЗАЯВОК ---
  async function loadBookings() {
    const tbody = document.getElementById('bookings-list');
    try {
      const res = await fetch('/api/admin/bookings');
      const data = await res.json();
      tbody.innerHTML = data.map(b => `
        <tr>
          <td>${b.id}</td>
          <td>${b.name}</td>
          <td>${b.phone}</td>
          <td>${b.car}</td>
          <td>${new Date(b.created_at).toLocaleString('ru-RU')}</td>
        </tr>
      `).join('');
    } catch (err) { console.error('Ошибка загрузки заявок', err); }
  }

  // --- УПРАВЛЕНИЕ МАШИНАМИ ---
  const carModal = document.getElementById('car-modal');
  const carForm = document.getElementById('car-form');
  let allCars = [];

  async function loadCars() {
    const tbody = document.getElementById('cars-list');
    try {
      const res = await fetch('/api/cars');
      allCars = await res.json();
      
      tbody.innerHTML = allCars.map(c => `
        <tr>
          <td>${c.id}</td>
          <td><img src="${c.img}" alt="${c.title}"></td>
          <td>${c.title}</td>
          <td>${c.spec}</td>
          <td>
            <span class="action-link" onclick="openEditModal(${c.id})">РЕДАКТИРОВАТЬ</span>
            <span class="action-link delete" onclick="deleteCar(${c.id})">УДАЛИТЬ</span>
          </td>
        </tr>
      `).join('');
    } catch (err) { console.error('Ошибка загрузки машин', err); }
  }

  // Открытие модалки
  document.getElementById('btn-add-car').addEventListener('click', () => {
    carForm.reset();
    document.getElementById('car-id').value = '';
    document.getElementById('modal-title').textContent = 'ДОБАВИТЬ МАШИНУ';
    carModal.classList.add('open');
  });

  document.getElementById('btn-cancel').addEventListener('click', () => {
    carModal.classList.remove('open');
  });

  // Глобальные функции для кнопок в таблице
  window.openEditModal = (id) => {
    const car = allCars.find(c => c.id === id);
    if (!car) return;

    document.getElementById('car-id').value = car.id;
    document.getElementById('car-title').value = car.title;
    document.getElementById('car-spec').value = car.spec;
    document.getElementById('car-img').value = car.img;
    document.getElementById('car-engine').value = car.engine || '';
    document.getElementById('car-hp').value = car.hp || '';
    document.getElementById('car-weight').value = car.weight || '';
    document.getElementById('car-drive').value = car.drive || '';
    document.getElementById('car-accel').value = car.accel || '';
    document.getElementById('car-desc').value = car.description || '';

    document.getElementById('modal-title').textContent = 'РЕДАКТИРОВАТЬ МАШИНУ';
    carModal.classList.add('open');
  };

  window.deleteCar = async (id) => {
    if (!confirm('Вы уверены, что хотите удалить эту машину?')) return;
    try {
      await fetch(`/api/admin/cars/${id}`, { method: 'DELETE' });
      loadCars(); // Перезагружаем список
    } catch (err) { console.error(err); }
  };

  // Сохранение (Добавление или Редактирование)
  carForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('car-id').value;
    
    const payload = {
      title: document.getElementById('car-title').value,
      spec: document.getElementById('car-spec').value,
      img: document.getElementById('car-img').value,
      engine: document.getElementById('car-engine').value,
      hp: document.getElementById('car-hp').value,
      weight: document.getElementById('car-weight').value,
      drive: document.getElementById('car-drive').value,
      accel: document.getElementById('car-accel').value,
      description: document.getElementById('car-desc').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/admin/cars/${id}` : '/api/admin/cars';

    try {
      await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      carModal.classList.remove('open');
      loadCars(); // Перезагружаем список
    } catch (err) { console.error('Ошибка сохранения', err); }
  });

  // Инициализация
  loadBookings();
  loadCars();
});