(() => {
  'use strict';

  /* ---------- 0. ПРЕЛОАДЕР И СКРОЛЛ ---------- */
  window.addEventListener('load', async () => {
    try { await fetch('/api/cars', { method: 'HEAD', cache: 'no-store' }).catch(() => {}); } 
    finally { const p = document.getElementById('preloader'); if (p) setTimeout(() => p.classList.add('hidden'), 800); }
  });

  const container = document.getElementById('scroll-container');
  const logoBtn = document.getElementById('logo-btn');
  if (container && window.innerWidth > 1024) {
    let target = container.scrollLeft, current = container.scrollLeft, anim = false;
    if (logoBtn) logoBtn.addEventListener('click', () => { target = 0; if (!anim) { anim = true; reqAnim(); } });
    container.addEventListener('wheel', (e) => {
      e.preventDefault(); target += e.deltaY * 1.5;
      const max = container.scrollWidth - container.clientWidth;
      target = Math.max(0, Math.min(target, max));
      if (!anim) { anim = true; reqAnim(); }
    }, { passive: false });
    function reqAnim() {
      current += (target - current) * 0.08; container.scrollLeft = current;
      if (Math.abs(target - current) > 0.5) requestAnimationFrame(reqAnim);
      else { container.scrollLeft = target; current = target; anim = false; }
    }
    window.addEventListener('resize', () => { target = container.scrollLeft; current = container.scrollLeft; });
  } else { if (logoBtn) logoBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' })); }

  /* ---------- 1. ЗВУКИ И ЧАСЫ ---------- */
  const AudioContext = window.AudioContext || window.webkitAudioContext; let audioCtx, isSoundOn = true;
  function initAudio() { if (!audioCtx) audioCtx = new AudioContext(); if (audioCtx.state === 'suspended') audioCtx.resume(); }
  function playSound(type) {
    if (!isSoundOn || !audioCtx) return;
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    if (type === 'hover') { osc.type = 'square'; osc.frequency.setValueAtTime(150, audioCtx.currentTime); gain.gain.setValueAtTime(0.02, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.02); osc.start(); osc.stop(audioCtx.currentTime + 0.02); }
    else if (type === 'click') { osc.type = 'triangle'; osc.frequency.setValueAtTime(120, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.08); gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08); osc.start(); osc.stop(audioCtx.currentTime + 0.08); }
    else if (type === 'modal') { osc.type = 'sine'; osc.frequency.setValueAtTime(80, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.2); gain.gain.setValueAtTime(0.15, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25); osc.start(); osc.stop(audioCtx.currentTime + 0.25); }
    else if (type === 'car') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(40, audioCtx.currentTime); osc.frequency.linearRampToValueAtTime(120, audioCtx.currentTime + 0.3); osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.7);
      const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 400;
      osc.disconnect(); osc.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.7);
    }
  }
  document.body.addEventListener('click', initAudio, { once: true });
  document.querySelectorAll('a, button, select, .part-row label').forEach(el => {
    el.addEventListener('mouseenter', () => playSound('hover')); el.addEventListener('click', () => playSound('click'));
  });
  const soundBtn = document.getElementById('sound-toggle');
  if (soundBtn) soundBtn.addEventListener('click', () => { isSoundOn = !isSoundOn; soundBtn.classList.toggle('muted', !isSoundOn); });

  setInterval(() => { const c = document.getElementById('clock'); if (c) c.textContent = `JST ${new Date().toLocaleTimeString('ru-RU', { hour12: false })}`; }, 1000);

  /* ---------- 2. ЗАГРУЗКА ДАННЫХ ---------- */
  let carsData = [], servicesData = [];
  
  async function loadCars() {
    const grid = document.getElementById('gallery-grid'); if (!grid) return;
    const res = await fetch('/api/cars'); carsData = await res.json();
    grid.innerHTML = carsData.map((c, i) => `
      <div class="gallery-item" data-index="${i}"><img src="${c.img}" alt="${c.title}"><div class="gallery-item-info"><h4>${c.title}</h4><p>${c.spec}</p></div></div>
    `).join('');
    document.querySelectorAll('.gallery-item').forEach(item => {
      item.addEventListener('click', () => {
        const car = carsData[item.dataset.index]; playSound('car');
        document.getElementById('cm-img').src = car.img; document.getElementById('cm-title').textContent = car.title;
        document.getElementById('cm-spec').textContent = car.spec; document.getElementById('cm-engine').textContent = car.engine;
        document.getElementById('cm-hp').textContent = car.hp; document.getElementById('cm-weight').textContent = car.weight;
        document.getElementById('cm-drive').textContent = car.drive; document.getElementById('cm-accel').textContent = car.accel;
        document.getElementById('cm-desc').textContent = car.description;
        closeAllModals(); document.getElementById('car-modal').classList.add('open');
      });
    });

    const baseSelect = document.getElementById('base-car');
    if (baseSelect) {
      baseSelect.innerHTML = carsData.map(c => `<option value="${c.id}" data-hp="${parseInt(c.hp) || 200}" data-price="1500000">${c.title}</option>`).join('');
      calculateConfig();
    }
  }

  async function loadServices() {
    const grid = document.getElementById('services-grid'); if (!grid) return;
    const res = await fetch('/api/services'); servicesData = await res.json();
    grid.innerHTML = servicesData.map(s => `<div class="service-card" data-id="${s.id}"><span class="num">${s.num}</span><h3>${s.title}</h3><p>${s.short}</p></div>`).join('');
    document.querySelectorAll('.service-card').forEach(card => {
      card.addEventListener('click', () => {
        const srv = servicesData.find(s => s.id === parseInt(card.dataset.id));
        document.getElementById('srv-title').textContent = srv.title; document.getElementById('srv-desc').textContent = srv.full_description;
        document.getElementById('srv-price').textContent = srv.price; document.getElementById('srv-list').innerHTML = srv.works.split('\n').map(w => `<li>${w}</li>`).join('');
        closeAllModals(); document.getElementById('service-modal').classList.add('open'); playSound('modal');
      });
    });
  }
  loadCars(); loadServices();

  /* ---------- 3. МОДАЛКИ И КОНФИГУРАТОР ---------- */
  const closeAllModals = () => document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
  document.querySelectorAll('.close-modal').forEach(b => b.addEventListener('click', closeAllModals));
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) closeAllModals(); }));
  document.querySelectorAll('.open-booking').forEach(b => b.addEventListener('click', () => { closeAllModals(); document.getElementById('booking-modal').classList.add('open'); playSound('modal'); }));

  const baseCarSelect = document.getElementById('base-car');
  const partsCbs = document.querySelectorAll('.part-row input[type="checkbox"]');
  function calculateConfig() {
    if (!baseCarSelect) return;
    const opt = baseCarSelect.options[baseCarSelect.selectedIndex]; if (!opt) return;
    let hp = parseInt(opt.dataset.hp) || 0, price = parseInt(opt.dataset.price) || 0;
    partsCbs.forEach(cb => { if (cb.checked) { hp += parseInt(cb.dataset.hp) || 0; price += parseInt(cb.dataset.price) || 0; } });
    document.getElementById('total-hp').textContent = hp;
    document.getElementById('total-price').textContent = price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }
  if (baseCarSelect) { baseCarSelect.addEventListener('change', calculateConfig); partsCbs.forEach(c => c.addEventListener('change', calculateConfig)); }

  /* ---------- 4. АВТОРИЗАЦИЯ ---------- */
  let authToken = localStorage.getItem('kanjo_token') || null;
  let currentUser = null;
  const authModal = document.getElementById('auth-modal');
  const authForm = document.getElementById('auth-form');

  function updateAuthUI() {
    document.getElementById('login-btn').style.display = authToken ? 'none' : 'block';
    document.getElementById('profile-btn').style.display = authToken ? 'flex' : 'none';
  }
  updateAuthUI();

  document.getElementById('login-btn').addEventListener('click', () => authModal.classList.add('open'));

  document.querySelectorAll('.auth-tab[data-mode]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab[data-mode]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isReg = tab.dataset.mode === 'register';
      document.getElementById('reg-name-group').style.display = isReg ? 'block' : 'none';
      document.getElementById('reg-phone-group').style.display = isReg ? 'block' : 'none';
      document.getElementById('auth-submit-btn').textContent = isReg ? 'СОЗДАТЬ АККАУНТ' : 'ВОЙТИ';
    });
  });

  // Кастомная валидация
  function validateForm(form) {
    let isValid = true;
    form.querySelectorAll('input[required]').forEach(input => {
      const err = input.nextElementSibling;
      if (!input.value.trim()) {
        input.style.borderBottomColor = 'red';
        if (err && err.classList.contains('error-msg')) { err.textContent = 'Заполните поле'; err.style.display = 'block'; }
        isValid = false;
      } else {
        input.style.borderBottomColor = ''; if (err && err.classList.contains('error-msg')) err.style.display = 'none';
      }
    });
    return isValid;
  }

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault(); if (!validateForm(authForm)) return;
    const isLogin = document.querySelector('.auth-tab[data-mode].active').dataset.mode === 'login';
    const btn = document.getElementById('auth-submit-btn'); btn.textContent = 'ЗАГРУЗКА...';

    const body = {
      email: document.getElementById('auth-email').value,
      password: document.getElementById('auth-password').value
    };
    if (!isLogin) { body.name = document.getElementById('auth-name').value; body.phone = document.getElementById('auth-phone').value; }

    try {
      const res = await fetch(isLogin ? '/api/auth/login' : '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      
      authToken = data.token; currentUser = data.user; localStorage.setItem('kanjo_token', authToken);
      updateAuthUI(); authModal.classList.remove('open'); authForm.reset();
    } catch (err) { document.getElementById('auth-error').textContent = err.message; document.getElementById('auth-error').style.display = 'block'; }
    finally { btn.textContent = isLogin ? 'ВОЙТИ' : 'СОЗДАТЬ АККАУНТ'; }
  });

  // Забыл пароль
  document.getElementById('forgot-pass-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = prompt('Введите ваш Email для восстановления:');
    if (!email) return;
    try {
      const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await res.json(); alert(data.message || data.error);
    } catch (err) { alert('Ошибка сервера'); }
  });

  // Получение профиля и автозаполнение
  async function loadProfile() {
    if (!authToken) return;
    try {
      const res = await fetch('/api/user/profile', { headers: { 'Authorization': `Bearer ${authToken}` } });
      if (res.ok) {
        currentUser = await res.json();
        // Автозаполнение
        document.querySelectorAll('#booking-form input[type="text"], #inline-booking-form input[type="text"]').forEach((inp, i) => { if(i===0) inp.value = currentUser.name || ''; });
        document.querySelectorAll('#booking-form input[type="tel"], #inline-booking-form input[type="tel"]').forEach(inp => inp.value = currentUser.phone || '');
      } else { logout(); }
    } catch (err) { console.error(err); }
  }
  loadProfile();

  function logout() { localStorage.removeItem('kanjo_token'); authToken = null; updateAuthUI(); document.getElementById('profile-modal').classList.remove('open'); }
  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('profile-btn').addEventListener('click', () => { document.getElementById('profile-modal').classList.add('open'); loadBookings(); loadBuilds(); });

  // Вкладки ЛК
  document.getElementById('tab-btn-bookings').addEventListener('click', (e) => {
    e.target.classList.add('active'); document.getElementById('tab-btn-builds').classList.remove('active');
    document.getElementById('profile-tab-bookings').style.display = 'block'; document.getElementById('profile-tab-builds').style.display = 'none';
  });
  document.getElementById('tab-btn-builds').addEventListener('click', (e) => {
    e.target.classList.add('active'); document.getElementById('tab-btn-bookings').classList.remove('active');
    document.getElementById('profile-tab-bookings').style.display = 'none'; document.getElementById('profile-tab-builds').style.display = 'block';
  });

  async function loadBookings() {
    const list = document.getElementById('profile-bookings-list'); list.innerHTML = 'Загрузка...';
    const res = await fetch('/api/user/bookings', { headers: { 'Authorization': `Bearer ${authToken}` } });
    if (!res.ok) return;
    const b = await res.json();
    list.innerHTML = b.length ? b.map(x => `
      <div class="profile-card"><div class="profile-card-info"><h4>${x.car}</h4><p>Имя: ${x.name} | Тел: ${x.phone}</p></div>
      <div style="text-align:right;"><span class="status-badge status-${x.status==='В работе'?'work':(x.status==='Выполнена'?'done':'new')}">${x.status}</span><br><small>${new Date(x.created_at).toLocaleString()}</small></div></div>
    `).join('') : '<p>Нет заявок</p>';
  }

  async function loadBuilds() {
    const list = document.getElementById('profile-builds-list'); list.innerHTML = 'Загрузка...';
    const res = await fetch('/api/user/builds', { headers: { 'Authorization': `Bearer ${authToken}` } });
    const b = await res.json();
    list.innerHTML = b.length ? b.map(x => `<div class="profile-card"><h4>${x.car_name}</h4><p>${x.build_text} (${x.total_hp} HP)</p></div>`).join('') : '<p>Гараж пуст</p>';
  }

  /* ---------- 5. ОТПРАВКА ЗАЯВОК ---------- */
  const handleForm = async (e) => {
    e.preventDefault(); if (!validateForm(e.target)) return;
    const btn = e.target.querySelector('button'); const originalText = btn.textContent;
    const form = e.target;
    const name = form.querySelector('input[type="text"]').value;
    const phone = form.querySelector('input[type="tel"]').value;
    const car = form.querySelectorAll('input[type="text"]')[1].value;
    const price = form.querySelector('.booking-price-input') ? form.querySelector('.booking-price-input').value : null;

    btn.textContent = 'ОТПРАВКА...';
    try {
      const headers = { 'Content-Type': 'application/json' }; if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const res = await fetch('/api/book', { method: 'POST', headers, body: JSON.stringify({ name, phone, car, price }) });
      if (!res.ok) throw new Error();
      btn.textContent = 'УСПЕШНО!'; btn.style.color = '#10b981'; btn.style.borderColor = '#10b981';
      setTimeout(() => { form.reset(); btn.textContent = originalText; btn.style.color = ''; btn.style.borderColor = ''; closeAllModals(); loadProfile(); }, 2000);
    } catch (err) { btn.textContent = 'ОШИБКА!'; btn.style.color = 'red'; btn.style.borderColor = 'red'; setTimeout(() => { btn.textContent = originalText; btn.style.color = ''; btn.style.borderColor = ''; }, 2000); }
  };
  document.getElementById('booking-form').addEventListener('submit', handleForm);
  document.getElementById('inline-booking-form').addEventListener('submit', handleForm);

  document.getElementById('btn-book-build').addEventListener('click', () => {
    const car = baseCarSelect.options[baseCarSelect.selectedIndex].text;
    const parts = []; partsCbs.forEach(cb => { if (cb.checked) parts.push(cb.nextElementSibling.textContent.split('(')[0].trim()); });
    const text = car + (parts.length ? ` + ${parts.join(' + ')}` : '') + ` (${document.getElementById('total-hp').textContent} HP)`;
    closeAllModals(); document.getElementById('booking-modal').classList.add('open');
    const modal = document.getElementById('booking-form');
    modal.querySelectorAll('input[type="text"]')[1].value = text;
    modal.querySelector('.booking-price-input').value = document.getElementById('total-price').textContent.replace(/\s/g, '');
    if (currentUser) { modal.querySelector('input[type="text"]').value = currentUser.name || ''; modal.querySelector('input[type="tel"]').value = currentUser.phone || ''; }
  });

  document.getElementById('btn-save-build').addEventListener('click', async () => {
    if (!authToken) { authModal.classList.add('open'); return; }
    const car = baseCarSelect.options[baseCarSelect.selectedIndex].text;
    const parts = []; partsCbs.forEach(cb => { if (cb.checked) parts.push(cb.nextElementSibling.textContent.split('(')[0].trim()); });
    await fetch('/api/user/save-build', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ car_name: car, build_text: parts.join(' + ') || 'Сток', total_hp: parseInt(document.getElementById('total-hp').textContent), total_price: parseInt(document.getElementById('total-price').textContent.replace(/\s/g, '')) })
    });
    alert('Сборка сохранена в гараже!');
  });

  /* ---------- 6. ВИДЕО ---------- */
  document.getElementById('credits-btn').addEventListener('click', () => { document.getElementById('video-modal').classList.add('open'); document.getElementById('credits-video').play(); });
  document.querySelector('.close-video').addEventListener('click', () => { document.getElementById('video-modal').classList.remove('open'); document.getElementById('credits-video').pause(); });

})();