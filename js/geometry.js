// Small vector helpers shared by the engine and the editor.
export const D2R = Math.PI / 180;
export const R2D = 180 / Math.PI;

// ---- 3D ----
export const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross3 = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const len3 = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm3 = (a) => {
  const l = len3(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const centroid3 = (pts) => {
  const c = [0, 0, 0];
  for (const p of pts) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }
  return scale3(c, 1 / pts.length);
};

// ---- 2D ----
export const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const scale2 = (a, s) => [a[0] * s, a[1] * s];
export const dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
export const cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];
export const len2 = (a) => Math.hypot(a[0], a[1]);
export const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
export const rot2 = (p, c, ang) => {
  const s = Math.sin(ang), co = Math.cos(ang);
  const x = p[0] - c[0], y = p[1] - c[1];
  return [c[0] + x * co - y * s, c[1] + x * s + y * co];
};

/** Distance from point p to segment ab, plus the closest point. */
export function closestOnSeg(p, a, b) {
  const ab = sub2(b, a);
  const l2 = dot2(ab, ab);
  let t = l2 ? dot2(sub2(p, a), ab) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const q = [a[0] + ab[0] * t, a[1] + ab[1] * t];
  return { q, d: dist2(p, q), t };
}

/** Closest point on an infinite line through a with direction d. */
export function closestOnLine(p, a, d) {
  const l2 = dot2(d, d) || 1;
  const t = dot2(sub2(p, a), d) / l2;
  const q = [a[0] + d[0] * t, a[1] + d[1] * t];
  return { q, d: dist2(p, q), t };
}

/** Intersection of two infinite lines (p + t r, q + u s). Returns {pt,t,u} or null. */
export function lineLine(p, r, q, s) {
  const den = cross2(r, s);
  if (Math.abs(den) < 1e-12) return null;
  const qp = sub2(q, p);
  const t = cross2(qp, s) / den;
  const u = cross2(qp, r) / den;
  return { pt: [p[0] + r[0] * t, p[1] + r[1] * t], t, u };
}

/** Intersections of an infinite line with a circle. Returns [{pt,t}]. */
export function lineCircle(p, r, c, rad) {
  const f = sub2(p, c);
  const a = dot2(r, r), b = 2 * dot2(f, r), cc = dot2(f, f) - rad * rad;
  const disc = b * b - 4 * a * cc;
  if (disc < 0 || a < 1e-12) return [];
  const sq = Math.sqrt(disc);
  const out = [];
  for (const t of disc < 1e-12 ? [-b / (2 * a)] : [(-b - sq) / (2 * a), (-b + sq) / (2 * a)]) {
    out.push({ pt: [p[0] + r[0] * t, p[1] + r[1] * t], t });
  }
  return out;
}

/** Intersections of two circles. */
export function circleCircle(c1, r1, c2, r2) {
  const d = dist2(c1, c2);
  if (d < 1e-9 || d > r1 + r2 + 1e-9 || d < Math.abs(r1 - r2) - 1e-9) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const m = [c1[0] + ((c2[0] - c1[0]) * a) / d, c1[1] + ((c2[1] - c1[1]) * a) / d];
  const ox = (-(c2[1] - c1[1]) * h) / d, oy = ((c2[0] - c1[0]) * h) / d;
  return h < 1e-9 ? [m] : [[m[0] + ox, m[1] + oy], [m[0] - ox, m[1] - oy]];
}

/** Normalise an angle into [0, 2π). */
export const normAng = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

/** Is angle a inside the arc that sweeps positively from a0 to a1? */
export function angleInArc(a, a0, a1) {
  const sweep = normAng(a1 - a0);
  return normAng(a - a0) <= sweep + 1e-9;
}

/** Catmull-Rom spline sampled into a polyline. */
export function sampleSpline(pts, closed, perSeg = 12) {
  if (pts.length < 3) return pts.slice();
  const n = pts.length;
  const out = [];
  const get = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(closed ? pts[0] : pts[n - 1]);
  return out;
}
