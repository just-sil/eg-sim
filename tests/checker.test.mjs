import test from 'node:test';
import assert from 'node:assert/strict';
import { PROBLEMS } from '../js/problems.js';
import { solve } from '../js/stages.js';
import { check } from '../js/checker.js';

// Turn a solution into a "user drawing", optionally shifted / mirrored / damaged.
function drawingFrom(sol, { dx = 0, dy = 0, drop = -1, restyle = -1, flipX = false } = {}) {
  const prims = [], keys = [];
  let n = 0;
  for (const st of sol.stages) for (const v of ['FV', 'TV']) {
    const cx = st[v].keyPts.reduce((s, p) => s + p[0], 0) / st[v].keyPts.length;
    const T = (p) => [(flipX ? 2 * cx - p[0] : p[0]) + dx, p[1] + (v === 'TV' ? dy : 0)];
    for (const s of st[v].segs) {
      const i = n++;
      if (i === drop) continue;
      const style = i === restyle ? (s.style === 'visible' ? 'hidden' : 'visible') : s.style;
      prims.push({ kind: 'seg', a: T(s.a), b: T(s.b), style, id: 'u' + i });
      keys.push(T(s.a), T(s.b));
    }
  }
  return { prims, keys };
}

for (const id of ['S1', 'S2', 'S3', 'P1', 'P3', 'P8', 'P12', 'P16', 'P17']) {
  const sol = solve(PROBLEMS.find((p) => p.id === id));
  test(`${id}: exact copy scores 100%`, () => {
    const { prims, keys } = drawingFrom(sol, { dx: 37, dy: 8 });
    const r = check(sol, prims, keys);
    for (const st of r.stages) for (const v of ['FV', 'TV']) {
      assert.ok(st.views[v].found, `stage ${st.no} ${v} not found`);
      assert.ok(st.views[v].score > 0.999, `stage ${st.no} ${v} score ${st.views[v].score}`);
    }
    assert.ok(Object.values(r.status).every((s) => s === 'ok'), JSON.stringify(Object.values(r.status).filter((s) => s !== 'ok')));
  });
  test(`${id}: mirrored copy still accepted`, () => {
    const { prims, keys } = drawingFrom(sol, { flipX: true });
    const r = check(sol, prims, keys);
    const last = r.stages[r.stages.length - 1];
    assert.ok(last.views.FV.score > 0.999 && last.views.TV.score > 0.999);
  });
}

test('P1: a missing edge and a wrong line style are reported', () => {
  const sol = solve(PROBLEMS.find((p) => p.id === 'P1'));
  const { prims, keys } = drawingFrom(sol, { drop: 0, restyle: 1 });
  const r = check(sol, prims, keys);
  const fv1 = r.stages[0].views.FV;
  assert.equal(fv1.missingN, 1);
  assert.equal(fv1.wrong, 1);
  assert.ok(Object.values(r.status).includes('wrong'));
});

test('P1: an extra line is flagged', () => {
  const sol = solve(PROBLEMS.find((p) => p.id === 'P1'));
  const { prims, keys } = drawingFrom(sol);
  prims.push({ kind: 'seg', a: [0, -100], b: [10, -120], style: 'visible', id: 'x' });
  const r = check(sol, prims, keys);
  assert.equal(r.status.x, 'extra');
});
