// Random practice problems built from the same schema as the playlist problems.
import { solve } from './stages.js';
import { solidName } from './solids.js';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomProblem(seed = Math.floor(Math.random() * 1e9)) {
  const r = rng(seed);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  for (let attempt = 0; attempt < 40; attempt++) {
    const kind = pick(['prism', 'prism', 'pyramid', 'pyramid', 'pyramid', 'cylinder', 'cone', 'cone']);
    const frame = r() < 0.7 ? 'HP' : 'VP';
    const P = frame, Q = frame === 'HP' ? 'VP' : 'HP';
    const tvName = frame === 'HP' ? 'top view' : 'front view';
    let solid, rest;
    const side = pick([25, 30, 35, 40]), h = pick([50, 55, 60, 65, 70]), d = pick([40, 45, 50]);
    if (kind === 'prism') { solid = { type: 'prism', n: pick([3, 4, 5, 6]), side, h }; rest = pick(['edge', 'edge', 'corner']); }
    else if (kind === 'pyramid') { solid = { type: 'pyramid', n: pick([3, 4, 5, 6]), side, h }; rest = pick(['edge', 'corner', 'face', 'slantEdge']); }
    else if (kind === 'cylinder') { solid = { type: 'cylinder', d, h }; rest = 'point'; }
    else { solid = { type: 'cone', d, h }; rest = pick(['point', 'point', 'generator']); }

    const theta = pick([30, 35, 40, 45, 50, 55, 60]);
    let stage2, stage3, near = null;
    const restText = {
      edge: 'one of its base edges', corner: 'one of its base corners', point: 'a point of its base circle',
      face: 'one of its triangular faces', slantEdge: 'one of its slant edges', generator: 'one of its generators',
    }[rest];
    const conds = [];
    if (rest === 'face' || rest === 'slantEdge' || rest === 'generator') {
      stage2 = { tilt: 'apexOn', element: { face: 'triangular face', slantEdge: 'slant edge', generator: 'generator' }[rest] };
    } else {
      stage2 = { tilt: 'axis', angle: theta };
      conds.push(`its axis is inclined at ${theta}° to ${P}`);
    }
    const phi = pick([30, 35, 40, 45, 50, 60]);
    const opts = [];
    if (rest === 'edge' || rest === 'face') opts.push('edgeQ');
    opts.push('axisTV');
    if (stage2.tilt === 'axis' && theta + phi <= 80) opts.push('axisTrue');
    if (stage2.tilt === 'apexOn') opts.push('plane');
    const t3 = pick(opts);
    stage3 = { type: t3, angle: phi };
    if (t3 === 'edgeQ') conds.push(`the ${rest === 'face' ? 'base edge on ' + P : 'resting edge'} is inclined at ${phi}° to ${Q}`);
    if (t3 === 'axisTV') conds.push(`the ${tvName} of the axis is inclined at ${phi}° to XY`);
    if (t3 === 'axisTrue') conds.push(`the axis is inclined at ${phi}° to ${Q}`);
    if (t3 === 'plane') {
      near = pick(['apex', 'base', null]);
      conds.push(`the plane containing the axis and perpendicular to ${P} is inclined at ${phi}° to ${Q}`);
      if (near) conds.push(`the ${near === 'apex' ? 'apex' : 'base'} is nearer to the ${Q}`);
    }
    const dims = solid.d ? `base diameter ${solid.d} mm and axis ${solid.h} mm long` : `base edge ${solid.side} mm and axis ${solid.h} mm long`;
    const name = solidName(solid);
    const p = {
      id: `R${seed}`, group: 'random', seed, title: `Random: ${name}, ${rest === 'point' ? 'base point' : rest} on ${P}`,
      statement: `A ${name} of ${dims} rests on the ${P} on ${restText} such that ${conds.join(', and ')}. Draw its projections.`,
      frame, solid, rest, stage2, stage3, near,
    };
    try {
      const sol = solve(p);
      const real = sol.stages[2].solid.pts.slice(0, sol.solid.B);
      if (real.every((q) => q[1] > -1e-6 && q[2] > -1e-6)) return p;
    } catch { /* try again */ }
  }
  return null;
}
