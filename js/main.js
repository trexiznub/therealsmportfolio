/* =====================================================================
   Ujwal Raj K. P — portfolio behaviour
     1. helpers
     2. scroll: progress bar, nav state, active link
     3. mobile menu
     4. reveals: split headings, staggered fade-ups, counters, bars
     5. hero: intro sequence + portrait (loading, scan reveal, parallax, slices)
     6. cursor + magnetic buttons (desktop only)
     7. placeholders (resume, form, back-to-top)
   ===================================================================== */
(() => {
  'use strict';

  /* ---------- 1. helpers ---------- */
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- 2. scroll ---------- */
  const progress = $('#progress');
  const nav = $('#nav');
  let scrollQueued = false;
  function onScroll() {
    scrollQueued = false;
    const max = root.scrollHeight - root.clientHeight;
    progress.style.transform = `scaleX(${max > 0 ? root.scrollTop / max : 0})`;
    nav.classList.toggle('scrolled', root.scrollTop > 10);
  }
  addEventListener('scroll', () => {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  const navLinks = $$('.navlinks a');
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = e.target.id;
        navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + id));
      }
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  $$('section[id], header[id]').forEach(s => sectionObserver.observe(s));

  /* ---------- 3. mobile menu ---------- */
  const burger = $('#hamburger');
  const menu = $('#mobilemenu');
  function setMenu(open) {
    burger.classList.toggle('open', open);
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  matchMedia('(min-width: 901px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  /* ---------- 4. reveals ---------- */
  // Headings: split into words so each one rises through a mask. Text is untouched.
  $$('.sec-title, .contact-title').forEach(h => {
    const text = h.textContent.trim();
    h.setAttribute('aria-label', text);
    h.textContent = '';
    text.split(/\s+/).forEach((word, i, all) => {
      const w = document.createElement('span');
      const s = document.createElement('span');
      w.className = 'w';
      w.setAttribute('aria-hidden', 'true');
      s.textContent = word;
      s.style.setProperty('--i', i);
      w.appendChild(s);
      h.appendChild(w);
      if (i < all.length - 1) h.appendChild(document.createTextNode(' '));
    });
  });

  // Everything else fades up; items that enter together are staggered.
  const revealObserver = new IntersectionObserver(entries => {
    entries.filter(e => e.isIntersecting).forEach((e, i) => {
      e.target.style.setProperty('--i', Math.min(i, 5));
      e.target.classList.add('in');
      revealObserver.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach(el => revealObserver.observe(el));

  // Stat counters
  function countUp(el) {
    const target = parseInt(el.dataset.count, 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    if (reduce) { el.textContent = prefix + target + suffix; return; }
    const start = performance.now(), dur = 1400;
    (function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = prefix + Math.floor((1 - Math.pow(1 - p, 3)) * target) + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = prefix + target + suffix;
    })(start);
  }
  const countObserver = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { countUp(e.target); countObserver.unobserve(e.target); } });
  }, { threshold: 0.4 });
  $$('.num[data-count]').forEach(c => countObserver.observe(c));

  // Skill bars
  const barObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.style.width = e.target.dataset.w + '%'; barObserver.unobserve(e.target); }
    });
  }, { threshold: 0.4 });
  $$('.bar span[data-w]').forEach(b => barObserver.observe(b));

  /* ---------- 5. hero ---------- */
  const fig = $('#heroFig');
  const wrap = $('#heroPhoto');
  const img = $('.hero-photo', fig);
  const word = $('.hero-word');

  // 5a. text intro waits for the fonts (hard limit 1.5s) so the name never swaps typeface mid-animation.
  //     The font stylesheet is non-blocking, so first paint (and the portrait placeholder) never waits for it.
  const fontLink = $('#gfonts');
  const cssLoaded = !fontLink || fontLink.sheet ? Promise.resolve() : new Promise(r => {
    fontLink.addEventListener('load', r, { once: true });
    fontLink.addEventListener('error', r, { once: true });
  });
  const fontsLoaded = cssLoaded.then(() => (document.fonts
    ? Promise.all(['900 1em "Inter Tight"', '700 1em "Inter Tight"', '400 1em Inter'].map(f => document.fonts.load(f))).catch(() => {})
    : null));
  Promise.race([fontsLoaded, new Promise(r => setTimeout(r, 1500))]).then(() => root.classList.add('ready'));

  // 5b. portrait: wait until the image is fully decoded, then reveal it. The inline
  //     blur placeholder is already on screen, so the hero is never empty while this happens.
  const imageLoaded = new Promise(resolve => {
    if (img.complete && img.naturalWidth) return resolve();
    img.addEventListener('load', resolve, { once: true });
    img.addEventListener('error', resolve, { once: true });
  });

  let slices = [];
  let introDone = false;
  let slicing = false;
  const N = 14;

  function buildSlices() {
    const src = img.currentSrc || img.src;     // same URL the <img> chose → served from cache
    const box = document.createElement('div');
    box.className = 'hero-slices';
    for (let i = 0; i < N; i++) {
      const d = document.createElement('div');
      d.className = 'sl';
      d.style.backgroundImage = `url("${src}")`;
      // 1px overlap hides sub-pixel seams between neighbouring slices
      d.style.clipPath = `inset(calc(${(i * 100) / N}% - .5px) 0 calc(${100 - ((i + 1) * 100) / N}% - .5px) 0)`;
      box.appendChild(d);
      slices.push(d);
    }
    wrap.insertBefore(box, $('.hero-light', wrap));
  }

  function setSlicing(on) {
    if (on === slicing) return;
    slicing = on;
    fig.classList.toggle('mode-slices', on);
    fig.classList.toggle('mode-base', !on);
  }

  function revealPortrait() {
    if (!img.naturalWidth || reduce) {            // broken image or reduced motion → plain fade
      fig.classList.add('fade', 'is-sharp', 'mode-base');
      introDone = true;
      return;
    }
    buildSlices();
    slices.forEach((d, i) => {
      const dir = i % 2 ? 1 : -1;
      d.style.opacity = 0;
      d.style.transform = `translate3d(${dir * (14 + (i % 5) * 4)}px,0,0)`;
      const delay = 0.15 + i * 0.04;
      d.style.transition = `transform 1.1s cubic-bezier(.22,.61,.36,1) ${delay}s, opacity .8s ease ${delay}s`;
    });
    fig.classList.add('mode-slices');
    slicing = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fig.classList.add('scanning', 'is-sharp');
      slices.forEach(d => { d.style.opacity = 1; d.style.transform = 'translate3d(0,0,0)'; });
    }));
    setTimeout(() => {                             // intro finished → hand over to the clean <img>
      slices.forEach(d => { d.style.transition = 'none'; });
      fig.classList.remove('scanning');
      introDone = true;
      setSlicing(false);
    }, 1900);
  }

  imageLoaded
    .then(() => (img.decode ? img.decode().catch(() => {}) : null))
    .then(revealPortrait);



  /* ---------- 6. cursor + magnetic buttons ---------- */
  if (finePointer) {
    document.body.classList.add('has-cursor');
    const dot = $('#cursor-dot');
    const ring = $('#cursor-ring');
    const label = $('span', ring);
    let mx = 0, my = 0, rx = 0, ry = 0, raf = 0;

    function ringLoop() {
      raf = 0;
      rx += (mx - rx) * 0.2; ry += (my - ry) * 0.2;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      if (Math.abs(mx - rx) > 0.1 || Math.abs(my - ry) > 0.1) raf = requestAnimationFrame(ringLoop);
    }
    addEventListener('mousemove', e => {
      if (!document.body.classList.contains('cursor-on')) { rx = mx = e.clientX; ry = my = e.clientY; document.body.classList.add('cursor-on'); }
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
      if (!raf) raf = requestAnimationFrame(ringLoop);
    }, { passive: true });
    document.addEventListener('mouseleave', () => document.body.classList.remove('cursor-on'));

    const GROW = 'a, button, .btn, input, textarea, .project-card:not(.placeholder), .cert-card, .lead-card, .hero-fig';
    document.addEventListener('mouseover', e => {
      const t = e.target.closest(GROW);
      if (!t) return;
      ring.classList.add('grow');
      label.textContent = t.dataset.cursorLabel || '';
    });
    document.addEventListener('mouseout', e => {
      const t = e.target.closest(GROW);
      if (t && !t.contains(e.relatedTarget)) { ring.classList.remove('grow'); label.textContent = ''; }
    });

    $$('.magnetic').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.2}px,${(e.clientY - r.top - r.height / 2) * 0.25}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- 7. placeholders ---------- */
  $$('.resume-link').forEach(el => el.addEventListener('click', e => {
    e.preventDefault();
    alert('Add your resume PDF link here.');
  }));
  $('#contactForm').addEventListener('submit', e => {
    e.preventDefault();
    alert('This is a static preview — connect a form service (e.g. Formspree) to receive messages.');
  });
  $('#totop').addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
})();
