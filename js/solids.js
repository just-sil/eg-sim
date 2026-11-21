// Parametric solid models in local coordinates: base on z = 0, centred on the
// origin, axis along +z. World axes everywhere: x along XY (right), y = distance
// in front of VP, z = height above HP.
import { D2R } from './geometry.js';

export const RIM = 48; // rim samples for cylinder / cone
export const GEN_EVERY = 4; // every 4th rim sample is a generator (12 generators)

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const NAMES = { 3: 'triangular', 4: 'square', 5: 'pentagonal', 6: 'hexagonal' };

export function solidName(s) {
  if (s.type === 'tetra') return 'tetrahedron';
  if (s.type === 'cylinder' || s.type === 'cone') return s.type;
  if (s.rect) return `rectangular ${s.type}`;
  return `${NAMES[s.n]} ${s.type}`;
}
export function baseShapeName(s) {
  if (s.type === 'cylinder' || s.type === 'cone') return 'circle';
  if (s.type === 'tetra') return 'equilateral triangle';
  if (s.rect) return 'rectangle';
  return { 3: 'equilateral triangle', 4: 'square', 5: 'regular pentagon', 6: 'regular hexagon' }[s.n];
}

/** Height of the solid (tetrahedron height is derived from its edge). */
export const solidHeight = (s) => (s.type === 'tetra' ? s.side * Math.sqrt(2 / 3) : s.h);

/** Circumradius and inradius (apothem) of the base. */
export function baseRadii(s) {
  if (s.type === 'cylinder' || s.type === 'cone') return { R: s.d / 2, r: s.d / 2 };
  if (s.rect) return { R: Math.hypot(s.rect[0], s.rect[1]) / 2, r: s.rect[0] / 2 };
  const n = s.type === 'tetra' ? 3 : s.n;
  const R = s.side / (2 * Math.sin(Math.PI / n));
  return { R, r: R * Math.cos(Math.PI / n) };
}

/**
 * Build a solid.
 * orient: 'edge'  – a base edge perpendicular to the x axis on the +x side
 *         'corner'– a base corner on the +x axis
 *         'edgeParallel' – a base edge parallel to the x axis (front/back)
 * Returns { pts, labels, faces, edges, keyIdx, B, T, G, curved }
 */
export function makeSolid(spec, orient = 'edge') {
  const s = spec;
  const pts = [], labels = [];
  const faces = [];
  const h = solidHeight(s);
  const isCurved = s.type === 'cylinder' || s.type === 'cone';

  if (isCurved) {
    const r = s.d / 2;
    const rim = [], top = [];
    for (let k = 0; k < RIM; k++) {
      const a = (2 * Math.PI * k) / RIM;
      rim.push(pts.length);
      pts.push([r * Math.cos(a), r * Math.sin(a), 0]);
      labels.push(k % GEN_EVERY === 0 ? String(k / GEN_EVERY + 1) : null);
    }
    let apex = null;
    if (s.type === 'cylinder') {
      for (let k = 0; k < RIM; k++) {
        const a = (2 * Math.PI * k) / RIM;
        top.push(pts.length);
        pts.push([r * Math.cos(a), r * Math.sin(a), h]);
        labels.push(k % GEN_EVERY === 0 ? LETTERS[k / GEN_EVERY] : null);
      }
    } else {
      apex = pts.length;
      pts.push([0, 0, h]);
      labels.push('o');
    }
    const B = pts.length; pts.push([0, 0, 0]); labels.push(null);
    const T = pts.length; pts.push([0, 0, h]); labels.push(null);
    const G = pts.length; pts.push([0, 0, s.type === 'cone' ? h / 4 : h / 2]); labels.push(null);
    const keyIdx = rim.filter((_, k) => k % GEN_EVERY === 0);
    if (s.type === 'cylinder') keyIdx.push(...top.filter((_, k) => k % GEN_EVERY === 0));
    else keyIdx.push(apex);
    return {
      spec: s, pts, labels, faces: [], edges: [], keyIdx, B, T, G,
      curved: { kind: s.type, rim, top: s.type === 'cylinder' ? top : null, apex, r, h },
    };
  }

  // ---- polyhedra ----
  let base = [];
  if (s.rect) {
    const [w, d] = s.rect; // w along x, d along y
    const v = orient === 'edgeParallel'
      ? [[d / 2, w / 2], [-d / 2, w / 2], [-d / 2, -w / 2], [d / 2, -w / 2]]
      : [[w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2], [-w / 2, -d / 2]];
    base = v.map(([x, y]) => [x, y, 0]);
  } else {
    const n = s.type === 'tetra' ? 3 : s.n;
    const { R } = baseRadii(s);
    let start = 0; // corner at +x
    if (orient === 'edge') start = 180 / n; // edge centred on +x
    if (orient === 'edgeParallel') start = 90 + 180 / n; // edge centred on +y
    for (let i = 0; i < n; i++) {
      const a = (start + (360 * i) / n) * D2R;
      base.push([R * Math.cos(a), R * Math.sin(a), 0]);
    }
    // Start labelling at a corner that touches the +x side so "a" sits at the resting element.
    if (orient === 'edge') {
      // vertex with angle -180/n (i.e. the last one) and first one form the right edge
      base = [base[n - 1], ...base.slice(0, n - 1)];
    }
  }
  const n = base.length;
  for (let i = 0; i < n; i++) { pts.push(base[i]); labels.push(LETTERS[i]); }
  const baseIdx = base.map((_, i) => i);
  faces.push(baseIdx.slice().reverse());

  const isPrism = s.type === 'prism';
  if (isPrism) {
    for (let i = 0; i < n; i++) { pts.push([base[i][0], base[i][1], h]); labels.push(String(i + 1)); }
    faces.push(baseIdx.map((i) => i + n));
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      faces.push([i, j, j + n, i + n]);
    }
  } else {
    const apex = pts.length;
    pts.push([0, 0, h]); labels.push('o');
    for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, apex]);
  }
  const B = pts.length; pts.push([0, 0, 0]); labels.push(null);
  const T = pts.length; pts.push([0, 0, h]); labels.push(null);
  const G = pts.length; pts.push([0, 0, isPrism ? h / 2 : h / 4]); labels.push(null);

  // edges with adjacent faces
  const map = new Map();
  faces.forEach((f, fi) => {
    for (let k = 0; k < f.length; k++) {
      const a = f[k], b = f[(k + 1) % f.length];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!map.has(key)) map.set(key, { a: Math.min(a, b), b: Math.max(a, b), faces: [] });
      map.get(key).faces.push(fi);
    }
  });
  const keyIdx = [];
  for (let i = 0; i < B; i++) keyIdx.push(i);
  return { spec: s, pts, labels, faces, edges: [...map.values()], keyIdx, B, T, G, curved: null };
}

/** Return a copy of the solid with new point positions. */
export const withPts = (solid, pts) => ({ ...solid, pts });
