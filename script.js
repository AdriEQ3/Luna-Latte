(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const motion = root.classList.contains('motion'); // false si se pide "reducir movimiento"
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Año del pie ---------- */
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Mapa (solo carga Google Maps tras aceptar) ---------- */
  const mapPreview = $('#mapPreview');
  const mapConsent = $('#mapConsent');
  $('#loadMap')?.addEventListener('click', () => {
    if (!mapPreview || mapPreview.querySelector('iframe')) return;
    const frame = document.createElement('iframe');
    frame.title = 'Mapa interactivo de Luna & Latte en Ciudad Lineal, Madrid';
    frame.loading = 'eager';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.allowFullscreen = true;
    frame.src = 'https://maps.google.com/maps?q=Luna%20%26%20Latte%2C%20Calle%20Torrecilla%20del%20Puerto%205%2C%2028043%20Madrid&z=16&output=embed';
    mapPreview.append(frame);
    mapConsent?.remove();
  });
  $('#declineMap')?.addEventListener('click', () => mapConsent?.remove());

  /* ---------- Marca el día de hoy en el horario (hora de Madrid) ---------- */
  try {
    const wd = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Europe/Madrid' }).format(new Date());
    const today = { Sun: '0', Mon: '1', Tue: '2', Wed: '3', Thu: '4', Fri: '5', Sat: '6' }[wd];
    $$('.hours [data-day]').forEach((row) => {
      if (row.dataset.day.split(' ').includes(today)) row.classList.add('is-today');
    });
  } catch (e) { /* sin Intl: no se marca el día */ }

  /* ---------- Menú móvil ---------- */
  const toggle = $('.menu-toggle');
  const setMenu = (open) => {
    root.classList.toggle('is-menu-open', open);
    toggle?.setAttribute('aria-expanded', String(open));
    toggle?.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  };
  toggle?.addEventListener('click', () => setMenu(!root.classList.contains('is-menu-open')));
  $$('#menu a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  addEventListener('resize', () => { if (innerWidth > 820) setMenu(false); });

  /* Con "reducir movimiento" la web queda estática y solo hace lo anterior */
  if (!motion) return;

  /* ---------- Intro ---------- */
  const loader = $('#loader');
  let seen = false;
  try { seen = sessionStorage.getItem('ll-intro') === '1'; } catch (e) { /* ignorar */ }
  const ready = () => root.classList.add('is-ready');
  if (!loader || seen) {
    loader?.remove();
    requestAnimationFrame(() => requestAnimationFrame(ready));
  } else {
    root.classList.add('is-loading');
    setTimeout(() => {
      loader.classList.add('is-done');
      root.classList.remove('is-loading');
      ready();
      try { sessionStorage.setItem('ll-intro', '1'); } catch (e) { /* ignorar */ }
    }, 2100);
    setTimeout(() => loader.remove(), 3500);
  }

  /* ---------- Revelados al entrar en pantalla ---------- */
  $$('[data-stagger]').forEach((group) => {
    $$('[data-reveal]', group).forEach((el, i) => el.style.setProperty('--d', `${Math.min(i, 8) * 80}ms`));
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
    $$('[data-reveal], .shutter, .reveal-lines').forEach((el) => io.observe(el));
  } else {
    $$('[data-reveal], .shutter, .reveal-lines').forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Texto que se ilumina palabra a palabra ---------- */
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const wordGroups = $$('[data-words]').map((el) => {
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    el.innerHTML = `<span class="sr-only">${esc(text)}</span><span aria-hidden="true">${text.split(' ').map((w) => `<span class="w">${esc(w)}</span>`).join(' ')}</span>`;
    return { el, words: $$('.w', el) };
  });

  /* ---------- Recorrido horizontal de "El lugar" ---------- */
  const hs = $('.hscroll');
  const track = $('.htrack', hs);
  const hbar = $('.hprogress span', hs);
  let hsOn = false;
  let hsDist = 0;
  const layoutH = () => {
    const on = innerWidth >= 901;
    if (on !== hsOn) {
      hsOn = on;
      hs.classList.toggle('hs-on', on);
      if (!on) { track.style.transform = ''; hs.style.height = ''; }
    }
    if (on) {
      hsDist = Math.max(0, track.offsetWidth - innerWidth);
      hs.style.height = `${hsDist + innerHeight}px`;
    }
  };

  /* ---------- Marquesina ---------- */
  const tTrack = $('.ticker-track');
  let tGroupW = 0;
  let tx = 0;
  let tDir = 1;
  if (tTrack) {
    const group = $('.ticker-group', tTrack);
    for (let i = 0; i < 3; i++) tTrack.append(group.cloneNode(true));
  }
  const measureTicker = () => { tGroupW = tTrack ? $('.ticker-group', tTrack).offsetWidth : 0; };

  /* ---------- Cursor discreto ---------- */
  const cursor = $('.cursor');
  let cx = -100, cy = -100, mx = -100, my = -100;
  if (cursor && finePointer) {
    addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      cursor.classList.add('is-on');
    }, { passive: true });
    document.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));
    document.addEventListener('pointerover', (e) => {
      cursor.classList.toggle('is-active', !!e.target.closest('a, button, .hero-photo, .menu-image, .hp-photo'));
    });
    $$('.button, .nav-cta').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px, ${(e.clientY - r.top - r.height / 2) * 0.32}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  } else if (cursor) {
    cursor.remove();
  }

  /* ---------- Scroll suavizado (solo con ratón) ---------- */
  const smooth = finePointer;
  if (smooth) root.classList.add('smooth');
  let current = scrollY;
  let target = scrollY;
  const maxScroll = () => Math.max(0, root.scrollHeight - innerHeight);
  const goTo = (y) => {
    if (smooth) target = clamp(y, 0, maxScroll());
    else scrollTo({ top: y, behavior: 'smooth' });
  };
  if (smooth) {
    addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.defaultPrevented || root.classList.contains('is-menu-open')) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 32;
      else if (e.deltaMode === 2) dy *= innerHeight;
      target = clamp(target + dy, 0, maxScroll());
    }, { passive: false });
    // Si el scroll lo mueve otra cosa (teclado, barra lateral…), nos sincronizamos
    addEventListener('scroll', () => {
      if (Math.abs(scrollY - current) > 2) { current = target = scrollY; }
    }, { passive: true });
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = document.getElementById(id.slice(1));
    if (!el) return;
    e.preventDefault();
    goTo(el.getBoundingClientRect().top + scrollY);
    history.replaceState(null, '', id);
  });

  /* ---------- Efectos ligados al scroll ---------- */
  const progress = $('.progress');
  const header = $('.topbar');
  const heroCopy = $('.hero-copy');
  const parallax = $$('[data-parallax]').map((img) => ({
    img,
    wrap: img.parentElement,
    speed: parseFloat(img.dataset.parallax) || 0.1,
    axis: img.dataset.axis || 'y'
  }));
  let lastY = -1;
  let lastHeaderY = scrollY;
  let vel = 0;

  const update = (y) => {
    const max = maxScroll();
    root.classList.toggle('is-scrolled', y > 60);
    if (progress) progress.style.transform = `scaleX(${max ? clamp(y / max, 0, 1) : 0})`;

    // Cabecera: se oculta al bajar, vuelve al subir
    if (header) {
      header.classList.toggle('is-solid', y > 40);
      const dy = y - lastHeaderY;
      if (Math.abs(dy) > 6) {
        header.classList.toggle('is-hidden', dy > 0 && y > 260);
        lastHeaderY = y;
      }
    }

    // Hero: el texto se desliza más lento que la página
    if (heroCopy) heroCopy.style.transform = innerWidth > 900 && y < innerHeight * 1.3 ? `translate3d(0, ${y * 0.12}px, 0)` : '';

    // Recorrido horizontal
    if (hsOn) {
      const r = hs.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, hs.offsetHeight - innerHeight), 0, 1);
      track.style.transform = `translate3d(${-hsDist * p}px, 0, 0)`;
      if (hbar) hbar.style.transform = `scaleX(${p})`;
    }

    // Paralaje de imágenes (vertical, u horizontal dentro del recorrido)
    parallax.forEach(({ img, wrap, speed, axis }) => {
      const r = wrap.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200 || r.right < -200 || r.left > innerWidth + 200) return;
      if (axis === 'x' && hsOn) {
        const off = clamp((r.left + r.width / 2 - innerWidth / 2) * -speed, -r.width * 0.07, r.width * 0.07);
        img.style.transform = `translate3d(${off}px, 0, 0)`;
      } else {
        const sp = axis === 'x' ? 0.08 : speed;
        const off = clamp((r.top + r.height / 2 - innerHeight / 2) * -sp, -r.height * 0.07, r.height * 0.07);
        img.style.transform = `translate3d(0, ${off}px, 0)`;
      }
    });

    // Palabras que se iluminan
    wordGroups.forEach(({ el, words }) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const p = clamp((innerHeight * 0.9 - r.top) / (innerHeight * 0.5 + r.height * 0.2), 0, 1);
      const n = Math.ceil(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    });
  };

  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(64, now - last);
    last = now;

    if (smooth) {
      const t = 1 - Math.pow(1 - 0.11, dt / 16.67);
      const prev = current;
      current = lerp(current, target, t);
      if (Math.abs(target - current) < 0.15) current = target;
      if (current !== prev) scrollTo(0, current);
    }

    const y = scrollY;
    const dy = lastY < 0 ? 0 : y - lastY;
    vel = lerp(vel, dy, 0.12);
    if (y !== lastY) { update(y); lastY = y; }

    // Marquesina: se acelera con el scroll y cambia de sentido al subir
    if (tTrack && tGroupW) {
      if (Math.abs(vel) > 0.5) tDir = vel > 0 ? 1 : -1;
      tx -= (0.6 + Math.min(Math.abs(vel), 60) * 0.2) * tDir * (dt / 16.67);
      if (tx <= -tGroupW) tx += tGroupW;
      if (tx > 0) tx -= tGroupW;
      tTrack.style.transform = `translate3d(${tx}px, 0, 0)`;
    }

    // Cursor
    if (cursor && finePointer) {
      cx = lerp(cx, mx, 0.2);
      cy = lerp(cy, my, 0.2);
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    }
    requestAnimationFrame(frame);
  };

  const relayout = () => {
    layoutH();
    measureTicker();
    if (smooth) { current = target = scrollY; }
    lastY = -1;
  };
  addEventListener('resize', relayout);
  addEventListener('load', relayout);
  document.fonts?.ready.then(relayout);
  layoutH();
  measureTicker();
  requestAnimationFrame(frame);
})();
