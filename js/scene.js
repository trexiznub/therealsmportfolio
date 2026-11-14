/* =====================================================================
   scene.js — small dependency-free 3D mesh renderer (Canvas 2D)
   Models: spark (twisted ribbon) · esg (globe + orbit rings) · renew (wind turbine)
   Any <canvas class="model" data-model="..."> is mounted automatically.
     data-drag  → the model can be dragged (with inertia)
     data-big   → larger framing
     data-manual→ not auto-mounted; controlled from main.js via Scene3D.mount()
   Rendering pauses whenever a canvas is hidden, off-screen, or the tab is in the background.
   ===================================================================== */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;

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
    const v = [], f = [];
    for (const p of parts) { const o = v.length; v.push(...p.v); f.push(...p.f.map(q => q.map(i => i + o))); }
    return { v, f };
  }
  const rotX = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; };
  const rotZ = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; };
  const torus = (R, r, n, m) => grid(n, m, (u, w) => {
    const a = u * TAU, b = w * TAU; return [(R + r * Math.cos(b)) * Math.cos(a), r * Math.sin(b), (R + r * Math.cos(b)) * Math.sin(a)];
  }, true, true);
  const sphere = (R, n, m, c = [0, 0, 0]) => grid(n, m, (u, w) => {
    const a = u * TAU, b = w * Math.PI; return [c[0] + R * Math.sin(b) * Math.cos(a), c[1] + R * Math.cos(b), c[2] + R * Math.sin(b) * Math.sin(a)];
  }, true, false);

  /* ---------- models ---------- */
  const MODELS = {
    spark() {                                       // flat band twisted 1.5× around a ring
      const mesh = grid(110, 12, (u, w) => {
        const a = u * TAU, b = w * TAU, tw = a * 1.5;
        const e1 = 0.5 * Math.cos(b), e2 = 0.13 * Math.sin(b);
        const d1 = e1 * Math.cos(tw) - e2 * Math.sin(tw), d2 = e1 * Math.sin(tw) + e2 * Math.cos(tw);
        return [(1 + d1) * Math.cos(a), (1 + d1) * Math.sin(a), d2];
      }, true, true);
      return { mesh, scale: 0.215, spin: 0, sway: 0.75, tilt: 0.55 };
    },
    esg() {
      const ring1 = torus(1.42, 0.022, 72, 6), ring2 = torus(1.2, 0.016, 72, 6);
      ring1.v = ring1.v.map(p => rotZ(rotX(p, 0.35), 0.3));
      ring2.v = ring2.v.map(p => rotZ(rotX(p, -0.5), -0.5));
      return { mesh: merge(sphere(0.9, 44, 26), ring1, ring2, sphere(0.07, 8, 6, rotZ(rotX([1.42, 0, 0], 0.35), 0.3))), scale: 0.235, spin: 0.3, tilt: 0.3 };
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
  const TINT = [1, 1, 1];                                                 // metal colour as 0..1 (1,1,1 = chrome)
  const L = (() => { const v = [-0.45, 0.65, 0.62], n = Math.hypot(...v); return v.map(x => x / n); })();
  const Hh = (() => { const v = [L[0], L[1], L[2] + 1], n = Math.hypot(...v); return v.map(x => x / n); })();

  function render(ctx, W, H, mesh, ry, rx, scale) {
    const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
    const P = mesh.v.map(p => {
      const X = p[0] * cy + p[2] * sy, z1 = -p[0] * sy + p[2] * cy;
      return [X, p[1] * cx - z1 * sx, p[1] * sx + z1 * cx];
    });
    const faces = [];
    for (const f of mesh.f) {
      const a = P[f[0]], b = P[f[1]], c = P[f[2]];
      let nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
      let ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
      let nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      const len = Math.hypot(nx, ny, nz) || 1; nx /= len; ny /= len; nz /= len;
      if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }                      // light both sides
      let z = 0; for (const i of f) z += P[i][2];
      faces.push([z / f.length, f, nx, ny, nz]);
    }
    faces.sort((p, q) => p[0] - q[0]);                                    // far → near
    const S = Math.min(W, H) * scale * 1.55, D = 5.2;
    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = 'round'; ctx.lineWidth = 0.7;
    for (const [, f, nx, ny, nz] of faces) {
      const diff = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
      const spec = Math.pow(Math.max(0, nx * Hh[0] + ny * Hh[1] + nz * Hh[2]), 38);
      const band = 0.5 + 0.5 * Math.sin(ny * 6.5 + nx * 2.5);            // fake studio reflections → brushed metal
      const rim = Math.pow(1 - nz, 3);
      const v = Math.min(255, Math.round(20 + diff * 78 + band * 46 + spec * 190 + rim * 70));
      const k = 0.18 + band * 0.42;                                       // tint rides the reflections
      const colr = `rgb(${Math.round(v * (1 - k) + v * TINT[0] * k)},${Math.round(v * (1 - k) + v * TINT[1] * k)},${Math.round(v * (1 - k) + v * TINT[2] * k)})`;
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
    let model = MODELS[name] ? MODELS[name]() : null;
    let W = 0, H = 0, onScreen = false, active = opts.active !== false, raf = 0;
    const t0 = performance.now();
    const m = { x: 0, y: 0, tx: 0, ty: 0 };                 // hover follow
    const d = { on: false, x: 0, y: 0, ry: 0, rx: 0, vy: 0 }; // drag + inertia

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
      const ry = (model.sway ? Math.sin(t * 0.45) * model.sway : t * model.spin) + m.x * 1.1 + d.ry;
      const rx = model.tilt + m.y * 0.6 + d.rx;
      render(ctx, W, H, model.build ? model.build(t) : model.mesh, ry, rx, model.scale * (opts.big ? 0.98 : 1));
      if (onScreen && active && !document.hidden && !reduce) raf = requestAnimationFrame(frame);
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
      host.addEventListener('pointerdown', e => { d.on = true; d.x = e.clientX; d.y = e.clientY; host.setPointerCapture(e.pointerId); });
      host.addEventListener('pointermove', e => {
        if (!d.on) return;
        const dx = (e.clientX - d.x) * 0.009; d.ry += dx; d.vy = dx;
        d.rx = Math.max(-0.9, Math.min(0.9, d.rx + (e.clientY - d.y) * 0.007));
        d.x = e.clientX; d.y = e.clientY; kick();
      });
      const end = () => { d.on = false; };
      host.addEventListener('pointerup', end); host.addEventListener('pointercancel', end);
    }
    return {
      set(n) { if (MODELS[n]) { model = MODELS[n](); kick(); } },
      active(on) { active = on; if (on) { fit(); kick(); } },
      refresh() { fit(); kick(); }
    };
  }

  document.querySelectorAll('canvas.model[data-model]').forEach(c => {
    const v = mount(c, c.dataset.model, { drag: c.hasAttribute('data-drag'), big: c.hasAttribute('data-big') });
    // a model inside a closed <details> has no size yet; size it when the row opens
    const det = c.closest('details');
    if (det && v) det.addEventListener('toggle', () => { if (det.open) v.refresh(); });
  });
  window.Scene3D = { mount };
})();
