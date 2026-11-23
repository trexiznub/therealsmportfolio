/* =====================================================================
   main.js — motion and behaviour (GSAP 3 + ScrollTrigger + SplitText)
   The 3D models live in scene.js.

   - Native scrolling; nothing hijacks the wheel or touch.
   - gsap.matchMedia() holds the motion sets (desktop, tablet/phone, reduced motion);
     each reverts itself when the viewport or preference changes.
   - Hidden start states are only ever set by GSAP, so without JavaScript
     (or if GSAP fails to load) every section is plain, readable content.

   1 helpers + guards   2 loader → intro   3 clock   4 nav, menu, progress, page colour
   5 lazy video   6 motion sets   7 counters   8 small hovers
   9 contact form → Google Sheet
   ===================================================================== */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // wrap every word (or letter) of an element in a span, keeping nested tags such as <span class="hl">
  function split(el, unit = 'w') {
    const out = [];
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(part));
          const pieces = unit === 'c' ? [...part] : [part];
          pieces.forEach(p => { const s = document.createElement('span'); s.className = unit === 'c' ? 'char' : 'w'; s.textContent = p; frag.appendChild(s); out.push(s); });
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !n.classList.contains('avatar')) walk(n);
    });
    walk(el);
    return out;
  }

  /* ---------- 3. clock (Pune time) — runs even if GSAP fails ---------- */
  const clocks = $$('#clock, #clock2');
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
  const tickClock = () => { const t = fmt.format(new Date()); clocks.forEach(c => { c.textContent = t; }); };
  tickClock(); setInterval(tickClock, 10000);

  /* ---------- 1. guards ---------- */
  const G = window.gsap, ST = window.ScrollTrigger, Split = window.SplitText;
  if (!G || !ST) {                                   // library failed to load: show the plain page
    root.classList.remove('js');
    const l = $('#loader'); if (l) l.remove();
    setupForm();
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
    ? Promise.all(['400 1em "Inter"', '600 1em "Inter"', '700 1em "Inter"', '400 1em "Geist Mono"'].map(f => document.fonts.load(f))).catch(() => {}) : null);
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
    pctEl.textContent = String(Math.floor(shown)).padStart(3, '0'); barEl.style.transform = `scaleX(${shown / 100})`;
    if (ticking) requestAnimationFrame(tick);
  })(t0);
  if (!seen && !reduce) words.forEach((w, i) => setTimeout(() => { if (i) words[i - 1].classList.replace('on', 'off'); w.classList.add('on'); }, 120 + i * 680));
  else words[words.length - 1].classList.add('on');

  // Intro: built while the loader covers the page, played when it lifts.
  const intro = G.timeline({ paused: true, defaults: { ease: 'expo.out' } });
  const wordSpan = $('#heroWord > span[aria-hidden]');
  const heroChars = wordSpan ? split(wordSpan, 'c') : [];
  if (wordSpan) wordSpan.classList.add('split');
  if (!reduce) {
    intro.from(heroChars, { yPercent: 70, opacity: 0, filter: 'blur(24px)', duration: 1.6, stagger: 0.07 }, 0.1)
      .from('#heroGlow', { opacity: 0, scale: 1.2, duration: 2.4 }, 0)
      .from('#heroPhoto', { yPercent: 18, opacity: 0, duration: 1.8 }, 0.35)
      .from('[data-hero]', { y: 24, opacity: 0, duration: 1.1, stagger: 0.09 }, 0.8)
      .from('.fl', { y: 50, scale: 0.85, opacity: 0, filter: 'blur(10px)', duration: 1.4, stagger: 0.14, ease: 'back.out(1.4)', clearProps: 'filter' }, 1.0)
      .from('.code .cl', { opacity: 0, x: -10, duration: 0.5, stagger: 0.16, ease: 'power2.out' }, 1.5)
      .from('#nav', { y: -30, opacity: 0, duration: 1, clearProps: 'transform,opacity' }, 0.9);
  }

  Promise.race([Promise.all([fonts, photoReady, wait(minTime)]), wait(6000)]).then(() => {
    real = 1;
    const lift = () => {
      if (shown < 100) return requestAnimationFrame(lift);
      ticking = false;
      G.to(loader, {
        clipPath: 'inset(0 0 100% 0)', duration: reduce ? 0 : 1.1, ease: 'expo.inOut', delay: 0.15,
        onStart: () => intro.play(0),
        onComplete: () => { loader.remove(); document.body.style.overflow = ''; ST.refresh(); }
      });
    };
    lift();
  });

  /* ---------- 4. nav, menu, progress, page colour ---------- */
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
  // the whole page changes colour as each section reaches the middle of the screen
  $$('[data-theme]:not(body)').forEach(sec => ST.create({
    trigger: sec, start: 'top 55%', end: 'bottom 55%',
    onToggle: s => { if (s.isActive) document.body.dataset.theme = sec.dataset.theme; }
  }));
  ST.create({ trigger: '#top', start: 'top top', end: 'bottom 55%', onEnterBack: () => { document.body.dataset.theme = 'ink'; } });

  function setMenu(open) {
    burger.classList.toggle('open', open); menu.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', !open); document.body.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });
  matchMedia('(min-width: 861px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

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
  // split once, outside matchMedia, so a resize never splits the same text twice
  const sayWords = $('#aboutSay') ? split($('#aboutSay')) : [];
  const scriptChars = $$('[data-script]').map(h => split(h, 'c'));

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

    /* hero: the name sinks, the portrait rises, the glow fades as you scroll away */
    const heroOut = G.timeline({ scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom top', scrub: true } });
    heroOut.to('#heroWord', { yPercent: 30, scale: 0.92, opacity: 0.2, ease: 'none' }, 0)
      .to('#heroPhoto', { yPercent: -8, ease: 'none' }, 0)
      .to('.hero-foot', { y: -60, opacity: 0, ease: 'none' }, 0)
      .to('#heroGlow', { yPercent: -18, ease: 'none' }, 0)
      .to('.hero-badge > *', { opacity: 0, ease: 'none' }, 0);
    // floating cards rise at different speeds (deeper = faster), so the hero comes apart in layers
    $$('.fl').forEach(f => heroOut.to(f, { yPercent: -60 * parseFloat(f.dataset.depth || 1), ease: 'none' }, 0).to($('.fl-in', f), { opacity: 0, ease: 'none' }, 0));
    if (desk && fine) {                              // the dark glow, the name and the cards lean toward the cursor
      const gx = G.quickTo('#heroGlow', 'x', { duration: 2, ease: 'power3' });
      const wx = G.quickTo('#heroWord', 'x', { duration: 1.6, ease: 'power3' });
      const px = G.quickTo('#heroPhoto', 'x', { duration: 1.4, ease: 'power3' });
      const cards = $$('.fl').map(f => ({ d: parseFloat(f.dataset.depth || 1), x: G.quickTo($('.fl-p', f), 'x', { duration: 1.2, ease: 'power3' }), y: G.quickTo($('.fl-p', f), 'y', { duration: 1.2, ease: 'power3' }) }));
      const onMove = e => {
        const u = e.clientX / innerWidth - 0.5, v = e.clientY / innerHeight - 0.5;
        gx(u * 120); wx(u * -26); px(u * 18);
        cards.forEach(c => { c.x(u * 34 * c.d); c.y(v * 24 * c.d); });
      };
      $('#top').addEventListener('mousemove', onMove);
      ctx.add(() => () => $('#top').removeEventListener('mousemove', onMove));
    }

    /* headings: lines rise out of a mask */
    $$('[data-lines]').forEach(h => {
      if (!Split) return G.from(h, { y: 50, opacity: 0, scrollTrigger: { trigger: h, start: 'top 88%' } });
      Split.create(h, {
        type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true,
        onSplit: self => G.from(self.lines, { yPercent: 110, duration: 1.4, stagger: 0.1, scrollTrigger: { trigger: h, start: 'top 88%' } })
      });
    });
    ST.batch('[data-up]', {
      start: 'top 90%', once: true,
      onEnter: b => G.from(b, { y: 40, opacity: 0, duration: 1.2, stagger: 0.08, overwrite: true })
    });

    /* section headings: letters rise into place one by one */
    scriptChars.forEach(chars => G.from(chars, {
      yPercent: 60, opacity: 0, filter: 'blur(8px)', duration: 1.1, stagger: 0.035,
      scrollTrigger: { trigger: chars[0].parentElement, start: 'top 88%' }
    }));

    /* work: each screen starts bent back, straightens as it reaches the middle, then leans away */
    $$('[data-wk]').forEach(card => {
      const bend = $('.wk-bend', card);
      G.timeline({ scrollTrigger: { trigger: card.querySelector('.wk-screen'), start: 'top bottom', end: 'bottom top', scrub: 0.6 } })
        .fromTo(bend, { '--rx': '38deg', '--sk': '-5deg', '--sc': 0.86 }, { '--rx': '0deg', '--sk': '0deg', '--sc': 1, ease: 'power2.out', duration: 0.5 })
        .to(bend, { '--rx': '-16deg', '--sk': '3deg', '--sc': 0.94, ease: 'power1.in', duration: 0.5 });
      G.from($('.wk-meta', card).children, { y: 30, opacity: 0, stagger: 0.06, duration: 1, scrollTrigger: { trigger: card, start: 'top 80%' } });
    });

    /* about: the sentence lights up word by word; the red part comes into focus */
    if (sayWords.length) {
      const hl = sayWords.filter(w => w.closest('.hl'));
      const plain = sayWords.filter(w => !w.closest('.hl'));
      G.set(plain, { opacity: 0.14 });
      G.set(hl, { opacity: 0.1, filter: 'blur(12px)' });
      const tl = G.timeline({ scrollTrigger: { trigger: '#aboutSay', start: phone ? 'top 85%' : 'top 75%', end: phone ? 'bottom 55%' : 'bottom 45%', scrub: true } });
      tl.to(plain, { opacity: 1, stagger: 0.1, ease: 'none', duration: 0.3 })
        .to(hl, { opacity: 1, filter: 'blur(0px)', stagger: 0.12, ease: 'none', duration: 0.4 });
      G.from('.avatar', { scale: 0, rotate: -90, duration: 1.4, ease: 'back.out(1.6)', scrollTrigger: { trigger: '#aboutSay', start: 'top 80%' } });
    }

    /* rows (experience, education, notes) slide up in turn */
    ST.batch('[data-row]', { start: 'top 92%', once: true, onEnter: b => G.from(b, { y: 36, opacity: 0, stagger: 0.08, duration: 1.1, overwrite: true }) });
    ST.batch('[data-cell]', { start: 'top 92%', once: true, onEnter: b => G.from(b, { y: 50, opacity: 0, stagger: 0.07, duration: 1.2, overwrite: true }) });

    /* UJ Moto A: a card opens to full screen around the footage */
    if (!phone) {
      const motoTl = G.timeline({ scrollTrigger: { trigger: '#motoPin', start: 'top top', end: '+=180%', pin: true, scrub: true, anticipatePin: 1 } });
      motoTl.fromTo('#motoFrame', { '--ci': '20svh', '--cx': '28vw', '--cr': '18px' }, { '--ci': '0svh', '--cx': '0vw', '--cr': '0px', ease: 'power2.inOut', duration: 1 }, 0)
        .fromTo('#motoFrame video', { scale: 1.3 }, { scale: 1, ease: 'power2.inOut', duration: 1 }, 0)
        .fromTo('#motoWord', { scale: 0.7 }, { scale: 1.25, ease: 'none', duration: 1 }, 0)
        .to('#motoWord', { scale: 0.5, y: () => -innerHeight * 0.3, duration: 0.35, ease: 'power2.inOut' }, 0.72)
        .from('#motoCopy > *', { y: 50, opacity: 0, stagger: 0.06, duration: 0.4, ease: 'power3.out' }, 0.95)
        .to({}, { duration: 0.35 });
    } else {
      G.fromTo('#motoFrame', { clipPath: 'inset(10% 8% 10% 8% round 18px)' }, { clipPath: 'inset(0% 0% 0% 0% round 18px)', ease: 'none', scrollTrigger: { trigger: '#motoPin', start: 'top 92%', end: 'center 55%', scrub: true } });
      G.from('#motoCopy > *', { y: 30, opacity: 0, stagger: 0.07, scrollTrigger: { trigger: '#motoCopy', start: 'top 92%' } });
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
      $$('.jump-words li').forEach(li => li.classList.add('on'));
    }

    /* UJ Moto C: photo and video drift at different speeds */
    $$('[data-par]').forEach(el => G.fromTo(el.querySelector('img, video'), { yPercent: -parseFloat(el.dataset.par) * 0.6 }, { yPercent: parseFloat(el.dataset.par) * 0.6, ease: 'none', scrollTrigger: { trigger: '.moto-duo', start: 'top bottom', end: 'bottom top', scrub: true } }));
    G.from('.moto-duo figure', { y: 50, opacity: 0, stagger: 0.12, duration: 1.3, scrollTrigger: { trigger: '.moto-duo', start: 'top 85%' } });

    /* contact: the glow breathes in as you arrive; footer name rises */
    G.fromTo('.contact-glow', { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, ease: 'none', scrollTrigger: { trigger: '#contact', start: 'top 90%', end: 'top 20%', scrub: true } });
    G.from('.foot-mark', { yPercent: 60, opacity: 0, duration: 1.4, scrollTrigger: { trigger: '.foot', start: 'top 95%' } });
  });

  // layout settles after fonts and images: recalculate trigger positions
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
  $$('[data-count]').forEach(el => ST.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => countUp(el) }));

  /* ---------- 8. small hovers: "Open ↗" label follows the cursor; skill cells glow under it ---------- */
  if (fine) $$('a.wk-screen, .cell').forEach(el => el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', e.clientX - r.left + 'px'); el.style.setProperty('--my', e.clientY - r.top + 'px');
  }));

  setupForm();

  /* ---------- 9. contact form → Google Sheet (backend/contact-form.gs) ---------- */
  function setupForm() {
    const form = $('#contactForm');
    if (!form) return;
    const statusEl = $('.form-status', form);
    const sendBtn = $('button[type="submit"]', form);
    const sendLabel = $('.btn-label', sendBtn);
    const setStatus = (text, kind) => { statusEl.textContent = text; statusEl.className = 'form-status' + (kind ? ' is-' + kind : ''); };

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
      const fd = new FormData(form);
      const endpoint = form.dataset.endpoint;
      if (!endpoint) {
        // Not connected to the Sheet yet: open the visitor's email app with the message filled in instead.
        const body = `${fd.get('message')}\n\n— ${fd.get('name')} (${fd.get('email')})`;
        location.href = 'mailto:ujwalraj3103@gmail.com?subject=' + encodeURIComponent('Portfolio message from ' + fd.get('name')) + '&body=' + encodeURIComponent(body);
        return setStatus('Your email app should open with the message ready to send.', 'ok');
      }
      const data = new URLSearchParams(fd);
      data.set('page', location.href);
      form.classList.add('sending'); sendBtn.disabled = true; sendLabel.textContent = 'Sending'; setStatus('');
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
        form.classList.remove('sending'); sendBtn.disabled = false; sendLabel.textContent = 'Send message';
      }
    });
    form.addEventListener('input', e => { e.target.closest('.form-field')?.classList.remove('invalid'); form.classList.remove('sent'); });
  }
})();
