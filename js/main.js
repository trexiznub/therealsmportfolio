/* =====================================================================
   main.js — motion and behaviour (GSAP 3 + ScrollTrigger + SplitText)
   The 3D models live in scene.js.

   Architecture
   - Native scrolling. Nothing hijacks the wheel or touch.
   - gsap.matchMedia() holds three motion sets: desktop (≥1101px), tablet+phone
     (≤1100px) and reduced motion. Each set is reverted automatically when the
     viewport or preference changes, which is the vanilla-JS equivalent of
     @gsap/react's useGSAP cleanup.
   - Hidden start states are only ever set by GSAP, so without JavaScript
     (or if GSAP fails to load) every section is plain, readable content.

   1 helpers + guards   2 loader → intro   3 hero background   4 nav, menu, progress
   5 lazy video        6 motion sets      7 counters, misc
   8 contact form → Google Sheet
   ===================================================================== */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- 1. guards ---------- */
  const G = window.gsap, ST = window.ScrollTrigger, Split = window.SplitText;
  if (!G || !ST) {                                   // library failed to load: show the plain page
    root.classList.remove('js');
    const l = $('#loader'); if (l) l.remove();
    return;
  }
  G.registerPlugin(ST); if (Split) G.registerPlugin(Split);
  G.defaults({ ease: 'expo.out', duration: 1.1 });
  ST.config({ ignoreMobileResize: true });

  /* ---------- 2. loader → intro ---------- */
  let seen = false;
  try { seen = sessionStorage.getItem('uj-seen') === '1'; sessionStorage.setItem('uj-seen', '1'); } catch (e) {}
  const minTime = reduce ? 0 : seen ? 600 : 2300;
  const loader = $('#loader'), pctEl = $('#ldPct'), barEl = $('#ldBar'), words = $$('.ld-hello span');
  document.body.style.overflow = 'hidden';

  const fontLink = $('#gfonts');
  const cssLoaded = !fontLink || fontLink.sheet ? Promise.resolve() : new Promise(r => {
    fontLink.addEventListener('load', r, { once: true }); fontLink.addEventListener('error', r, { once: true });
  });
  const fonts = cssLoaded.then(() => document.fonts
    ? Promise.all(['700 1em "Inter Tight"', '400 1em "Inter"', 'italic 1em "Instrument Serif"'].map(f => document.fonts.load(f))).catch(() => {}) : null);
  const heroImg = $('.hero-photo img');
  const photoReady = new Promise(res => {
    if (!heroImg) return res();
    const done = () => (heroImg.decode ? heroImg.decode().catch(() => {}) : Promise.resolve()).then(res);
    if (heroImg.complete && heroImg.naturalWidth) done();
    else { heroImg.addEventListener('load', done, { once: true }); heroImg.addEventListener('error', res, { once: true }); }
  });

  let real = 0; [fonts, photoReady].forEach(p => p.then(() => { real += 0.5; }));
  const t0 = performance.now(); let shown = 0, ticking = true;
  (function tick(now) {
    const target = Math.min(real, Math.min((now - t0) / Math.max(minTime, 1), 1)) * 100;
    shown += (target - shown) * 0.12; if (target === 100 && shown > 99.4) shown = 100;
    pctEl.textContent = Math.floor(shown); barEl.style.transform = `scaleX(${shown / 100})`;
    if (ticking) requestAnimationFrame(tick);
  })(t0);
  if (!seen && !reduce) words.forEach((w, i) => setTimeout(() => { if (i) words[i - 1].classList.replace('on', 'off'); w.classList.add('on'); }, 120 + i * 680));
  else words[words.length - 1].classList.add('on');

  // Intro: built now (while the loader covers the page), played when it lifts.
  const intro = G.timeline({ paused: true, defaults: { ease: 'expo.out' } });
  function buildIntro() {
    if (reduce) return;
    const name = $('#heroName');
    if (Split) {
      const sp = Split.create(name, { type: 'chars' });   // no per-letter masks: they crop descenders and italic overhang
      intro.from(sp.chars, { yPercent: 150, rotate: 6, duration: 1.4, stagger: 0.035 }, 0.15);
    } else intro.from(name, { yPercent: 40, opacity: 0, duration: 1.2 }, 0.15);
    intro.from('.hero-photo', { y: 90, opacity: 0, scale: 1.04, duration: 1.8 }, 0)
      .from('.hero-halo', { scale: 0.6, opacity: 0, rotate: -40, duration: 2.2 }, 0)
      .from('[data-hero]', { y: 22, opacity: 0, duration: 1.1, stagger: 0.08 }, 0.6)
      .from('#nav', { y: -30, opacity: 0, duration: 1, clearProps: 'transform,opacity' }, 0.7);
  }
  buildIntro();

  Promise.race([Promise.all([fonts, photoReady, wait(minTime)]), wait(6000)]).then(() => {
    real = 1;
    const lift = () => {
      if (shown < 100) return requestAnimationFrame(lift);
      ticking = false;
      $('.hero-photo').classList.add('sharp');
      G.to(loader, {
        yPercent: -100, duration: reduce ? 0 : 1.1, ease: 'expo.inOut', delay: 0.15,
        onStart: () => intro.play(0.0),
        onComplete: () => { loader.remove(); document.body.style.overflow = ''; ST.refresh(); }
      });
    };
    lift();
  });

  /* ---------- 3. hero background: drifting contour lines (wind over terrain) ---------- */
  (function contours() {
    const c = $('#heroBg'); if (!c) return;
    const ctx = c.getContext('2d');
    let W = 0, H = 0, raf = 0, on = true, mx = 0.5, my = 0.5, tmx = 0.5, tmy = 0.5;
    const fit = () => { const d = Math.min(devicePixelRatio || 1, 2), r = c.getBoundingClientRect(); W = r.width; H = r.height; c.width = W * d; c.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    const lines = () => (W < 700 ? 26 : 44);
    function draw(t) {
      raf = 0;
      mx += (tmx - mx) * 0.04; my += (tmy - my) * 0.04;
      ctx.clearRect(0, 0, W, H);
      const n = lines(), seg = W < 700 ? 60 : 110;
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1), base = H * (0.12 + k * 0.9);
        ctx.beginPath();
        for (let s = 0; s <= seg; s++) {
          const x = (s / seg) * W, u = s / seg;
          const bump = Math.exp(-Math.pow((u - mx) / 0.18, 2)) * 40 * (1 - Math.abs(k - my));
          const y = base + Math.sin(u * 5.2 + k * 3.1 + t * 0.00018) * 18 * (0.4 + k)
                         + Math.sin(u * 11 - t * 0.00025 + k * 7) * 6 - bump;
          s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        const green = k > 0.72;
        ctx.strokeStyle = green ? `rgba(52,210,123,${0.05 + (k - 0.72) * 0.35})` : `rgba(238,238,232,${0.035 + k * 0.05})`;
        ctx.lineWidth = 1; ctx.stroke();
      }
      if (on && !reduce && !document.hidden) raf = requestAnimationFrame(draw);
    }
    fit(); draw(0);
    new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !raf) raf = requestAnimationFrame(draw); }).observe(c);
    addEventListener('resize', () => { fit(); if (!raf) raf = requestAnimationFrame(draw); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && on && !raf) raf = requestAnimationFrame(draw); });
    if (fine) $('#top').addEventListener('mousemove', e => { tmx = e.clientX / innerWidth; tmy = e.clientY / innerHeight; });
  })();

  /* ---------- 4. nav, menu, progress ---------- */
  const nav = $('#nav'), burger = $('#burger'), menu = $('#menu');
  ST.create({
    start: 0, end: 'max',
    onUpdate: self => {
      nav.classList.toggle('solid', self.scroll() > 40);
      nav.classList.toggle('away', self.direction === 1 && self.scroll() > innerHeight * 0.8 && !menu.classList.contains('open'));
    }
  });
  G.to('#progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
  const links = $$('.nav-links a');
  $$('main section[id]').forEach(sec => ST.create({
    trigger: sec, start: 'top 50%', end: 'bottom 50%',
    onToggle: s => { if (s.isActive) links.forEach(l => l.classList.toggle('on', l.getAttribute('href') === '#' + sec.id)); }
  }));

  function setMenu(open) {
    burger.classList.toggle('open', open); menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', !open); document.body.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- 5. lazy video: load only near the viewport, play only while visible ---------- */
  const small = matchMedia('(max-width: 800px)').matches || (navigator.connection && navigator.connection.saveData);
  function loadVideo(v) {
    if (v.dataset.loaded) return;
    v.dataset.loaded = '1';
    v.src = (small && v.dataset.srcSmall) || v.dataset.src;
    v.load();
  }
  const near = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { loadVideo(e.target); near.unobserve(e.target); } }), { rootMargin: '600px 0px' });
  const vis = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting && !reduce) { const p = v.play(); if (p) p.catch(() => {}); } else v.pause();
  }), { threshold: 0.15 });
  $$('video.lazy-video').forEach(v => { near.observe(v); vis.observe(v); });

  /* ---------- 6. motion sets ---------- */
  const mm = G.matchMedia();
  mm.add({
    desk: '(min-width: 1101px) and (prefers-reduced-motion: no-preference)',
    small: '(max-width: 1100px) and (prefers-reduced-motion: no-preference)',
    phone: '(max-width: 800px) and (prefers-reduced-motion: no-preference)',
    still: '(prefers-reduced-motion: reduce)'
  }, ctx => {
    const { desk, phone, still } = ctx.conditions;

    if (still) {                                     // reduced motion: content only, jump video shows its poster frame
      const jv = $('#jumpVideo'); if (jv) loadVideo(jv);
      return;
    }

    /* hero: drifts apart as you scroll away; subtle parallax with the cursor on desktop */
    const heroOut = G.timeline({ scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom top', scrub: true } });
    heroOut.to('.hero-photo', { yPercent: 14, scale: 0.94, ease: 'none' }, 0)
      .to('.hero-halo', { scale: 1.35, opacity: 0, rotate: 30, ease: 'none' }, 0)
      .to('.hero-type', { yPercent: -40, opacity: 0.1, ease: 'none' }, 0)
      .to(['.hero-meta', '.scroll-cue'], { opacity: 0, y: -40, ease: 'none' }, 0)
      .to('.hero-bg', { opacity: 0.25, ease: 'none' }, 0);
    if (desk && fine) {
      const px = G.quickTo('.hero-photo img', 'x', { duration: 1.2, ease: 'power3' });
      const nx = G.quickTo('.hero-name', 'x', { duration: 1.6, ease: 'power3' });
      const onMove = e => { const u = e.clientX / innerWidth - 0.5; px(u * -18); nx(u * 24); };
      $('#top').addEventListener('mousemove', onMove);
      ctx.add(() => () => $('#top').removeEventListener('mousemove', onMove));
    }

    /* manifesto: words light up as you read (pinned on larger screens) */
    if (Split) {
      const mf = Split.create('#mfText', { type: 'words', wordsClass: 'w' });
      G.set(mf.words, { opacity: 0.14 });
      G.to(mf.words, {
        opacity: 1, stagger: 0.12, ease: 'none',
        scrollTrigger: phone
          ? { trigger: '#mfText', start: 'top 80%', end: 'bottom 45%', scrub: true }
          : { trigger: '.manifesto', start: 'top top', end: '+=140%', pin: true, scrub: true }
      });
    }

    /* section headings: lines rise out of a mask */
    $$('[data-lines]').forEach(h => {
      if (!Split) return G.from(h, { y: 50, opacity: 0, scrollTrigger: { trigger: h, start: 'top 85%' } });
      Split.create(h, {
        type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true,
        onSplit: self => G.from(self.lines, { yPercent: 105, duration: 1.3, stagger: 0.09, scrollTrigger: { trigger: h, start: 'top 85%' } })
      });
    });
    ST.batch('[data-up]', {
      start: 'top 88%', once: true,
      onEnter: b => G.from(b, { y: 40, opacity: 0, duration: 1.2, stagger: 0.08, overwrite: true })
    });

    /* about: the portrait opens like an aperture, image settles inside */
    G.fromTo('#aboutPhoto .mask', { clipPath: 'inset(16% 14% 16% 14% round 24px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 24px)', ease: 'none',
      scrollTrigger: { trigger: '#aboutPhoto', start: 'top 90%', end: 'center 50%', scrub: true }
    });
    G.fromTo('#aboutPhoto img', { scale: 1.3, yPercent: -6 }, {
      scale: 1, yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: '#aboutPhoto', start: 'top bottom', end: 'bottom top', scrub: true }
    });
    G.from('.stat', { y: 40, opacity: 0, stagger: 0.07, duration: 1.2, scrollTrigger: { trigger: '#stats', start: 'top 85%' } });

    /* work: pinned horizontal showcase on desktop, stacked reveals elsewhere */
    const track = $('#workTrack');
    if (desk) {
      $('#work').classList.add('h-scroll');
      ctx.add(() => () => $('#work').classList.remove('h-scroll'));
      const dist = () => track.scrollWidth - innerWidth;
      const slide = G.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: '#workPin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 }
      });
      G.to('#workBar', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '#workPin', start: 'top top', end: () => '+=' + dist(), scrub: true, invalidateOnRefresh: true } });
      $$('.proj', track).forEach(card => {
        const body = $('.proj-body', card), vis = $('.proj-visual', card);
        if (body) G.from(body.children, { x: 80, opacity: 0, stagger: 0.06, duration: 1, scrollTrigger: { trigger: card, containerAnimation: slide, start: 'left 85%' } });
        if (vis) G.fromTo(vis, { scale: 0.92 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: slide, start: 'left right', end: 'left 30%', scrub: true } });
      });
    } else {
      $$('.proj', track).forEach(card => G.from(card, { y: 70, opacity: 0, duration: 1.2, scrollTrigger: { trigger: card, start: 'top 88%' } }));
    }

    /* experience: the rail fills as you read; each milestone lights up */
    G.to('#tlFill', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#timeline', start: 'top 65%', end: 'bottom 65%', scrub: true } });
    $$('[data-tl]').forEach(item => {
      ST.create({ trigger: item, start: 'top 65%', onToggle: s => item.classList.toggle('on', s.isActive || s.progress === 1), onLeaveBack: () => item.classList.remove('on'), onEnter: () => item.classList.add('on') });
      G.from(item.children, { y: 36, opacity: 0, stagger: 0.07, duration: 1.1, scrollTrigger: { trigger: item, start: 'top 82%' } });
    });

    /* skills: each row draws its bar, then the tags land */
    $$('[data-sk]').forEach(row => {
      G.fromTo(row, { '--sk-p': 0 }, { '--sk-p': 1, ease: 'none', scrollTrigger: { trigger: row, start: 'top 92%', end: 'top 55%', scrub: true } });
      G.from([$('.sk-n', row), $('.sk-head', row)], { y: 34, opacity: 0, stagger: 0.08, duration: 1, scrollTrigger: { trigger: row, start: 'top 86%' } });
      G.from($$('.chips li', row), { y: 18, opacity: 0, stagger: 0.035, duration: 0.7, scrollTrigger: { trigger: row, start: 'top 82%' } });
    });

    /* education / certifications: rows slide in */
    ST.batch('[data-row]', { start: 'top 90%', once: true, onEnter: b => G.from(b, { x: -40, opacity: 0, stagger: 0.08, duration: 1.1, overwrite: true }) });

    /* leadership: each card draws its top rule, then the text follows */
    $$('[data-lead]').forEach((card, i) => {
      G.fromTo(card, { '--line-p': 0 }, { '--line-p': 1, ease: 'none', scrollTrigger: { trigger: card, start: 'top 90%', end: 'top 55%', scrub: true } });
      G.from(card.children, { y: 30, opacity: 0, stagger: 0.07, delay: i * 0.08, scrollTrigger: { trigger: card, start: 'top 85%' } });
    });

    /* UJ Moto A: a card opens to full screen around the footage */
    if (!phone) {
      const motoTl = G.timeline({ scrollTrigger: { trigger: '#motoPin', start: 'top top', end: '+=180%', pin: true, scrub: true, anticipatePin: 1 } });
      motoTl.fromTo('#motoFrame', { '--ci': '22svh', '--cx': '30vw', '--cr': '28px' }, { '--ci': '0svh', '--cx': '0vw', '--cr': '0px', ease: 'power2.inOut', duration: 1 }, 0)
        .fromTo('#motoFrame video', { scale: 1.3 }, { scale: 1, ease: 'power2.inOut', duration: 1 }, 0)
        .fromTo('#motoWord', { scale: 0.75 }, { scale: 1.35, ease: 'none', duration: 1 }, 0)
        .to('#motoWord', { scale: 0.46, y: () => -innerHeight * 0.31, duration: 0.35, ease: 'power2.inOut' }, 0.72)
        .from('#motoCopy > *', { y: 50, opacity: 0, stagger: 0.06, duration: 0.4, ease: 'power3.out' }, 0.95)
        .to({}, { duration: 0.35 });
    } else {
      G.fromTo('#motoFrame', { clipPath: 'inset(10% 8% 10% 8% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 24px)', ease: 'none', scrollTrigger: { trigger: '#motoFrame', start: 'top 92%', end: 'center 55%', scrub: true } });
      G.from('#motoCopy > *', { y: 30, opacity: 0, stagger: 0.07, scrollTrigger: { trigger: '#motoCopy', start: 'top 88%' } });
    }

    /* UJ Moto B: scroll scrubs through the jump (desktop/tablet); phones simply loop it */
    const jv = $('#jumpVideo');
    if (jv && !phone) {
      loadVideo(jv); jv.removeAttribute('loop'); jv.pause();
      const wordsEls = $$('.jump-words li');
      const state = { t: 0 };
      let pending = false, dur = 0;
      const seek = () => { pending = false; if (jv.readyState >= 1 && dur) { try { jv.currentTime = Math.min(dur - 0.05, state.t * dur); } catch (e) {} } };
      const metaReady = () => { dur = jv.duration || 0; seek(); };
      if (jv.readyState >= 1) metaReady(); else jv.addEventListener('loadedmetadata', metaReady, { once: true });
      G.to(state, {
        t: 1, ease: 'none',
        scrollTrigger: {
          trigger: '#jump', start: 'top top', end: '+=220%', pin: '.jump-stage', scrub: 0.6, anticipatePin: 1,
          onUpdate: s => {
            G.set('#jumpBar', { scaleX: s.progress });
            const k = Math.min(wordsEls.length - 1, Math.floor(s.progress * wordsEls.length));
            wordsEls.forEach((w, i) => w.classList.toggle('on', i <= k && s.progress > 0.02));
          }
        },
        onUpdate: () => { if (!pending) { pending = true; requestAnimationFrame(seek); } }
      });
    } else if (jv) {
      jv.classList.add('lazy-video'); jv.setAttribute('loop', ''); near.observe(jv); vis.observe(jv);
    }

    /* UJ Moto C: photo and video drift at different speeds */
    $$('[data-par]').forEach(el => G.fromTo(el, { yPercent: -parseFloat(el.dataset.par) }, { yPercent: parseFloat(el.dataset.par), ease: 'none', scrollTrigger: { trigger: '.moto-duo', start: 'top bottom', end: 'bottom top', scrub: true } }));

    /* contact + footer: the name rises from the floor */
    if (Split) {
      Split.create('#footName', {
        type: 'chars',
        onSplit: self => G.from(self.chars, { yPercent: 150, stagger: 0.03, duration: 1.3, scrollTrigger: { trigger: '.foot', start: 'top 85%' } })
      });
    }
  });

  // layout settles after fonts and images: recalculate trigger positions once
  fonts.then(() => ST.refresh());
  addEventListener('load', () => ST.refresh());

  /* ---------- 7. counters ---------- */
  function countUp(el) {
    const target = parseInt(el.dataset.count, 10), prefix = el.dataset.prefix || '', suffix = el.dataset.suffix || '';
    const show = v => { el.innerHTML = (prefix ? '<span class="pre">' + prefix.trim() + '</span>' : '') + Math.round(v).toLocaleString('en-US') + suffix; };
    if (reduce) return show(target);
    const o = { v: 0 }; show(0);
    G.to(o, { v: target, duration: 2, ease: 'power3.out', onUpdate: () => show(o.v) });
  }
  $$('[data-count]').forEach(el => ST.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => countUp(el) }));
  /* ---------- 8. contact form → Google Sheet (backend/contact-form.gs) ---------- */
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
    form.classList.add('sending'); sendBtn.disabled = true; sendLabel.textContent = 'Sending…'; setStatus('');
    try {
      // URL-encoded body = "simple" request, so Apps Script answers without a CORS preflight
      const res = await fetch(endpoint, { method: 'POST', body: data });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) throw new Error(out.error || 'Request failed');
      form.reset(); form.classList.add('sent');
      setStatus('Thanks! Your message is in. I’ll get back to you soon.', 'ok');
    } catch (err) {
      setStatus(err.message && err.message !== 'Request failed' && !/fetch/i.test(err.message)
        ? err.message : 'Couldn’t send right now. Please try again, or email me directly.', 'error');
    } finally {
      form.classList.remove('sending'); sendBtn.disabled = false; sendLabel.textContent = 'Send Message';
    }
  });
  form.addEventListener('input', e => { e.target.closest('.form-field')?.classList.remove('invalid'); form.classList.remove('sent'); });
})();
