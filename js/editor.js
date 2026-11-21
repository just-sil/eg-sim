// SVG drafting sheet: pan/zoom, drafting tools, snapping, undo/redo.
// World units are millimetres; the XY line is y = 0 and y grows downwards.
// User-facing coordinates show "h" = height above XY (positive up) and angles
// counter-clockwise from +x, like on paper.
import {
  D2R, R2D, add2, sub2, scale2, dot2, cross2, len2, dist2, rot2, lerp2,
  closestOnSeg, closestOnLine, lineLine, lineCircle, circleCircle, normAng, angleInArc, sampleSpline,
} from './geometry.js';

const NS = 'http://www.w3.org/2000/svg';
const BIG = 5000;
let uid = 1;
const nid = () => 'e' + (uid++).toString(36) + Math.random().toString(36).slice(2, 6);

export const TOOLS = {
  select: { key: 'v', label: 'Select', tip: 'Click or drag a box to select. Delete removes. Shift adds to the selection.' },
  pan: { key: ' ', label: 'Pan', tip: 'Drag to move the sheet. Mouse wheel zooms.' },
  point: { key: 'p', label: 'Point', tip: 'Click to place a point, or type x,h and press Enter.' },
  segment: { key: 'l', label: 'Line', tip: 'Click two points. After the first, type a length, "length<angle" or "@dx,dh". Shift snaps to 15°.' },
  polyline: { key: 'o', label: 'Polyline', tip: 'Click points; double-click or Enter to finish (click the start point to close).' },
  polygon: { key: 'g', label: 'Polygon', tip: 'Regular polygon: click two corners of one edge (or type "length<angle"), then click the side it goes on.' },
  circle: { key: 'c', label: 'Circle', tip: 'Click the centre, then a point on the circle, or type the radius.' },
  arc: { key: 'a', label: 'Compass arc', tip: 'Click the centre, then the start point (or type a radius), then sweep to the end and click.' },
  curve: { key: 's', label: 'Curve', tip: 'Smooth curve through points (for ellipses). Enter/double-click to finish; click the start point to close.' },
  vline: { key: 'j', label: 'Projector ↕', tip: 'Thin vertical projector through the clicked point.' },
  hline: { key: 'h', label: 'Projector ↔', tip: 'Thin horizontal line through the clicked point.' },
  angle: { key: 'n', label: 'Angle line', tip: 'Click a point, then type an angle (CCW from XY) or click a direction.' },
  parallel: { key: 'k', label: 'Parallel', tip: 'Click a line, then a point: a thin parallel line through that point.' },
  perp: { key: 'u', label: 'Perpendicular', tip: 'Click a line, then a point: a thin perpendicular through that point.' },
  divide: { key: 'd', label: 'Divide ○', tip: 'Click a circle to mark 12 equal divisions (generators), starting at its right end.' },
  rotate: { key: 'r', label: 'Rotate copy', tip: 'Select items first. Click the pivot, then type an angle (CCW +) or click a reference point and then a target point.' },
  copy: { key: 'm', label: 'Move copy', tip: 'Select items first. Click a base point, then the destination.' },
  measure: { key: 'q', label: 'Measure', tip: 'Click two points to read the length and angle.' },
  label: { key: 't', label: 'Label', tip: 'Click where the label goes, then type the text.' },
  erase: { key: 'e', label: 'Erase', tip: 'Click an item to delete it.' },
};

export const STYLES = {
  visible: { key: '1', label: 'Visible', tip: 'Thick continuous line (visible edges)' },
  hidden: { key: '2', label: 'Hidden', tip: 'Dashed line (hidden edges)' },
  axis: { key: '3', label: 'Axis', tip: 'Chain line (axis / centre lines)' },
  construction: { key: '4', label: 'Thin', tip: 'Thin line (construction, projectors)' },
};

// ---------- geometry of user elements ----------
export function primsOf(el) {
  switch (el.type) {
    case 'seg': return [{ kind: 'seg', a: el.a, b: el.b }];
    case 'xline': return [{ kind: 'line', p: el.p, d: el.d }];
    case 'poly': {
      const out = [];
      for (let i = 0; i < el.pts.length - 1; i++) out.push({ kind: 'seg', a: el.pts[i], b: el.pts[i + 1] });
      if (el.closed && el.pts.length > 2) out.push({ kind: 'seg', a: el.pts[el.pts.length - 1], b: el.pts[0] });
      return out;
    }
    case 'curve': {
      const s = sampleSpline(el.pts, el.closed, 10);
      const out = [];
      for (let i = 0; i < s.length - 1; i++) out.push({ kind: 'seg', a: s[i], b: s[i + 1] });
      return out;
    }
    case 'circle': return [{ kind: 'circle', c: el.c, r: el.r }];
    case 'arc': return [{ kind: 'circle', c: el.c, r: el.r, a0: el.a0, a1: el.a1 }];
    default: return [];
  }
}
export function keyPointsOf(el) {
  switch (el.type) {
    case 'point': return [el.p];
    case 'seg': return [el.a, el.b];
    case 'poly': case 'curve': return el.pts;
    case 'circle': return [el.c];
    case 'arc': return [el.c, arcPt(el, el.a0), arcPt(el, el.a1)];
    case 'xline': return [el.p];
    default: return [];
  }
}
const arcPt = (el, a) => [el.c[0] + el.r * Math.cos(a), el.c[1] + el.r * Math.sin(a)];

export function distToPrim(p, pr) {
  if (pr.kind === 'seg') return closestOnSeg(p, pr.a, pr.b);
  if (pr.kind === 'line') return closestOnLine(p, pr.p, pr.d);
  const v = sub2(p, pr.c);
  const L = len2(v) || 1e-9;
  let ang = Math.atan2(v[1], v[0]);
  if (pr.a0 !== undefined && !angleInArc(ang, pr.a0, pr.a1)) {
    const e0 = [pr.c[0] + pr.r * Math.cos(pr.a0), pr.c[1] + pr.r * Math.sin(pr.a0)];
    const e1 = [pr.c[0] + pr.r * Math.cos(pr.a1), pr.c[1] + pr.r * Math.sin(pr.a1)];
    const d0 = dist2(p, e0), d1 = dist2(p, e1);
    return d0 < d1 ? { q: e0, d: d0 } : { q: e1, d: d1 };
  }
  const q = add2(pr.c, scale2(v, pr.r / L));
  return { q, d: Math.abs(L - pr.r) };
}

function intersect(p1, p2) {
  const out = [];
  const asLine = (pr) => (pr.kind === 'seg' ? { p: pr.a, d: sub2(pr.b, pr.a), bounded: true } : { p: pr.p, d: pr.d, bounded: false });
  const okT = (L, t) => !L.bounded || (t >= -1e-9 && t <= 1 + 1e-9);
  const okA = (C, pt) => C.a0 === undefined || angleInArc(Math.atan2(pt[1] - C.c[1], pt[0] - C.c[0]), C.a0, C.a1);
  if (p1.kind !== 'circle' && p2.kind !== 'circle') {
    const A = asLine(p1), B = asLine(p2);
    const r = lineLine(A.p, A.d, B.p, B.d);
    if (r && okT(A, r.t) && okT(B, r.u)) out.push(r.pt);
  } else if (p1.kind === 'circle' && p2.kind === 'circle') {
    for (const pt of circleCircle(p1.c, p1.r, p2.c, p2.r)) if (okA(p1, pt) && okA(p2, pt)) out.push(pt);
  } else {
    const C = p1.kind === 'circle' ? p1 : p2;
    const L = asLine(p1.kind === 'circle' ? p2 : p1);
    for (const r of lineCircle(L.p, L.d, C.c, C.r)) if (okT(L, r.t) && okA(C, r.pt)) out.push(r.pt);
  }
  return out;
}

function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

const fmt = (n) => (Math.round(n * 10) / 10).toFixed(1);

export class Editor {
  constructor(svg, { onChange, onStatus, onSelection } = {}) {
    this.svg = svg;
    this.onChange = onChange || (() => {});
    this.onStatus = onStatus || (() => {});
    this.onSelection = onSelection || (() => {});
    this.elements = [];
    this.undoStack = [];
    this.redoStack = [];
    this.tool = 'segment';
    this.style = 'visible';
    this.polyN = 4;
    this.gridSnap = false;
    this.selected = new Set();
    this.op = null; // in-progress operation
    this.overlaySnap = [];
    this.highlight = null;
    this.view = { x: -10, y: -110, scale: 3 }; // x,y = world at top-left; scale = px per mm
    this.buildLayers();
    this.bindEvents();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(svg);
    this.render();
  }

  // ------------------------------------------------------------ layers
  buildLayers() {
    const s = this.svg;
    s.innerHTML = '';
    const defs = el('defs', {}, s);
    const pat = el('pattern', { id: 'grid5', width: 5, height: 5, patternUnits: 'userSpaceOnUse' }, defs);
    el('path', { d: 'M 5 0 L 0 0 0 5', class: 'grid-minor' }, pat);
    const pat2 = el('pattern', { id: 'grid50', width: 50, height: 50, patternUnits: 'userSpaceOnUse' }, defs);
    el('rect', { width: 50, height: 50, fill: 'url(#grid5)' }, pat2);
    el('path', { d: 'M 50 0 L 0 0 0 50', class: 'grid-major' }, pat2);
    this.gGrid = el('rect', { x: -BIG, y: -BIG, width: 2 * BIG, height: 2 * BIG, fill: 'url(#grid50)', class: 'grid' }, s);
    this.gRef = el('g', { class: 'ref' }, s);
    el('line', { x1: -BIG, y1: 0, x2: BIG, y2: 0, class: 'xy-line' }, this.gRef);
    this.xyLabels = el('g', {}, this.gRef);
    this.gOverlay = el('g', { class: 'overlay' }, s);
    this.gUser = el('g', { class: 'user' }, s);
    this.gHigh = el('g', { class: 'highlight' }, s);
    this.gPreview = el('g', { class: 'preview' }, s);
    this.gSnap = el('g', { class: 'snap' }, s);
  }

  resize() {
    const r = this.svg.getBoundingClientRect();
    this.w = r.width || 800; this.h = r.height || 600;
    this.applyView();
  }
  applyView() {
    const v = this.view;
    this.svg.setAttribute('viewBox', `${v.x} ${v.y} ${this.w / v.scale} ${this.h / v.scale}`);
    // X / Y labels stick to the visible ends of the reference line
    this.xyLabels.innerHTML = '';
    const left = v.x + 4 / v.scale * 4, right = v.x + this.w / v.scale - 16 / v.scale;
    const fs = 13 / v.scale;
    el('text', { x: left, y: -3 / v.scale * 2, class: 'xy-text', 'font-size': fs }, this.xyLabels).textContent = 'X';
    el('text', { x: right, y: -3 / v.scale * 2, class: 'xy-text', 'font-size': fs }, this.xyLabels).textContent = 'Y';
    this.svg.style.setProperty('--px', 1 / v.scale);
    this.renderPoints();
  }
  fitTo(bounds, pad = 15) {
    const [x0, y0, x1, y1] = bounds;
    const sw = (x1 - x0) + 2 * pad, sh = (y1 - y0) + 2 * pad;
    const scale = Math.max(0.5, Math.min(this.w / sw, this.h / sh, 12));
    this.view = { scale, x: (x0 + x1) / 2 - this.w / scale / 2, y: (y0 + y1) / 2 - this.h / scale / 2 };
    this.applyView();
  }
  toWorld(evt) {
    const r = this.svg.getBoundingClientRect();
    return [this.view.x + (evt.clientX - r.left) / this.view.scale, this.view.y + (evt.clientY - r.top) / this.view.scale];
  }

  // ------------------------------------------------------------ state
  snapshot() { return JSON.stringify(this.elements); }
  commit(mutator) {
    this.undoStack.push(this.snapshot());
    if (this.undoStack.length > 200) this.undoStack.shift();
    this.redoStack = [];
    mutator();
    this.highlight = null;
    this.render();
    this.onChange();
  }
  add(...els) { this.commit(() => { for (const e of els) { e.id = nid(); this.elements.push(e); } }); }
  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(this.snapshot());
    this.elements = JSON.parse(this.undoStack.pop());
    this.selected.clear(); this.highlight = null; this.render(); this.onChange();
  }
  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(this.snapshot());
    this.elements = JSON.parse(this.redoStack.pop());
    this.selected.clear(); this.highlight = null; this.render(); this.onChange();
  }
  clear() { if (this.elements.length) this.commit(() => { this.elements = []; this.selected.clear(); }); }
  load(elements) {
    this.elements = Array.isArray(elements) ? elements : [];
    this.undoStack = []; this.redoStack = []; this.selected.clear(); this.highlight = null;
    this.cancelOp(); this.render();
  }
  deleteSelected() {
    if (!this.selected.size) return;
    this.commit(() => { this.elements = this.elements.filter((e) => !this.selected.has(e.id)); this.selected.clear(); });
    this.onSelection(0);
  }
  setTool(t) {
    this.cancelOp();
    this.tool = t;
    this.svg.dataset.tool = t;
    this.status();
  }
  setStyle(s) {
    this.style = s;
    if (this.selected.size) {
      this.commit(() => { for (const e of this.elements) if (this.selected.has(e.id) && e.style) e.style = s; });
    }
  }
  cancelOp() { this.op = null; this.gPreview.innerHTML = ''; this.status(); }

  // ------------------------------------------------------------ overlay / highlight
  setOverlay(items, snapPts = []) {
    this.gOverlay.innerHTML = '';
    for (const it of items) {
      for (const s of it.segs || []) {
        el('line', { x1: s.a[0], y1: s.a[1], x2: s.b[0], y2: s.b[1], class: `st-${s.style} ${it.cls || 'ghost'}` }, this.gOverlay);
      }
      for (const l of it.labels || []) {
        const t = el('text', { x: l.at[0], y: l.at[1], class: `lbl ${it.cls || 'ghost'}`, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, this.gOverlay);
        t.textContent = l.text;
      }
    }
    this.overlaySnap = snapPts;
  }
  setHighlight(h) { this.highlight = h; this.render(); }

  // ------------------------------------------------------------ rendering
  render() {
    const g = this.gUser;
    g.innerHTML = '';
    const hi = this.highlight;
    for (const e of this.elements) {
      const cls = [e.style ? `st-${e.style}` : '', this.selected.has(e.id) ? 'sel' : '', hi && hi.status[e.id] ? `chk-${hi.status[e.id]}` : ''].join(' ');
      let node;
      switch (e.type) {
        case 'seg': node = el('line', { x1: e.a[0], y1: e.a[1], x2: e.b[0], y2: e.b[1] }); break;
        case 'xline': {
          const d = e.d, L = len2(d) || 1;
          const a = add2(e.p, scale2(d, -BIG / L)), b = add2(e.p, scale2(d, BIG / L));
          node = el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }); break;
        }
        case 'poly': node = el(e.closed ? 'polygon' : 'polyline', { points: e.pts.map((p) => p.join(',')).join(' '), fill: 'none' }); break;
        case 'curve': node = el('polyline', { points: sampleSpline(e.pts, e.closed, 10).map((p) => p.join(',')).join(' '), fill: 'none' }); break;
        case 'circle': node = el('circle', { cx: e.c[0], cy: e.c[1], r: e.r, fill: 'none' }); break;
        case 'arc': node = el('path', { d: arcPath(e), fill: 'none' }); break;
        case 'point': node = el('circle', { cx: e.p[0], cy: e.p[1], class: 'pt' }); break;
        case 'label': {
          node = el('text', { x: e.p[0], y: e.p[1], class: 'lbl user-lbl' });
          node.textContent = e.text; break;
        }
        default: continue;
      }
      node.setAttribute('class', `${node.getAttribute('class') || ''} ${cls}`.trim());
      node.dataset.id = e.id;
      g.appendChild(node);
    }
    this.gHigh.innerHTML = '';
    if (hi && hi.missing) {
      for (const s of hi.missing) el('line', { x1: s.a[0], y1: s.a[1], x2: s.b[0], y2: s.b[1], class: `st-${s.style} chk-missing` }, this.gHigh);
    }
    this.renderPoints();
  }
  renderPoints() {
    const r = 3.2 / this.view.scale;
    this.gUser.querySelectorAll('circle.pt').forEach((c) => c.setAttribute('r', r));
  }

  // ------------------------------------------------------------ snapping
  snap(p, evt, from) {
    const tol = 9 / this.view.scale;
    let best = null;
    const consider = (q, kind, rank) => {
      const d = dist2(p, q);
      if (d > tol) return;
      const score = d + rank * tol;
      if (!best || score < best.score) best = { p: q, kind, score };
    };
    const near = [];
    const all = this.elements.concat([{ type: 'xline', p: [0, 0], d: [1, 0], id: '__xy' }]);
    for (const e of all) {
      for (const q of keyPointsOf(e)) if (e.id !== '__xy') consider(q, 'point', 0);
      for (const pr of primsOf(e)) {
        const r = distToPrim(p, pr);
        if (r.d < tol * 2.5) near.push({ pr, r });
        if (pr.kind === 'seg' && e.type === 'seg') consider(lerp2(pr.a, pr.b, 0.5), 'midpoint', 0.3);
      }
    }
    for (const q of this.overlaySnap) consider(q, 'guide point', 0.05);
    for (let i = 0; i < near.length; i++) {
      for (let j = i + 1; j < near.length; j++) {
        for (const q of intersect(near[i].pr, near[j].pr)) consider(q, 'intersection', 0.02);
      }
    }
    if (!best) for (const n of near) consider(n.r.q, 'on line', 0.6);
    if (!best && this.gridSnap) {
      const q = [Math.round(p[0]), Math.round(p[1])];
      consider(q, 'grid', 0.9);
    }
    let out = best ? best.p : p, kind = best ? best.kind : '';
    // Shift: constrain direction to 15° steps from the previous point
    if (evt && evt.shiftKey && from) {
      const v = sub2(p, from);
      const L = len2(v);
      const a = Math.round(Math.atan2(v[1], v[0]) / (15 * D2R)) * 15 * D2R;
      out = [from[0] + L * Math.cos(a), from[1] + L * Math.sin(a)];
      kind = `${Math.round(normAng(-a) * R2D) % 360}°`;
    }
    return { p: out, kind };
  }
  showSnap(s) {
    this.gSnap.innerHTML = '';
    if (!s.kind) return;
    const r = 5 / this.view.scale;
    el('circle', { cx: s.p[0], cy: s.p[1], r, class: 'snap-mark' }, this.gSnap);
  }

  hitTest(p) {
    const tol = 6 / this.view.scale;
    let best = null;
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const e = this.elements[i];
      let d = Infinity;
      if (e.type === 'point') d = dist2(p, e.p);
      else if (e.type === 'label') d = dist2(p, e.p) - 2;
      else for (const pr of primsOf(e)) d = Math.min(d, distToPrim(p, pr).d);
      if (d < tol && (!best || d < best.d)) best = { e, d };
    }
    return best ? best.e : null;
  }

  // ------------------------------------------------------------ status
  status(extra) {
    const t = TOOLS[this.tool];
    let msg = t ? t.tip : '';
    if (this.op && this.op.prompt) msg = this.op.prompt;
    this.onStatus({ prompt: extra || msg, tool: this.tool });
  }

  // ------------------------------------------------------------ events
  bindEvents() {
    const s = this.svg;
    s.addEventListener('contextmenu', (e) => e.preventDefault());
    s.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = this.toWorld(e);
      const f = Math.exp(-e.deltaY * 0.0015);
      const ns = Math.max(0.4, Math.min(40, this.view.scale * f));
      const r = s.getBoundingClientRect();
      this.view.scale = ns;
      this.view.x = p[0] - (e.clientX - r.left) / ns;
      this.view.y = p[1] - (e.clientY - r.top) / ns;
      this.applyView();
    }, { passive: false });

    s.addEventListener('pointerdown', (e) => this.onDown(e));
    s.addEventListener('pointermove', (e) => this.onMove(e));
    s.addEventListener('pointerup', (e) => this.onUp(e));
    s.addEventListener('dblclick', (e) => this.onDbl(e));
    s.addEventListener('pointerleave', () => { this.gSnap.innerHTML = ''; });
  }

  onDown(e) {
    try { this.svg.setPointerCapture(e.pointerId); } catch { /* synthetic or stale pointer */ }
    const raw = this.toWorld(e);
    if (e.button === 1 || e.button === 2 || this.tool === 'pan' || this.spaceDown) {
      this.drag = { kind: 'pan', start: [e.clientX, e.clientY], view: { ...this.view } };
      return;
    }
    if (e.button !== 0) return;
    if (this.tool === 'select') {
      const hit = this.hitTest(raw);
      if (hit) {
        if (!e.shiftKey) this.selected.clear();
        this.selected.has(hit.id) && e.shiftKey ? this.selected.delete(hit.id) : this.selected.add(hit.id);
        this.render(); this.onSelection(this.selected.size);
      } else {
        this.drag = { kind: 'box', start: raw, add: e.shiftKey };
      }
      return;
    }
    if (this.tool === 'erase') {
      const hit = this.hitTest(raw);
      if (hit) this.commit(() => { this.elements = this.elements.filter((x) => x !== hit); });
      return;
    }
    const s = this.snap(raw, e, this.op && this.op.last);
    this.mouse = s.p;
    this.click(s.p, raw, e);
  }

  onMove(e) {
    const raw = this.toWorld(e);
    if (this.drag && this.drag.kind === 'pan') {
      const d = this.drag;
      this.view.x = d.view.x - (e.clientX - d.start[0]) / this.view.scale;
      this.view.y = d.view.y - (e.clientY - d.start[1]) / this.view.scale;
      this.applyView();
      return;
    }
    if (this.drag && this.drag.kind === 'box') {
      this.gPreview.innerHTML = '';
      const [a, b] = [this.drag.start, raw];
      el('rect', { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), width: Math.abs(a[0] - b[0]), height: Math.abs(a[1] - b[1]), class: 'box-select' }, this.gPreview);
      return;
    }
    const noSnapTools = ['select', 'pan', 'erase'];
    const s = noSnapTools.includes(this.tool) ? { p: raw, kind: '' } : this.snap(raw, e, this.op && this.op.last);
    this.showSnap(s);
    this.mouse = s.p;
    this.onStatus({ coords: `x ${fmt(s.p[0])}   h ${fmt(-s.p[1])}`, snap: s.kind });
    this.preview(s.p, e);
  }

  onUp(e) {
    if (this.drag && this.drag.kind === 'box') {
      const a = this.drag.start, b = this.toWorld(e);
      const [x0, x1] = [Math.min(a[0], b[0]), Math.max(a[0], b[0])];
      const [y0, y1] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
      if (!this.drag.add) this.selected.clear();
      if (Math.abs(x1 - x0) > 0.5 || Math.abs(y1 - y0) > 0.5) {
        for (const el2 of this.elements) {
          const pts = el2.type === 'label' ? [el2.p] : el2.type === 'circle' || el2.type === 'arc'
            ? [[el2.c[0] - el2.r, el2.c[1] - el2.r], [el2.c[0] + el2.r, el2.c[1] + el2.r]] : keyPointsOf(el2);
          if (el2.type === 'xline') continue;
          if (pts.length && pts.every((p) => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1)) this.selected.add(el2.id);
        }
      }
      this.gPreview.innerHTML = '';
      this.render(); this.onSelection(this.selected.size);
    }
    this.drag = null;
  }

  onDbl() {
    if (this.op && (this.tool === 'polyline' || this.tool === 'curve')) this.finishPath(false);
  }

  // Keyboard handled by app; these are called from there.
  typed(text) {
    const t = text.trim();
    if (!t) return false;
    const num = (s) => parseFloat(s);
    const op = this.op;
    // absolute "x,h"
    const abs = t.match(/^(-?[\d.]+)\s*,\s*(-?[\d.]+)$/);
    const rel = t.match(/^@(-?[\d.]+)\s*,\s*(-?[\d.]+)$/);
    const polar = t.match(/^(-?[\d.]+)\s*(?:<\s*(-?[\d.]+))?$/);
    const from = op && op.last;
    const dirTo = (L, ang) => [from[0] + L * Math.cos(-ang * D2R), from[1] + L * Math.sin(-ang * D2R)];
    const cursorAng = () => (this.mouse && from ? -Math.atan2(this.mouse[1] - from[1], this.mouse[0] - from[0]) * R2D : 0);
    if (abs) { this.click([num(abs[1]), -num(abs[2])]); return true; }
    if (rel && from) { this.click([from[0] + num(rel[1]), from[1] - num(rel[2])]); return true; }
    if (!polar) return false;
    const a = num(polar[1]);
    const b = polar[2] !== undefined ? num(polar[2]) : null;
    if (!op) return false;
    switch (this.tool) {
      case 'segment': case 'polyline': case 'curve': case 'polygon':
        if (op.stage === 'side') return false;
        this.click(dirTo(a, b ?? cursorAng())); return true;
      case 'circle':
        this.add({ type: 'circle', c: op.c, r: a, style: this.style }); this.cancelOp(); return true;
      case 'arc':
        if (op.stage === 'start') { this.click(dirTo(a, b ?? cursorAng())); return true; }
        return false;
      case 'angle':
        this.add({ type: 'xline', p: op.last, d: [Math.cos(-a * D2R), Math.sin(-a * D2R)], style: 'construction' });
        this.cancelOp(); return true;
      case 'rotate':
        if (op.stage === 'ref' || op.stage === 'target') { this.doRotate(op.pivot, -a * D2R); return true; }
        return false;
      default: return false;
    }
  }

  // ------------------------------------------------------------ tool logic
  click(p, raw, evt) {
    const op = this.op;
    const st = this.style;
    switch (this.tool) {
      case 'point': this.add({ type: 'point', p }); break;
      case 'segment':
        if (!op) this.op = { last: p, prompt: 'Next point, or type a length ("30" or "30<45")' };
        else { this.add({ type: 'seg', a: op.last, b: p, style: st }); this.op = { last: p, prompt: 'Next point (chained). Esc to stop.' }; }
        break;
      case 'polyline': case 'curve':
        if (!op) this.op = { pts: [p], last: p, prompt: 'Next point. Enter or double-click to finish.' };
        else if (op.pts.length > 2 && dist2(p, op.pts[0]) < 1e-6) this.finishPath(true);
        else if (dist2(p, op.last) > 1e-6) { op.pts.push(p); op.last = p; }
        break;
      case 'polygon':
        if (!op) this.op = { stage: 'v2', v1: p, last: p, prompt: 'Second corner of the edge (or type "length<angle")' };
        else if (op.stage === 'v2') { this.op = { stage: 'side', v1: op.v1, v2: p, last: p, prompt: 'Click the side the polygon goes on' }; }
        else { this.add({ type: 'poly', pts: regularPolygon(op.v1, op.v2, this.polyN, p), closed: true, style: st }); this.cancelOp(); }
        break;
      case 'circle':
        if (!op) this.op = { c: p, last: p, prompt: 'Point on the circle, or type the radius' };
        else { this.add({ type: 'circle', c: op.c, r: dist2(op.c, p), style: st }); this.cancelOp(); }
        break;
      case 'arc':
        if (!op) this.op = { stage: 'start', c: p, last: p, prompt: 'Start point of the arc (or type a radius)' };
        else if (op.stage === 'start') {
          const a0 = Math.atan2(p[1] - op.c[1], p[0] - op.c[0]);
          this.op = { stage: 'end', c: op.c, r: dist2(op.c, p), a0, acc: 0, lastA: a0, last: op.c, prompt: 'Sweep to the end of the arc and click' };
        } else {
          const { a0, acc } = op;
          const [s0, s1] = acc >= 0 ? [a0, a0 + acc] : [a0 + acc, a0];
          if (Math.abs(acc) > 1e-3) this.add({ type: 'arc', c: op.c, r: op.r, a0: normAng(s0), a1: normAng(s1), style: st });
          this.cancelOp();
        }
        break;
      case 'vline': this.add({ type: 'xline', p, d: [0, 1], style: 'construction' }); break;
      case 'hline': this.add({ type: 'xline', p, d: [1, 0], style: 'construction' }); break;
      case 'angle':
        if (!op) this.op = { last: p, prompt: 'Type the angle in degrees (CCW from XY), or click a direction' };
        else { this.add({ type: 'xline', p: op.last, d: sub2(p, op.last), style: 'construction' }); this.cancelOp(); }
        break;
      case 'parallel': case 'perp': {
        if (!op) {
          const hit = this.hitTest(raw || p);
          const pr = hit && primsOf(hit).map((q) => ({ q, d: distToPrim(raw || p, q).d })).sort((x, y) => x.d - y.d)[0];
          if (!pr || pr.q.kind === 'circle') { this.status('Click a straight line first'); return; }
          const d = pr.q.kind === 'seg' ? sub2(pr.q.b, pr.q.a) : pr.q.d;
          this.op = { d, prompt: 'Now click the point the new line passes through' };
        } else {
          const d = this.tool === 'perp' ? [-op.d[1], op.d[0]] : op.d;
          this.add({ type: 'xline', p, d, style: 'construction' }); this.cancelOp();
        }
        break;
      }
      case 'divide': {
        const hit = this.hitTest(raw || p);
        if (!hit || (hit.type !== 'circle' && hit.type !== 'arc')) { this.status('Click on a circle'); return; }
        const pts = [];
        for (let k = 0; k < 12; k++) {
          const a = -k * 30 * D2R;
          pts.push({ type: 'point', p: [hit.c[0] + hit.r * Math.cos(a), hit.c[1] + hit.r * Math.sin(a)] });
        }
        this.add(...pts);
        break;
      }
      case 'rotate':
        if (!this.selected.size) { this.status('Select the items to rotate first (Select tool)'); return; }
        if (!op) this.op = { stage: 'ref', pivot: p, last: p, prompt: 'Type the rotation angle (CCW +), or click a reference point' };
        else if (op.stage === 'ref') this.op = { ...op, stage: 'target', ref: p, prompt: 'Click the target direction' };
        else {
          const a = Math.atan2(p[1] - op.pivot[1], p[0] - op.pivot[0]) - Math.atan2(op.ref[1] - op.pivot[1], op.ref[0] - op.pivot[0]);
          this.doRotate(op.pivot, a);
        }
        break;
      case 'copy':
        if (!this.selected.size) { this.status('Select the items to copy first (Select tool)'); return; }
        if (!op) this.op = { base: p, last: p, prompt: 'Click the destination point' };
        else { this.doTransform((q) => add2(q, sub2(p, op.base)), 0); this.cancelOp(); }
        break;
      case 'measure':
        if (!op) this.op = { last: p, prompt: 'Second point' };
        else {
          const v = sub2(p, op.last);
          const ang = normAng(-Math.atan2(v[1], v[0])) * R2D;
          const acute = Math.min(ang % 180, 180 - (ang % 180));
          this.op = null;
          this.status(`Length ${fmt(len2(v))} mm · angle ${fmt(ang)}° (${fmt(acute)}° with XY)`);
          this.gPreview.innerHTML = '';
          el('line', { x1: p[0] - v[0], y1: p[1] - v[1], x2: p[0], y2: p[1], class: 'measure' }, this.gPreview);
          return;
        }
        break;
      case 'label': {
        const text = window.prompt('Label text (e.g. a, b′, o₁)');
        if (text) this.add({ type: 'label', p, text });
        break;
      }
      default: break;
    }
    this.status();
    if (this.mouse) this.preview(this.mouse, evt);
  }

  finishPath(closed) {
    const op = this.op;
    if (!op || !op.pts) return;
    if (op.pts.length >= 2) this.add({ type: this.tool === 'curve' ? 'curve' : 'poly', pts: op.pts, closed, style: this.style });
    this.cancelOp();
  }

  doRotate(pivot, ang) {
    this.doTransform((q) => rot2(q, pivot, ang), ang);
    this.cancelOp();
  }
  doTransform(fp, ang) {
    const copies = [];
    for (const e of this.elements) {
      if (!this.selected.has(e.id)) continue;
      const c = JSON.parse(JSON.stringify(e));
      if (c.p) c.p = fp(c.p);
      if (c.a) c.a = fp(c.a);
      if (c.b) c.b = fp(c.b);
      if (c.c) c.c = fp(c.c);
      if (c.pts) c.pts = c.pts.map(fp);
      if (c.d) c.d = rot2(c.d, [0, 0], ang);
      if (c.type === 'arc') { c.a0 = normAng(c.a0 + ang); c.a1 = normAng(c.a1 + ang); }
      copies.push(c);
    }
    this.add(...copies);
    // select the copies so they can be transformed again
    this.selected = new Set(copies.map((c) => c.id));
    this.render(); this.onSelection(this.selected.size);
  }

  preview(p, evt) {
    const g = this.gPreview;
    const op = this.op;
    if (!op) { if (this.tool !== 'measure') g.innerHTML = ''; return; }
    g.innerHTML = '';
    const cls = `st-${this.style} pv`;
    const line = (a, b, c = cls) => el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: c }, g);
    const info = (txt) => {
      const t = el('text', { x: p[0] + 10 / this.view.scale, y: p[1] - 10 / this.view.scale, class: 'pv-info', 'font-size': 12 / this.view.scale }, g);
      t.textContent = txt;
    };
    const lenAng = (a, b) => {
      const v = sub2(b, a);
      return `${fmt(len2(v))} mm  ${fmt(normAng(-Math.atan2(v[1], v[0])) * R2D)}°`;
    };
    switch (this.tool) {
      case 'segment': case 'measure': line(op.last, p, this.tool === 'measure' ? 'measure' : cls); info(lenAng(op.last, p)); break;
      case 'polyline': case 'curve': {
        const pts = [...op.pts, p];
        const s = this.tool === 'curve' ? sampleSpline(pts, false, 10) : pts;
        el('polyline', { points: s.map((q) => q.join(',')).join(' '), class: cls, fill: 'none' }, g);
        info(lenAng(op.last, p));
        break;
      }
      case 'polygon':
        if (op.stage === 'v2') { line(op.v1, p); info(lenAng(op.v1, p)); }
        else el('polygon', { points: regularPolygon(op.v1, op.v2, this.polyN, p).map((q) => q.join(',')).join(' '), class: cls, fill: 'none' }, g);
        break;
      case 'circle':
        el('circle', { cx: op.c[0], cy: op.c[1], r: dist2(op.c, p), class: cls, fill: 'none' }, g);
        line(op.c, p, 'measure'); info(`r ${fmt(dist2(op.c, p))}`);
        break;
      case 'arc':
        if (op.stage === 'start') { line(op.c, p, 'measure'); info(`r ${fmt(dist2(op.c, p))}`); }
        else {
          const a = Math.atan2(p[1] - op.c[1], p[0] - op.c[0]);
          let d = a - op.lastA;
          while (d > Math.PI) d -= 2 * Math.PI;
          while (d < -Math.PI) d += 2 * Math.PI;
          op.acc = Math.max(-2 * Math.PI, Math.min(2 * Math.PI, op.acc + d));
          op.lastA = a;
          const [s0, s1] = op.acc >= 0 ? [op.a0, op.a0 + op.acc] : [op.a0 + op.acc, op.a0];
          if (Math.abs(op.acc) > 1e-3) el('path', { d: arcPath({ c: op.c, r: op.r, a0: s0, a1: s1 }), class: cls, fill: 'none' }, g);
          info(`${fmt(Math.abs(op.acc) * R2D)}°`);
        }
        break;
      case 'angle': {
        const d = sub2(p, op.last), L = len2(d) || 1;
        line(add2(op.last, scale2(d, -BIG / L)), add2(op.last, scale2(d, BIG / L)), 'st-construction pv');
        info(`${fmt(normAng(-Math.atan2(d[1], d[0])) * R2D)}°`);
        break;
      }
      case 'parallel': case 'perp': {
        const d = this.tool === 'perp' ? [-op.d[1], op.d[0]] : op.d, L = len2(d) || 1;
        line(add2(p, scale2(d, -BIG / L)), add2(p, scale2(d, BIG / L)), 'st-construction pv');
        break;
      }
      case 'rotate':
        line(op.pivot, p, 'measure');
        if (op.ref) {
          line(op.pivot, op.ref, 'measure');
          const a = Math.atan2(p[1] - op.pivot[1], p[0] - op.pivot[0]) - Math.atan2(op.ref[1] - op.pivot[1], op.ref[0] - op.pivot[0]);
          let ccw = normAng(-a) * R2D;
          if (ccw > 180) ccw -= 360;
          info(`${fmt(ccw)}°`);
        }
        break;
      case 'copy': line(op.base, p, 'measure'); break;
      default: break;
    }
  }

  // ------------------------------------------------------------ export for checker
  userPrims() {
    const out = [];
    for (const e of this.elements) {
      if (!e.style || e.type === 'xline') continue;
      for (const pr of primsOf(e)) out.push({ ...pr, style: e.style, id: e.id });
    }
    return out;
  }
  userKeyPoints() {
    const out = [];
    for (const e of this.elements) {
      if (e.type === 'xline' || e.type === 'label') continue;
      out.push(...keyPointsOf(e));
    }
    return out;
  }
  bounds() {
    const pts = this.userKeyPoints();
    if (!pts.length) return null;
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }
}

function arcPath(e) {
  const p0 = [e.c[0] + e.r * Math.cos(e.a0), e.c[1] + e.r * Math.sin(e.a0)];
  const p1 = [e.c[0] + e.r * Math.cos(e.a1), e.c[1] + e.r * Math.sin(e.a1)];
  const sweep = normAng(e.a1 - e.a0);
  if (sweep > 2 * Math.PI - 1e-3 || sweep < 1e-6 && e.a1 !== e.a0) {
    return `M ${e.c[0] - e.r} ${e.c[1]} a ${e.r} ${e.r} 0 1 1 ${2 * e.r} 0 a ${e.r} ${e.r} 0 1 1 ${-2 * e.r} 0`;
  }
  return `M ${p0[0]} ${p0[1]} A ${e.r} ${e.r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${p1[0]} ${p1[1]}`;
}

export function regularPolygon(v1, v2, n, sidePt) {
  const e = sub2(v2, v1), L = len2(e);
  if (L < 1e-9) return [v1];
  const nrm = [-e[1] / L, e[0] / L];
  const s = Math.sign(cross2(e, sub2(sidePt, v1))) || 1;
  const apothem = L / (2 * Math.tan(Math.PI / n));
  const mid = lerp2(v1, v2, 0.5);
  const c = add2(mid, scale2(nrm, s * apothem));
  let step = (2 * Math.PI) / n;
  if (dist2(rot2(v1, c, step), v2) > dist2(rot2(v1, c, -step), v2)) step = -step;
  const pts = [];
  for (let k = 0; k < n; k++) pts.push(rot2(v1, c, k * step));
  return pts;
}
