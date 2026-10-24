document.addEventListener('DOMContentLoaded', () => {
  
  // --- ВКЛАДКИ ---
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

  // --- ЗАЯВКИ ---
  async function loadBookings() {
    const tbody = document.getElementById('bookings-list');
    try {
      const res = await fetch('/api/admin/bookings');
      const data = await res.json();
      tbody.innerHTML = data.map(b => `
        <tr><td>${b.id}</td><td>${b.name}</td><td>${b.phone}</td><td>${b.car}</td><td>${new Date(b.created_at).toLocaleString('ru-RU')}</td></tr>
      `).join('');
    } catch (err) { console.error(err); }
  }

  // --- МАШИНЫ ---
  const carModal = document.getElementById('car-modal');
  const carForm = document.getElementById('car-form');
  let allCars = [];

    async function loadCars() {
    const tbody = document.getElementById('cars-list');
    try {
      const res = await fetch('/api/cars');
      allCars = await res.json();
      
      tbody.innerHTML = allCars.map(c => {
        // Проверяем, начинается ли ссылка с http (внешняя) или это локальный путь
        const imgUrl = c.img.startsWith('http') ? c.img : `/${c.img}`;

        return `
        <tr>
          <td>${c.id}</td>
          <td><img src="${imgUrl}" alt="${c.title}"></td>
          <td>${c.title}</td>
          <td>${c.spec}</td>
          <td>
            <span class="action-link" onclick="openEditCar(${c.id})">РЕДАКТИРОВАТЬ</span>
            <span class="action-link delete" onclick="deleteCar(${c.id})">УДАЛИТЬ</span>
          </td>
        </tr>
      `}).join('');
    } catch (err) { console.error('Ошибка загрузки машин', err); }
  }

  document.getElementById('btn-add-car').addEventListener('click', () => {
    carForm.reset(); document.getElementById('car-id').value = '';
    document.getElementById('modal-title').textContent = 'ДОБАВИТЬ МАШИНУ';
    carModal.classList.add('open');
  });

  window.openEditCar = (id) => {
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
    if (!confirm('Удалить машину?')) return;
    await fetch(`/api/admin/cars/${id}`, { method: 'DELETE' });
    loadCars();
  };

  carForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('car-id').value;
    const payload = {
      title: document.getElementById('car-title').value, spec: document.getElementById('car-spec').value, img: document.getElementById('car-img').value,
      engine: document.getElementById('car-engine').value, hp: document.getElementById('car-hp').value, weight: document.getElementById('car-weight').value,
      drive: document.getElementById('car-drive').value, accel: document.getElementById('car-accel').value, description: document.getElementById('car-desc').value
    };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/admin/cars/${id}` : '/api/admin/cars';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    carModal.classList.remove('open');
    loadCars();
  });

  // --- УСЛУГИ ---
  const srvModal = document.getElementById('service-modal');
  const srvForm = document.getElementById('service-form');
  let allServices = [];

  async function loadServices() {
    const tbody = document.getElementById('services-list');
    try {
      const res = await fetch('/api/services');
      allServices = await res.json();
      tbody.innerHTML = allServices.map(s => `
        <tr>
          <td>${s.id}</td><td>${s.num}</td><td>${s.title}</td><td>${s.price}</td>
          <td>
            <span class="action-link" onclick="openEditService(${s.id})">РЕДАКТИРОВАТЬ</span>
            <span class="action-link delete" onclick="deleteService(${s.id})">УДАЛИТЬ</span>
          </td>
        </tr>
      `).join('');
    } catch (err) { console.error(err); }
  }

  document.getElementById('btn-add-service').addEventListener('click', () => {
    srvForm.reset(); document.getElementById('srv-id').value = '';
    document.getElementById('srv-modal-title').textContent = 'ДОБАВИТЬ УСЛУГУ';
    srvModal.classList.add('open');
  });

  window.openEditService = (id) => {
    const srv = allServices.find(s => s.id === id);
    if (!srv) return;
    document.getElementById('srv-id').value = srv.id;
    document.getElementById('srv-num').value = srv.num;
    document.getElementById('srv-title').value = srv.title;
    document.getElementById('srv-short').value = srv.short;
    document.getElementById('srv-full').value = srv.full_description;
    document.getElementById('srv-works').value = srv.works;
    document.getElementById('srv-price').value = srv.price;
    document.getElementById('srv-modal-title').textContent = 'РЕДАКТИРОВАТЬ УСЛУГУ';
    srvModal.classList.add('open');
  };

  window.deleteService = async (id) => {
    if (!confirm('Удалить услугу?')) return;
    await fetch(`/api/admin/services/${id}`, { method: 'DELETE' });
    loadServices();
  };

  srvForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('srv-id').value;
    const payload = {
      num: document.getElementById('srv-num').value, title: document.getElementById('srv-title').value,
      short: document.getElementById('srv-short').value, full_description: document.getElementById('srv-full').value,
      works: document.getElementById('srv-works').value, price: document.getElementById('srv-price').value
    };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/admin/services/${id}` : '/api/admin/services';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    srvModal.classList.remove('open');
    loadServices();
  });

  // Инициализация
  loadBookings();
  loadCars();
  loadServices();
});