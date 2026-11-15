/* =====================================================================
   scene.js — small dependency-free 3D mesh renderer (Canvas 2D)
   Models:
     halo  → chrome ring with a green dot in orbit (hero, behind the portrait)
     logo  → the UJ emblem in chrome (ring + monoline U and J + accent dot)
     spark → twisted ribbon      esg → globe + orbit rings      renew → wind turbine
   Any <canvas class="model" data-model="..."> is mounted automatically.
     data-drag        the model can be dragged (with inertia)
     data-big         larger framing
     data-light       chrome tuned for a light background (dark rims)
     data-host="#id"  element whose cursor movement steers the model (default: the canvas parent)
   Rendering pauses whenever a canvas is off-screen or the tab is in the background.
   ===================================================================== */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;
  const ACCENT = [52, 210, 123];                   // keep in sync with --acc in style.css

  /* ---------- geometry helpers ---------- */
  function grid(n, m, fn, wrapU, wrapV) {          // parametric surface → { v, f }
    const v = [], f = [];
    const nu = wrapU ? n : n + 1, nv = wrapV ? m : m + 1;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) v.push(fn(i / n, j / m));
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
      const a = i * nv + j, b = ((i + 1) % nu) * nv + j, c = ((i + 1) % nu) * nv + (j + 1) % nv, d = i * nv + (j + 1) % nv;
      f.push([a, b, c, d]);
    }
    return { v, f };
  }
  function merge(...parts) {
    const v = [], f = [], m = [];
    for (const p of parts) {
      const o = v.length; v.push(...p.v);
      for (const q of p.f) { f.push(q.map(i => i + o)); m.push(p.mat || 0); }
    }
    return { v, f, m };
  }
  const rotX = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; };
  const rotZ = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; };
  const torus = (R, r, n, m) => grid(n, m, (u, w) => {
    const a = u * TAU, b = w * TAU; return [(R + r * Math.cos(b)) * Math.cos(a), r * Math.sin(b), (R + r * Math.cos(b)) * Math.sin(a)];
  }, true, true);
  const sphere = (R, n, m, c = [0, 0, 0]) => grid(n, m, (u, w) => {
    const a = u * TAU, b = w * Math.PI; return [c[0] + R * Math.sin(b) * Math.cos(a), c[1] + R * Math.cos(b), c[2] + R * Math.sin(b) * Math.sin(a)];
  }, true, false);

  // round tube along a 2D path (in the XY plane) with rounded ends
  function tube(path, r, sides) {
    const pts = [];
    const cap = 5;
    const dir = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
    const t0 = dir(path[0], path[1]), t1 = dir(path[path.length - 2], path[path.length - 1]);
    for (let k = cap; k >= 1; k--) { const a = (k / cap) * Math.PI / 2; pts.push({ p: [path[0][0] - t0[0] * r * Math.sin(a), path[0][1] - t0[1] * r * Math.sin(a)], t: t0, r: r * Math.cos(a) }); }
    path.forEach((p, i) => pts.push({ p, t: dir(path[Math.max(0, i - 1)], path[Math.min(path.length - 1, i + 1)]), r }));
    const L = path[path.length - 1];
    for (let k = 1; k <= cap; k++) { const a = (k / cap) * Math.PI / 2; pts.push({ p: [L[0] + t1[0] * r * Math.sin(a), L[1] + t1[1] * r * Math.sin(a)], t: t1, r: r * Math.cos(a) }); }
    const n = pts.length - 1;
    return grid(n, sides, (u, w) => {
      const s = pts[Math.round(u * n)], b = w * TAU, nx = -s.t[1], ny = s.t[0];
      return [s.p[0] + nx * s.r * Math.cos(b), s.p[1] + ny * s.r * Math.cos(b), s.r * Math.sin(b)];
    }, false, true);
  }
  const line = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
  const arc = (c, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]; });

  /* ---------- models ---------- */
  const MODELS = {
    halo(lo) {                                      // the logo's ring and green dot, without the letters
      const ring = torus(1.02, 0.05, lo ? 120 : 200, lo ? 12 : 18); ring.v = ring.v.map(p => rotX(p, Math.PI / 2));
      const inner = torus(0.86, 0.01, lo ? 90 : 140, 6); inner.v = inner.v.map(p => rotX(p, Math.PI / 2));
      const dot = sphere(0.1, lo ? 16 : 26, lo ? 10 : 16);
      return {
        scale: 0.265, spin: 0, sway: 0.28, tilt: 0.12,
        build(t) {
          const a = 0.7 + t * 0.32, c = [Math.cos(a) * 1.02, Math.sin(a) * 1.02, 0];
          const d = { v: dot.v.map(q => [q[0] + c[0], q[1] + c[1], q[2] + c[2]]), f: dot.f, mat: 1 };
          return merge(ring, inner, d);
        }
      };
    },
    logo(lo) {                                      // same geometry as images/logo.svg; lo = lighter mesh for small screens
      const ox = 0.06, oy = -0.05, sh = p => [p[0] + ox, p[1] + oy];
      const U = [...line([-0.62, 0.42], [-0.62, -0.08], 10), ...arc([-0.37, -0.08], 0.25, 180, 360, 26).slice(1), ...line([-0.12, -0.08], [-0.12, 0.42], 10).slice(1)].map(sh);
      const J = [...line([0.18, 0.42], [0.42, 0.42], 6), ...arc([0.42, 0.34], 0.08, 90, 0, 8).slice(1), ...line([0.50, 0.34], [0.50, -0.08], 10).slice(1), ...arc([0.28, -0.08], 0.22, 0, -160, 24).slice(1)].map(sh);
      const sides = lo ? 16 : 26;
      const ring = torus(1.02, 0.072, lo ? 120 : 190, sides); ring.v = ring.v.map(p => rotX(p, Math.PI / 2));
      const a = 40 * Math.PI / 180, dot = sphere(0.135, lo ? 18 : 30, lo ? 12 : 20, [Math.cos(a) * 1.02, Math.sin(a) * 1.02, 0]); dot.mat = 1;
      return { mesh: merge(ring, tube(U, 0.088, sides), tube(J, 0.088, sides), dot), scale: 0.262, spin: 0, sway: 0.5, tilt: 0.06 };
    },
    spark() {
      const mesh = grid(110, 12, (u, w) => {
        const a = u * TAU, b = w * TAU, tw = a * 1.5;
        const e1 = 0.5 * Math.cos(b), e2 = 0.13 * Math.sin(b);
        const d1 = e1 * Math.cos(tw) - e2 * Math.sin(tw), d2 = e1 * Math.sin(tw) + e2 * Math.cos(tw);
        return [(1 + d1) * Math.cos(a), (1 + d1) * Math.sin(a), d2];
      }, true, true);
      return { mesh: merge(mesh), scale: 0.215, spin: 0, sway: 0.75, tilt: 0.55 };
    },
    esg() {
      const ring1 = torus(1.42, 0.022, 72, 6), ring2 = torus(1.2, 0.016, 72, 6);
      ring1.v = ring1.v.map(p => rotZ(rotX(p, 0.35), 0.3));
      ring2.v = ring2.v.map(p => rotZ(rotX(p, -0.5), -0.5));
      const moon = sphere(0.07, 8, 6, rotZ(rotX([1.42, 0, 0], 0.35), 0.3)); moon.mat = 1;
      return { mesh: merge(sphere(0.9, 44, 26), ring1, ring2, moon), scale: 0.2, spin: 0.3, tilt: 0.3 };
    },
    renew() {
      const tower = grid(12, 1, (u, w) => { const a = u * TAU, r = 0.085 - w * 0.04; return [r * Math.cos(a), -1.55 + w * 2.15, r * Math.sin(a)]; }, true, false);
      const nacelle = grid(4, 1, (u, w) => { const a = u * TAU + Math.PI / 4; return [0.1 * Math.cos(a), 0.62 + 0.09 * Math.sin(a), -0.16 + w * 0.42]; }, true, false);
      const hub = sphere(0.085, 10, 7, [0, 0.62, 0.3]);
      const fixed = merge(tower, nacelle, hub);
      const blade = grid(6, 1, (u, w) => [(0.085 - u * 0.065) * (w - 0.5) * 2, 0.06 + u * 1.2, 0.3 + (w - 0.5) * 0.02 * (1 - u)], false, false);
      return {
        scale: 0.2, spin: 0, tilt: 0.1, sway: 0.55,
        build(t) {
          const parts = [fixed];
          for (let k = 0; k < 3; k++) {
            const a = t * 1.3 + k * TAU / 3;
            parts.push({ v: blade.v.map(p => { const q = rotZ([p[0], p[1], p[2]], a); return [q[0], q[1] + 0.62, q[2]]; }), f: blade.f });
          }
          const all = merge(...parts); all.v = all.v.map(q => [q[0], q[1] - 0.14, q[2]]); return all;
        }
      };
    }
  };

  /* ---------- renderer ---------- */
  // Chrome = a mirror of a simple studio: bright ceiling, dark horizon line, grey floor.
  const RAMP = [[-1, 208], [-0.5, 238], [-0.22, 150], [-0.06, 40], [0.03, 26], [0.13, 118], [0.3, 238], [1, 255]];
  function chrome(up) {
    for (let i = 1; i < RAMP.length; i++) if (up <= RAMP[i][0]) {
      const a = RAMP[i - 1], b = RAMP[i]; return a[1] + (b[1] - a[1]) * (up - a[0]) / (b[0] - a[0]);
    }
    return 255;
  }
  function render(ctx, W, H, mesh, ry, rx, scale, light) {
    const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
    const P = mesh.v.map(p => {
      const X = p[0] * cy + p[2] * sy, z1 = -p[0] * sy + p[2] * cy;
      return [X, p[1] * cx - z1 * sx, p[1] * sx + z1 * cx];
    });
    const faces = [];
    for (let k = 0; k < mesh.f.length; k++) {
      const f = mesh.f[k], a = P[f[0]], b = P[f[1]], c = P[f[2]];
      let nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
      let ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
      let nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      const len = Math.hypot(nx, ny, nz); if (len < 1e-9) continue;
      nx /= len; ny /= len; nz /= len;
      if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      let z = 0; for (const i of f) z += P[i][2];
      faces.push([z / f.length, f, nx, ny, nz, mesh.m ? mesh.m[k] : 0]);
    }
    faces.sort((p, q) => p[0] - q[0]);                                    // far → near
    const S = Math.min(W, H) * scale * 1.55, D = 5.2;
    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = 'round'; ctx.lineWidth = 0.8;
    for (const [, f, nx, ny, nz, mat] of faces) {
      let r, g, b;
      if (mat === 1) {                                                    // accent: glossy coloured ball
        const d = 0.62 + 0.5 * Math.max(0, nx * -0.4 + ny * 0.7 + nz * 0.55), sp = Math.pow(Math.max(0, nx * -0.28 + ny * 0.5 + nz * 0.82), 30) * 200;
        r = ACCENT[0] * d + sp; g = ACCENT[1] * d + sp; b = ACCENT[2] * d + sp;
      } else {
        let v = chrome(ny * 0.86 + nx * 0.16 + (1 - nz) * 0.1);
        v *= light ? 1 - 0.5 * Math.pow(1 - nz, 2.6) : 0.78 + 0.22 * nz;   // dark rims read on a light page
        r = v; g = v + 1; b = v + 3;
      }
      const colr = `rgb(${Math.min(255, r | 0)},${Math.min(255, g | 0)},${Math.min(255, b | 0)})`;
      ctx.beginPath();
      for (let i = 0; i < f.length; i++) {
        const p = P[f[i]], k = D / (D - p[2]);
        const x = W / 2 + p[0] * k * S, y = H / 2 - p[1] * k * S;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath(); ctx.fillStyle = colr; ctx.strokeStyle = colr; ctx.fill(); ctx.stroke();
    }
  }

  /* ---------- viewers ---------- */
  function mount(canvas, name, opts = {}) {
    if (!canvas || !canvas.getContext) return null;
    const ctx = canvas.getContext('2d');
    let model = MODELS[name] ? MODELS[name](innerWidth < 700) : null;
    let W = 0, H = 0, onScreen = false, raf = 0, extra = 0;
    const t0 = performance.now();
    const m = { x: 0, y: 0, tx: 0, ty: 0 };
    const d = { on: false, x: 0, y: 0, ry: 0, rx: 0, vy: 0 };

    function fit() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2), r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.max(1, Math.round(W * dpr)); canvas.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function frame(now) {
      raf = 0;
      if (!model || W < 2) return;
      const t = (now - t0) / 1000;
      m.x += (m.tx - m.x) * 0.07; m.y += (m.ty - m.y) * 0.07;
      if (!d.on) { d.ry += d.vy; d.vy *= 0.95; }
      const ry = (model.sway ? Math.sin(t * 0.45) * model.sway : t * model.spin) + m.x * 1.1 + d.ry + extra;
      const rx = model.tilt + m.y * 0.6 + d.rx;
      render(ctx, W, H, model.build ? model.build(t) : model.mesh, ry, rx, model.scale * (opts.big ? 0.98 : 1), opts.light);
      if (onScreen && !document.hidden && !reduce) raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

    fit(); frame(t0);
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) { fit(); kick(); } }, { rootMargin: '80px' }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
    addEventListener('resize', () => { fit(); kick(); });

    const host = opts.host || canvas.parentElement;
    host.addEventListener('mousemove', e => {
      const r = host.getBoundingClientRect();
      m.tx = (e.clientX - r.left) / r.width - 0.5; m.ty = (e.clientY - r.top) / r.height - 0.5;
    });
    host.addEventListener('mouseleave', () => { m.tx = 0; m.ty = 0; });
    if (opts.drag) {
      const grab = canvas.parentElement;
      grab.addEventListener('pointerdown', e => { d.on = true; d.x = e.clientX; d.y = e.clientY; grab.setPointerCapture(e.pointerId); });
      grab.addEventListener('pointermove', e => {
        if (!d.on) return;
        const dx = (e.clientX - d.x) * 0.009; d.ry += dx; d.vy = dx;
        d.rx = Math.max(-0.9, Math.min(0.9, d.rx + (e.clientY - d.y) * 0.007));
        d.x = e.clientX; d.y = e.clientY; kick();
      });
      const end = () => { d.on = false; };
      grab.addEventListener('pointerup', end); grab.addEventListener('pointercancel', end);
    }
    return { refresh() { fit(); kick(); }, turn(a) { extra = a; if (reduce) kick(); } };
  }

  const views = {};
  document.querySelectorAll('canvas.model[data-model]').forEach(c => {
    const v = mount(c, c.dataset.model, {
      drag: c.hasAttribute('data-drag'), big: c.hasAttribute('data-big'), light: c.hasAttribute('data-light'),
      host: c.dataset.host ? document.querySelector(c.dataset.host) : null
    });
    if (c.id) views[c.id] = v;
    const det = c.closest('details');
    if (det && v) det.addEventListener('toggle', () => { if (det.open) v.refresh(); });
  });
  window.Scene3D = { mount, views };
})();
