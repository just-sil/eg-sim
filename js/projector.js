// Orthographic first-angle projection with hidden-line classification.
// Sheet coordinates are millimetres, XY line at y = 0, y grows downwards:
//   front view (FV): (x, -z)  – above XY
//   top view   (TV): (x,  y)  – below XY
import {
  sub3, dot3, cross3, norm3, centroid3, scale3, add3, len3, dist2, closestOnSeg,
} from './geometry.js';
import { GEN_EVERY } from './solids.js';

export const VIEW_DIR = { FV: [0, 1, 0], TV: [0, 0, 1] };
export const toSheet = (p, view) => (view === 'FV' ? [p[0], -p[2]] : [p[0], p[1]]);

const EPS = 1e-6;
const PRIORITY = { visible: 3, axis: 2, hidden: 1 };

function faceNormals(solid) {
  const c = centroid3(solid.pts.slice(0, solid.B));
  return solid.faces.map((f) => {
    const p0 = solid.pts[f[0]], p1 = solid.pts[f[1]], p2 = solid.pts[f[2]];
    let n = norm3(cross3(sub3(p1, p0), sub3(p2, p0)));
    const fc = centroid3(f.map((i) => solid.pts[i]));
    if (dot3(n, sub3(fc, c)) < 0) n = scale3(n, -1);
    return n;
  });
}

/** Lateral-surface frame of a curved solid in its current pose. */
export function curvedFrame(solid) {
  const { rim, r, h } = solid.curved;
  const B = solid.pts[solid.B], T = solid.pts[solid.T];
  const a = norm3(sub3(T, B));
  const u = norm3(sub3(solid.pts[rim[0]], B));
  const w = norm3(sub3(solid.pts[rim[rim.length / 4]], B));
  return { B, T, a, u, w, r, h };
}

function lateralNormal(fr, kind, t) {
  const radial = add3(scale3(fr.u, Math.cos(t)), scale3(fr.w, Math.sin(t)));
  return kind === 'cylinder' ? radial : norm3(add3(scale3(radial, fr.h), scale3(fr.a, fr.r)));
}

/**
 * Project a posed solid into one view.
 * Returns { segs:[{a,b,style,kind,optional}], labels:[{p,text,anchor}], keyPts:[[x,y]] }
 */
export function projectSolid(solid, view, stageNo = 1) {
  const v = VIEW_DIR[view];
  const P = (i) => toSheet(solid.pts[i], view);
  const segs = [];

  if (!solid.curved) {
    const normals = faceNormals(solid);
    for (const e of solid.edges) {
      const vis = e.faces.some((fi) => dot3(normals[fi], v) > -EPS);
      segs.push({ a: P(e.a), b: P(e.b), style: vis ? 'visible' : 'hidden', kind: 'edge' });
    }
  } else {
    const { kind, rim, top, apex } = solid.curved;
    const fr = curvedFrame(solid);
    const N = rim.length;
    const tOf = (k) => (2 * Math.PI * k) / N;
    const baseFront = dot3(scale3(fr.a, -1), v) > -EPS;
    const topFront = dot3(fr.a, v) > -EPS;
    for (let k = 0; k < N; k++) {
      const k2 = (k + 1) % N;
      const lat = dot3(lateralNormal(fr, kind, tOf(k + 0.5)), v) > -EPS;
      segs.push({ a: P(rim[k]), b: P(rim[k2]), style: baseFront || lat ? 'visible' : 'hidden', kind: 'rim' });
      if (top) {
        segs.push({ a: P(top[k]), b: P(top[k2]), style: topFront || lat ? 'visible' : 'hidden', kind: 'rim' });
      }
    }
    for (let k = 0; k < N; k += GEN_EVERY) {
      const lat = dot3(lateralNormal(fr, kind, tOf(k)), v) > -EPS;
      const end = top ? P(top[k]) : P(apex);
      segs.push({ a: P(rim[k]), b: end, style: lat ? 'visible' : 'hidden', kind: 'gen', optional: true });
    }
    // silhouette (outline) generators: lateral normal ⟂ view direction
    let A, Bc, C;
    if (kind === 'cylinder') { A = dot3(fr.u, v); Bc = dot3(fr.w, v); C = 0; }
    else { A = fr.h * dot3(fr.u, v); Bc = fr.h * dot3(fr.w, v); C = fr.r * dot3(fr.a, v); }
    const M = Math.hypot(A, Bc);
    if (M > 1e-9 && Math.abs(C) <= M) {
      const base = Math.atan2(Bc, A), off = Math.acos(-C / M);
      for (const t of [base + off, base - off]) {
        const radial = add3(scale3(fr.u, Math.cos(t)), scale3(fr.w, Math.sin(t)));
        const p0 = add3(fr.B, scale3(radial, fr.r));
        const p1 = kind === 'cylinder' ? add3(p0, sub3(fr.T, fr.B)) : fr.T;
        segs.push({ a: toSheet(p0, view), b: toSheet(p1, view), style: 'visible', kind: 'sil' });
      }
    }
  }
  // axis
  segs.push({ a: P(solid.B), b: P(solid.T), style: 'axis', kind: 'axis', optional: true });

  const clean = dedupe(segs);

  // labels
  const sub = ['', '₁', '₂', '₃'][stageNo - 1] || '';
  const prime = view === 'FV' ? '′' : '';
  const keyPts = solid.keyIdx.map(P);
  const cen = keyPts.reduce((s, p) => [s[0] + p[0] / keyPts.length, s[1] + p[1] / keyPts.length], [0, 0]);
  const groups = [];
  solid.keyIdx.forEach((i) => {
    const text = solid.labels[i];
    if (!text) return;
    const p = P(i);
    const g = groups.find((gg) => dist2(gg.p, p) < 0.3);
    const t = text + sub + prime;
    if (g) g.texts.push(t); else groups.push({ p, texts: [t] });
  });
  const labels = groups.map((g) => {
    let dx = g.p[0] - cen[0], dy = g.p[1] - cen[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    if (Math.hypot(g.p[0] - cen[0], g.p[1] - cen[1]) < 0.5) { dx = 0.7; dy = -0.7; }
    return { p: g.p, at: [g.p[0] + dx * 3.2, g.p[1] + dy * 3.2], text: g.texts.join(',') };
  });

  const axisPts = [P(solid.B), P(solid.T)];
  return { segs: clean, labels, keyPts: [...keyPts, ...axisPts] };
}

/** Remove zero-length segments and segments covered by others of >= priority. */
export function dedupe(segs, tol = 0.05) {
  const live = segs.filter((s) => dist2(s.a, s.b) > tol);
  live.sort((p, q) => (PRIORITY[q.style] - PRIORITY[p.style]) || (dist2(q.a, q.b) - dist2(p.a, p.b)));
  const kept = [];
  for (const s of live) {
    const covered = kept.some((k) =>
      PRIORITY[k.style] >= PRIORITY[s.style] &&
      closestOnSeg(s.a, k.a, k.b).d < tol && closestOnSeg(s.b, k.a, k.b).d < tol);
    if (!covered) kept.push(s);
  }
  return kept;
}

/** Measured inclinations (degrees) of a 3D direction to HP and VP. */
export function inclinations(dir) {
  const d = norm3(dir);
  return {
    hp: Math.asin(Math.min(1, Math.abs(d[2]))) * 180 / Math.PI,
    vp: Math.asin(Math.min(1, Math.abs(d[1]))) * 180 / Math.PI,
  };
}
export { len3 };
