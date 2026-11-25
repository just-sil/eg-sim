import test from 'node:test';
import assert from 'node:assert/strict';
import { PROBLEMS3 } from '../js/problems3.js';
import { solve } from '../js/stages.js';
import { check } from '../js/checker.js';
import { sub3, cross3, len3, dot3, D2R } from '../js/geometry.js';

const byId = (id) => PROBLEMS3.find((p) => p.id === id);
const area3 = (pts) => {
  let s = [0, 0, 0];
  for (let i = 1; i < pts.length - 1; i++) {
    const c = cross3(sub3(pts[i], pts[0]), sub3(pts[i + 1], pts[0]));
    s = [s[0] + c[0], s[1] + c[1], s[2] + c[2]];
  }
  return len3(s) / 2;
};

for (const p of PROBLEMS3) {
  test(`${p.id}: solves, section lies on the plane, true shape has the true area`, () => {
    const sol = solve(p);
    assert.ok(sol.views.length >= 2);
    for (const v of sol.views) assert.ok(v.segs.some((s) => !s.optional), `${v.key} has no required lines`);
    const { section, plane } = sol.stats;
    if (!plane) return;
    assert.ok(section && section.length >= 3, 'no section polygon');
    for (const q of section) assert.ok(Math.abs(dot3(plane.n, q.p) - plane.c) < 1e-6, 'point off the plane');
    // the remaining part is on the kept side
    for (const f of sol.stats.R.faces) for (const q of f.pts) assert.ok(dot3(plane.n, q) - plane.c < 1e-6);
    if (sol.numbers.sectionArea !== undefined) {
      const a = area3(section.map((q) => q.p));
      assert.ok(Math.abs(sol.numbers.sectionArea - a) / a < 1e-6, `true shape area ${sol.numbers.sectionArea} vs ${a}`);
    }
  });
}

test('section shapes are recognised', () => {
  assert.equal(solve(byId('X5')).numbers.sectionShape, 'hyperbola');
  assert.equal(solve(byId('X6')).numbers.sectionShape, 'parabola');
  assert.equal(solve(byId('X10')).numbers.sectionShape, 'ellipse');
  assert.equal(solve(byId('X3')).numbers.sectionShape, '5-sided polygon');
  assert.equal(solve(byId('X11')).numbers.sectionShape, '7-sided polygon');
  assert.equal(solve(byId('X13')).numbers.sectionShape, '5-sided polygon');
});

test('developments have the textbook dimensions', () => {
  assert.ok(Math.abs(solve(byId('D1')).numbers.perimeter - 100) < 1e-9);
  assert.ok(Math.abs(solve(byId('D2')).numbers.perimeter - Math.PI * 50) < 1e-9);
  const d3 = solve(byId('D3')).numbers;
  assert.ok(Math.abs(d3.slant - Math.hypot(25, 60)) < 1e-9);
  assert.ok(Math.abs(d3.sector - (360 * 25) / Math.hypot(25, 60)) < 1e-9);
  const d4 = solve(byId('D4')).numbers;
  assert.ok(Math.abs(d4.slant - Math.hypot(15 * Math.SQRT2, 60)) < 1e-9);
  // the developed outline of an uncut cylinder is a 157.1 × 60 rectangle
  const dev = solve(byId('D2')).views.find((v) => v.key === 'DEV');
  const xs = dev.segs.flatMap((s) => [s.a[0], s.b[0]]), ys = dev.segs.flatMap((s) => [s.a[1], s.b[1]]);
  assert.ok(Math.abs(Math.max(...xs) - Math.min(...xs) - Math.PI * 50) < 1e-6);
  assert.ok(Math.abs(Math.max(...ys) - Math.min(...ys) - 60) < 1e-6);
});

test('truncated development: cut heights are kept along every fold line', () => {
  const sol = solve(byId('D5'));
  const dev = sol.views.find((v) => v.key === 'DEV');
  // the top outline of the development is the cut, so its highest point is the longest remaining edge
  const top = -Math.min(...dev.segs.flatMap((s) => [s.a[1], s.b[1]]));
  const { M, plane } = sol.stats;
  const heights = M.verts.map((v) => (plane.c - plane.n[0] * v[0] - plane.n[1] * v[1]) / plane.n[2]);
  assert.ok(Math.abs(top - Math.min(70, Math.max(...heights))) < 1e-6, `top ${top}`);
});

test('shortest paths have the right length', () => {
  assert.ok(Math.abs(solve(byId('D9')).numbers.pathLength - Math.hypot(75, 60)) < 1e-6);
  const L = Math.hypot(30, 64), th = (360 * 30) / L;
  assert.ok(Math.abs(solve(byId('D10')).numbers.pathLength - 2 * L * Math.sin((th / 2) * D2R)) < 1e-6);
});

// ---------------- checker on Module 3 views ----------------
function drawingFrom(sol, { dx = 0, useAlt = false, skip = null } = {}) {
  const prims = [], keys = [];
  let n = 0;
  for (const v of sol.views) {
    if (v.key === skip) continue;
    const segs = useAlt && v.alts && v.alts.length ? v.alts[v.alts.length - 1].segs : v.segs;
    const off = v.side === 'free' ? [dx + 13, 7] : [dx, 0];
    for (const s of segs) {
      if (s.kind === 'hatch') continue;
      const a = [s.a[0] + off[0], s.a[1] + off[1]], b = [s.b[0] + off[0], s.b[1] + off[1]];
      prims.push({ kind: 'seg', a, b, style: s.style, id: 'u' + n++ });
      keys.push(a, b);
    }
  }
  return { prims, keys };
}

for (const id of ['X1', 'X2', 'X3', 'X5', 'X6', 'X9', 'X10', 'D1', 'D3', 'D5', 'D7', 'D8', 'D9', 'D10', 'D11']) {
  test(`${id}: exact copy (shifted) scores 100% in every view`, () => {
    const sol = solve(byId(id));
    const { prims, keys } = drawingFrom(sol, { dx: 23 });
    const r = check(sol, prims, keys);
    for (const v of r.stages[0].list) {
      assert.ok(v.found, `${v.key} not found`);
      assert.ok(v.score > 0.999, `${v.key} score ${v.score}`);
    }
  });
}

for (const id of ['D1', 'D2', 'D4', 'D6', 'D8']) {
  test(`${id}: a development opened along another edge is accepted`, () => {
    const sol = solve(byId(id));
    const { prims, keys } = drawingFrom(sol, { useAlt: true });
    const r = check(sol, prims, keys);
    const dev = r.stages[0].list.find((v) => v.key === 'DEV');
    assert.ok(dev.found && dev.score > 0.999, `dev score ${dev.score}`);
  });
}

test('X3: a missing true shape is reported as not found', () => {
  const sol = solve(byId('X3'));
  const { prims, keys } = drawingFrom(sol, { skip: 'TS' });
  const r = check(sol, prims, keys);
  const ts = r.stages[0].list.find((v) => v.key === 'TS');
  assert.ok(!ts.found || ts.score < 0.5);
});
