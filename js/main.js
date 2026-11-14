/* =====================================================================
   main.js — page behaviour (3D models live in scene.js)
   1 helpers  2 loading screen, welcome, photo stage  3 reveals  4 counters + bars
   5 nav, progress, menu  6 back to top  7 contact form → Google Sheet
   ===================================================================== */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- 2. loading screen + welcome ---------- */
  // Progress follows real work: fonts and the hero portrait. The screen stays at least
  // ~2.4s on a first visit (so the greeting can play) and ~0.7s on repeat visits in the
  // same browser session; it never stays longer than 6s even on a very slow connection.
  $$('.hi').forEach((el, i) => el.style.setProperty('--d', 700 + i * 110 + 'ms'));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  let seen = false;
  try { seen = sessionStorage.getItem('uj-seen') === '1'; sessionStorage.setItem('uj-seen', '1'); } catch (e) {}
  const minTime = reduce ? 0 : seen ? 700 : 2400;
  const loader = $('#loader'), pctEl = $('#ldPct'), barEl = $('#ldBar'), words = $$('.ld-hello span');
  document.body.classList.add('loading');

  const fontLink = $('#gfonts');
  const cssLoaded = !fontLink || fontLink.sheet ? Promise.resolve() : new Promise(r => {
    fontLink.addEventListener('load', r, { once: true }); fontLink.addEventListener('error', r, { once: true });
  });
  const fonts = cssLoaded.then(() => document.fonts ? document.fonts.load('600 1em "DM Sans"').catch(() => {}) : null);

  const fig = $('#heroFig'), photo = $('.hero-photo');
  const photoReady = new Promise(res => {
    if (!photo) return res();
    const done = () => (photo.decode ? photo.decode().catch(() => {}) : Promise.resolve()).then(res);
    if (photo.complete && photo.naturalWidth) done();
    else { photo.addEventListener('load', done, { once: true }); photo.addEventListener('error', res, { once: true }); }
  });

  let real = 0;
  [fonts, photoReady].forEach(p => p.then(() => { real += 0.5; }));
  const t0 = performance.now();
  let shown = 0, finished = false;
  (function tick(now) {
    // time-based ease toward the real progress, so the counter always moves smoothly
    const timeShare = Math.min((now - t0) / Math.max(minTime, 1), 1);
    const target = Math.min(real, timeShare) * 100;
    shown += (target - shown) * 0.12;
    if (target === 100 && shown > 99.4) shown = 100;
    pctEl.textContent = Math.floor(shown);
    barEl.style.transform = `scaleX(${shown / 100})`;
    if (!finished) requestAnimationFrame(tick);
  })(t0);

  // greeting words: Hello → Namaste → Welcome
  if (!seen && !reduce) {
    words.forEach((w, i) => setTimeout(() => {
      if (i) words[i - 1].classList.replace('on', 'off');
      w.classList.add('on');
    }, 150 + i * 700));
  } else words[words.length - 1].classList.add('on');

  Promise.race([Promise.all([fonts, photoReady, wait(minTime)]), wait(6000)]).then(() => {
    real = 1;
    const close = () => {
      if (shown < 100) return requestAnimationFrame(close);
      finished = true;
      setTimeout(() => {
        root.classList.add('ready');          // loader wipes up, hero welcome animation starts
        fig.classList.add('is-sharp');
        document.body.classList.remove('loading');
        setTimeout(() => { if (loader) loader.remove(); }, 1200);
      }, 180);
    };
    close();
  });

  // photo stage: tilts toward the cursor, soft light follows it
  if (fine && !reduce && fig) {
    fig.addEventListener('mousemove', e => {
      const r = fig.getBoundingClientRect(), u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
      fig.classList.add('live');
      fig.style.setProperty('--ry', (u - 0.5) * 8 + 'deg');
      fig.style.setProperty('--rx', (0.5 - v) * 6 + 'deg');
      fig.style.setProperty('--mx', u * 100 + '%'); fig.style.setProperty('--my', v * 100 + '%');
    });
    fig.addEventListener('mouseleave', () => { fig.classList.remove('live'); fig.style.setProperty('--ry', '0deg'); fig.style.setProperty('--rx', '0deg'); });
  }
  // the stage lies back slightly and stands up as you scroll into it
  const stageIO = () => {
    if (!fig || fig.classList.contains('live')) return;
    const r = fig.getBoundingClientRect(), p = Math.max(0, Math.min(1, (innerHeight - r.top) / (innerHeight * 0.9)));
    fig.style.setProperty('--rx', (1 - p) * 14 + 'deg');
  };

  // marquee: duplicate the list once so the loop is seamless
  $$('.marquee ul').forEach(ul => { ul.insertAdjacentHTML('beforeend', ul.innerHTML.replace(/<li>/g, '<li aria-hidden="true">')); });

  /* ---------- 3. reveals ---------- */
  const revealIO = new IntersectionObserver(entries => {
    entries.filter(e => e.isIntersecting).forEach((e, i) => {
      e.target.style.setProperty('--d', Math.min(i, 5) * 90 + 'ms');
      e.target.classList.add('in');
      revealIO.unobserve(e.target);
      setTimeout(() => e.target.style.setProperty('--d', '0ms'), 1500);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach(el => revealIO.observe(el));

  /* ---------- 4. counters + bars ---------- */
  function countUp(el) {
    const target = parseInt(el.dataset.count, 10), prefix = el.dataset.prefix || '', suffix = el.dataset.suffix || '';
    const show = v => { el.innerHTML = (prefix ? '<span class="pre">' + prefix.trim() + '</span>' : '') + v.toLocaleString('en-US') + suffix; };
    if (reduce) return show(target);
    const start = performance.now(), dur = 1600;
    (function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      show(Math.round((1 - Math.pow(1 - p, 4)) * target));
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  }
  const countIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { countUp(e.target); countIO.unobserve(e.target); } }), { threshold: 0.6 });
  $$('[data-count]').forEach(c => countIO.observe(c));

  const barIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    $$('.bar span', e.target).forEach((b, i) => { b.style.setProperty('--d', i * 100 + 'ms'); b.style.width = b.dataset.w + '%'; });
    barIO.unobserve(e.target);
  }), { threshold: 0.3 });
  $$('.skill-cat').forEach(c => barIO.observe(c));

  /* ---------- 5. nav, progress, menu ---------- */
  const nav = $('#nav'), progress = $('#progress'), links = $$('.navlinks a');
  let queued = false, lastY = 0;
  const menu = $('#mobilemenu');
  function onScroll() {
    queued = false;
    const max = root.scrollHeight - root.clientHeight;
    progress.style.transform = `scaleX(${max > 0 ? root.scrollTop / max : 0})`;
    nav.classList.toggle('hide', root.scrollTop > lastY && root.scrollTop > 500 && !menu.classList.contains('open'));
    lastY = root.scrollTop;
    stageIO();
  }
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  const secIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -45% 0px' });
  $$('main section[id], header[id]').forEach(s => secIO.observe(s));

  const burger = $('#hamburger');
  function setMenu(open) {
    burger.classList.toggle('open', open); menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  matchMedia('(min-width: 901px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  /* ---------- 6. back to top ---------- */
  $('#totop').addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  /* ---------- 7. contact form → Google Sheet (backend/contact-form.gs) ---------- */
  const form = $('#contactForm');
  const statusEl = $('.form-status', form);
  const sendBtn = $('button[type="submit"]', form);
  const sendLabel = $('.btn-label', sendBtn);

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = 'form-status' + (kind ? ' is-' + kind : '');
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (form.classList.contains('sending')) return;

    // Highlight the first empty/invalid field instead of the browser's default bubble
    const bad = $$('input[required], textarea[required]', form).find(f => !f.value.trim() || !f.checkValidity());
    $$('.form-field', form).forEach(f => f.classList.remove('invalid'));
    if (bad) {
      bad.closest('.form-field').classList.add('invalid');
      bad.focus();
      return setStatus(bad.type === 'email' && bad.value.trim() ? 'Please check your email address.' : 'Please fill in every field.', 'error');
    }

    const endpoint = form.dataset.endpoint;
    if (!endpoint) return setStatus('The contact form isn’t connected yet. Please email me directly.', 'error');

    const data = new URLSearchParams(new FormData(form));
    data.set('page', location.href);

    form.classList.add('sending');
    sendBtn.disabled = true;
    sendLabel.textContent = 'Sending…';
    setStatus('');
    try {
      // URL-encoded body = "simple" request, so Apps Script answers without a CORS preflight
      const res = await fetch(endpoint, { method: 'POST', body: data });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) throw new Error(out.error || 'Request failed');
      form.reset();
      form.classList.add('sent');
      setStatus('Thanks! Your message is in. I’ll get back to you soon.', 'ok');
    } catch (err) {
      setStatus(err.message && err.message !== 'Request failed' && !/fetch/i.test(err.message)
        ? err.message
        : 'Couldn’t send right now. Please try again, or email me directly.', 'error');
    } finally {
      form.classList.remove('sending');
      sendBtn.disabled = false;
      sendLabel.textContent = 'Send Message';
    }
  });
  form.addEventListener('input', e => {
    e.target.closest('.form-field')?.classList.remove('invalid');
    form.classList.remove('sent');
  });
})();
