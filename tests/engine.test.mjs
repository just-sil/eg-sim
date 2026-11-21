import test from 'node:test';
import assert from 'node:assert/strict';
import { PROBLEMS } from '../js/problems.js';
import { solve } from '../js/stages.js';
import { inclinations } from '../js/projector.js';
import { sub3, norm3, cross3, R2D } from '../js/geometry.js';

const near = (a, b, tol = 0.1) => Math.abs(a - b) <= tol;
// For VP problems the roles swap: "hp" <-> "vp", "TV" <-> "FV".
const P = (p) => (p.frame === 'VP' ? { on: 'vp', other: 'hp', up: 1, front: 2 } : { on: 'hp', other: 'vp', up: 2, front: 1 });

function finalOf(sol) { return sol.stages[sol.stages.length - 1].solid; }
const axisDir = (s) => sub3(s.pts[s.T], s.pts[s.B]);
const tvAngle = (dir, p) => { // angle of the axis projection with XY in the view of the resting plane
  const f = P(p).front; return Math.abs(Math.atan2(Math.abs(dir[f]), Math.abs(dir[0])) * R2D);
};

for (const p of PROBLEMS) {
  test(`${p.id} ${p.title}`, () => {
    const sol = solve(p);
    const s = finalOf(sol);
    const k = P(p);
    const real = s.pts.slice(0, s.B);
    // first quadrant: everything in front of VP and above HP
    for (const q of real) { assert.ok(q[1] >= -1e-6 && q[2] >= -1e-6, `point outside 1st quadrant ${q}`); }
    // resting on the plane
    const minOn = Math.min(...real.map((q) => q[k.up]));
    if (p.rest !== 'suspend') assert.ok(near(minOn, 0, 1e-6), `not resting on ${k.on}: min=${minOn}`);
    if (!p.stage2 || p.onlyStages === 1) {
      const inc = inclinations(axisDir(s));
      assert.ok(near(inc[k.on], 90), 'axis should be perpendicular to resting plane');
      return;
    }
    const inc = inclinations(axisDir(s));
    const s2 = p.stage2, s3 = p.stage3;
    if (s2.tilt === 'axis') assert.ok(near(inc[k.on], s2.angle), `axis to ${k.on} ${inc[k.on]} != ${s2.angle}`);
    if (s2.tilt === 'base') assert.ok(near(inc[k.on], 90 - s2.angle), `base angle`);
    if (s2.tilt === 'apexOn') {
      const apexIdx = s.curved ? s.curved.apex : s.B - 1;
      assert.ok(near(s.pts[apexIdx][k.up], 0, 1e-6), 'apex should be on the plane');
    }
    if (s2.tilt === 'slantEdge') {
      const e = sub3(s.pts[s.B - 1], s.pts[0]);
      assert.ok(near(inclinations(e)[k.on], s2.angle), 'slant edge angle');
    }
    if (s2.tilt === 'suspend') {
      const g = sub3(s.pts[s.G], s.pts[0]);
      const d = norm3(g);
      assert.ok(near(Math.abs(d[k.up]), 1, 1e-9), 'corner-G line must be vertical');
      assert.ok(d[k.up] < 0, 'corner must be above G');
    }
    if (s3.type === 'axisTrue') assert.ok(near(inc[k.other], s3.angle), `true angle ${inc[k.other]} != ${s3.angle}`);
    if (s3.type === 'axisTV' || s3.type === 'plane') assert.ok(near(tvAngle(axisDir(s), p), s3.angle), `TV axis ${tvAngle(axisDir(s), p)}`);
    if (s3.type === 'edgeQ') {
      const e = sub3(s.pts[1], s.pts[0]); // a-b is the resting edge
      assert.ok(near(s.pts[0][k.up], 0, 1e-6) && near(s.pts[1][k.up], 0, 1e-6), 'a-b on plane');
      assert.ok(near(inclinations(e)[k.other], s3.angle), `edge angle ${inclinations(e)[k.other]}`);
    }
    if (p.near === 'apex' || p.near === 'base') {
      const B = s.pts[s.B], T = s.pts[s.T];
      const apexNearer = T[k.front] < B[k.front];
      assert.equal(apexNearer, p.near === 'apex', 'near condition');
    }
    if (p.rest === 'face') {
      // the face containing a-b and the apex is flat on the plane
      const n = norm3(cross3(sub3(s.pts[1], s.pts[0]), sub3(s.pts[s.B - 1], s.pts[0])));
      assert.ok(near(Math.abs(n[k.up]), 1, 1e-9), 'face on plane');
    }
    // views exist
    for (const st of sol.stages) for (const v of ['FV', 'TV']) assert.ok(st[v].segs.length > 2);
    assert.ok(sol.steps.length >= 4 && sol.hints.length >= 2);
  });
}
