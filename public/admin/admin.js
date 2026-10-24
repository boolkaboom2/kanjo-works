document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active')); contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active'); document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  // Заявки
  async function loadBookings() {
    const res = await fetch('/api/admin/bookings'); const data = await res.json();
    document.getElementById('bookings-list').innerHTML = data.map(b => `
      <tr><td>${b.id}</td><td>${b.name}</td><td>${b.phone}</td><td>${b.car}</td>
      <td><select onchange="updateBookingStatus(${b.id}, this.value)" class="status-select"><option value="Новая" ${b.status==='Новая'?'selected':''}>Новая</option><option value="В работе" ${b.status==='В работе'?'selected':''}>В работе</option><option value="Выполнена" ${b.status==='Выполнена'?'selected':''}>Выполнена</option></select></td>
      <td>${new Date(b.created_at).toLocaleString()}</td></tr>
    `).join('');
  }
  window.updateBookingStatus = async (id, status) => {
    await fetch(`/api/admin/bookings/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    loadBookings();
  };

  // Клиенты
  async function loadClients() {
    const res = await fetch('/api/admin/clients'); const data = await res.json();
    document.getElementById('clients-list').innerHTML = data.map(c => `
      <tr><td>${c.id}</td><td>${c.email}</td><td>${c.name || '-'}</td><td>${c.phone || '-'}</td><td>${new Date(c.created_at).toLocaleString()}</td></tr>
    `).join('');
  }

  // Машины
  let allCars = [];
  async function loadCars() {
    const res = await fetch('/api/cars'); allCars = await res.json();
    document.getElementById('cars-list').innerHTML = allCars.map(c => `<tr><td>${c.id}</td><td><img src="/${c.img}" width="50"></td><td>${c.title}</td><td><span class="action-link" onclick="openEditCar(${c.id})">ИЗМЕНИТЬ</span> <span class="action-link delete" onclick="deleteCar(${c.id})">УДАЛИТЬ</span></td></tr>`).join('');
  }
  document.getElementById('btn-add-car').addEventListener('click', () => { document.getElementById('car-form').reset(); document.getElementById('car-id').value = ''; document.getElementById('car-modal').classList.add('open'); });
  window.openEditCar = (id) => {
    const c = allCars.find(x => x.id === id);
    document.getElementById('car-id').value = c.id; document.getElementById('car-title').value = c.title; document.getElementById('car-spec').value = c.spec; document.getElementById('car-img').value = c.img;
    document.getElementById('car-engine').value = c.engine || ''; document.getElementById('car-hp').value = c.hp || ''; document.getElementById('car-weight').value = c.weight || ''; document.getElementById('car-drive').value = c.drive || ''; document.getElementById('car-accel').value = c.accel || ''; document.getElementById('car-desc').value = c.description || '';
    document.getElementById('car-modal').classList.add('open');
  };
  window.deleteCar = async (id) => { if(confirm('Удалить?')) { await fetch(`/api/admin/cars/${id}`, { method: 'DELETE' }); loadCars(); } };
  document.getElementById('car-form').addEventListener('submit', async (e) => {
    e.preventDefault(); const id = document.getElementById('car-id').value;
    const p = { title: document.getElementById('car-title').value, spec: document.getElementById('car-spec').value, img: document.getElementById('car-img').value, engine: document.getElementById('car-engine').value, hp: document.getElementById('car-hp').value, weight: document.getElementById('car-weight').value, drive: document.getElementById('car-drive').value, accel: document.getElementById('car-accel').value, description: document.getElementById('car-desc').value };
    await fetch(id ? `/api/admin/cars/${id}` : '/api/admin/cars', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
    document.getElementById('car-modal').classList.remove('open'); loadCars();
  });

  // Услуги
  let allServices = [];
  async function loadServices() {
    const res = await fetch('/api/services'); allServices = await res.json();
    document.getElementById('services-list').innerHTML = allServices.map(s => `<tr><td>${s.id}</td><td>${s.title}</td><td>${s.price}</td><td><span class="action-link" onclick="openEditService(${s.id})">ИЗМЕНИТЬ</span> <span class="action-link delete" onclick="deleteService(${s.id})">УДАЛИТЬ</span></td></tr>`).join('');
  }
  document.getElementById('btn-add-service').addEventListener('click', () => { document.getElementById('service-form').reset(); document.getElementById('srv-id').value = ''; document.getElementById('service-modal').classList.add('open'); });
  window.openEditService = (id) => {
    const s = allServices.find(x => x.id === id);
    document.getElementById('srv-id').value = s.id; document.getElementById('srv-num').value = s.num; document.getElementById('srv-title').value = s.title; document.getElementById('srv-short').value = s.short; document.getElementById('srv-full').value = s.full_description; document.getElementById('srv-works').value = s.works; document.getElementById('srv-price').value = s.price;
    document.getElementById('service-modal').classList.add('open');
  };
  window.deleteService = async (id) => { if(confirm('Удалить?')) { await fetch(`/api/admin/services/${id}`, { method: 'DELETE' }); loadServices(); } };
  document.getElementById('service-form').addEventListener('submit', async (e) => {
    e.preventDefault(); const id = document.getElementById('srv-id').value;
    const p = { num: document.getElementById('srv-num').value, title: document.getElementById('srv-title').value, short: document.getElementById('srv-short').value, full_description: document.getElementById('srv-full').value, works: document.getElementById('srv-works').value, price: document.getElementById('srv-price').value };
    await fetch(id ? `/api/admin/services/${id}` : '/api/admin/services', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
    document.getElementById('service-modal').classList.remove('open'); loadServices();
  });

  loadBookings(); loadCars(); loadServices(); loadClients();
});