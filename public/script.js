(() => {
  'use strict';

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

  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const creditsBtn = document.getElementById('credits-btn');
    if (creditsBtn) creditsBtn.classList.add('hidden');

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span><button onclick="this.parentElement.remove()">✕</button>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('show'); }, 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
        if (container.children.length === 0 && creditsBtn) creditsBtn.classList.remove('hidden');
      }, 300);
    }, 4000);
  }

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
  }

  document.body.addEventListener('click', initAudio, { once: true });
  document.querySelectorAll('a, button, select, .part-row label').forEach(el => { el.addEventListener('mouseenter', () => playSound('hover')); el.addEventListener('click', () => playSound('click')); });
  const soundBtn = document.getElementById('sound-toggle');
  if (soundBtn) soundBtn.addEventListener('click', () => { isSoundOn = !isSoundOn; soundBtn.classList.toggle('muted', !isSoundOn); });
  setInterval(() => { const c = document.getElementById('clock'); if (c) c.textContent = `JST ${new Date().toLocaleTimeString('ru-RU', { hour12: false })}`; }, 1000);

  let carsData = [], servicesData = [];
  let selectedCarId = null, selectedCarHp = 0, selectedCarPrice = 0;
  const customSelect = document.getElementById('base-car-select');
  const selectTrigger = document.querySelector('.select-trigger');
  const optionsContainer = document.getElementById('base-car-options');
  const selectedText = document.getElementById('selected-car-text');

  async function loadCars() {
    const grid = document.getElementById('gallery-grid'); if (!grid) return;
    const res = await fetch('/api/cars'); carsData = await res.json();
    
    grid.innerHTML = carsData.map((c, i) => `<div class="gallery-item" data-index="${i}"><img src="${escapeHTML(c.img)}" alt="${escapeHTML(c.title)}"><div class="gallery-item-info"><h4>${escapeHTML(c.title)}</h4><p>${escapeHTML(c.spec)}</p></div></div>`).join('');
    document.querySelectorAll('.gallery-item').forEach(item => {
      item.addEventListener('click', () => {
        const car = carsData[item.dataset.index]; playSound('click'); 
        document.getElementById('cm-img').src = escapeHTML(car.img); document.getElementById('cm-title').textContent = escapeHTML(car.title); document.getElementById('cm-spec').textContent = escapeHTML(car.spec);
        document.getElementById('cm-engine').textContent = escapeHTML(car.engine); document.getElementById('cm-hp').textContent = escapeHTML(car.hp); document.getElementById('cm-weight').textContent = escapeHTML(car.weight);
        document.getElementById('cm-drive').textContent = escapeHTML(car.drive); document.getElementById('cm-accel').textContent = escapeHTML(car.accel); document.getElementById('cm-desc').textContent = escapeHTML(car.description);
        closeAllModals(); document.getElementById('car-modal').classList.add('open');
      });
    });

    if (optionsContainer && carsData.length > 0) {
      optionsContainer.innerHTML = carsData.map(c => `<div class="select-option" data-id="${c.id}" data-hp="${parseInt(c.hp) || 200}" data-price="1500000">${escapeHTML(c.title)}</div>`).join('');
      optionsContainer.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });

      document.querySelectorAll('.select-option').forEach(opt => {
        opt.addEventListener('click', () => {
          selectedText.textContent = opt.textContent;
          selectedCarId = opt.dataset.id; selectedCarHp = parseInt(opt.dataset.hp); selectedCarPrice = parseInt(opt.dataset.price);
          customSelect.classList.remove('open'); calculateConfig();
        });
      });

      const firstOpt = document.querySelector('.select-option');
      if (firstOpt) {
        selectedText.textContent = firstOpt.textContent;
        selectedCarId = firstOpt.dataset.id; selectedCarHp = parseInt(firstOpt.dataset.hp); selectedCarPrice = parseInt(firstOpt.dataset.price);
        calculateConfig();
      }
    }
  }

  if (selectTrigger) {
    selectTrigger.addEventListener('click', (e) => { e.stopPropagation(); customSelect.classList.toggle('open'); });
    document.addEventListener('click', (e) => { if (!customSelect.contains(e.target)) customSelect.classList.remove('open'); });
  }

  async function loadServices() {
    const grid = document.getElementById('services-grid'); if (!grid) return;
    const res = await fetch('/api/services'); servicesData = await res.json();
    grid.innerHTML = servicesData.map(s => `<div class="service-card" data-id="${s.id}"><span class="num">${escapeHTML(s.num)}</span><h3>${escapeHTML(s.title)}</h3><p>${escapeHTML(s.short)}</p></div>`).join('');
    document.querySelectorAll('.service-card').forEach(card => {
      card.addEventListener('click', () => {
        const srv = servicesData.find(s => s.id === parseInt(card.dataset.id));
        document.getElementById('srv-title').textContent = escapeHTML(srv.title); document.getElementById('srv-desc').textContent = escapeHTML(srv.full_description); document.getElementById('srv-price').textContent = escapeHTML(srv.price);
        document.getElementById('srv-list').innerHTML = srv.works.split('\n').map(w => `<li>${escapeHTML(w)}</li>`).join('');
        closeAllModals(); document.getElementById('service-modal').classList.add('open'); playSound('modal');
      });
    });
  }
  loadCars(); loadServices();

  async function loadMainReviews() {
    const grid = document.getElementById('main-reviews-grid'); if (!grid) return;
    try {
      const res = await fetch('/api/reviews'); const reviews = await res.json();
      grid.innerHTML = reviews.length ? reviews.map(r => `
        <div class="review-card">
          <div class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
          <p class="review-text">"${escapeHTML(r.text)}"</p>
          <p style="color:var(--red); font-size:12px; margin-bottom:5px;">Заказ: ${escapeHTML(r.target_car) || 'Неизвестно'}</p>
          <span class="review-author">— ${escapeHTML(r.name)}</span>
        </div>
      `).join('') : '<p style="color:var(--grey);">Пока нет отзывов.</p>';
    } catch(e) {}
  }
  loadMainReviews();

  const closeAllModals = () => document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
  document.querySelectorAll('.close-modal').forEach(b => b.addEventListener('click', closeAllModals));
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) closeAllModals(); }));
  document.querySelectorAll('.open-booking').forEach(b => b.addEventListener('click', () => { closeAllModals(); document.getElementById('booking-modal').classList.add('open'); playSound('modal'); }));

  const confirmModal = document.getElementById('confirm-modal');
  const confirmText = document.getElementById('confirm-text');
  let confirmCallback = null;

  function showConfirm(text, callback) {
    confirmText.textContent = text; confirmCallback = callback; confirmModal.classList.add('open');
  }

  document.getElementById('confirm-yes').addEventListener('click', () => { if (confirmCallback) confirmCallback(); confirmModal.classList.remove('open'); });
  document.getElementById('confirm-no').addEventListener('click', () => { confirmModal.classList.remove('open'); });

  const cancelModal = document.getElementById('cancel-modal');
  let currentCancelId = null;

  window.cancelUserBooking = (id) => {
    currentCancelId = id;
    document.getElementById('cancel-reason-input').value = '';
    cancelModal.classList.add('open');
  };

  document.getElementById('btn-confirm-cancel').addEventListener('click', async () => {
    const reason = document.getElementById('cancel-reason-input').value || 'Не указана';
    try {
      const res = await fetch(`/api/user/bookings/${currentCancelId}/cancel`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ reason })
      });
      if (res.ok) { 
        cancelModal.classList.remove('open');
        loadBookings(); 
        showToast('Заявка отменена', 'success'); 
        loadProfile(); 
      }
    } catch (err) { showToast('Ошибка', 'error'); }
  });

  const partsCbs = document.querySelectorAll('.part-row input[type="checkbox"]');
  function calculateConfig() {
    let hp = selectedCarHp || 0, price = selectedCarPrice || 0;
    partsCbs.forEach(cb => { if (cb.checked) { hp += parseInt(cb.dataset.hp) || 0; price += parseInt(cb.dataset.price) || 0; } });
    document.getElementById('total-hp').textContent = hp;
    document.getElementById('total-price').textContent = price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }
  partsCbs.forEach(c => c.addEventListener('change', calculateConfig));

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
    document.getElementById('auth-form').reset(); document.getElementById('verify-form').reset();
    document.getElementById('auth-step-1').style.display = 'block'; document.getElementById('auth-step-2').style.display = 'none';
    document.getElementById('auth-error').style.display = 'none';
    
    const loginTab = document.querySelector('.auth-tab[data-mode="login"]');
    if (loginTab) {
      document.querySelectorAll('.auth-tab[data-mode]').forEach(t => t.classList.remove('active'));
      loginTab.classList.add('active'); document.querySelectorAll('.reg-only').forEach(el => el.style.display = 'none');
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
          tempEmail = data.email; document.getElementById('auth-step-1').style.display = 'none';
          document.getElementById('auth-step-2').style.display = 'block'; showToast('Введите код подтверждения', 'success'); return;
        }
        throw new Error(data.error);
      }
      
      if (isLogin) {
        authToken = data.token; currentUser = data.user; localStorage.setItem('kanjo_token', authToken);
        updateAuthUI(); authModal.classList.remove('open'); e.target.reset();
        showToast('Успешный вход в систему!', 'success'); loadProfile();
      } else {
        tempEmail = email; document.getElementById('auth-step-1').style.display = 'none';
        document.getElementById('auth-step-2').style.display = 'block';
        showToast(`Ваш код: ${data.code}`, 'success'); document.getElementById('auth-code').value = data.code;
      }
    } catch (err) { document.getElementById('auth-error').textContent = err.message; document.getElementById('auth-error').style.display = 'block'; } 
    finally { btn.textContent = isLogin ? 'ВОЙТИ' : 'СОЗДАТЬ АККАУНТ'; }
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
      document.getElementById('auth-step-1').style.display = 'block'; document.getElementById('auth-step-2').style.display = 'none';
      document.getElementById('auth-form').reset(); document.getElementById('verify-form').reset();
      showToast('Аккаунт успешно создан!', 'success'); loadProfile();
    } catch (err) { document.getElementById('auth-error').textContent = err.message; document.getElementById('auth-error').style.display = 'block'; } 
    finally { btn.textContent = 'ПОДТВЕРДИТЬ'; }
  });

  document.getElementById('forgot-pass-btn').addEventListener('click', async (e) => {
    e.preventDefault(); const email = prompt('Введите ваш Email:'); if (!email) return;
    try {
      const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await res.json(); 
      if(res.ok) { showToast(`Ваш новый пароль: ${data.pass}`, 'success'); console.log(`Новый пароль для ${email}: ${data.pass}`); } 
      else { showToast(data.error, 'error'); }
    } catch (err) { showToast('Ошибка сервера', 'error'); }
  });

  async function loadProfile() {
    if (!authToken) return;
    try {
      const res = await fetch('/api/user/profile', { headers: { 'Authorization': `Bearer ${authToken}` } });
      if (res.ok) { 
        currentUser = await res.json(); 
        const bookRes = await fetch('/api/user/bookings', { headers: { 'Authorization': `Bearer ${authToken}` } });
        const bookings = await bookRes.json();
        currentUser.hasOrders = bookings.length > 0;
      } else { logout(); }
    } catch (err) { }
  }
  loadProfile();

  function logout() { localStorage.removeItem('kanjo_token'); authToken = null; updateAuthUI(); document.getElementById('profile-modal').classList.remove('open'); showToast('Вы вышли из системы', 'success'); }
  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('profile-btn').addEventListener('click', () => { document.getElementById('profile-modal').classList.add('open'); loadBookings(); loadBuilds(); loadUserReviews(); });

  const tabsList = document.querySelectorAll('.auth-tabs .auth-tab');
  tabsList.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabsList.forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      
      document.getElementById('profile-tab-bookings').style.display = 'none';
      document.getElementById('profile-tab-builds').style.display = 'none';
      document.getElementById('profile-tab-reviews').style.display = 'none';
      
      const targetId = e.target.id.replace('tab-btn-', 'profile-tab-');
      document.getElementById(targetId).style.display = 'block';
      
      if (targetId === 'profile-tab-bookings') loadBookings();
      if (targetId === 'profile-tab-builds') loadBuilds();
      if (targetId === 'profile-tab-reviews') loadUserReviews();
    });
  });

  async function loadBookings() {
    const list = document.getElementById('profile-bookings-list'); list.innerHTML = 'Загрузка...';
    const res = await fetch('/api/user/bookings', { headers: { 'Authorization': `Bearer ${authToken}` } });
    if (!res.ok) return;
    const b = await res.json();
    list.innerHTML = b.length ? b.map(x => `
      <div class="profile-card">
        <div class="profile-card-info"><h4>${escapeHTML(x.car)}</h4><p>Имя: ${escapeHTML(x.name)} | Тел: ${escapeHTML(x.phone)}</p></div>
        <div style="text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:5px;">
          <span class="status-badge status-${x.status==='В работе'?'work':(x.status==='Выполнена'?'done':(x.status==='Отменена'?'cancel':'new'))}">${escapeHTML(x.status)}</span>
          <small style="font-family: monospace; color: var(--grey);">${new Date(x.created_at).toLocaleString()}</small>
          ${x.status !== 'Отменена' && x.status !== 'Выполнена' ? `<button onclick="cancelUserBooking(${x.id})" style="background:none; border:none; color:var(--grey); font-size:12px; cursor:pointer; text-decoration:underline;">Отменить</button>` : ''}
        </div>
      </div>
    `).join('') : '<p>Нет заявок</p>';
  }

  async function loadBuilds() {
    const list = document.getElementById('profile-builds-list'); list.innerHTML = 'Загрузка...';
    const res = await fetch('/api/user/builds', { headers: { 'Authorization': `Bearer ${authToken}` } });
    const b = await res.json();
    list.innerHTML = b.length ? b.map(x => `
      <div class="profile-card" style="border-left: 2px solid var(--red);">
        <div class="profile-card-info"><h4>${escapeHTML(x.car_name)}</h4><p>${escapeHTML(x.build_text)} (${x.total_hp} HP)</p><p style="color:var(--red); margin-top:5px;">${x.total_price} ₽</p></div>
        <button onclick="deleteBuild(${x.id})" style="background:none; border:none; color:#888; cursor:pointer; font-size:20px;">✕</button>
      </div>
    `).join('') : '<p>Гараж пуст. Соберите свою легенду!</p>';
  }

  window.deleteBuild = async (id) => {
    showConfirm('Удалить сборку из гаража?', async () => {
      await fetch(`/api/user/builds/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` } });
      loadBuilds(); showToast('Сборка удалена', 'success');
    });
  };

  const stars = document.querySelectorAll('.star');
  let currentRating = 5;
  const ratingText = document.getElementById('selected-rating-text');

  stars.forEach(star => {
    star.addEventListener('mouseover', () => {
      const val = parseInt(star.dataset.val);
      stars.forEach(s => { s.style.color = parseInt(s.dataset.val) <= val ? 'var(--red)' : 'var(--grey)'; });
    });
    star.addEventListener('mouseout', () => {
      stars.forEach(s => { s.style.color = parseInt(s.dataset.val) <= currentRating ? 'var(--red)' : 'var(--grey)'; });
    });
    star.addEventListener('click', () => {
      currentRating = parseInt(star.dataset.val);
      ratingText.textContent = `${currentRating}/5`;
    });
  });
  stars.forEach(s => { if (parseInt(s.dataset.val) <= currentRating) s.style.color = 'var(--red)'; });

  async function loadUserReviews() {
    const list = document.getElementById('profile-reviews-list'); 
    const formContainer = document.getElementById('review-form-container');
    const select = document.getElementById('review-booking-select');
    
    list.innerHTML = 'Загрузка...';
    
    const bookingsRes = await fetch('/api/user/bookings', { headers: { 'Authorization': `Bearer ${authToken}` } });
    const bookings = await bookingsRes.json();
    
    const reviewsRes = await fetch('/api/reviews');
    const allReviews = await reviewsRes.json();
    const userReviews = allReviews.filter(r => r.name === currentUser?.name);

    const completedBookings = bookings.filter(b => b.status === 'Выполнена');
    const unreviewedBookings = completedBookings.filter(b => !userReviews.some(r => r.booking_id === b.id));

    if (unreviewedBookings.length > 0) {
      formContainer.style.display = 'block';
      select.innerHTML = unreviewedBookings.map(b => `<option value="${b.id}">${escapeHTML(b.car)}</option>`).join('');
    } else {
      formContainer.style.display = 'none'; 
    }

    list.innerHTML = userReviews.length ? userReviews.map(r => `
      <div class="profile-card">
        <div class="profile-card-info">
          <h4>${escapeHTML(r.name)} <span style="color:var(--red); font-size:14px;">${'★'.repeat(r.rating)}</span></h4>
          <p style="font-size:12px; color:var(--red); margin-bottom:5px;">Работа: ${escapeHTML(r.target_car) || 'Неизвестно'}</p>
          <p>${escapeHTML(r.text)}</p>
        </div>
      </div>
    `).join('') : '<p>Вы пока не оставляли отзывов.</p>';
  }

  document.getElementById('btn-submit-review')?.addEventListener('click', async () => {
    const text = document.getElementById('review-text').value;
    const bookingId = document.getElementById('review-booking-select').value;

    if (!text) return showToast('Напишите текст отзыва', 'error');
    if (!bookingId) return showToast('Нет выполненных заказов для отзыва', 'error');
    
    try {
      const res = await fetch('/api/user/reviews', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ text, rating: currentRating, booking_id: parseInt(bookingId) })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Спасибо за отзыв!', 'success');
        document.getElementById('review-text').value = '';
        loadUserReviews();
        loadMainReviews();
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) { showToast('Ошибка отправки', 'error'); }
  });

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
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка отправки');

      btn.textContent = 'УСПЕШНО!'; btn.style.color = '#10b981'; btn.style.borderColor = '#10b981';
      showToast('Заявка отправлена! Мы свяжемся с вами.', 'success');
      setTimeout(() => { form.reset(); btn.textContent = originalText; btn.style.color = ''; btn.style.borderColor = ''; closeAllModals(); loadProfile(); }, 2000);
    } catch (err) { 
      btn.textContent = 'ОШИБКА!'; btn.style.color = 'red'; btn.style.borderColor = 'red'; 
      showToast(err.message, 'error'); 
      setTimeout(() => { btn.textContent = originalText; btn.style.color = ''; btn.style.borderColor = ''; }, 2000); 
    }
  };
  document.getElementById('booking-form').addEventListener('submit', handleForm);
  document.getElementById('inline-booking-form').addEventListener('submit', handleForm);

  document.getElementById('btn-book-build').addEventListener('click', () => {
    const car = selectedText.textContent;
    const parts = []; partsCbs.forEach(cb => { if (cb.checked) parts.push(cb.nextElementSibling.textContent.split('(')[0].trim()); });
    const text = car + (parts.length ? ` + ${parts.join(' + ')}` : '') + ` (${document.getElementById('total-hp').textContent} HP)`;
    closeAllModals(); document.getElementById('booking-modal').classList.add('open');
    const modal = document.getElementById('booking-form');
    modal.querySelectorAll('input[type="text"]')[1].value = text;
    modal.querySelector('.booking-price-input').value = document.getElementById('total-price').textContent.replace(/\s/g, '');
    
    if (currentUser) {
      modal.querySelector('input[type="text"]').value = currentUser.name || '';
      modal.querySelector('input[type="tel"]').value = currentUser.phone || '';
      modal.querySelector('.discount-hint').style.display = (!currentUser.hasOrders) ? 'block' : 'none';
    }
  });

  document.getElementById('btn-book-current-car').addEventListener('click', () => {
    const carName = document.getElementById('cm-title').textContent;
    closeAllModals();
    const bookingModal = document.getElementById('booking-modal');
    bookingModal.classList.add('open'); playSound('modal');
    const form = document.getElementById('booking-form');
    
    form.querySelectorAll('input[type="text"]')[1].value = carName;
    
    if (currentUser) {
      form.querySelector('input[type="text"]').value = currentUser.name || '';
      form.querySelector('input[type="tel"]').value = currentUser.phone || '';
      form.querySelector('.discount-hint').style.display = (!currentUser.hasOrders) ? 'block' : 'none';
    }
  });

  document.getElementById('btn-order-service').addEventListener('click', () => {
    const srvName = document.getElementById('srv-title').textContent;
    closeAllModals();
    const bookingModal = document.getElementById('booking-modal');
    bookingModal.classList.add('open'); playSound('modal');
    const form = document.getElementById('booking-form');
    
    form.querySelectorAll('input[type="text"]')[1].value = srvName; 
    
    if (currentUser) {
      form.querySelector('input[type="text"]').value = currentUser.name || '';
      form.querySelector('input[type="tel"]').value = currentUser.phone || '';
      form.querySelector('.discount-hint').style.display = (!currentUser.hasOrders) ? 'block' : 'none';
    }
  });

  document.getElementById('btn-save-build').addEventListener('click', async () => {
    if (!authToken) { authModal.classList.add('open'); return; }
    const car = selectedText.textContent;
    const parts = []; partsCbs.forEach(cb => { if (cb.checked) parts.push(cb.nextElementSibling.textContent.split('(')[0].trim()); });
    
    try {
      const res = await fetch('/api/user/save-build', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ car_name: car, build_text: parts.join(' + ') || 'Сток', total_hp: parseInt(document.getElementById('total-hp').textContent), total_price: parseInt(document.getElementById('total-price').textContent.replace(/\s/g, '')) })
      });
      const data = await res.json();
      if (res.ok) showToast('Сборка сохранена в гараже!', 'success');
      else showToast(data.error || 'Ошибка', 'error');
    } catch (err) { showToast('Ошибка сервера', 'error'); }
  });

  const videoModal = document.getElementById('video-modal');
  const video = document.getElementById('credits-video');
  const playPauseBtn = document.getElementById('play-pause-btn');
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');
  const timeDisplay = document.getElementById('time-display');
  const muteBtn = document.getElementById('mute-btn');

  document.getElementById('credits-btn').addEventListener('click', () => {
    videoModal.classList.add('open'); video.currentTime = 0; video.play(); playPauseBtn.textContent = '⏸';
  });

  function closeVideo() { videoModal.classList.remove('open'); video.pause(); }
  document.getElementById('close-video-btn').addEventListener('click', closeVideo);
  videoModal.addEventListener('click', (e) => { if (e.target === videoModal) closeVideo(); });

  playPauseBtn.addEventListener('click', () => {
    if (video.paused) { video.play(); playPauseBtn.textContent = '⏸'; } 
    else { video.pause(); playPauseBtn.textContent = '▶'; }
  });

  muteBtn.addEventListener('click', () => {
    video.muted = !video.muted; muteBtn.textContent = video.muted ? '🔇' : '🔊';
  });

  function formatTime(seconds) { const m = Math.floor(seconds / 60); const s = Math.floor(seconds % 60); return `${m}:${s < 10 ? '0' : ''}${s}`; }
  video.addEventListener('timeupdate', () => { const percent = (video.currentTime / video.duration) * 100; progressBar.style.width = `${percent}%`; timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration || 0)}`; });
  progressContainer.addEventListener('click', (e) => { const rect = progressContainer.getBoundingClientRect(); const pos = (e.clientX - rect.left) / rect.width; video.currentTime = pos * video.duration; });

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && authToken) {
      loadProfile();
      if (document.getElementById('profile-modal').classList.contains('open')) { 
        loadBookings(); loadBuilds(); loadUserReviews(); 
      }
    }
  });

})();