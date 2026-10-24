(() => {
  'use strict';

  /* ---------- 0. ПРЕЛОАДЕР ---------- */
  window.addEventListener('load', async () => {
    try {
      await fetch('/api/cars', { method: 'HEAD', cache: 'no-store' }).catch(() => {});
    } finally {
      const preloader = document.getElementById('preloader');
      if (preloader) {
        setTimeout(() => preloader.classList.add('hidden'), 800);
      }
    }
  });

  /* ---------- 1. АУДИО ---------- */
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let audioCtx;
  let isSoundOn = true;

  function initAudio() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playHoverSound() {
    if (!isSoundOn || !audioCtx) return;
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.type = 'square'; osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.02, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.02);
    osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.02);
  }

  function playClickSound() {
    if (!isSoundOn || !audioCtx) return;
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.type = 'triangle'; osc.frequency.setValueAtTime(120, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.08);
  }

  function playModalSound() {
    if (!isSoundOn || !audioCtx) return;
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(80, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.25);
  }

  function playServiceSound() {
    if (!isSoundOn || !audioCtx) return;
    const now = audioCtx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
      osc.type = 'square'; osc.frequency.setValueAtTime(800, now + i * 0.05);
      gain.gain.setValueAtTime(0.03, now + i * 0.05); gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.02);
      osc.connect(gain); gain.connect(audioCtx.destination); osc.start(now + i * 0.05); osc.stop(now + i * 0.05 + 0.02);
    }
  }

  function playCarSound() {
    if (!isSoundOn || !audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(40, now); osc.frequency.linearRampToValueAtTime(120, now + 0.3); osc.frequency.exponentialRampToValueAtTime(60, now + 0.6);
    gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 400;
    osc.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination); osc.start(now); osc.stop(now + 0.7);
  }

  document.body.addEventListener('click', initAudio, { once: true });
  const soundBtn = document.getElementById('sound-toggle');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      isSoundOn = !isSoundOn;
      soundBtn.classList.toggle('muted', !isSoundOn);
      if (isSoundOn) playClickSound();
    });
  }
  document.querySelectorAll('a, button, select, .part-row label, .btn-racing, .logo').forEach(el => {
    el.addEventListener('mouseenter', playHoverSound); el.addEventListener('click', playClickSound);
  });

  /* ---------- 2. ЧАСЫ ---------- */
  const clockEl = document.getElementById('clock');
  if (clockEl) {
    setInterval(() => {
      clockEl.textContent = `JST ${new Date().toLocaleTimeString('ru-RU', { hour12: false })}`;
    }, 1000);
  }

  /* ---------- 3. БАЗА ДАННЫХ (СЕРВЕР) ---------- */
  let carsData = [];
  let servicesData = [];

  async function loadCars() {
    const galleryGrid = document.getElementById('gallery-grid');
    if (!galleryGrid) return;
    try {
      const res = await fetch('/api/cars');
      carsData = await res.json();
      galleryGrid.innerHTML = carsData.map((car, index) => `
        <div class="gallery-item" data-index="${index}">
          <img src="${car.img}" alt="${car.title}">
          <div class="gallery-item-info"><h4>${car.title}</h4><p>${car.spec}</p></div>
        </div>
      `).join('');
      attachCarClickEvents();
    } catch (err) { console.error(err); }
  }

  async function loadServices() {
    const servicesGrid = document.getElementById('services-grid');
    if (!servicesGrid) return;
    try {
      const res = await fetch('/api/services');
      servicesData = await res.json();
      servicesGrid.innerHTML = servicesData.map(s => `
        <div class="service-card" data-id="${s.id}">
          <span class="num">${s.num}</span><h3>${s.title}</h3><p>${s.short}</p>
        </div>
      `).join('');
      document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => {
          const srv = servicesData.find(s => s.id === parseInt(card.dataset.id));
          if (!srv) return;
          document.getElementById('srv-title').textContent = srv.title;
          document.getElementById('srv-desc').textContent = srv.full_description;
          document.getElementById('srv-price').textContent = srv.price;
          document.getElementById('srv-list').innerHTML = srv.works.split('\n').filter(w => w.trim()).map(item => `<li>${item}</li>`).join('');
          closeAllModals(); serviceModal.classList.add('open'); playServiceSound();
        });
      });
    } catch (err) { console.error(err); }
    
  }
    /* ---------- 3.5 КАСТОМНЫЙ ПЛАВНЫЙ СКРОЛЛ ---------- */
  const container = document.getElementById('scroll-container');
  const logoBtn = document.getElementById('logo-btn');
  
  if (container && window.innerWidth > 1024) {
    let targetScroll = container.scrollLeft;
    let currentScroll = container.scrollLeft;
    let isAnimating = false;

    if (logoBtn) {
      logoBtn.addEventListener('click', () => {
        targetScroll = 0;
        if (!isAnimating) { isAnimating = true; requestAnimationFrame(updateScroll); }
      });
    }

    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      targetScroll += e.deltaY * 1.5;
      const maxScroll = container.scrollWidth - container.clientWidth;
      targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));
      if (!isAnimating) { isAnimating = true; requestAnimationFrame(updateScroll); }
    }, { passive: false });

    function updateScroll() {
      currentScroll += (targetScroll - currentScroll) * 0.08;
      container.scrollLeft = currentScroll;
      if (Math.abs(targetScroll - currentScroll) > 0.5) {
        requestAnimationFrame(updateScroll);
      } else {
        container.scrollLeft = targetScroll;
        currentScroll = targetScroll;
        isAnimating = false;
      }
    }
    window.addEventListener('resize', () => {
      targetScroll = container.scrollLeft;
      currentScroll = container.scrollLeft;
    });
  } else {
    if (logoBtn) {
      logoBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }


  /* ---------- 4. МОДАЛКИ ---------- */
  const bookingModal = document.getElementById('booking-modal');
  const serviceModal = document.getElementById('service-modal');
  const carModal = document.getElementById('car-modal');
  const allModals = [bookingModal, serviceModal, carModal];
  const closeAllModals = () => allModals.forEach(m => m && m.classList.remove('open'));
  
  document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', closeAllModals));
  allModals.forEach(modal => modal && modal.addEventListener('click', (e) => { if (e.target === modal) closeAllModals(); }));
  document.querySelectorAll('.open-booking').forEach(btn => {
    btn.addEventListener('click', () => { closeAllModals(); bookingModal.classList.add('open'); playModalSound(); });
  });

  function attachCarClickEvents() {
    document.querySelectorAll('.gallery-item').forEach(item => {
      item.addEventListener('click', () => {
        const car = carsData[item.dataset.index];
        if (!car) return;
        playCarSound();
        document.getElementById('cm-img').src = car.img;
        document.getElementById('cm-title').textContent = car.title;
        document.getElementById('cm-spec').textContent = car.spec;
        document.getElementById('cm-engine').textContent = car.engine;
        document.getElementById('cm-hp').textContent = car.hp;
        document.getElementById('cm-weight').textContent = car.weight;
        document.getElementById('cm-drive').textContent = car.drive;
        document.getElementById('cm-accel').textContent = car.accel;
        document.getElementById('cm-desc').textContent = car.description;
        closeAllModals(); carModal.classList.add('open');
      });
    });
  }

  /* ---------- 5. КОНФИГУРАТОР ---------- */
  const baseCarSelect = document.getElementById('base-car');
  const partsCheckboxes = document.querySelectorAll('.part-row input[type="checkbox"]');
  const totalHpEl = document.getElementById('total-hp');
  const totalPriceEl = document.getElementById('total-price');

  function calculateConfig() {
    if (!baseCarSelect) return;
    const opt = baseCarSelect.options[baseCarSelect.selectedIndex];
    let hp = parseInt(opt.dataset.hp) || 0, price = parseInt(opt.dataset.price) || 0;
    partsCheckboxes.forEach(cb => { if (cb.checked) { hp += parseInt(cb.dataset.hp) || 0; price += parseInt(cb.dataset.price) || 0; } });
    totalHpEl.textContent = hp;
    totalPriceEl.textContent = price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }
  if (baseCarSelect) {
    baseCarSelect.addEventListener('change', calculateConfig);
    partsCheckboxes.forEach(cb => cb.addEventListener('change', calculateConfig));
    calculateConfig();
  }

  const btnBookBuild = document.getElementById('btn-book-build');
  if (btnBookBuild) {
    btnBookBuild.addEventListener('click', () => {
      const carName = baseCarSelect.options[baseCarSelect.selectedIndex].text;
      let parts = [];
      partsCheckboxes.forEach(cb => { if (cb.checked) parts.push(cb.nextElementSibling.textContent.split('(')[0].trim()); });
      let buildText = carName + (parts.length ? ` + ${parts.join(' + ')}` : '') + ` (${totalHpEl.textContent} HP)`;
      closeAllModals(); bookingModal.classList.add('open'); playModalSound();
      const modalCarInput = bookingModal.querySelectorAll('input[type="text"]')[1];
      if (modalCarInput) modalCarInput.value = buildText;
    });
  }

  /* ---------- 6. АВТОРИЗАЦИЯ И ПРОФИЛЬ ---------- */
  let authToken = localStorage.getItem('kanjo_token') || null;
  const authModal = document.getElementById('auth-modal');
  const profileModal = document.getElementById('profile-modal');
  const profileBtn = document.getElementById('profile-btn');
  const loginBtn = document.getElementById('login-btn');
  const authForm = document.getElementById('auth-form');
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const authError = document.getElementById('auth-error');
  let isLoginMode = true;

  function updateAuthUI() {
    if (authToken) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (profileBtn) profileBtn.style.display = 'flex';
    } else {
      if (loginBtn) loginBtn.style.display = 'block';
      if (profileBtn) profileBtn.style.display = 'none';
    }
  }
  updateAuthUI();

  if (loginBtn) {
    loginBtn.addEventListener('click', () => { authModal.classList.add('open'); });
  }

  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      isLoginMode = tab.dataset.mode === 'login';
      authSubmitBtn.textContent = isLoginMode ? 'ВОЙТИ' : 'СОЗДАТЬ АККАУНТ';
      authError.style.display = 'none';
    });
  });

  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      authError.style.display = 'none';
      authSubmitBtn.textContent = 'ЗАГРУЗКА...';
      authSubmitBtn.disabled = true;
      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;
      const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';

      try {
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка');
        authToken = data.token;
        localStorage.setItem('kanjo_token', authToken);
        updateAuthUI();
        authModal.classList.remove('open');
        authForm.reset();
      } catch (err) {
        authError.textContent = err.message;
        authError.style.display = 'block';
      } finally {
        authSubmitBtn.textContent = isLoginMode ? 'ВОЙТИ' : 'СОЗДАТЬ АККАУНТ';
        authSubmitBtn.disabled = false;
      }
    });
  }

  if (profileBtn) {
    profileBtn.addEventListener('click', async () => {
      profileModal.classList.add('open');
      const list = document.getElementById('profile-bookings-list');
      list.innerHTML = '<p style="color:var(--grey);">Загрузка...</p>';
      try {
        const res = await fetch('/api/user/bookings', { headers: { 'Authorization': `Bearer ${authToken}` } });
        if (res.status === 401) { localStorage.removeItem('kanjo_token'); authToken = null; updateAuthUI(); profileModal.classList.remove('open'); return; }
        const bookings = await res.json();
        if (bookings.length === 0) { list.innerHTML = '<p style="color:var(--grey);">У вас пока нет заявок.</p>'; return; }
        list.innerHTML = bookings.map(b => `
          <div class="profile-card">
            <div class="profile-card-info"><h4>${b.car}</h4><p>Имя: ${b.name} | Тел: ${b.phone}</p></div>
            <div class="profile-card-date">${new Date(b.created_at).toLocaleString('ru-RU')}</div>
          </div>
        `).join('');
      } catch (err) { list.innerHTML = '<p style="color:red;">Ошибка загрузки</p>'; }
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('kanjo_token');
      authToken = null; updateAuthUI(); profileModal.classList.remove('open');
    });
  }
  const closeProfileBtn = document.querySelector('.close-profile');
  if (closeProfileBtn) closeProfileBtn.addEventListener('click', () => profileModal.classList.remove('open'));

  /* ---------- 7. ОТПРАВКА ЗАЯВКИ ---------- */
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;
    const nameInput = e.target.querySelector('input[type="text"]');
    const phoneInput = e.target.querySelector('input[type="tel"]');
    const carInput = e.target.querySelectorAll('input[type="text"]')[1];
    const data = {
      name: nameInput ? nameInput.value : 'Не указано',
      phone: phoneInput ? phoneInput.value : 'Не указан',
      car: carInput ? carInput.value : 'Не указана'
    };
    btn.textContent = 'SENDING...'; btn.style.opacity = '0.7';
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const response = await fetch('/api/book', { method: 'POST', headers: headers, body: JSON.stringify(data) });
      if (!response.ok) throw new Error('Ошибка');
      btn.textContent = 'SUCCESS!'; btn.style.background = '#fff'; btn.style.color = '#000';
      playModalSound();
      setTimeout(() => { e.target.reset(); btn.textContent = originalText; btn.style.background = ''; btn.style.color = ''; btn.style.opacity = '1'; closeAllModals(); }, 2000);
    } catch (error) {
      btn.textContent = 'ERROR!'; btn.style.background = 'red'; btn.style.color = '#fff';
      setTimeout(() => { btn.textContent = originalText; btn.style.background = ''; btn.style.color = ''; btn.style.opacity = '1'; }, 2000);
    }
  };
  const bookingForm = document.getElementById('booking-form');
  if (bookingForm) bookingForm.addEventListener('submit', handleFormSubmit);
  const inlineBookingForm = document.getElementById('inline-booking-form');
  if (inlineBookingForm) inlineBookingForm.addEventListener('submit', handleFormSubmit);

  /* ---------- 8. ЗАГРУЗКА КОНТЕНТА ---------- */
  loadServices();
  loadCars();

})();