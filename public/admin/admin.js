document.addEventListener('DOMContentLoaded', () => {
  function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, 
      tag => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        }[tag] || tag)
    );
  }

  const token = localStorage.getItem('kanjo_admin_token');
  const loginModal = document.getElementById('login-modal');
  const adminTabs = document.getElementById('admin-tabs');
  const adminMain = document.getElementById('admin-main');
  const btnLogout = document.getElementById('btn-logout');

  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    let [resource, config] = args;
    if (!config) config = {};
    if (!config.headers) config.headers = {};
    
    const currentToken = localStorage.getItem('kanjo_admin_token');
    if (currentToken && resource.startsWith('/api/admin')) {
      config.headers['Authorization'] = `Bearer ${currentToken}`;
    }
    
    const response = await originalFetch(resource, config);
    if (response.status === 401 && resource.startsWith('/api/admin')) {
      localStorage.removeItem('kanjo_admin_token');
      loginModal.style.display = 'flex';
      loginModal.classList.add('open');
      adminTabs.style.display = 'none';
      adminMain.style.display = 'none';
      btnLogout.style.display = 'none';
    }
    return response;
  };

  function initAdminUI() {
    if (localStorage.getItem('kanjo_admin_token')) {
      loginModal.style.display = 'none';
      loginModal.classList.remove('open');
      adminTabs.style.display = 'flex';
      adminMain.style.display = 'block';
      btnLogout.style.display = 'block';
      loadData();
    } else {
      loginModal.style.display = 'flex';
      loginModal.classList.add('open');
      adminTabs.style.display = 'none';
      adminMain.style.display = 'none';
      btnLogout.style.display = 'none';
    }
  }

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const login = document.getElementById('admin-login').value;
    const password = document.getElementById('admin-pass').value;
    const errorEl = document.getElementById('login-error');
    
    try {
      const res = await originalFetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('kanjo_admin_token', data.token);
        errorEl.style.display = 'none';
        document.getElementById('login-form').reset();
        initAdminUI();
      } else {
        errorEl.textContent = data.error;
        errorEl.style.display = 'block';
      }
    } catch (err) {
      errorEl.textContent = 'Ошибка сервера';
      errorEl.style.display = 'block';
    }
  });

  btnLogout.addEventListener('click', () => {
    localStorage.removeItem('kanjo_admin_token');
    initAdminUI();
  });

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

  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-admin').forEach(s => s.classList.remove('open'));
  });

  function showAdminConfirm(text, callback) {
    const modal = document.getElementById('admin-confirm-modal');
    document.getElementById('admin-confirm-text').textContent = text;
    modal.classList.add('open');
    
    const yesBtn = document.getElementById('admin-confirm-yes');
    const noBtn = document.getElementById('admin-confirm-no');
    const newYesBtn = yesBtn.cloneNode(true);
    const newNoBtn = noBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
    noBtn.parentNode.replaceChild(newNoBtn, noBtn);
    
    newYesBtn.addEventListener('click', () => { callback(); modal.classList.remove('open'); });
    newNoBtn.addEventListener('click', () => modal.classList.remove('open'));
  }

  async function loadBookings() {
    const tbody = document.getElementById('bookings-list');
    try {
      const res = await fetch('/api/admin/bookings');
      if (!res.ok) return;
      const data = await res.json();
      tbody.innerHTML = data.map(b => {
        const statusClass = b.status === 'В работе' ? 'work' : (b.status === 'Выполнена' ? 'done' : (b.status === 'Отменена' ? 'cancel' : 'new'));
        
        return `
        <tr>
          <td>${b.id}</td>
          <td>${escapeHTML(b.name)}</td>
          <td>${escapeHTML(b.phone)}</td>
          <td>${b.telegram ? escapeHTML(b.telegram) : '-'}</td>
          <td>${escapeHTML(b.car)} ${b.price ? `<br><small style="color:var(--grey);">${b.price} ₽</small>` : ''}</td>
          <td>
            <div class="custom-select-admin" data-id="${b.id}">
              <div class="select-trigger-admin status-${statusClass}">
                <span>${b.status}</span>
                <span class="select-arrow">▼</span>
              </div>
              <div class="select-options-admin">
                <div class="select-option-admin" data-val="Новая">Новая</div>
                <div class="select-option-admin" data-val="В работе">В работе</div>
                <div class="select-option-admin" data-val="Выполнена">Выполнена</div>
                <div class="select-option-admin" data-val="Отменена">Отменена</div>
              </div>
            </div>
          </td>
          <td>${b.status === 'Отменена' && b.cancel_reason ? escapeHTML(b.cancel_reason) : '-'}</td>
          <td>${new Date(b.created_at).toLocaleString('ru-RU')}</td>
          <td><span class="action-link delete" onclick="deleteAdminBooking(${b.id})">УДАЛИТЬ</span></td>
        </tr>
      `}).join('');

      document.querySelectorAll('.custom-select-admin').forEach(select => {
        const trigger = select.querySelector('.select-trigger-admin');
        const options = select.querySelectorAll('.select-option-admin');
        const id = select.dataset.id;

        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          document.querySelectorAll('.custom-select-admin').forEach(s => {
            if (s !== select) s.classList.remove('open');
          });
          select.classList.toggle('open');
        });

        options.forEach(opt => {
          opt.addEventListener('click', (e) => {
            e.stopPropagation();
            const newStatus = opt.dataset.val;
            select.classList.remove('open');
            updateBookingStatus(id, newStatus);
          });
        });
      });

    } catch (err) { console.error(err); }
  }
  
  window.updateBookingStatus = async (id, status) => {
    await fetch(`/api/admin/bookings/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    loadBookings();
  };

  window.deleteAdminBooking = (id) => {
    showAdminConfirm('Вы уверены, что хотите навсегда удалить эту заявку?', async () => {
      try {
        const res = await fetch(`/api/admin/bookings/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json();
          alert('Ошибка: ' + (data.error || 'Не удалось удалить.'));
        } else {
          loadBookings();
        }
      } catch (err) { alert('Ошибка сети'); }
    });
  };

  async function loadClients() {
    const tbody = document.getElementById('clients-list');
    try {
      const res = await fetch('/api/admin/clients');
      if (!res.ok) return;
      const data = await res.json();
      tbody.innerHTML = data.map(c => `
        <tr>
          <td>${c.id}</td>
          <td>${escapeHTML(c.email)}</td>
          <td>${escapeHTML(c.name) || '-'}</td>
          <td>${escapeHTML(c.phone) || '-'}</td>
          <td>${c.telegram ? escapeHTML(c.telegram) : '-'}</td>
          <td>${new Date(c.created_at).toLocaleString('ru-RU')}</td>
          <td><span class="action-link delete" onclick="deleteClient(${c.id})">Удалить</span></td>
        </tr>
      `).join('');
    } catch (err) { console.error(err); }
  }

  window.deleteClient = (id) => {
    showAdminConfirm('Удалить клиента? Все его заявки и сборки также будут удалены.', async () => {
      try {
        const res = await fetch(`/api/admin/clients/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json();
          alert('Ошибка: ' + (data.error || 'Не удалось удалить клиента.'));
        } else {
          loadClients(); loadBookings();
        }
      } catch (err) { alert('Ошибка сети'); }
    });
  };

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
          <td><img src="${escapeHTML(imgUrl)}" alt="${escapeHTML(c.title)}"></td>
          <td>${escapeHTML(c.title)}</td>
          <td>${escapeHTML(c.spec)}</td>
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

  window.deleteCar = (id) => {
    showAdminConfirm('Вы уверены, что хотите удалить эту машину?', async () => {
      try {
        const res = await fetch(`/api/admin/cars/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json();
          alert('Ошибка: ' + (data.error || 'Не удалось удалить машину.'));
        } else {
          loadCars();
        }
      } catch (err) { alert('Ошибка сети'); }
    });
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
          <td>${escapeHTML(s.title)}</td>
          <td>${escapeHTML(s.price)}</td>
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

  window.deleteService = (id) => {
    showAdminConfirm('Вы уверены, что хотите удалить эту услугу?', async () => {
      try {
        const res = await fetch(`/api/admin/services/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json();
          alert('Ошибка: ' + (data.error || 'Не удалось удалить услугу.'));
        } else {
          loadServices();
        }
      } catch (err) { alert('Ошибка сети'); }
    });
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

  async function loadReviews() {
    const tbody = document.getElementById('reviews-list');
    try {
      const res = await fetch('/api/admin/reviews');
      if (!res.ok) return;
      const data = await res.json();
      tbody.innerHTML = data.map(r => `
        <tr>
          <td>${r.id}</td>
          <td>${escapeHTML(r.name)}</td>
          <td style="color:var(--red);">${'★'.repeat(r.rating)}</td>
          <td style="color:var(--grey); font-size:12px;">${escapeHTML(r.target_car) || '-'}</td>
          <td>${escapeHTML(r.text)}</td>
          <td>${new Date(r.created_at).toLocaleString('ru-RU')}</td>
          <td><span class="action-link delete" onclick="deleteReview(${r.id})">Удалить</span></td>
        </tr>
      `).join('');
    } catch (err) { console.error(err); }
  }

  window.deleteReview = (id) => {
    showAdminConfirm('Удалить этот отзыв?', async () => {
      try {
        const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json();
          alert('Ошибка: ' + (data.error || 'Не удалось удалить отзыв.'));
        } else {
          loadReviews();
        }
      } catch (err) { alert('Ошибка сети'); }
    });
  };

  function loadData() {
    loadBookings(); loadClients(); loadCars(); loadServices(); loadReviews();
  }

  initAdminUI();

  setInterval(() => {
    if (!localStorage.getItem('kanjo_admin_token')) return;
    if (document.querySelector('.modal.open') || document.querySelector('.custom-select-admin.open')) return; 
    
    const activeTab = document.querySelector('.tab-btn.active');
    if (!activeTab) return;
    const target = activeTab.dataset.target;
    if (target === 'bookings') loadBookings();
    if (target === 'cars') loadCars();
    if (target === 'services') loadServices();
    if (target === 'clients') loadClients();
    if (target === 'reviews') loadReviews();
  }, 5000); // 5000 мс = 5 секунд
});