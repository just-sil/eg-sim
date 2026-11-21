// three.js scene: HP, VP, the solid in its current stage, and (optionally)
// projectors and the projected views drawn on the planes.
// World (x, y=front, z=up) maps to three.js (X=x, Y=z, Z=y).
/* global THREE */
import { toSheet } from './projector.js';

const W = (p) => new THREE.Vector3(p[0], p[2], p[1]);

export class View3D {
  constructor(host) {
    this.host = host;
    this.ok = typeof THREE !== 'undefined';
    if (!this.ok) { host.innerHTML = '<p class="muted">3D view unavailable (three.js failed to load).</p>'; return; }
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    host.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 1, 5000);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6);
    dl.position.set(80, 160, 120);
    this.scene.add(dl);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.orbit = { theta: -0.75, phi: 1.05, r: 300, target: new THREE.Vector3() };
    this.showProj = true;
    this.bindOrbit();
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
  }

  resize() {
    if (!this.ok) return;
    const w = this.host.clientWidth || 300, h = this.host.clientHeight || 260;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.draw();
  }

  bindOrbit() {
    const el = this.renderer.domElement;
    let drag = null;
    el.addEventListener('pointerdown', (e) => { drag = [e.clientX, e.clientY]; try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ } });
    el.addEventListener('pointermove', (e) => {
      if (!drag) return;
      this.orbit.theta -= (e.clientX - drag[0]) * 0.008;
      this.orbit.phi = Math.max(0.05, Math.min(Math.PI - 0.05, this.orbit.phi - (e.clientY - drag[1]) * 0.008));
      drag = [e.clientX, e.clientY];
      this.draw();
    });
    el.addEventListener('pointerup', () => { drag = null; });
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.orbit.r = Math.max(60, Math.min(2000, this.orbit.r * Math.exp(e.deltaY * 0.001)));
      this.draw();
    }, { passive: false });
  }

  preset(name) {
    const o = this.orbit;
    if (name === 'front') { o.theta = 0; o.phi = Math.PI / 2; }
    if (name === 'top') { o.theta = 0; o.phi = 0.06; }
    if (name === 'iso') { o.theta = -0.75; o.phi = 1.05; }
    this.draw();
  }

  draw() {
    if (!this.ok) return;
    const o = this.orbit;
    const t = o.target;
    this.camera.position.set(
      t.x + o.r * Math.sin(o.phi) * Math.sin(o.theta),
      t.y + o.r * Math.cos(o.phi),
      t.z + o.r * Math.sin(o.phi) * Math.cos(o.theta),
    );
    this.camera.lookAt(t);
    this.renderer.render(this.scene, this.camera);
  }

  /** Show a posed solid; stage = { solid, FV, TV } from solve(). */
  show(stage, { keepCamera = false } = {}) {
    if (!this.ok) return;
    this.stage = stage;
    const g = this.root;
    while (g.children.length) {
      const c = g.children.pop();
      c.geometry?.dispose?.();
    }
    const s = stage.solid;
    const real = s.pts.slice(0, s.B);
    const xs = real.map((p) => p[0]), ys = real.map((p) => p[1]), zs = real.map((p) => p[2]);
    const x0 = Math.min(...xs) - 25, x1 = Math.max(...xs) + 25;
    const yMax = Math.max(...ys) + 25, zMax = Math.max(...zs) + 25;
    const css = getComputedStyle(document.documentElement);
    const col = (v, d) => new THREE.Color((css.getPropertyValue(v) || d).trim() || d);

    // planes
    const hp = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, yMax), new THREE.MeshBasicMaterial({ color: col('--hp', '#6b8fd6'), transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
    hp.rotation.x = -Math.PI / 2; hp.position.set((x0 + x1) / 2, 0, yMax / 2);
    const vp = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, zMax), new THREE.MeshBasicMaterial({ color: col('--vp', '#5fae8a'), transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
    vp.position.set((x0 + x1) / 2, zMax / 2, 0);
    g.add(hp, vp);
    g.add(this.lines([[[x0, 0, 0], [x1, 0, 0]]], col('--ink', '#222'), false));
    g.add(this.text('HP', [x1 - 8, yMax - 6, 0.5], '#4466aa'));
    g.add(this.text('VP', [x1 - 8, 0.5, zMax - 6], '#2f8a60'));

    // solid surface
    const tris = [];
    const P = s.pts;
    if (!s.curved) {
      for (const f of s.faces) for (let k = 1; k < f.length - 1; k++) tris.push(P[f[0]], P[f[k]], P[f[k + 1]]);
    } else {
      const { rim, top, apex } = s.curved;
      const N = rim.length;
      for (let k = 0; k < N; k++) {
        const k2 = (k + 1) % N;
        tris.push(P[s.B], P[rim[k]], P[rim[k2]]);
        if (top) { tris.push(P[s.T], P[top[k2]], P[top[k]]); tris.push(P[rim[k]], P[rim[k2]], P[top[k2]]); tris.push(P[rim[k]], P[top[k2]], P[top[k]]); }
        else tris.push(P[rim[k]], P[rim[k2]], P[apex]);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(tris.flatMap((p) => [p[0], p[2], p[1]]), 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: col('--solid', '#f2b54a'), transparent: true, opacity: 0.82, side: THREE.DoubleSide, flatShading: true }));
    g.add(mesh);

    // edges
    const edges = [];
    if (!s.curved) for (const e of s.edges) edges.push([P[e.a], P[e.b]]);
    else {
      const { rim, top, apex } = s.curved;
      const N = rim.length;
      for (let k = 0; k < N; k++) {
        edges.push([P[rim[k]], P[rim[(k + 1) % N]]]);
        if (top) edges.push([P[top[k]], P[top[(k + 1) % N]]]);
        if (k % 4 === 0) edges.push([P[rim[k]], top ? P[top[k]] : P[apex]]);
      }
    }
    g.add(this.lines(edges, new THREE.Color('#3a2a10'), false));
    g.add(this.lines([[P[s.B], P[s.T]]], new THREE.Color('#c0392b'), true));

    if (this.showProj) {
      // projected views drawn on the planes
      const fv = stage.FV.segs.filter((q) => q.kind !== 'axis');
      const tv = stage.TV.segs.filter((q) => q.kind !== 'axis');
      const onVP = (q) => [q[0], 0.15, -q[1]];
      const onHP = (q) => [q[0], q[1], 0.15];
      const vis = (arr, map, style) => arr.filter((q) => q.style === style).map((q) => [map(q.a), map(q.b)]);
      g.add(this.lines(vis(fv, onVP, 'visible'), new THREE.Color('#1f6b45'), false));
      g.add(this.lines(vis(fv, onVP, 'hidden'), new THREE.Color('#1f6b45'), true));
      g.add(this.lines(vis(tv, onHP, 'visible'), new THREE.Color('#2a4f9a'), false));
      g.add(this.lines(vis(tv, onHP, 'hidden'), new THREE.Color('#2a4f9a'), true));
      // projectors from the key points
      const pr = [];
      for (const i of s.keyIdx) {
        const p = P[i];
        pr.push([p, [p[0], 0, p[2]]], [p, [p[0], p[1], 0]]);
      }
      const m = this.lines(pr, new THREE.Color('#888'), true);
      m.material.opacity = 0.45; m.material.transparent = true;
      g.add(m);
    }
    if (!keepCamera) {
      this.orbit.target.set((x0 + x1) / 2, zMax / 3, yMax / 3);
      this.orbit.r = Math.max(x1 - x0, yMax, zMax) * 2.4;
    }
    this.draw();
  }

  lines(pairs, color, dashed) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pairs.flatMap(([a, b]) => [a[0], a[2], a[1], b[0], b[2], b[1]]), 3));
    const mat = dashed ? new THREE.LineDashedMaterial({ color, dashSize: 2.5, gapSize: 1.5 }) : new THREE.LineBasicMaterial({ color });
    const l = new THREE.LineSegments(geo, mat);
    if (dashed) l.computeLineDistances();
    return l;
  }

  text(str, p, color) {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 32;
    const ctx = c.getContext('2d');
    ctx.fillStyle = color; ctx.font = 'bold 22px sans-serif'; ctx.fillText(str, 8, 24);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
    sp.position.copy(W(p));
    sp.scale.set(16, 8, 1);
    return sp;
  }
}
export { toSheet };
