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

  /* ---------- 1. TOAST УВЕДОМЛЕНИЯ ---------- */
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span><button onclick="this.parentElement.remove()">✕</button>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('show'); }, 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 4000);
  }

  /* ---------- 2. МАСКА ТЕЛЕФОНА ---------- */
  const phoneInputs = document.querySelectorAll('.phone-input');
  phoneInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      let x = e.target.value.replace(/\D/g, '').match(/(\d{0,1})(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})/);
      if (!x[2] && x[1] !== '') { e.target.value = x[1] === '7' ? '+7 ' : '+7 (' + x[1]; } 
      else if (!x[3] && x[2] !== '') { e.target.value = '+7 (' + x[2] + ') '; } 
      else if (!x[4] && x[3] !== '') { e.target.value = '+7 (' + x[2] + ') ' + x[3] + '-'; } 
      else if (!x[5] && x[4] !== '') { e.target.value = '+7 (' + x[2] + ') ' + x[3] + '-' + x[4] + '-'; } 
      else { e.target.value = '+7 (' + x[2] + ') ' + x[3] + '-' + x[4] + '-' + x[5]; }
    });
    input.addEventListener('focus', (e) => { if (!e.target.value) e.target.value = '+7 ('; });
    input.addEventListener('blur', (e) => { if (e.target.value === '+7 (') e.target.value = ''; });
  });

  /* ---------- 3. ЗВУКИ ---------- */
  const AudioContext = window.AudioContext || window.webkitAudioContext; let audioCtx, isSoundOn = true;
  function initAudio() { if (!audioCtx) audioCtx = new AudioContext(); if (audioCtx.state === 'suspended') audioCtx.resume(); }
  
  function playSound(type) {
    if (!isSoundOn || !audioCtx) return;
    
    if (type === 'hover') {
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.type = 'square'; osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.02, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.02);
      osc.start(); osc.stop(audioCtx.currentTime + 0.02);
    } 
    else if (type === 'click') {
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.type = 'triangle'; osc.frequency.setValueAtTime(120, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.start(); osc.stop(audioCtx.currentTime + 0.08);
    }
    else if (type === 'modal') {
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.type = 'sine'; osc.frequency.setValueAtTime(80, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.start(); osc.stop(audioCtx.currentTime + 0.25);
    }
    else if (type === 'car') {
      const now = audioCtx.currentTime;
      // Рокот мотора
      const osc1 = audioCtx.createOscillator(); const osc2 = audioCtx.createOscillator();
      const engineGain = audioCtx.createGain(); const filter = audioCtx.createBiquadFilter();
      osc1.type = 'sawtooth'; osc2.type = 'square';
      osc1.frequency.setValueAtTime(60, now); osc1.frequency.linearRampToValueAtTime(180, now + 0.25); osc1.frequency.exponentialRampToValueAtTime(70, now + 0.6);
      osc2.frequency.setValueAtTime(30, now); osc2.frequency.linearRampToValueAtTime(90, now + 0.25); osc2.frequency.exponentialRampToValueAtTime(35, now + 0.6);
      filter.type = 'lowpass'; filter.frequency.setValueAtTime(500, now); filter.frequency.linearRampToValueAtTime(1500, now + 0.25); filter.frequency.exponentialRampToValueAtTime(400, now + 0.6);
      engineGain.gain.setValueAtTime(0.15, now); engineGain.gain.linearRampToValueAtTime(0.25, now + 0.25); engineGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc1.connect(filter); osc2.connect(filter); filter.connect(engineGain); engineGain.connect(audioCtx.destination);
      osc1.start(now); osc1.stop(now + 0.7); osc2.start(now); osc2.stop(now + 0.7);
      // Пшик турбины
      const bufferSize = audioCtx.sampleRate * 0.5; const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate); const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noiseNode = audioCtx.createBufferSource(); noiseNode.buffer = buffer;
      const noiseFilter = audioCtx.createBiquadFilter(); noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(4000, now + 0.35); noiseFilter.frequency.exponentialRampToValueAtTime(1500, now + 0.65); noiseFilter.Q.value = 2;
      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.001, now); noiseGain.gain.setValueAtTime(0.001, now + 0.3); noiseGain.gain.linearRampToValueAtTime(0.08, now + 0.35); noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      noiseNode.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(audioCtx.destination);
      noiseNode.start(now); noiseNode.stop(now + 0.7);
    }
  }

  document.body.addEventListener('click', initAudio, { once: true });
  document.querySelectorAll('a, button, select, .part-row label').forEach(el => { el.addEventListener('mouseenter', () => playSound('hover')); el.addEventListener('click', () => playSound('click')); });
  const soundBtn = document.getElementById('sound-toggle');
  if (soundBtn) soundBtn.addEventListener('click', () => { isSoundOn = !isSoundOn; soundBtn.classList.toggle('muted', !isSoundOn); });
  setInterval(() => { const c = document.getElementById('clock'); if (c) c.textContent = `JST ${new Date().toLocaleTimeString('ru-RU', { hour12: false })}`; }, 1000);

  /* ---------- 4. ЗАГРУЗКА ДАННЫХ ---------- */
  let carsData = [], servicesData = [];
  async function loadCars() {
    const grid = document.getElementById('gallery-grid'); if (!grid) return;
    const res = await fetch('/api/cars'); carsData = await res.json();
    grid.innerHTML = carsData.map((c, i) => `<div class="gallery-item" data-index="${i}"><img src="${c.img}" alt="${c.title}"><div class="gallery-item-info"><h4>${c.title}</h4><p>${c.spec}</p></div></div>`).join('');
    document.querySelectorAll('.gallery-item').forEach(item => {
      item.addEventListener('click', () => {
        const car = carsData[item.dataset.index]; playSound('car'); // ЗВУК МАШИНЫ
        document.getElementById('cm-img').src = car.img; document.getElementById('cm-title').textContent = car.title; document.getElementById('cm-spec').textContent = car.spec;
        document.getElementById('cm-engine').textContent = car.engine; document.getElementById('cm-hp').textContent = car.hp; document.getElementById('cm-weight').textContent = car.weight;
        document.getElementById('cm-drive').textContent = car.drive; document.getElementById('cm-accel').textContent = car.accel; document.getElementById('cm-desc').textContent = car.description;
        closeAllModals(); document.getElementById('car-modal').classList.add('open');
      });
    });
    const baseSelect = document.getElementById('base-car');
    if (baseSelect) { baseSelect.innerHTML = carsData.map(c => `<option value="${c.id}" data-hp="${parseInt(c.hp) || 200}" data-price="1500000">${c.title}</option>`).join(''); calculateConfig(); }
  }
  async function loadServices() {
    const grid = document.getElementById('services-grid'); if (!grid) return;
    const res = await fetch('/api/services'); servicesData = await res.json();
    grid.innerHTML = servicesData.map(s => `<div class="service-card" data-id="${s.id}"><span class="num">${s.num}</span><h3>${s.title}</h3><p>${s.short}</p></div>`).join('');
    document.querySelectorAll('.service-card').forEach(card => {
      card.addEventListener('click', () => {
        const srv = servicesData.find(s => s.id === parseInt(card.dataset.id));
        document.getElementById('srv-title').textContent = srv.title; document.getElementById('srv-desc').textContent = srv.full_description; document.getElementById('srv-price').textContent = srv.price;
        document.getElementById('srv-list').innerHTML = srv.works.split('\n').map(w => `<li>${w}</li>`).join('');
        closeAllModals(); document.getElementById('service-modal').classList.add('open'); playSound('modal');
      });
    });
  }
  loadCars(); loadServices();

  /* ---------- 5. МОДАЛКИ И КОНФИГУРАТОР ---------- */
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

  /* ---------- 6. АВТОРИЗАЦИЯ И ПРОФИЛЬ ---------- */
  let authToken = localStorage.getItem('kanjo_token') || null;
  let currentUser = null;
  let tempEmail = ''; 
  const authModal = document.getElementById('auth-modal');

  function updateAuthUI() {
    document.getElementById('login-btn').style.display = authToken ? 'none' : 'block';
    document.getElementById('profile-btn').style.display = authToken ? 'flex' : 'none';
  }
  updateAuthUI();

  document.getElementById('login-btn').addEventListener('click', () => {
    document.getElementById('auth-form').reset();
    document.getElementById('verify-form').reset();
    document.getElementById('auth-step-1').style.display = 'block';
    document.getElementById('auth-step-2').style.display = 'none';
    document.getElementById('auth-error').style.display = 'none';
    
    const loginTab = document.querySelector('.auth-tab[data-mode="login"]');
    if (loginTab) {
      document.querySelectorAll('.auth-tab[data-mode]').forEach(t => t.classList.remove('active'));
      loginTab.classList.add('active');
      document.querySelectorAll('.reg-only').forEach(el => el.style.display = 'none');
      document.getElementById('auth-submit-btn').textContent = 'ВОЙТИ';
    }
    authModal.classList.add('open');
  });

  document.querySelectorAll('.auth-tab[data-mode]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab[data-mode]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isReg = tab.dataset.mode === 'register';
      document.querySelectorAll('.reg-only').forEach(el => el.style.display = isReg ? 'block' : 'none');
      document.getElementById('auth-submit-btn').textContent = isReg ? 'СОЗДАТЬ АККАУНТ' : 'ВОЙТИ';
      document.getElementById('auth-error').style.display = 'none';
    });
  });

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

  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault(); if (!validateForm(e.target)) return;
    const isLogin = document.querySelector('.auth-tab[data-mode].active').dataset.mode === 'login';
    const btn = document.getElementById('auth-submit-btn'); btn.textContent = 'ЗАГРУЗКА...';
    const email = document.getElementById('auth-email').value;

    const body = { email, password: document.getElementById('auth-password').value };
    if (!isLogin) { body.name = document.getElementById('auth-name').value; body.phone = document.getElementById('auth-phone').value; }

    try {
      const res = await fetch(isLogin ? '/api/auth/login' : '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json(); 
      
      if (!res.ok) {
        if (data.needsVerify) {
          tempEmail = data.email;
          document.getElementById('auth-step-1').style.display = 'none';
          document.getElementById('auth-step-2').style.display = 'block';
          showToast('Введите код подтверждения', 'success');
          return;
        }
        throw new Error(data.error);
      }
      
      if (isLogin) {
        authToken = data.token; currentUser = data.user; localStorage.setItem('kanjo_token', authToken);
        updateAuthUI(); authModal.classList.remove('open'); e.target.reset();
        showToast('Успешный вход в систему!', 'success');
        loadProfile();
      } else {
        tempEmail = email;
        document.getElementById('auth-step-1').style.display = 'none';
        document.getElementById('auth-step-2').style.display = 'block';
        
        // ВЫВОДИМ КОД ПРЯМО НА САЙТЕ И АВТОМАТИЧЕСКИ ВСТАВЛЯЕМ
        showToast(`Ваш код: ${data.code}`, 'success');
        document.getElementById('auth-code').value = data.code;
      }
    } catch (err) { 
      document.getElementById('auth-error').textContent = err.message; document.getElementById('auth-error').style.display = 'block'; 
    } finally { btn.textContent = isLogin ? 'ВОЙТИ' : 'СОЗДАТЬ АККАУНТ'; }
  });

  document.getElementById('verify-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('auth-code').value;
    const btn = document.getElementById('verify-submit-btn'); btn.textContent = 'ПРОВЕРКА...';
    try {
      const res = await fetch('/api/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: tempEmail, code }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      
      authToken = data.token; currentUser = data.user; localStorage.setItem('kanjo_token', authToken);
      updateAuthUI(); authModal.classList.remove('open'); 
      document.getElementById('auth-step-1').style.display = 'block';
      document.getElementById('auth-step-2').style.display = 'none';
      document.getElementById('auth-form').reset(); document.getElementById('verify-form').reset();
      showToast('Аккаунт успешно создан!', 'success');
      loadProfile();
    } catch (err) { 
      document.getElementById('auth-error').textContent = err.message; document.getElementById('auth-error').style.display = 'block'; 
    } finally { btn.textContent = 'ПОДТВЕРДИТЬ'; }
  });

  document.getElementById('forgot-pass-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = prompt('Введите ваш Email:');
    if (!email) return;
    try {
      const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await res.json(); 
      if(res.ok) {
        showToast(`Ваш новый пароль: ${data.pass}`, 'success');
        console.log(`Новый пароль для ${email}: ${data.pass}`);
      } else { showToast(data.error, 'error'); }
    } catch (err) { showToast('Ошибка сервера', 'error'); }
  });

  async function loadProfile() {
    if (!authToken) return;
    try {
      const res = await fetch('/api/user/profile', { headers: { 'Authorization': `Bearer ${authToken}` } });
      if (res.ok) { currentUser = await res.json(); } else { logout(); }
    } catch (err) { }
  }
  loadProfile();

  function logout() { localStorage.removeItem('kanjo_token'); authToken = null; updateAuthUI(); document.getElementById('profile-modal').classList.remove('open'); showToast('Вы вышли из системы', 'success'); }
  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('profile-btn').addEventListener('click', () => { document.getElementById('profile-modal').classList.add('open'); loadBookings(); loadBuilds(); });

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
    list.innerHTML = b.length ? b.map(x => `
      <div class="profile-card" style="border-left: 2px solid var(--red);">
        <div class="profile-card-info"><h4>${x.car_name}</h4><p>${x.build_text} (${x.total_hp} HP)</p><p style="color:var(--red); margin-top:5px;">${x.total_price} ₽</p></div>
        <button onclick="deleteBuild(${x.id})" style="background:none; border:none; color:#888; cursor:pointer; font-size:20px;">✕</button>
      </div>
    `).join('') : '<p>Гараж пуст. Соберите свою легенду!</p>';
  }

  window.deleteBuild = async (id) => {
    if(!confirm('Удалить сборку?')) return;
    await fetch(`/api/user/builds/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` } });
    loadBuilds(); showToast('Сборка удалена', 'success');
  };

  /* ---------- 7. ОТПРАВКА ЗАЯВОК ---------- */
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
      showToast('Заявка отправлена! Мы свяжемся с вами.', 'success');
      setTimeout(() => { form.reset(); btn.textContent = originalText; btn.style.color = ''; btn.style.borderColor = ''; closeAllModals(); }, 2000);
    } catch (err) { btn.textContent = 'ОШИБКА!'; btn.style.color = 'red'; btn.style.borderColor = 'red'; showToast('Ошибка отправки', 'error'); setTimeout(() => { btn.textContent = originalText; btn.style.color = ''; btn.style.borderColor = ''; }, 2000); }
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
    
    if (currentUser) {
      modal.querySelector('input[type="text"]').value = currentUser.name || '';
      modal.querySelector('input[type="tel"]').value = currentUser.phone || '';
      modal.querySelector('.discount-hint').style.display = 'block';
    }
  });

  document.getElementById('btn-save-build').addEventListener('click', async () => {
    if (!authToken) { authModal.classList.add('open'); return; }
    const car = baseCarSelect.options[baseCarSelect.selectedIndex].text;
    const parts = []; partsCbs.forEach(cb => { if (cb.checked) parts.push(cb.nextElementSibling.textContent.split('(')[0].trim()); });
    await fetch('/api/user/save-build', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ car_name: car, build_text: parts.join(' + ') || 'Сток', total_hp: parseInt(document.getElementById('total-hp').textContent), total_price: parseInt(document.getElementById('total-price').textContent.replace(/\s/g, '')) })
    });
    showToast('Сборка сохранена в гараже!', 'success');
  });

  /* ---------- 8. КАСТОМНЫЙ ВИДЕОПЛЕЕР ---------- */
  const videoModal = document.getElementById('video-modal');
  const video = document.getElementById('credits-video');
  const playPauseBtn = document.getElementById('play-pause-btn');
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');
  const timeDisplay = document.getElementById('time-display');
  const muteBtn = document.getElementById('mute-btn');

  document.getElementById('credits-btn').addEventListener('click', () => {
    videoModal.classList.add('open');
    video.play();
    playPauseBtn.textContent = '⏸';
  });

  function closeVideo() {
    videoModal.classList.remove('open');
    video.pause();
  }

  document.getElementById('close-video-btn').addEventListener('click', closeVideo);
  videoModal.addEventListener('click', (e) => { if (e.target === videoModal) closeVideo(); });

  playPauseBtn.addEventListener('click', () => {
    if (video.paused) { video.play(); playPauseBtn.textContent = '⏸'; } 
    else { video.pause(); playPauseBtn.textContent = '▶'; }
  });

  muteBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    muteBtn.textContent = video.muted ? '🔇' : '🔊';
  });

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  video.addEventListener('timeupdate', () => {
    const percent = (video.currentTime / video.duration) * 100;
    progressBar.style.width = `${percent}%`;
    timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration || 0)}`;
  });

  progressContainer.addEventListener('click', (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  });

})();