document.addEventListener('DOMContentLoaded', () => {
  
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

  // --- 1. ЗАЯВКИ ---
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
          <td>${b.car} ${b.price ? `<br><small style="color:var(--grey);">${b.price} ₽</small>` : ''}</td>
          <td>
            <select onchange="updateBookingStatus(${b.id}, this.value)" class="status-select">
              <option value="Новая" ${b.status==='Новая'?'selected':''}>Новая</option>
              <option value="В работе" ${b.status==='В работе'?'selected':''}>В работе</option>
              <option value="Выполнена" ${b.status==='Выполнена'?'selected':''}>Выполнена</option>
            </select>
          </td>
          <td>${new Date(b.created_at).toLocaleString('ru-RU')}</td>
        </tr>
      `).join('');
    } catch (err) { console.error('Ошибка загрузки заявок', err); }
  }
  
  window.updateBookingStatus = async (id, status) => {
    await fetch(`/api/admin/bookings/${id}/status`, { 
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) 
    });
    loadBookings();
  };

  // --- 2. КЛИЕНТЫ ---
  async function loadClients() {
    const tbody = document.getElementById('clients-list');
    try {
      const res = await fetch('/api/admin/clients');
      const data = await res.json();
      tbody.innerHTML = data.map(c => `
        <tr>
          <td>${c.id}</td>
          <td>${c.email}</td>
          <td>${c.name || '-'}</td>
          <td>${c.phone || '-'}</td>
          <td>${new Date(c.created_at).toLocaleString('ru-RU')}</td>
          <td>
            <span class="action-link delete" onclick="deleteClient(${c.id})">Удалить</span>
          </td>
        </tr>
      `).join('');
    } catch (err) { console.error('Ошибка загрузки клиентов', err); }
  }

  window.deleteClient = async (id) => {
    if (!confirm('Вы уверены, что хотите удалить клиента? Все его заявки и сборки также будут удалены.')) return;
    try {
      const res = await fetch(`/api/admin/clients/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Ошибка удаления');
      loadClients();
    } catch (err) {
      alert('Ошибка при удалении клиента.');
    }
  };

  // --- 3. МАШИНЫ ---
  const carModal = document.getElementById('car-modal');
  const carForm = document.getElementById('car-form');
  let allCars = [];

  async function loadCars() {
    const tbody = document.getElementById('cars-list');
    try {
      const res = await fetch('/api/cars');
      allCars = await res.json();
      tbody.innerHTML = allCars.map(c => {
        const imgUrl = c.img.startsWith('http') ? c.img : `/${c.img}`;
        return `
        <tr>
          <td>${c.id}</td>
          <td><img src="${imgUrl}" alt="${c.title}"></td>
          <td>${c.title}</td>
          <td>${c.spec}</td>
          <td>
            <span class="action-link" onclick="openEditCar(${c.id})">Изменить</span>
            <span class="action-link delete" onclick="deleteCar(${c.id})">Удалить</span>
          </td>
        </tr>`;
      }).join('');
    } catch (err) { console.error(err); }
  }

  document.getElementById('btn-add-car').addEventListener('click', () => {
    carForm.reset(); document.getElementById('car-id').value = '';
    document.getElementById('car-modal-title').textContent = 'ДОБАВИТЬ МАШИНУ';
    carModal.classList.add('open');
  });

  window.openEditCar = (id) => {
    const c = allCars.find(x => x.id === id);
    if (!c) return;
    document.getElementById('car-id').value = c.id;
    document.getElementById('car-title').value = c.title;
    document.getElementById('car-spec').value = c.spec;
    document.getElementById('car-img').value = c.img;
    document.getElementById('car-engine').value = c.engine || '';
    document.getElementById('car-hp').value = c.hp || '';
    document.getElementById('car-weight').value = c.weight || '';
    document.getElementById('car-drive').value = c.drive || '';
    document.getElementById('car-accel').value = c.accel || '';
    document.getElementById('car-desc').value = c.description || '';
    document.getElementById('car-modal-title').textContent = 'РЕДАКТИРОВАТЬ МАШИНУ';
    carModal.classList.add('open');
  };

  window.deleteCar = async (id) => {
    if (!confirm('Вы уверены, что хотите удалить эту машину?')) return;
    await fetch(`/api/admin/cars/${id}`, { method: 'DELETE' });
    loadCars();
  };

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
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    carModal.classList.remove('open');
    loadCars();
  });

  // --- 4. УСЛУГИ ---
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
          <td>${s.id}</td>
          <td>${s.title}</td>
          <td>${s.price}</td>
          <td>
            <span class="action-link" onclick="openEditService(${s.id})">Изменить</span>
            <span class="action-link delete" onclick="deleteService(${s.id})">Удалить</span>
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
    const s = allServices.find(x => x.id === id);
    if (!s) return;
    document.getElementById('srv-id').value = s.id;
    document.getElementById('srv-num').value = s.num;
    document.getElementById('srv-title').value = s.title;
    document.getElementById('srv-short').value = s.short;
    document.getElementById('srv-full').value = s.full_description;
    document.getElementById('srv-works').value = s.works;
    document.getElementById('srv-price').value = s.price;
    document.getElementById('srv-modal-title').textContent = 'РЕДАКТИРОВАТЬ УСЛУГУ';
    srvModal.classList.add('open');
  };

  window.deleteService = async (id) => {
    if (!confirm('Вы уверены, что хотите удалить эту услугу?')) return;
    await fetch(`/api/admin/services/${id}`, { method: 'DELETE' });
    loadServices();
  };

  srvForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('srv-id').value;
    const payload = {
      num: document.getElementById('srv-num').value,
      title: document.getElementById('srv-title').value,
      short: document.getElementById('srv-short').value,
      full_description: document.getElementById('srv-full').value,
      works: document.getElementById('srv-works').value,
      price: document.getElementById('srv-price').value
    };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/admin/services/${id}` : '/api/admin/services';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    srvModal.classList.remove('open');
    loadServices();
  });

  // Инициализация
  loadBookings();
  loadClients();
  loadCars();
  loadServices();

      // Автообновление админки каждые 5 секунд (если не открыта модалка)
  setInterval(() => {
    if (document.querySelector('.modal.open')) return; // Не обновляем, если открыто окно редактирования
    
    const activeTab = document.querySelector('.tab-btn.active').dataset.target;
    if (activeTab === 'bookings') loadBookings();
    if (activeTab === 'cars') loadCars();
    if (activeTab === 'services') loadServices();
    if (activeTab === 'clients') loadClients();
  }, 5000);
  
});