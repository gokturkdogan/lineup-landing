/* =============================================================================
   LineUp Landing — interactions
   ========================================================================== */
(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

  /* ---------------------------------------------------------------------------
     NAV — scroll state, mobile menu, scroll progress
  --------------------------------------------------------------------------- */
  const nav = $('#nav');
  const burger = $('#navBurger');
  const mobileMenu = $('#navMobile');
  const progress = $('#scrollProgress');

  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 24);
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (docH > 0 ? (y / docH) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function closeMenu() {
    burger.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('is-open');
  }
  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    mobileMenu.classList.toggle('is-open', !open);
  });
  $$('#navMobile a').forEach((a) => a.addEventListener('click', closeMenu));

  /* ---------------------------------------------------------------------------
     REVEAL on scroll
  --------------------------------------------------------------------------- */
  const heroSection = $('#hero');
  if (heroSection) requestAnimationFrame(() => heroSection.classList.add('is-in'));

  if (prefersReduced) {
    $$('[data-reveal]').forEach((el) => el.classList.add('is-in'));
  } else {
    const revealIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            revealIO.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    $$('[data-reveal]').forEach((el) => revealIO.observe(el));
  }

  /* ---------------------------------------------------------------------------
     COUNT-UP numbers
  --------------------------------------------------------------------------- */
  function animateCount(el) {
    const target = parseInt(el.dataset.count, 10) || 0;
    if (prefersReduced) { el.textContent = String(target); return; }
    const dur = 1400;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  const countIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { animateCount(e.target); countIO.unobserve(e.target); }
      });
    },
    { threshold: 0.5 }
  );
  $$('[data-count]').forEach((el) => countIO.observe(el));

  /* ---------------------------------------------------------------------------
     FEATURE CARDS — spotlight follow
  --------------------------------------------------------------------------- */
  $$('.feature-card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  /* ---------------------------------------------------------------------------
     3D TILT — feature cards (subtle) + FIFA card (strong)
  --------------------------------------------------------------------------- */
  function addTilt(el, max) {
    let raf = null;
    function move(e) {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)` +
          (el.hasAttribute('data-tilt-strong') ? ' scale(1.03)' : '');
      });
    }
    function reset() { if (raf) cancelAnimationFrame(raf); el.style.transform = ''; }
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', reset);
  }
  if (!prefersReduced && window.matchMedia('(pointer:fine)').matches) {
    $$('[data-tilt]').forEach((el) => addTilt(el, 7));
    $$('[data-tilt-strong]').forEach((el) => addTilt(el, 14));
  }

  /* ---------------------------------------------------------------------------
     PARTICLE NETWORK — hero + cta canvases
  --------------------------------------------------------------------------- */
  function createNetwork(canvas, opts) {
    if (!canvas || prefersReduced) return;
    const ctx = canvas.getContext('2d');
    let w, h, dpr, nodes = [], raf, mouse = { x: -9999, y: -9999 };
    const cfg = Object.assign({ density: 0.00009, maxDist: 130, speed: 0.25, color: '28,176,84' }, opts);

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(28, Math.min(110, Math.round(w * h * cfg.density)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * cfg.speed, vy: (Math.random() - 0.5) * cfg.speed,
        r: Math.random() * 1.8 + 0.8,
      }));
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        const dxm = n.x - mouse.x, dym = n.y - mouse.y;
        if (dxm * dxm + dym * dym < 14000) { n.x += dxm * 0.012; n.y += dym * 0.012; }
      }
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < cfg.maxDist) {
            ctx.strokeStyle = `rgba(${cfg.color},${(1 - dist / cfg.maxDist) * 0.28})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = `rgba(${cfg.color},0.7)`;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    canvas.addEventListener('pointerleave', () => { mouse.x = -9999; mouse.y = -9999; });

    let ro;
    function start() { resize(); cancelAnimationFrame(raf); frame(); }
    window.addEventListener('resize', () => { clearTimeout(ro); ro = setTimeout(resize, 200); });

    // pause when offscreen
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { if (!raf) frame(); }
        else { cancelAnimationFrame(raf); raf = null; }
      });
    }, { threshold: 0 });
    io.observe(canvas);

    start();
  }
  createNetwork($('#netCanvas'), { color: '28,176,84', maxDist: 140 });
  createNetwork($('#ctaCanvas'), { color: '120,220,160', density: 0.00007, maxDist: 120 });

  /* ---------------------------------------------------------------------------
     INTERACTIVE PITCH — draggable tokens
  --------------------------------------------------------------------------- */
  const pitch = $('#pitch');
  if (pitch) {
    const formation = [
      // home (top half) — % positions
      { t: 'home', n: 'GK', x: 50, y: 12 },
      { t: 'home', n: 'DF', x: 26, y: 26 },
      { t: 'home', n: 'DF', x: 74, y: 26 },
      { t: 'home', n: 'MF', x: 38, y: 38 },
      { t: 'home', n: 'FW', x: 62, y: 38 },
      // away (bottom half)
      { t: 'away', n: 'GK', x: 50, y: 88 },
      { t: 'away', n: 'DF', x: 26, y: 74 },
      { t: 'away', n: 'DF', x: 74, y: 74 },
      { t: 'away', n: 'MF', x: 38, y: 62 },
      { t: 'away', n: 'FW', x: 62, y: 62 },
    ];

    formation.forEach((p) => {
      const el = document.createElement('div');
      el.className = `token token--${p.t}`;
      el.textContent = p.n;
      el.style.left = p.x + '%';
      el.style.top = p.y + '%';
      pitch.appendChild(el);

      let dragging = false, pid = null;
      el.addEventListener('pointerdown', (e) => {
        dragging = true; pid = e.pointerId; el.setPointerCapture(pid);
        el.classList.add('is-drag');
      });
      el.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const r = pitch.getBoundingClientRect();
        let x = ((e.clientX - r.left) / r.width) * 100;
        let y = ((e.clientY - r.top) / r.height) * 100;
        x = Math.max(5, Math.min(95, x));
        y = Math.max(6, Math.min(94, y));
        el.style.left = x + '%';
        el.style.top = y + '%';
      });
      function end() { dragging = false; el.classList.remove('is-drag'); if (pid != null) { try { el.releasePointerCapture(pid); } catch (_) {} pid = null; } }
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    });
  }

  /* ---------------------------------------------------------------------------
     CTA form (decorative — no backend yet)
  --------------------------------------------------------------------------- */
  const form = $('#ctaForm');
  if (form) {
    const note = $('#ctaNote');
    const input = $('#ctaEmail');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = (input.value || '').trim();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      if (!ok) {
        note.style.color = '#ff9b9b';
        note.textContent = 'Geçerli bir e-posta gir.';
        input.focus();
        return;
      }
      note.style.color = '';
      note.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5L16 9"/></svg>Teşekkürler! Lansmanda ilk sen haberdar olacaksın.';
      form.reset();
    });
  }

  /* ---------------------------------------------------------------------------
     Dashboard mock — live countdown ring
  --------------------------------------------------------------------------- */
  const dashRing = $('[data-countdown]');
  if (dashRing && !prefersReduced) {
    const target = new Date();
    target.setDate(target.getDate() + ((6 - target.getDay() + 7) % 7 || 7));
    target.setHours(19, 0, 0, 0);
    if (target <= new Date()) target.setDate(target.getDate() + 7);

    const hEl = dashRing.querySelector('.ui__ring-h');
    const mEl = dashRing.querySelector('.ui__ring-m');
    const sEl = dashRing.querySelector('.ui__ring-s');
    const pad = (n) => String(n).padStart(2, '0');

    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      const total = Math.floor(diff / 1000);
      if (hEl) hEl.textContent = pad(Math.floor(total / 3600));
      if (mEl) mEl.textContent = pad(Math.floor((total % 3600) / 60));
      if (sEl) sEl.textContent = pad(total % 60);
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------------------------------------------------------------------------
     Goal kings — tab switch
  --------------------------------------------------------------------------- */
  const SCORERS_DATA = {
    goals: {
      label: 'gol',
      podium: [
        { rank: 2, name: 'Emre', pos: 'OOS', val: 11, initial: 'E' },
        { rank: 1, name: 'Göktürk', pos: 'SNT', val: 14, initial: 'G', champion: true },
        { rank: 3, name: 'Can', pos: 'SNT', val: 9, initial: 'C' },
      ],
      list: [
        { rank: 4, name: 'Barış', pos: 'DEF', val: 7, initial: 'B', pct: 50 },
        { rank: 5, name: 'Mert', pos: 'ORT', val: 6, initial: 'M', pct: 43 },
        { rank: 6, name: 'Ali', pos: 'SNT', val: 5, initial: 'A', pct: 36 },
        { rank: 7, name: 'Kerem', pos: 'OOS', val: 4, initial: 'K', pct: 29 },
      ],
    },
    assists: {
      label: 'asist',
      podium: [
        { rank: 2, name: 'Mert', pos: 'ORT', val: 10, initial: 'M' },
        { rank: 1, name: 'Can', pos: 'SNT', val: 12, initial: 'C', champion: true },
        { rank: 3, name: 'Göktürk', pos: 'SNT', val: 8, initial: 'G' },
      ],
      list: [
        { rank: 4, name: 'Emre', pos: 'OOS', val: 6, initial: 'E', pct: 50 },
        { rank: 5, name: 'Barış', pos: 'DEF', val: 5, initial: 'B', pct: 42 },
        { rank: 6, name: 'Ali', pos: 'SNT', val: 3, initial: 'A', pct: 25 },
        { rank: 7, name: 'Kerem', pos: 'OOS', val: 2, initial: 'K', pct: 17 },
      ],
    },
  };

  const scorersPodium = $('#scorersPodium');
  const scorersList = $('#scorersList');
  const scorersTabs = $$('[data-scorers-tab]');

  function renderScorers(type) {
    const data = SCORERS_DATA[type];
    if (!data || !scorersPodium || !scorersList) return;

    scorersPodium.querySelectorAll('.scorer-podium').forEach((el, i) => {
      const p = data.podium[i];
      if (!p) return;
      el.classList.toggle('is-champion', !!p.champion);
      el.querySelector('.scorer-podium__rank').textContent = p.rank;
      el.querySelector('.scorer-podium__avatar').textContent = p.initial;
      el.querySelector('.scorer-podium__name').textContent = p.name;
      el.querySelector('.scorer-podium__pos').textContent = p.pos;
      const statEl = el.querySelector('.scorer-podium__stat');
      const start = prefersReduced ? p.val : '0';
      statEl.innerHTML = `<b data-count="${p.val}">${start}</b> ${data.label}`;
    });

    scorersList.innerHTML = data.list.map((r) => `
      <li class="scorer-row">
        <span class="scorer-row__rank">${r.rank}</span>
        <div class="scorer-row__avatar" aria-hidden="true">${r.initial}</div>
        <div class="scorer-row__info">
          <span class="scorer-row__name">${r.name}</span>
          <span class="scorer-row__pos">${r.pos}</span>
        </div>
        <div class="scorer-row__bar-wrap" aria-hidden="true"><span class="scorer-row__bar" style="--pct:${r.pct}%"></span></div>
        <span class="scorer-row__val"><b data-count="${r.val}">0</b></span>
      </li>
    `).join('');

    scorersPodium.querySelectorAll('[data-count]').forEach((el) => animateCount(el));
    scorersList.querySelectorAll('[data-count]').forEach((el) => animateCount(el));
  }

  scorersTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const type = tab.dataset.scorersTab;
      scorersTabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
      });
      renderScorers(type);
    });
  });

  /* ---------------------------------------------------------------------------
     Smooth anchor scroll with nav offset
  --------------------------------------------------------------------------- */
  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 56;
      window.scrollTo({ top, behavior: prefersReduced ? 'auto' : 'smooth' });
    });
  });
})();
