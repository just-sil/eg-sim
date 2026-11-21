import test from 'node:test';
import assert from 'node:assert/strict';
import { randomProblem } from '../js/generator.js';
import { solve } from '../js/stages.js';

test('random problems are solvable and stay in the first quadrant', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const p = randomProblem(seed);
    assert.ok(p, `seed ${seed} produced nothing`);
    const sol = solve(p);
    assert.equal(sol.stages.length, 3);
    for (const st of sol.stages) {
      for (const q of st.solid.pts.slice(0, st.solid.B)) assert.ok(q[1] > -1e-6 && q[2] > -1e-6, `seed ${seed}`);
    }
    assert.ok(p.statement.length > 40);
  }
});
