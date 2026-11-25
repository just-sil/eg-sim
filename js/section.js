// Module 3: section of solids and development of lateral surfaces.
//
// Every solid stands on its base on HP. It is turned into a convex mesh of faces
// (curved solids become RIM thin "smooth" facets), cut by the section plane, and
// projected. Because the remaining part of a convex solid is still convex, an edge is
// visible when any face next to it faces the viewer, just as in projector.js.
//
// Section planes (all perpendicular to HP or VP, as in the KTU syllabus):
//   H     horizontal, z = z0                      → sectional TV is the true shape
//   AIP   ⟂ VP, at `angle` to HP, through the axis at z0 (dir +1 rises to the right)
//   gen   ⟂ VP, parallel to the right extreme generator of a cone, `offset` inside it
//   V     ⟂ HP, ∥ VP, `dist` in front of the axis   → sectional FV is the true shape
//   AVP   ⟂ HP, at `angle` to VP, `dist` in front of the axis
// The part between the observer and the plane is removed: the upper part for H/AIP/gen,
// the front part for V/AVP.
//
// Development: lateral faces are unfolded with one affine map per face, so the cut
// faces, shortest paths and holes all map the same way.
import { D2R, R2D, sub3, add3, scale3, dot3, cross3, norm3, len3, dist2 } from './geometry.js';
import { makeSolid, solidName, baseShapeName, baseRadii, RIM, GEN_EVERY } from './solids.js';
import { dedupe } from './projector.js';

const VIEWDIR = { FV: [0, 1, 0], TV: [0, 0, 1] };
const sheet = (p, v) => (v === 'FV' ? [p[0], -p[2]] : [p[0], p[1]]);
const EPS = 1e-7;
const CLEAR = 15; // mm in front of VP
const LEFT = 25; // mm from the left end of XY
const GAP = 40; // mm between views
const key3 = (p) => `${Math.round(p[0] * 1e5)},${Math.round(p[1] * 1e5)},${Math.round(p[2] * 1e5)}`;
const f1 = (x) => (Math.round(x * 10) / 10).toString();
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sc2 = (a, s) => [a[0] * s, a[1] * s];
const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
const norm2 = (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };

// ------------------------------------------------------------ mesh
function buildMesh(problem) {
  const spec = problem.solid;
  const s = makeSolid(spec, problem.orient || 'edge');
  const { R } = baseRadii(spec);
  const rot = (problem.rot || 0) * D2R;
  const c0 = [LEFT + R, CLEAR + R, 0];
  const place = (p) => [c0[0] + p[0] * Math.cos(rot) - p[1] * Math.sin(rot), c0[1] + p[0] * Math.sin(rot) + p[1] * Math.cos(rot), p[2]];
  const P = s.pts.map(place);
  const faces = [];
  let n, verts, apex = null, tops = null;
  if (!s.curved) {
    const prism = spec.type === 'prism';
    n = spec.rect ? 4 : spec.n;
    verts = P.slice(0, n);
    if (prism) tops = P.slice(n, 2 * n); else apex = P[n];
    s.faces.forEach((f, fi) => {
      const pts = f.map((k) => P[k]);
      if (fi === 0) faces.push({ pts, tag: 'base' });
      else if (prism && fi === 1) faces.push({ pts, tag: 'top' });
      else {
        const i = fi - (prism ? 2 : 1);
        faces.push({ pts, tag: 'lat', i });
      }
    });
  } else {
    const { rim, top } = s.curved;
    n = RIM;
    verts = rim.map((k) => P[k]);
    faces.push({ pts: verts.slice().reverse(), tag: 'base' });
    if (top) {
      tops = top.map((k) => P[k]);
      faces.push({ pts: tops.slice(), tag: 'top' });
      for (let k = 0; k < n; k++) {
        const k2 = (k + 1) % n;
        faces.push({ pts: [verts[k], verts[k2], tops[k2], tops[k]], tag: 'lat', i: k, smooth: true });
      }
    } else {
      apex = P[s.curved.apex];
      for (let k = 0; k < n; k++) faces.push({ pts: [verts[k], verts[(k + 1) % n], apex], tag: 'lat', i: k, smooth: true });
    }
  }
  const h = spec.h;
  return {
    spec, faces, n, verts, tops, apex, curved: s.curved ? spec.type : null,
    B: [c0[0], c0[1], 0], T: [c0[0], c0[1], h], h, R, c0,
    labels: s.curved ? null : s.labels,
  };
}

function faceNormal(pts, center) {
  // Newell normal, turned outwards
  let n = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    n = [n[0] + (a[1] - b[1]) * (a[2] + b[2]), n[1] + (a[2] - b[2]) * (a[0] + b[0]), n[2] + (a[0] - b[0]) * (a[1] + b[1])];
  }
  n = norm3(n);
  const fc = pts.reduce((s, p) => add3(s, scale3(p, 1 / pts.length)), [0, 0, 0]);
  return dot3(n, sub3(fc, center)) < 0 ? scale3(n, -1) : n;
}
function meshCenter(mesh) {
  const all = mesh.faces.flatMap((f) => f.pts);
  return all.reduce((s, p) => add3(s, scale3(p, 1 / all.length)), [0, 0, 0]);
}

// ------------------------------------------------------------ plane
function makePlane(problem, M) {
  const c = problem.cut;
  if (!c) return null;
  const [X0, Y0] = M.c0;
  switch (c.type) {
    case 'H': return { type: c.type, n: [0, 0, 1], c: c.z, trace: 'FV' };
    case 'AIP': {
      const a = c.angle * D2R, d = c.dir || 1;
      const n = [-d * Math.sin(a), 0, Math.cos(a)];
      return { type: c.type, n, c: dot3(n, [X0, Y0, c.z]), trace: 'FV' };
    }
    case 'gen': {
      const g = Math.atan2(M.h, M.R);
      const n = [Math.sin(g), 0, Math.cos(g)];
      return { type: c.type, n, c: dot3(n, [X0 + M.R, Y0, 0]) - c.offset, trace: 'FV', gamma: g * R2D };
    }
    case 'V': case 'AVP': {
      const a = (c.type === 'V' ? 0 : c.angle) * D2R, s = c.slope || -1;
      const n = [-s * Math.sin(a), Math.cos(a), 0];
      return { type: c.type, n, c: dot3(n, [X0, Y0, 0]) + c.dist, trace: 'TV' };
    }
    default: throw new Error('unknown section plane ' + c.type);
  }
}

// ------------------------------------------------------------ clipping
function clipMesh(mesh, plane) {
  const sd = (p) => dot3(plane.n, p) - plane.c;
  const cut = new Map();
  const inter = (a, b) => {
    const [p, q] = key3(a) < key3(b) ? [a, b] : [b, a];
    const dp = sd(p), dq = sd(q);
    return add3(p, scale3(sub3(q, p), dp / (dp - dq)));
  };
  const faces = [];
  for (const f of mesh.faces) {
    const out = [];
    const L = f.pts.length;
    for (let k = 0; k < L; k++) {
      const cur = f.pts[k], nxt = f.pts[(k + 1) % L];
      const dc = sd(cur), dn = sd(nxt);
      if (dc <= EPS) out.push(cur);
      if (Math.abs(dc) <= EPS) cut.set(key3(cur), { p: cur, mark: markOf(f, k, mesh, true) });
      if ((dc < -EPS && dn > EPS) || (dc > EPS && dn < -EPS)) {
        const x = inter(cur, nxt);
        out.push(x);
        const kx = key3(x);
        const m = markOf(f, k, mesh, false);
        if (!cut.has(kx) || m) cut.set(kx, { p: x, mark: m || cut.get(kx)?.mark });
      }
    }
    if (out.length >= 3) faces.push({ ...f, pts: out });
  }
  // the section polygon, ordered around its centre
  const pts = [...cut.values()];
  let section = null;
  if (pts.length >= 3) {
    const c = pts.reduce((s, q) => add3(s, scale3(q.p, 1 / pts.length)), [0, 0, 0]);
    const u = norm3(Math.abs(plane.n[2]) < 0.9 ? cross3(plane.n, [0, 0, 1]) : cross3(plane.n, [1, 0, 0]));
    const w = cross3(plane.n, u);
    pts.sort((a, b) => Math.atan2(dot3(sub3(a.p, c), w), dot3(sub3(a.p, c), u)) - Math.atan2(dot3(sub3(b.p, c), w), dot3(sub3(b.p, c), u)));
    section = pts;
    faces.push({ pts: pts.map((q) => q.p), tag: 'cut' });
  }
  return { ...mesh, faces, section };
}
// Is the cut point worth a number? Every edge of a polyhedron; generators 1–12 and the
// base/top circle of a curved solid.
function markOf(f, k, mesh, vertex) {
  if (!mesh.curved) return true;
  if (f.tag !== 'lat') return 'ring';
  const L = f.pts.length;
  // seam edges: quad [r k, r k+1, t k+1, t k] → edge 1 is seam k+1, edge 3 seam k; cone tri → 1 is seam k+1, 2 seam k
  let seam = null;
  if (L === 4) seam = k === 1 ? f.i + 1 : k === 3 ? f.i : null;
  else seam = k === 1 ? f.i + 1 : k === 2 ? f.i : null;
  if (vertex) return false;
  if (seam === null) return 'ring';
  return (seam % mesh.n) % GEN_EVERY === 0;
}

// ------------------------------------------------------------ projection
function meshEdges(mesh) {
  const map = new Map();
  mesh.faces.forEach((f, fi) => {
    const L = f.pts.length;
    for (let k = 0; k < L; k++) {
      const a = f.pts[k], b = f.pts[(k + 1) % L];
      const ka = key3(a), kb = key3(b);
      if (ka === kb) continue;
      const key = ka < kb ? ka + '|' + kb : kb + '|' + ka;
      if (!map.has(key)) map.set(key, { a, b, faces: [] });
      map.get(key).faces.push(fi);
    }
  });
  return map;
}

function projectMesh(mesh, view, { hatch = false } = {}) {
  const v = VIEWDIR[view];
  const center = meshCenter(mesh);
  const normals = mesh.faces.map((f) => faceNormal(f.pts, center));
  const segs = [];
  for (const e of meshEdges(mesh).values()) {
    const fs = e.faces;
    const a = sheet(e.a, view), b = sheet(e.b, view);
    if (fs.length === 2 && mesh.faces[fs[0]].smooth && mesh.faces[fs[1]].smooth) {
      const d0 = dot3(normals[fs[0]], v), d1 = dot3(normals[fs[1]], v);
      const s0 = d0 > EPS, s1 = d1 > EPS;
      if (s0 !== s1 && Math.abs(d0) > EPS && Math.abs(d1) > EPS) { segs.push({ a, b, style: 'visible', kind: 'sil' }); continue; }
      const i0 = mesh.faces[fs[0]].i, i1 = mesh.faces[fs[1]].i;
      const seam = (i1 - i0 + mesh.n) % mesh.n === 1 ? i1 : i0;
      // generators: only the visible ones (hidden generators just clutter the drawing)
      if (seam % GEN_EVERY === 0 && (d0 > -EPS || d1 > -EPS)) segs.push({ a, b, style: 'visible', kind: 'gen', optional: true });
      continue;
    }
    const vis = fs.some((fi) => dot3(normals[fi], v) > -EPS);
    segs.push({ a, b, style: vis ? 'visible' : 'hidden', kind: 'edge' });
  }
  // axis (only the part that remains)
  const ax = clipSegment(mesh.B, mesh.T, mesh.plane);
  if (ax) segs.push({ a: sheet(ax[0], view), b: sheet(ax[1], view), style: 'axis', kind: 'axis', optional: true });
  const out = dedupe(segs);
  // hidden lines are usually left out of a sectional view, so accept them either way there
  if (hatch) for (const s of out) if (s.style === 'hidden') s.optional = true;
  if (hatch) {
    const ci = mesh.faces.findIndex((f) => f.tag === 'cut');
    if (ci >= 0 && dot3(normals[ci], v) > 0.05) out.push(...hatchPoly(mesh.faces[ci].pts.map((p) => sheet(p, view))));
  }
  return out;
}

function clipSegment(a, b, plane) {
  if (!plane) return [a, b];
  const sa = dot3(plane.n, a) - plane.c, sb = dot3(plane.n, b) - plane.c;
  if (sa > 0 && sb > 0) return null;
  if (sa <= 0 && sb <= 0) return [a, b];
  const x = add3(a, scale3(sub3(b, a), sa / (sa - sb)));
  return sa <= 0 ? [a, x] : [x, b];
}

/** Section lines: thin, 45°, 3 mm apart, inside a convex polygon. */
function hatchPoly(poly, gap = 3) {
  const n = [Math.SQRT1_2, Math.SQRT1_2];
  const ds = poly.map((p) => dot2(p, n));
  const lo = Math.min(...ds), hi = Math.max(...ds);
  const out = [];
  for (let c = Math.ceil(lo / gap) * gap; c < hi; c += gap) {
    const hits = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length];
      const dp = dot2(p, n) - c, dq = dot2(q, n) - c;
      if ((dp < 0) !== (dq < 0)) hits.push(add2(p, sc2(sub2(q, p), dp / (dp - dq))));
    }
    if (hits.length >= 2) out.push({ a: hits[0], b: hits[1], style: 'construction', kind: 'hatch', optional: true });
  }
  return out;
}

/** Optional segments that are not already covered by a required one. */
function withOptional(req, opt) {
  const near = (p, s) => {
    const d = sub2(s.b, s.a), L = dot2(d, d) || 1;
    const t = Math.max(0, Math.min(1, dot2(sub2(p, s.a), d) / L));
    return dist2(p, add2(s.a, sc2(d, t))) < 0.1;
  };
  return req.concat(opt.filter((o) => !req.some((r) => near(o.a, r) && near(o.b, r))).map((o) => ({ ...o, optional: true, kind: o.kind === 'axis' ? 'axis' : 'removed' })));
}

function keyPtsOf(segs) {
  const out = [];
  for (const s of segs) {
    if (s.optional) continue;
    for (const p of [s.a, s.b]) if (!out.some((q) => dist2(p, q) < 0.3)) out.push(p);
  }
  return out;
}

function traceLine(plane, view, bounds) {
  // the plane's trace (VT in the FV, HT in the TV) across the view, 10 mm beyond it
  const n2 = view === 'FV' ? [plane.n[0], -plane.n[2]] : [plane.n[0], plane.n[1]];
  const l = Math.hypot(n2[0], n2[1]);
  const nn = [n2[0] / l, n2[1] / l];
  // in sheet coords: nn·q = c / l   (FV: z = -y, so n·p = n0 x + n2 z = n0 x - n2 y)
  const q0 = sc2(nn, plane.c / l);
  const d = [-nn[1], nn[0]];
  const ts = [[bounds[0], bounds[1]], [bounds[2], bounds[1]], [bounds[0], bounds[3]], [bounds[2], bounds[3]]].map((c) => dot2(sub2(c, q0), d));
  return { a: add2(q0, sc2(d, Math.min(...ts) - 10)), b: add2(q0, sc2(d, Math.max(...ts) + 10)), style: 'axis', kind: 'plane', optional: true };
}

const boundsOf = (segs) => {
  let b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const s of segs) for (const p of [s.a, s.b]) b = [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])];
  return b;
};

// ------------------------------------------------------------ labels
function labelPts(items, prime, sub = '') {
  // items: [{p:[x,y], text}]
  const groups = [];
  for (const it of items) {
    const g = groups.find((q) => dist2(q.p, it.p) < 0.4);
    const t = it.text + sub + prime;
    if (g) { if (!g.texts.includes(t)) g.texts.push(t); } else groups.push({ p: it.p, texts: [t] });
  }
  if (!groups.length) return [];
  const cen = groups.reduce((s, g) => add2(s, sc2(g.p, 1 / groups.length)), [0, 0]);
  return groups.map((g) => {
    let d = sub2(g.p, cen);
    d = Math.hypot(d[0], d[1]) < 0.5 ? [0.7, -0.7] : norm2(d);
    return { p: g.p, at: add2(g.p, sc2(d, 3.4)), text: g.texts.join(',') };
  });
}
function baseLabels(M, view) {
  if (!M.labels) return [];
  const items = M.verts.map((p, i) => ({ p: sheet(p, view), text: LETTERS[i] }));
  if (M.apex) items.push({ p: sheet(M.apex, view), text: 'o' });
  return labelPts(items, view === 'FV' ? '′' : '');
}
function numberedSection(section) {
  if (!section) return [];
  // number the marked points in polygon order, starting from the left-most
  const marked = section.filter((q) => q.mark);
  if (!marked.length) return [];
  let start = 0;
  marked.forEach((q, i) => { if (q.p[0] < marked[start].p[0] - 1e-6 || (Math.abs(q.p[0] - marked[start].p[0]) < 1e-6 && q.p[2] > marked[start].p[2])) start = i; });
  return marked.map((_, i) => marked[(start + i) % marked.length]).map((q, i) => ({ p3: q.p, text: String(i + 1) }));
}

// ------------------------------------------------------------ true shape
function trueShape(R, plane, clearOf) {
  const sec = R.section;
  const fv = plane.trace === 'FV';
  const f = (p) => sheet(p, plane.trace);
  const depth = (p) => (fv ? p[1] : p[2]);
  const ns = norm2(fv ? [plane.n[0], -plane.n[2]] : [plane.n[0], plane.n[1]]);
  const p0 = f(sec[0].p);
  let D = 0;
  for (const s of clearOf) for (const q of [s.a, s.b]) D = Math.max(D, dot2(sub2(q, p0), ns));
  D += 15;
  const map = (p) => add2(f(p), sc2(ns, D + depth(p)));
  const poly = sec.map((q) => map(q.p));
  const segs = [];
  const curved = !!R.curved;
  for (let i = 0; i < poly.length; i++) segs.push({ a: poly[i], b: poly[(i + 1) % poly.length], style: 'visible', kind: curved ? 'curve' : 'edge' });
  segs.push(...hatchPoly(poly));
  // construction: x1y1 parallel to the trace, perpendiculars from the numbered points
  const dirT = [-ns[1], ns[0]];
  const ts = poly.map((q) => dot2(sub2(q, p0), dirT));
  const xa = add2(add2(p0, sc2(ns, D)), sc2(dirT, Math.min(...ts) - 12)), xb = add2(add2(p0, sc2(ns, D)), sc2(dirT, Math.max(...ts) + 12));
  const nums = numberedSection(sec);
  const cons = [{ a: xa, b: xb, style: 'construction' }];
  for (const q of nums) cons.push({ a: f(q.p3), b: map(q.p3), style: 'construction' });
  const labels = labelPts(nums.map((q) => ({ p: map(q.p3), text: q.text })), '', '₁');
  labels.push({ p: xa, at: add2(xa, sc2(ns, -3)), text: 'x₁' }, { p: xb, at: add2(xb, sc2(ns, -3)), text: 'y₁' });
  return { segs: dedupe(segs.filter((s) => s.kind !== 'hatch')).concat(segs.filter((s) => s.kind === 'hatch')), cons, labels, poly };
}

function classifySection(problem, M, plane, R) {
  const s = problem.solid;
  if (!R.section) return 'none';
  if (!M.curved) return `${R.section.length}-sided polygon`;
  const cut = problem.cut;
  if (cut.type === 'H') return 'circle';
  if (s.type === 'cylinder') return cut.type === 'AIP' ? (R.faces.some((f) => f.tag === 'base') && R.section.some((q) => Math.abs(q.p[2]) < 1e-6) ? 'part ellipse' : 'ellipse') : 'rectangle';
  // cone: compare the plane's angle to HP with the generator's
  const g = Math.atan2(M.h, M.R) * R2D;
  const a = Math.acos(Math.min(1, Math.abs(plane.n[2]))) * R2D;
  if (Math.abs(a - g) < 0.5) return 'parabola';
  if (a > g) return 'hyperbola';
  return R.section.some((q) => Math.abs(q.p[2]) < 1e-6) ? 'part ellipse' : 'ellipse';
}

// ------------------------------------------------------------ development
function devMaps(M, seam, dir, origin) {
  const n = M.n, maps = new Array(n);
  const radial = !!M.apex;
  const kind = M.curved;
  const order = [];
  for (let j = 0; j < n; j++) order.push(dir > 0 ? (seam + j) % n : (seam - 1 - j + 2 * n) % n);
  if (!radial) {
    let X = 0;
    const arc = kind === 'cylinder' ? (Math.PI * M.spec.d) / n : null;
    for (const i of order) {
      const A = dir > 0 ? M.verts[i] : M.verts[(i + 1) % n];
      const B = dir > 0 ? M.verts[(i + 1) % n] : M.verts[i];
      const w = arc || len3(sub3(B, A));
      const At = dir > 0 ? M.tops[i] : M.tops[(i + 1) % n];
      maps[i] = { o3: A, e1: sub3(B, A), e2: sub3(At, A), o2: [origin[0] + X, origin[1]], f1: [w, 0], f2: [0, -M.h], A2: [origin[0] + X, origin[1]] };
      X += w;
    }
    return { maps, order, total: X, radial };
  }
  const O = M.apex;
  const L = (p) => len3(sub3(p, O));
  const gam = (i) => {
    if (kind === 'cone') return ((2 * Math.PI * (M.spec.d / 2)) / n) / len3(sub3(M.verts[0], O));
    const a = sub3(M.verts[i], O), b = sub3(M.verts[(i + 1) % n], O);
    return Math.acos(Math.max(-1, Math.min(1, dot3(a, b) / (len3(a) * len3(b)))));
  };
  const total = order.reduce((s, i) => s + gam(i), 0);
  let ang = Math.PI / 2 - total / 2;
  for (const i of order) {
    const A = dir > 0 ? M.verts[i] : M.verts[(i + 1) % n];
    const B = dir > 0 ? M.verts[(i + 1) % n] : M.verts[i];
    const g = gam(i);
    const VA = [L(A) * Math.cos(ang), L(A) * Math.sin(ang)], VB = [L(B) * Math.cos(ang + g), L(B) * Math.sin(ang + g)];
    maps[i] = { o3: O, e1: sub3(A, O), e2: sub3(B, O), o2: origin, f1: VA, f2: VB, A2: add2(origin, VA) };
    ang += g;
  }
  return { maps, order, total, radial };
}
function mapTo2D(m, p) {
  const d = sub3(p, m.o3);
  const a = dot3(m.e1, m.e1), b = dot3(m.e1, m.e2), c = dot3(m.e2, m.e2);
  const r1 = dot3(m.e1, d), r2 = dot3(m.e2, d);
  const det = a * c - b * b;
  const l = (r1 * c - r2 * b) / det, u = (a * r2 - b * r1) / det;
  return add2(m.o2, add2(sc2(m.f1, l), sc2(m.f2, u)));
}
function mapTo3D(m, q) {
  const d = sub2(q, m.o2);
  const det = m.f1[0] * m.f2[1] - m.f1[1] * m.f2[0];
  const l = (d[0] * m.f2[1] - d[1] * m.f2[0]) / det, u = (m.f1[0] * d[1] - m.f1[1] * d[0]) / det;
  return add3(m.o3, add3(scale3(m.e1, l), scale3(m.e2, u)));
}

/** Development of the lateral surface of the (possibly cut) solid R. */
function development(M, R, seam, origin, extra = {}) {
  const dm = devMaps(M, seam, extra.dir || 1, origin);
  const edges = meshEdges(R);
  const segs = [];
  const n = M.n;
  R.faces.forEach((f) => {
    if (f.tag !== 'lat') return;
    const m = dm.maps[f.i];
    const L = f.pts.length;
    for (let k = 0; k < L; k++) {
      const a = f.pts[k], b = f.pts[(k + 1) % L];
      const ka = key3(a), kb = key3(b);
      if (ka === kb) continue;
      const e = edges.get(ka < kb ? ka + '|' + kb : kb + '|' + ka);
      const other = e ? e.faces.map((fi) => R.faces[fi]).find((g) => g !== f) : null;
      const A = mapTo2D(m, a), B = mapTo2D(m, b);
      if (other && other.tag === 'lat') {
        const j = other.i;
        const shared = (j - f.i + n) % n === 1 ? j : f.i;
        if (shared === seam) {
          if (extra.hole) for (const piece of outsideHole(a, b, extra.hole)) segs.push({ a: mapTo2D(m, piece[0]), b: mapTo2D(m, piece[1]), style: 'visible', kind: 'edge' });
          else segs.push({ a: A, b: B, style: 'visible', kind: 'edge' });
          continue;
        }
        if (M.curved && shared % GEN_EVERY !== 0) continue;
        if (extra.hole) { for (const piece of outsideHole(a, b, extra.hole)) segs.push({ a: mapTo2D(m, piece[0]), b: mapTo2D(m, piece[1]), style: 'construction', kind: 'fold', optional: true, anyStyle: true }); continue; }
        segs.push({ a: A, b: B, style: 'construction', kind: 'fold', optional: true, anyStyle: true });
      } else {
        segs.push({ a: A, b: B, style: 'visible', kind: M.curved && other && other.tag !== 'base' && other.tag !== 'top' ? 'curve' : 'edge' });
      }
    }
  });
  const out = dedupe(segs.filter((s) => !s.optional)).concat(dedupe(segs.filter((s) => s.optional)));
  // fold-line letters
  const labels = [];
  const step = M.curved ? GEN_EVERY : 1;
  dm.order.forEach((i, j) => {
    const m = dm.maps[i];
    const vi = (extra.dir || 1) > 0 ? i : (i + 1) % n;
    if (vi % step) return;
    const text = M.curved ? String(vi / step + 1) : LETTERS[vi].toUpperCase();
    const p = m.A2;
    const away = dm.radial ? norm2(sub2(p, origin)) : [0, 1];
    labels.push({ p, at: add2(p, sc2(away, 4)), text });
    if (j === 0) {
      // the seam appears again at the far end
      const last = dm.maps[dm.order[n - 1]];
      const q = mapTo2D(last, (extra.dir || 1) > 0 ? M.verts[seam] : M.verts[seam]);
      const away2 = dm.radial ? norm2(sub2(q, origin)) : [0, 1];
      labels.push({ p: q, at: add2(q, sc2(away2, 4)), text: M.curved ? String(seam / step + 1) : LETTERS[seam].toUpperCase() });
    }
  });
  return { segs: out, labels, dm };
}

function outsideHole(a, b, hole) {
  // pieces of the segment a–b that are outside the horizontal hole (axis ⟂ VP)
  const N = 40, out = [];
  let run = null;
  for (let i = 0; i <= N; i++) {
    const p = add3(a, scale3(sub3(b, a), i / N));
    const inside = (p[0] - hole.x) ** 2 + (p[2] - hole.z) ** 2 < hole.r ** 2 - 1e-6;
    if (!inside) { if (!run) run = [p, p]; else run[1] = p; } else if (run) { out.push(run); run = null; }
  }
  if (run) out.push(run);
  return out.filter((r) => len3(sub3(r[1], r[0])) > 0.1);
}

// ------------------------------------------------------------ solver
const PLANE_NAME = {
  H: 'horizontal section plane (∥ HP)', AIP: 'auxiliary inclined plane (⟂ VP, inclined to HP)', gen: 'auxiliary inclined plane parallel to a generator',
  V: 'vertical section plane (∥ VP)', AVP: 'auxiliary vertical plane (⟂ HP, inclined to VP)',
};

export function solveM3(problem) {
  const M = buildMesh(problem);
  const plane = makePlane(problem, M);
  const R = plane ? clipMesh(M, plane) : M;
  R.plane = plane;
  M.plane = null;
  const numbers = { h: M.h, R: M.R };
  const hp = !plane || plane.trace === 'FV'; // the plane shows as a line in the FV
  const views = [];
  const groups = {};

  // ---------- FV and TV ----------
  const fullFV = projectMesh(M, 'FV'), fullTV = projectMesh(M, 'TV');
  let FV, TV;
  if (!plane) { FV = fullFV; TV = fullTV; } else if (hp) {
    FV = withOptional(projectMesh(R, 'FV'), fullFV);
    TV = projectMesh(R, 'TV', { hatch: true });
  } else {
    FV = projectMesh(R, 'FV', { hatch: true });
    TV = withOptional(projectMesh(R, 'TV'), fullTV);
  }
  if (problem.hole) ({ FV, TV } = holeViews(M, problem.hole, FV, TV));
  if (plane) {
    const tv = plane.trace;
    const tl = traceLine(plane, tv, boundsOf(tv === 'FV' ? fullFV : fullTV));
    (tv === 'FV' ? FV : TV).push(tl);
    groups.plane = { segs: [tl], labels: [{ p: tl.b, at: add2(tl.b, [2, -2]), text: tv === 'FV' ? 'VT' : 'HT' }] };
  }

  const sectional = (v) => plane && ((v === 'TV') === hp);
  views.push({ key: 'FV', name: sectional('FV') ? 'Sectional front view' : 'Front view', segs: FV, side: 'above' });
  views.push({ key: 'TV', name: sectional('TV') ? 'Sectional top view' : 'Top view', segs: TV, side: 'below', flipY: true });

  // ---------- numbered section points ----------
  const nums = plane ? numberedSection(R.section) : [];
  groups.fvFull = { segs: fullFV.filter((s) => s.kind !== 'axis'), labels: baseLabels(M, 'FV') };
  groups.tvFull = { segs: fullTV.filter((s) => s.kind !== 'axis'), labels: baseLabels(M, 'TV') };
  groups.axes = { segs: [...fullFV, ...fullTV].filter((s) => s.kind === 'axis') };
  groups.fvSec = { segs: FV.filter((s) => s.kind !== 'plane' && s.kind !== 'removed' && s.kind !== 'hatch') };
  groups.tvSec = { segs: TV.filter((s) => s.kind !== 'plane' && s.kind !== 'removed' && s.kind !== 'hatch') };
  groups.hatch = { segs: [...FV, ...TV].filter((s) => s.kind === 'hatch') };
  if (plane) {
    const tr = plane.trace, other = tr === 'FV' ? 'TV' : 'FV';
    groups.numTrace = { labels: labelPts(nums.map((q) => ({ p: sheet(q.p3, tr), text: q.text })), tr === 'FV' ? '′' : '') };
    groups.numOther = { labels: labelPts(nums.map((q) => ({ p: sheet(q.p3, other), text: q.text })), other === 'FV' ? '′' : '') };
    groups.proj = { segs: nums.map((q) => ({ a: sheet(q.p3, 'FV'), b: sheet(q.p3, 'TV'), style: 'construction' })) };
    numbers.sectionShape = classifySection(problem, M, plane, R);
  }

  // ---------- true shape ----------
  const wantTS = plane && !problem.develop && problem.cut.type !== 'H' && problem.cut.type !== 'V';
  if (wantTS) {
    const ts = trueShape(R, plane, plane.trace === 'FV' ? fullFV : fullTV);
    views.push({ key: 'TS', name: 'True shape of the section', segs: ts.segs, side: 'free', flipY: true });
    groups.tsCons = { segs: ts.cons, labels: ts.labels.filter((l) => l.text.startsWith('x') || l.text.startsWith('y')) };
    groups.ts = { segs: ts.segs, labels: ts.labels.filter((l) => !l.text.startsWith('x') && !l.text.startsWith('y')) };
    numbers.sectionArea = polyArea(ts.poly);
  }

  // ---------- development ----------
  if (problem.develop || problem.path) {
    const others = views.flatMap((v) => v.segs);
    const bx = boundsOf(others);
    const xs = bx[2] + GAP;
    let origin;
    if (M.apex) {
      const Lg = len3(sub3(M.verts[0], M.apex));
      origin = [xs + Lg, -M.h - 10];
      numbers.slant = Lg;
      if (M.curved) numbers.sector = (360 * (M.spec.d / 2)) / Lg;
    } else origin = [xs, 0];
    // seam: the start of the path, else the shortest remaining line, else the first fold
    const step = M.curved ? GEN_EVERY : 1;
    const seams = [];
    for (let s = 0; s < M.n; s += step) seams.push(s);
    let seam = 0;
    let dir = 1;
    if (problem.path) ({ seam, dir } = pathSeam(M, problem.path));
    else if (plane) {
      const len = (s) => { const l = clipSegment(M.verts[s], M.tops ? M.tops[s] : M.apex, plane); return l ? len3(sub3(l[1], l[0])) : 0; };
      seam = seams.reduce((b, s) => (len(s) < len(b) - 1e-6 ? s : b), seams[0]);
    }
    const hole = problem.hole ? holeSpec(M, problem.hole) : null;
    const dev = development(M, R, seam, origin, { dir, hole });
    let devSegs = dev.segs;
    if (hole) devSegs = devSegs.concat(holeOnDev(M, hole, dev.dm));
    let pathDev = [];
    if (problem.path) {
      const p = shortestPath(M, problem.path, dev.dm, seam, dir);
      pathDev = p.dev;
      numbers.pathLength = p.length;
      for (const v of views) {
        const add = p[v.key];
        if (add && add.length) v.segs.push(...add);
      }
      groups.pathViews = { segs: [...(p.FV || []), ...(p.TV || [])] };
    }
    devSegs = devSegs.concat(pathDev);
    numbers.perimeter = M.apex ? null : dev.dm.total;
    const alts = [];
    if (!problem.path) {
      for (const s of seams) if (s !== seam) {
        const d2 = development(M, R, s, origin, { hole });
        alts.push({ segs: hole ? d2.segs.concat(holeOnDev(M, hole, d2.dm)) : d2.segs });
      }
    }
    views.push({ key: 'DEV', name: problem.path ? 'Development with the path' : 'Development', segs: devSegs, side: 'free', flipY: true, alts });
    groups.dev = { segs: devSegs.filter((s) => s.kind !== 'path'), labels: dev.labels };
    groups.devPath = { segs: pathDev };
  }

  for (const v of views) {
    // optional lines (generators, hatching, VT/HT, fold lines, the removed part) may be drawn in any line type
    for (const seg of [...v.segs, ...(v.alts || []).flatMap((a) => a.segs)]) if (seg.optional) seg.anyStyle = true;
    v.keyPts = keyPtsOf(v.segs);
    for (const a of v.alts || []) a.keyPts = keyPtsOf(a.segs);
  }

  // ---------- 3D ----------
  const stage = {
    no: 1, title: plane ? 'After cutting' : 'Solid', views,
    solid: meshSolid(R), FV: { segs: FV.filter((q) => q.kind !== 'removed') }, TV: { segs: TV.filter((q) => q.kind !== 'removed') }, plane: plane ? planeQuad(M, plane) : null,
  };
  const sol = { module: 3, problem, frame: 'HP', stages: [stage], numbers, groups, views };
  sol.steps = buildSteps(sol, M, plane);
  sol.hints = buildHints(sol, M, plane);
  sol.stats = { section: R.section, R, M, plane };
  return sol;
}

function polyArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return Math.abs(a / 2);
}

// A mesh as a View3D "solid": points, faces as index lists, drawn edges only.
function meshSolid(R) {
  const pts = [], idx = new Map();
  const id = (p) => { const k = key3(p); if (!idx.has(k)) { idx.set(k, pts.length); pts.push(p); } return idx.get(k); };
  const faces = R.faces.map((f) => f.pts.map(id));
  const edges = [];
  for (const e of meshEdges(R).values()) {
    const fs = e.faces.map((i) => R.faces[i]);
    if (fs.length === 2 && fs[0].smooth && fs[1].smooth) {
      const i0 = fs[0].i, i1 = fs[1].i;
      const seam = (i1 - i0 + R.n) % R.n === 1 ? i1 : i0;
      if (seam % GEN_EVERY) continue;
    }
    edges.push({ a: id(e.a), b: id(e.b) });
  }
  const B = pts.length;
  const ax = clipSegment(R.B, R.T, R.plane) || [R.B, R.B];
  pts.push(ax[0], ax[1]);
  const keyIdx = [];
  if (R.section) for (const q of R.section) if (q.mark) keyIdx.push(id(q.p));
  return { pts, faces, edges, B, T: B + 1, keyIdx, curved: null, cutFace: R.faces.findIndex((f) => f.tag === 'cut') };
}
function planeQuad(M, plane) {
  // a rectangle of the section plane, a little larger than the solid
  const n = plane.n;
  const c = [M.c0[0], M.c0[1], M.h / 2];
  const p0 = add3(c, scale3(n, plane.c - dot3(n, c)));
  const u = norm3(Math.abs(n[2]) < 0.9 ? cross3(n, [0, 0, 1]) : cross3(n, [0, 1, 0]));
  const w = cross3(n, u);
  const s = Math.max(M.R, M.h) * 0.9;
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => add3(p0, add3(scale3(u, a * s), scale3(w, b * s))));
}

// ------------------------------------------------------------ shortest path
function pathSeam(M, path) {
  if (path.type === 'ant') {
    // start at the left-most bottom corner, unfold towards the front
    let s = 0;
    M.verts.forEach((p, i) => { if (p[0] < M.verts[s][0] - 1e-6) s = i; });
    const n = M.n;
    const frontNext = M.verts[(s + 1) % n][1] > M.verts[(s - 1 + n) % n][1];
    return { seam: s, dir: frontNext ? 1 : -1 };
  }
  // loop on a cone: start at the left-most rim point
  let s = 0;
  M.verts.forEach((p, i) => { if (p[0] < M.verts[s][0] - 1e-6) s = i; });
  return { seam: s, dir: 1 };
}
function shortestPath(M, path, dm, seam, dir) {
  const n = M.n, first = dm.maps[dm.order[0]], last = dm.maps[dm.order[n - 1]];
  let A2, B2;
  if (path.type === 'ant') {
    const k = n / 2; // the diametrically opposite corner, k faces away
    A2 = first.A2;
    B2 = mapTo2D(dm.maps[dm.order[k - 1]], M.tops[(seam + dir * k + 2 * n) % n]);
  } else {
    A2 = first.A2;
    B2 = mapTo2D(last, M.verts[dm.order[0]]);
  }
  const length = dist2(A2, B2);
  // sample the straight line on the development and fold it back onto the solid
  const center = meshCenter(M);
  const polys = dm.order.map((i) => {
    const f = M.faces.find((g) => g.tag === 'lat' && g.i === i);
    return { i, f, poly: f.pts.map((p) => mapTo2D(dm.maps[i], p)), normal: faceNormal(f.pts, center) };
  });
  const inside = (q, poly) => {
    let sgn = 0;
    for (let k = 0; k < poly.length; k++) {
      const a = poly[k], b = poly[(k + 1) % poly.length];
      const c = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]);
      if (Math.abs(c) < 1e-6) continue;
      if (!sgn) sgn = Math.sign(c); else if (Math.sign(c) !== sgn) return false;
    }
    return true;
  };
  const N = 160, pts3 = [];
  for (let k = 0; k <= N; k++) {
    const q = add2(A2, sc2(sub2(B2, A2), k / N));
    const hit = polys.find((P) => inside(q, P.poly)) || polys[k < N / 2 ? 0 : polys.length - 1];
    pts3.push({ p: mapTo3D(dm.maps[hit.i], q), nrm: hit.normal });
  }
  const out = { dev: [{ a: A2, b: B2, style: 'visible', kind: 'path' }], length };
  for (const v of ['FV', 'TV']) {
    if (path.views && !path.views.includes(v)) continue;
    const segs = [];
    for (let k = 0; k < N; k++) {
      const a = pts3[k], b = pts3[k + 1];
      const vis = dot3(a.nrm, VIEWDIR[v]) > -1e-6 || dot3(b.nrm, VIEWDIR[v]) > -1e-6;
      segs.push({ a: sheet(a.p, v), b: sheet(b.p, v), style: vis ? 'visible' : 'hidden', kind: 'path' });
    }
    out[v] = mergeRuns(segs);
  }
  return out;
}
function mergeRuns(segs) {
  // join consecutive short pieces of the same style into ~3 mm chords
  const out = [];
  let cur = null;
  for (const s of segs) {
    if (cur && cur.style === s.style && dist2(cur.a, s.b) < 3) cur.b = s.b;
    else { if (cur) out.push(cur); cur = { ...s }; }
  }
  if (cur) out.push(cur);
  return out.filter((s) => dist2(s.a, s.b) > 0.05);
}

// ------------------------------------------------------------ prism with a horizontal hole
function holeSpec(M, hole) { return { x: M.c0[0], z: hole.z, r: hole.d / 2 }; }
function holeViews(M, h, FV, TV) {
  const hs = holeSpec(M, h);
  const cut = (segs, v) => segs.flatMap((s) => {
    if (s.kind !== 'edge') return [s];
    // only the front/back vertical edges pass through the hole
    const a3 = v === 'FV' ? [s.a[0], 0, -s.a[1]] : null;
    if (!a3) return [s];
    const b3 = [s.b[0], 0, -s.b[1]];
    return outsideHole(a3, b3, hs).map(([p, q]) => ({ ...s, a: [p[0], -p[2]], b: [q[0], -q[2]] }));
  });
  const fv = cut(FV, 'FV');
  // the hole is seen as a circle in the FV
  const N = 48;
  for (let k = 0; k < N; k++) {
    const t0 = (2 * Math.PI * k) / N, t1 = (2 * Math.PI * (k + 1)) / N;
    fv.push({ a: [hs.x + hs.r * Math.cos(t0), -(hs.z + hs.r * Math.sin(t0))], b: [hs.x + hs.r * Math.cos(t1), -(hs.z + hs.r * Math.sin(t1))], style: 'visible', kind: 'curve' });
  }
  // two hidden lines in the TV: the extreme generators of the hole
  const tv = TV.slice();
  for (const x of [hs.x - hs.r, hs.x + hs.r]) {
    const ys = surfaceY(M, x);
    tv.push({ a: [x, ys[0]], b: [x, ys[1]], style: 'hidden', kind: 'edge' });
  }
  return { FV: fv, TV: tv };
}
function surfaceY(M, x) {
  // front and back y of the prism surface at a given x (vertical faces)
  const ys = [];
  const n = M.n;
  for (let i = 0; i < n; i++) {
    const a = M.verts[i], b = M.verts[(i + 1) % n];
    if ((a[0] - x) * (b[0] - x) <= 0 && Math.abs(a[0] - b[0]) > 1e-9) ys.push(a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]));
  }
  return [Math.min(...ys), Math.max(...ys)];
}
function holeOnDev(M, hs, dm) {
  // where the hole cylinder meets each vertical face, mapped onto the development
  const out = [];
  const n = M.n, N = 96;
  for (const side of [0, 1]) {
    let prev = null;
    for (let k = 0; k <= N; k++) {
      const t = (2 * Math.PI * k) / N;
      const x = hs.x + hs.r * Math.cos(t), z = hs.z + hs.r * Math.sin(t);
      const ys = surfaceY(M, x);
      const y = side ? ys[0] : ys[1];
      // the face that holds (x, y)
      let fi = -1;
      for (let i = 0; i < n; i++) {
        const a = M.verts[i], b = M.verts[(i + 1) % n];
        const ex = b[0] - a[0], ey = b[1] - a[1];
        const u = ((x - a[0]) * ex + (y - a[1]) * ey) / (ex * ex + ey * ey);
        const off = Math.abs((x - a[0]) * ey - (y - a[1]) * ex) / Math.hypot(ex, ey);
        if (u > -1e-6 && u < 1 + 1e-6 && off < 1e-6) { fi = i; break; }
      }
      if (fi < 0) { prev = null; continue; }
      const q = mapTo2D(dm.maps[fi], [x, y, z]);
      if (prev && dist2(prev, q) < 10) out.push({ a: prev, b: q, style: 'visible', kind: 'curve' });
      prev = q;
    }
  }
  return mergeRuns(out);
}

// ------------------------------------------------------------ words
function orientPhrase(p) {
  const s = p.solid;
  if (s.type === 'cylinder' || s.type === 'cone') return 'Divide the circle into 12 equal parts and number them.';
  if (p.rot) return `Turn it so that ${p.rotWhat || 'one base edge'} makes ${p.rot}° with XY.`;
  if (p.orient === 'corner') return s.n === 4 ? 'Keep two base edges equally inclined to XY (a corner pointing towards you).' : 'Keep a corner on the centre line parallel to XY.';
  if (p.orient === 'edgeParallel') return 'Keep one base edge parallel to XY.';
  return 'Keep one base edge perpendicular to XY.';
}

function buildSteps(sol, M, plane) {
  const p = sol.problem, s = p.solid, n = sol.numbers;
  const curved = !!M.curved;
  const size = curved ? `diameter ${s.d} mm` : `side ${s.side} mm`;
  const steps = [];
  const st = (title, text, show) => steps.push({ stage: 1, title, text, show });
  const shape = baseShapeName(s);

  st('Top view', `The ${solidName(s)} stands on its base on HP, so the top view shows the base in its true shape. Draw a ${shape} of ${size} below XY. ${orientPhrase(p)}${!curved ? ' Label the corners a, b, c…' : ''}${s.type === 'pyramid' || s.type === 'cone' ? ' Join the corners (or the 12 points) to the centre o.' : ''}`, ['tvFull']);
  st('Front view', `Draw projectors up from every corner/point. The base lies on XY and the ${s.type === 'pyramid' || s.type === 'cone' ? 'apex' : 'top'} is ${M.h} mm above it. Thick lines for visible edges, dashed for hidden, chain line for the axis.`, ['tvFull', 'fvFull', 'axes']);

  if (plane) {
    const c = p.cut;
    const trace = plane.trace === 'FV' ? 'VT' : 'HT', tv = plane.trace === 'FV' ? 'front view' : 'top view';
    const other = plane.trace === 'FV' ? 'top view' : 'front view';
    let where = '';
    if (c.type === 'H') where = `a horizontal line ${c.z} mm above XY (${M.h - c.z} mm below the apex)`;
    if (c.type === 'AIP') where = `a line at ${c.angle}° to XY through the point on the axis ${c.z} mm above the base`;
    if (c.type === 'gen') where = `a line parallel to the right-hand extreme generator, ${c.offset} mm away from it (inside the cone)`;
    if (c.type === 'V') where = `a line parallel to XY, ${c.dist} mm in front of the axis (below the centre in the TV)`;
    if (c.type === 'AVP') where = `a line at ${c.angle}° to XY, ${c.dist} mm in front of the axis`;
    st(`Section plane (${trace})`, `It is a ${PLANE_NAME[c.type]}, so it appears as a line in the ${tv}: ${where}. Draw it as a chain line marked ${trace}. Number the points where it cuts the edges${curved ? ' / generators' : ''}: 1${plane.trace === 'FV' ? '′' : ''}, 2${plane.trace === 'FV' ? '′' : ''}, 3${plane.trace === 'FV' ? '′' : ''}…`, ['tvFull', 'fvFull', 'plane', 'numTrace']);
    st('Project the cut points', `Project each numbered point ${plane.trace === 'FV' ? 'down' : 'up'} to the ${other}, onto the same edge${curved ? ' or generator' : ''}. ${curved ? 'Points on the extreme generators are projected straight; others go onto their generator line.' : 'If an edge looks vertical in the front view (it is ⟂ to XY in both views), its point can\'t be projected directly: swing it onto the extreme edge with an arc, or project it horizontally to a true-length edge first.'}`, ['tvFull', 'fvFull', 'plane', 'numTrace', 'proj', 'numOther']);
    const kept = plane.trace === 'FV' ? 'below the plane (the part above it is removed)' : 'behind the plane (the part in front is removed, so you see the cut face)';
    const view = plane.trace === 'FV' ? 'sectional top view' : 'sectional front view';
    st(view[0].toUpperCase() + view.slice(1), `Join the points in order${curved ? ' with a smooth curve' : ''}. Keep only the part ${kept}. Draw it thick and hatch the cut face with thin lines at 45°, about 3 mm apart.${c.type === 'H' || c.type === 'V' ? ' The plane is parallel to the view, so this hatched shape is already the true shape of the section.' : ''}`, [plane.trace === 'FV' ? 'fvSec' : 'tvSec', plane.trace === 'FV' ? 'tvSec' : 'fvSec', 'plane', 'hatch', 'numTrace', 'numOther']);
    if (sol.groups.ts) {
      st('Reference line x₁y₁', `The true shape is seen looking straight at the section plane. Draw a new reference line x₁y₁ parallel to the ${trace}, a little away from the drawing. From each point on the ${trace}, draw a thin line perpendicular to it, across x₁y₁.`, ['fvSec', 'tvSec', 'plane', 'numTrace', 'tsCons']);
      st('True shape', `On each perpendicular, measure from x₁y₁ the distance of the same point from XY in the ${other}. Join the points${curved ? ' with a smooth curve' : ''} and hatch. It is ${/^[aeiou]/.test(n.sectionShape || '') ? 'an' : 'a'} ${n.sectionShape}.`, ['fvSec', 'tvSec', 'plane', 'numTrace', 'tsCons', 'ts']);
    }
  }

  if (p.develop || p.path) {
    const radial = !!M.apex;
    if (!radial) {
      st('Stretch-out line', curved
        ? `Development of a cylinder is a rectangle. Draw a horizontal line of length πd = π × ${s.d} = ${f1(Math.PI * s.d)} mm, in line with the base in the front view. Divide it into 12 equal parts and number 1…12, 1.`
        : `Draw a horizontal line of length = perimeter = ${M.n} × ${s.side} = ${f1(n.perimeter || M.n * s.side)} mm, in line with the base in the front view. Mark the ${M.n} corners on it (A, B, C…, A).`, ['fvFull', 'tvFull']);
    } else {
      st('True length & sector', curved
        ? `Every generator of a cone has the true length L = √(h² + r²) = ${f1(n.slant)} mm (it's the extreme generator in the front view). With centre O and radius L draw an arc. Sector angle θ = 360° × r / L = 360 × ${s.d / 2} / ${f1(n.slant)} = ${f1(n.sector)}°. Divide the sector into 12 equal parts.`
        : `The slant edges are not true length in the front view. True length = √(h² + R²) = ${f1(n.slant)} mm (R = ${f1(M.R)} mm, the distance from the centre to a corner). With centre O and that radius draw an arc and step off the base side ${s.side} mm ${M.n} times along it as chords.`, ['fvFull', 'tvFull']);
    }
    if (plane) {
      st('Transfer the cut points', radial
        ? `The cut points on the slant edges/generators are not at true distance in the front view. Move each one horizontally to the true-length (extreme) line, then measure its distance from O along the matching line in the development.`
        : `Project each cut point horizontally from the front view to the matching line in the development (same height).`, ['fvSec', 'tvSec', 'plane', 'numTrace', 'dev']);
    }
    st(plane ? 'Development of the remaining part' : 'Development', `Join the points${curved && plane ? ' with a smooth curve' : ''}. Draw the outline thick; the fold lines are thin. ${plane ? 'Only the remaining part is developed.' : ''}`, ['fvFull', 'tvFull', 'dev']);
    if (p.path) {
      st('Shortest path', `On the development the shortest route is a straight line from the start to the end (length ${f1(n.pathLength)} mm). Mark where it crosses each fold line, then carry those points back to the same lines in the front${p.path.views && p.path.views.includes('TV') ? ' and top' : ''} view and join them with a smooth curve. The part on the back of the solid is dashed.`, ['fvFull', 'tvFull', 'dev', 'devPath', 'pathViews']);
    }
  }
  return steps;
}

function buildHints(sol, M, plane) {
  const p = sol.problem, n = sol.numbers;
  const h = [];
  if (plane) {
    const c = p.cut;
    h.push(`It's a ${PLANE_NAME[c.type]}. It is perpendicular to ${plane.trace === 'FV' ? 'VP, so it shows as a line (VT) in the front view' : 'HP, so it shows as a line (HT) in the top view'}.`);
    h.push(plane.trace === 'FV' ? 'Draw the full solid first. Number where the VT cuts each edge, project those points down, and draw only the part below the plane in the sectional top view, hatched.' : 'Draw the full solid first. Number where the HT cuts each edge, project those points up, and draw only the part behind the plane in the sectional front view, hatched.');
    if (sol.groups.ts) h.push(`True shape: x₁y₁ parallel to the ${plane.trace === 'FV' ? 'VT' : 'HT'}; distances from x₁y₁ = distances from XY in the ${plane.trace === 'FV' ? 'top' : 'front'} view. The answer is ${/^[aeiou]/.test(n.sectionShape) ? 'an' : 'a'} ${n.sectionShape}.`);
  }
  if (p.develop || p.path) {
    h.push(M.apex
      ? `Pyramids and cones use the radial-line method: a sector of radius = true length of the slant edge / generator (${f1(n.slant)} mm).${M.curved ? ` Sector angle = 360 × r / L = ${f1(n.sector)}°.` : ''}`
      : `Prisms and cylinders use the parallel-line method: a rectangle ${f1(n.perimeter || 0)} mm long (the perimeter) and ${M.h} mm high.`);
    if (plane) h.push(M.apex ? 'Cut points on slant edges must be moved horizontally to the true-length line before you measure them along the development.' : 'Cut points go straight across from the front view to the development: their heights don\'t change.');
  }
  if (p.path) h.push('The shortest path on any surface is a straight line on its development. Draw it there first, then fold it back.');
  if (p.hole) h.push('The hole shows as a circle in the front view. On the development, find where each of the 12 hole points lies on a face (its distance from the nearest edge in the top view, and its height) and join them smoothly.');
  for (const t of p.notes || []) h.push(t);
  return h;
}
