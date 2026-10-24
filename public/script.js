(() => {
  'use strict';
    let authToken = localStorage.getItem('kanjo_token') || null;

  /* ---------- 0. ПРЕЛОАДЕР (Разбудить сервер) ---------- */
  window.addEventListener('load', async () => {
    try {
      // Делаем запрос к API, чтобы Render проснулся
      await fetch('/api/cars', { method: 'HEAD', cache: 'no-store' }).catch(() => {});
    } finally {
      const preloader = document.getElementById('preloader');
      if (preloader) {
        setTimeout(() => {
          preloader.classList.add('hidden');
        }, 800);
      }
    }
  });

  /* ---------- 1. АВТОМОБИЛЬНАЯ АУДИО СИСТЕМА ---------- */
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let audioCtx;
  let isSoundOn = true;

  function initAudio() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function createNoiseBuffer() {
    const bufferSize = audioCtx.sampleRate * 1.0;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function playHoverSound() {
    if (!isSoundOn || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.02);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.02);
  }

  function playClickSound() {
    if (!isSoundOn || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.08);
  }

  function playServiceSound() {
    if (!isSoundOn || !audioCtx) return;
    const now = audioCtx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now + i * 0.05);
      gain.gain.setValueAtTime(0.03, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.02);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now + i * 0.05); osc.stop(now + i * 0.05 + 0.02);
    }
  }

  function playModalSound() {
    if (!isSoundOn || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.25);
  }

  function playCarSound() {
    if (!isSoundOn || !audioCtx) return;
    const now = audioCtx.currentTime;
    const engineOsc = audioCtx.createOscillator();
    const engineGain = audioCtx.createGain();
    const engineFilter = audioCtx.createBiquadFilter();
    
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.setValueAtTime(40, now); 
    engineOsc.frequency.linearRampToValueAtTime(120, now + 0.3); 
    engineOsc.frequency.exponentialRampToValueAtTime(60, now + 0.6);
    
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 400;
    engineGain.gain.setValueAtTime(0.2, now);
    engineGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    engineOsc.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(audioCtx.destination);
    engineOsc.start(now); engineOsc.stop(now + 0.7);

    const noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = createNoiseBuffer();
    const tireFilter = audioCtx.createBiquadFilter();
    tireFilter.type = 'bandpass';
    tireFilter.frequency.setValueAtTime(3000, now + 0.1);
    tireFilter.frequency.linearRampToValueAtTime(1000, now + 0.5);
    tireFilter.Q.value = 3; 

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.08, now + 0.2);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    noiseNode.connect(tireFilter);
    tireFilter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    noiseNode.start(now); noiseNode.stop(now + 0.6);
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
    el.addEventListener('mouseenter', playHoverSound);
    el.addEventListener('click', playClickSound);
  });

  /* ---------- 2. Часы ---------- */
  const clockEl = document.getElementById('clock');
  if (clockEl) {
    setInterval(() => {
      const now = new Date();
      clockEl.textContent = `JST ${now.toLocaleTimeString('ru-RU', { hour12: false })}`;
    }, 1000);
  }

    /* ---------- 3. База данных (Услуги и Машины) ---------- */
  
  // Загрузка Услуг
  async function loadServices() {
    const servicesGrid = document.getElementById('services-grid');
    if (!servicesGrid) return;

    try {
      const response = await fetch('/api/services');
      const servicesData = await response.json();

      servicesGrid.innerHTML = servicesData.map(s => `
        <div class="service-card" data-id="${s.id}">
          <span class="num">${s.num}</span>
          <h3>${s.title}</h3>
          <p>${s.short}</p>
        </div>
      `).join('');

      // Вешаем обработчики кликов
      document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => {
          const id = parseInt(card.dataset.id);
          const srv = servicesData.find(s => s.id === id);
          if (!srv) return;
          
          document.getElementById('srv-title').textContent = srv.title;
          document.getElementById('srv-desc').textContent = srv.full_description;
          document.getElementById('srv-price').textContent = srv.price;
          
          // Разбиваем строку работ на массив по переносу строки
          const worksArray = srv.works.split('\n').filter(w => w.trim() !== '');
          document.getElementById('srv-list').innerHTML = worksArray.map(item => `<li>${item}</li>`).join('');
          
          closeAllModals();
          serviceModal.classList.add('open');
          playServiceSound();
        });
      });

    } catch (err) {
      console.error('Ошибка загрузки услуг:', err);
    }
  }

  // Загрузка Машин
  let carsData = []; 

  async function loadCars() {
    const galleryGrid = document.getElementById('gallery-grid');
    if (!galleryGrid) return;

    try {
      const response = await fetch('/api/cars');
      carsData = await response.json();

      galleryGrid.innerHTML = carsData.map((car, index) => `
        <div class="gallery-item" data-index="${index}">
          <img src="${car.img}" alt="${car.title}">
          <div class="gallery-item-info">
            <h4>${car.title}</h4>
            <p>${car.spec}</p>
          </div>
        </div>
      `).join('');

      attachCarClickEvents();
      checkImages();

    } catch (err) {
      console.error('Ошибка загрузки машин:', err);
    }
  }

  function attachCarClickEvents() {
    document.querySelectorAll('.gallery-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = item.dataset.index;
        const car = carsData[index];
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

        closeAllModals();
        carModal.classList.add('open');
      });
    });
  }

  // Запускаем загрузку
  loadServices();
  loadCars();

  /* ---------- 4. Заглушки для фото ---------- */
  const escapeXml = s => s.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
  
  function checkImages() {
    document.querySelectorAll('img').forEach(img => {
      img.addEventListener('error', () => {
        if (img.dataset.placeholder) return;
        const file = escapeXml((img.getAttribute('src') || '').split('/').pop() || 'car.jpg');
        img.dataset.placeholder = file;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="#111"/><text x="400" y="500" text-anchor="middle" font-family="monospace" font-size="24" fill="#888">${file}</text></svg>`;
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      });
      if (img.complete && img.naturalWidth === 0) {
         img.dispatchEvent(new Event('error'));
      }
    });
  }

  /* ---------- 5. Кастомный плавный скролл и кнопка Home ---------- */
  const container = document.getElementById('scroll-container');
  const logoBtn = document.getElementById('logo-btn');
  
  if (container && window.innerWidth > 1024) {
    let targetScroll = container.scrollLeft;
    let currentScroll = container.scrollLeft;
    let isAnimating = false;

    if (logoBtn) {
      logoBtn.addEventListener('click', () => {
        targetScroll = 0;
        if (!isAnimating) {
          isAnimating = true;
          requestAnimationFrame(updateScroll);
        }
      });
    }

    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      targetScroll += e.deltaY * 1.5;
      const maxScroll = container.scrollWidth - container.clientWidth;
      targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));
      if (!isAnimating) {
        isAnimating = true;
        requestAnimationFrame(updateScroll);
      }
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

  /* ---------- 6. Модалки ---------- */
  const bookingModal = document.getElementById('booking-modal');
  const serviceModal = document.getElementById('service-modal');
  const carModal = document.getElementById('car-modal');
  const allModals = [bookingModal, serviceModal, carModal];

  const closeAllModals = () => allModals.forEach(m => m.classList.remove('open'));
  document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', closeAllModals));
  allModals.forEach(modal => modal.addEventListener('click', (e) => { if (e.target === modal) closeAllModals(); }));

  document.querySelectorAll('.open-booking').forEach(btn => {
    btn.addEventListener('click', () => {
      closeAllModals();
      bookingModal.classList.add('open');
      playModalSound();
    });
  });

  // Обработчик для услуг (так как они статичные, вешаем сразу)
  document.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const srv = servicesData.find(s => s.id === id);
      if (!srv) return;
      document.getElementById('srv-title').textContent = srv.title;
      document.getElementById('srv-desc').textContent = srv.full;
      document.getElementById('srv-price').textContent = srv.price;
      document.getElementById('srv-list').innerHTML = srv.list.map(item => `<li>${item}</li>`).join('');
      closeAllModals();
      serviceModal.classList.add('open');
      playServiceSound();
    });
  });

  /* ---------- 7. Конфигуратор ---------- */
  const baseCarSelect = document.getElementById('base-car');
  const partsCheckboxes = document.querySelectorAll('.part-row input[type="checkbox"]');
  const totalHpEl = document.getElementById('total-hp');
  const totalPriceEl = document.getElementById('total-price');

  function calculateConfig() {
    if (!baseCarSelect) return;
    const selectedOption = baseCarSelect.options[baseCarSelect.selectedIndex];
    let baseHp = parseInt(selectedOption.dataset.hp) || 0;
    let basePrice = parseInt(selectedOption.dataset.price) || 0;
    partsCheckboxes.forEach(cb => {
      if (cb.checked) {
        baseHp += parseInt(cb.dataset.hp) || 0;
        basePrice += parseInt(cb.dataset.price) || 0;
      }
    });
    totalHpEl.textContent = baseHp;
    totalPriceEl.textContent = basePrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  if (baseCarSelect) {
    baseCarSelect.addEventListener('change', calculateConfig);
    partsCheckboxes.forEach(cb => cb.addEventListener('change', calculateConfig));
    calculateConfig();
  }

    // Обработка кнопки "Обсудить проект" в конфигураторе
  const btnBookBuild = document.getElementById('btn-book-build');
  if (btnBookBuild) {
    btnBookBuild.addEventListener('click', () => {
      // 1. Получаем название выбранной машины
      const carName = baseCarSelect.options[baseCarSelect.selectedIndex].text;
      
      // 2. Собираем выбранные детали
      let parts = [];
      partsCheckboxes.forEach(cb => {
        if (cb.checked) {
          // Берем текст из label, убираем приписку с лошадиными силами
          const labelText = cb.nextElementSibling.textContent.split('(')[0].trim();
          parts.push(labelText);
        }
      });
      
      // 3. Получаем итоговую мощность
      const totalHp = totalHpEl.textContent;

      // 4. Формируем красивую строку
      let buildText = carName;
      if (parts.length > 0) {
        buildText += ` + ${parts.join(' + ')}`;
      }
      buildText += ` (${totalHp} HP)`;

      // 5. Открываем модалку и вставляем сборку в поле "Машина"
      closeAllModals();
      bookingModal.classList.add('open');
      playModalSound();

      // Находим поле для ввода машины в модалке
      const modalCarInput = bookingModal.querySelectorAll('input[type="text"]')[1];
      if (modalCarInput) {
        modalCarInput.value = buildText;
      }
    });
  }

  /* ---------- 8. Формы (Отправка на сервер) ---------- */
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

    btn.textContent = 'SENDING...';
    btn.style.opacity = '0.7';
    
    try {
           const headers = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const response = await fetch('/api/book', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Ошибка сервера');

      btn.textContent = 'SUCCESS!';
      btn.style.background = '#fff';
      btn.style.color = '#000';
      playModalSound();
      
      setTimeout(() => {
        e.target.reset();
        btn.textContent = originalText;
        btn.style.background = '';
        btn.style.color = '';
        btn.style.opacity = '1';
        closeAllModals();
      }, 2000);

    } catch (error) {
      console.error('Ошибка:', error);
      btn.textContent = 'ERROR!';
      btn.style.background = 'red';
      btn.style.color = '#fff';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.style.color = '';
        btn.style.opacity = '1';
      }, 2000);
    }
  };

  const bookingForm = document.getElementById('booking-form');
  if (bookingForm) bookingForm.addEventListener('submit', handleFormSubmit);

  const inlineBookingForm = document.getElementById('inline-booking-form');
  if (inlineBookingForm) inlineBookingForm.addEventListener('submit', handleFormSubmit);

  /* ---------- 9. Запуск загрузки машин ---------- */
  loadCars();

    // ... (код закрытия профиля)

  const closeProfileBtn = document.querySelector('.close-profile');
  if (closeProfileBtn) {
    closeProfileBtn.addEventListener('click', () => profileModal.classList.remove('open'));
  }

})(); // <--- ВОТ ЭТА СКОБКА ДОЛЖНА БЫТЬ САМОЙ ПОСЛЕДНЕЙ
