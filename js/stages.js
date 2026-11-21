// Change-of-position solver. Every problem is solved in an "HP frame" (solid
// resting on HP). Problems that rest on VP are solved the same way and then
// mirrored with (x, y, z) -> (x, z, y), which swaps the roles of HP and VP.
import { D2R, R2D, sub3, norm3, dist2 } from './geometry.js';
import { makeSolid, withPts, baseRadii, solidHeight, solidName, baseShapeName } from './solids.js';
import { projectSolid, toSheet, inclinations } from './projector.js';

const CLEAR = 12; // clearance (mm) from the other reference plane
const GAP = 45; // gap (mm) between stages on the sheet

const ORIENT = {
  base: (p) => p.orient || 'edgeParallel',
  edge: () => 'edge', face: () => 'edge',
  corner: () => 'corner', slantEdge: () => 'corner', suspend: () => 'corner',
  point: () => 'corner', generator: () => 'corner',
};

const mapPts = (pts, f) => pts.map(f);
const rotXZ = (pts, piv, t) => mapPts(pts, (p) => {
  const X = p[0] - piv[0], Z = p[2] - piv[2];
  const c = Math.cos(t), s = Math.sin(t);
  return [piv[0] + X * c + Z * s, p[1], piv[2] - X * s + Z * c];
});
const rotXY = (pts, piv, a) => mapPts(pts, (p) => {
  const X = p[0] - piv[0], Y = p[1] - piv[1];
  const c = Math.cos(a), s = Math.sin(a);
  return [piv[0] + X * c - Y * s, piv[1] + X * s + Y * c, p[2]];
});
const shift = (pts, d) => mapPts(pts, (p) => [p[0] + d[0], p[1] + d[1], p[2] + d[2]]);
const minOf = (pts, k, n) => Math.min(...pts.slice(0, n).map((p) => p[k]));
const maxOf = (pts, k, n) => Math.max(...pts.slice(0, n).map((p) => p[k]));

/** Solve a problem. Returns the full solution model used by the sheet, guide, checker and 3D view. */
export function solve(problem) {
  const frame = problem.frame || 'HP';
  const spec = problem.solid;
  const solid0 = makeSolid(spec, ORIENT[problem.rest](problem));
  const nReal = solid0.B; // real (non-aux) points
  const h = solidHeight(spec);
  const { R, r: apothem } = baseRadii(spec);
  const numbers = { h, R, apothem };

  // ---------- Stage 1: simple position ----------
  let pts = shift(solid0.pts, [0, maxOf(solid0.pts, 1, nReal) + CLEAR, 0]);
  const poses = [pts];

  // pivot: the right-most resting element
  const pivX = maxOf(pts, 0, nReal);
  let piv = [pivX, pts[solid0.B][1], 0];

  // ---------- Stage 2: tilt about the pivot (rotation axis ⟂ VP) ----------
  const s2 = problem.stage2;
  if (s2) {
    const d = pivX - pts[solid0.B][0]; // horizontal distance pivot -> axis
    let t;
    switch (s2.tilt) {
      case 'axis': t = (90 - s2.angle) * D2R; break;
      case 'base': t = s2.angle * D2R; break;
      case 'apexOn': t = Math.PI - Math.atan2(h, d); break;
      case 'slantEdge': t = Math.PI - Math.atan2(h, d) - s2.angle * D2R; break;
      case 'suspend': {
        const g = solid0.pts[solid0.G][2];
        t = Math.PI - Math.atan2(g, d) + Math.PI / 2;
        break;
      }
      default: throw new Error('unknown tilt ' + s2.tilt);
    }
    numbers.tilt = t * R2D;
    pts = rotXZ(pts, piv, t);
    if (s2.tilt === 'suspend') {
      const dz = CLEAR - minOf(pts, 2, nReal);
      pts = shift(pts, [0, 0, dz]);
      piv = [piv[0], piv[1], piv[2] + dz];
    }
    numbers.theta = inclinations(sub3(pts[solid0.T], pts[solid0.B])).hp;
    poses.push(pts);
  }

  // ---------- Stage 3: rotate about a vertical axis through the pivot ----------
  const s3 = problem.stage3;
  if (s3 && s2) {
    let a;
    switch (s3.type) {
      case 'edgeQ': a = (90 - s3.angle) * D2R; break;
      case 'axisTV': a = s3.angle * D2R; break;
      case 'plane': a = s3.angle * D2R; break;
      case 'axisTrue': {
        const sinb = Math.sin(s3.angle * D2R) / Math.cos(numbers.theta * D2R);
        if (sinb > 1) throw new Error('θ + φ > 90°: impossible');
        a = Math.asin(sinb);
        break;
      }
      default: throw new Error('unknown stage3 ' + s3.type);
    }
    if (problem.near === 'apex') a = -a;
    numbers.beta = Math.abs(a) * R2D;
    numbers.alpha = a * R2D;
    pts = rotXY(pts, piv, a);
    const dy = CLEAR - minOf(pts, 1, nReal);
    if (dy > 0) pts = shift(pts, [0, dy, 0]);
    poses.push(pts);
  }

  // ---------- place stages left to right and mirror VP problems ----------
  const onlyStages = problem.onlyStages || poses.length;
  const used = poses.slice(0, onlyStages);
  let x = 20;
  const placed = used.map((p) => {
    const dx = x - minOf(p, 0, nReal);
    const q = shift(p, [dx, 0, 0]);
    x += maxOf(q, 0, nReal) - minOf(q, 0, nReal) + GAP;
    return frame === 'VP' ? q.map(([a, b, c]) => [a, c, b]) : q;
  });

  // ---------- project ----------
  const stages = placed.map((p, i) => {
    const s = withPts(solid0, p);
    return { no: i + 1, solid: s, FV: projectSolid(s, 'FV', i + 1), TV: projectSolid(s, 'TV', i + 1) };
  });

  // measured checks (for tests / display)
  const fin = stages[stages.length - 1].solid;
  numbers.final = inclinations(sub3(fin.pts[fin.T], fin.pts[fin.B]));

  const sol = { problem, frame, stages, numbers, solid: solid0 };
  sol.groups = buildGroups(sol);
  sol.steps = buildSteps(sol);
  sol.hints = buildHints(sol);
  return sol;
}

// ------------------------------------------------------------------
// Overlay groups: named sets of segments/labels the guide can reveal.
// ------------------------------------------------------------------
function buildGroups(sol) {
  const G = {};
  const { stages, frame, problem } = sol;
  const tv = frame === 'HP' ? 'TV' : 'FV';
  stages.forEach((st, i) => {
    const k = `s${st.no}`;
    for (const v of ['FV', 'TV']) {
      G[`${k}.${v}`] = { segs: st[v].segs.filter((s) => s.kind !== 'axis') };
      G[`${k}.axis${v}`] = { segs: st[v].segs.filter((s) => s.kind === 'axis') };
      G[`${k}.lab${v}`] = { labels: st[v].labels };
    }
    // vertical projectors between FV and TV of this stage
    const vp = [];
    st.solid.keyIdx.forEach((idx) => {
      const p = st.solid.pts[idx];
      vp.push({ a: toSheet(p, 'FV'), b: toSheet(p, 'TV'), style: 'construction' });
    });
    G[`${k}.vproj`] = { segs: vp };
    // horizontal projectors carried over from the previous stage
    const hp = [];
    if (i > 0) {
      const prev = stages[i - 1].solid;
      for (const v of ['FV', 'TV']) {
        st.solid.keyIdx.forEach((idx) => {
          const a = toSheet(prev.pts[idx], v), b = toSheet(st.solid.pts[idx], v);
          if (Math.abs(a[1] - b[1]) < 1e-6 && Math.abs(a[0] - b[0]) > 0.5) hp.push({ a, b, style: 'construction' });
        });
      }
    }
    G[`${k}.hproj`] = { segs: hp };
    G[`${k}.cons`] = { segs: [], labels: [] };
  });

  // extra constructions
  const s2 = problem.stage2, s3 = problem.stage3;
  if (s2 && s2.tilt === 'suspend' && stages[1]) {
    const so = stages[1].solid;
    const ov = frame === 'HP' ? 'FV' : 'TV';
    const g = toSheet(so.pts[so.G], ov);
    const pv = so.keyIdx.map((i) => toSheet(so.pts[i], ov)).sort((a, b) => a[1] - b[1])[0];
    const c = G['s2.cons'];
    c.segs.push({ a: [pv[0], pv[1] - 8], b: [g[0], g[1] + 25], style: 'construction' });
    c.labels.push({ p: g, at: [g[0] + 3, g[1]], text: 'G' });
  }
  if (s3 && s3.type === 'axisTrue' && stages[2]) {
    const s2o = stages[1].solid, s3o = stages[2].solid;
    const B3 = toSheet(s3o.pts[s3o.B], tv), T3 = toSheet(s3o.pts[s3o.T], tv);
    const B2 = toSheet(s2o.pts[s2o.B], tv), T2 = toSheet(s2o.pts[s2o.T], tv);
    const rho = dist2(B2, T2);
    const c = G['s3.cons'];
    const a0 = Math.atan2(T3[1] - B3[1], T3[0] - B3[0]);
    const arc = [];
    for (let k = -12; k <= 12; k++) {
      const a = a0 + (k / 12) * 0.6;
      arc.push([B3[0] + rho * Math.cos(a), B3[1] + rho * Math.sin(a)]);
    }
    for (let k = 0; k < arc.length - 1; k++) c.segs.push({ a: arc[k], b: arc[k + 1], style: 'construction' });
    c.segs.push({ a: [B3[0] - 10, T3[1]], b: [B3[0] + rho + 15, T3[1]], style: 'construction' });
    c.segs.push({ a: B3, b: T3, style: 'construction' });
    c.labels.push({ p: T3, at: [T3[0] + 3, T3[1] + 4], text: `β = ${sol.numbers.beta.toFixed(1)}°` });
  }
  return G;
}

// ------------------------------------------------------------------
// Words & steps
// ------------------------------------------------------------------
function words(sol) {
  const hp = sol.frame === 'HP';
  return {
    P: hp ? 'HP' : 'VP', Q: hp ? 'VP' : 'HP',
    tv: hp ? 'TV' : 'FV', ov: hp ? 'FV' : 'TV',
    tvName: hp ? 'top view' : 'front view', ovName: hp ? 'front view' : 'top view',
    side: hp ? 'below' : 'above', otherSide: hp ? 'above' : 'below',
  };
}

const f1 = (x) => (Math.round(x * 10) / 10).toString();

function restPhrase(p) {
  const pyr = p.solid.type === 'pyramid' || p.solid.type === 'tetra';
  return {
    base: 'its base',
    edge: 'a base edge',
    corner: 'a base corner',
    point: 'a point on the base circle',
    face: 'a triangular face',
    slantEdge: 'a slant edge',
    generator: 'a generator',
    suspend: pyr ? 'a base corner (freely suspended)' : 'a corner (freely suspended)',
  }[p.rest];
}

function orientPhrase(sol) {
  const p = sol.problem, W = words(sol);
  const curved = p.solid.type === 'cylinder' || p.solid.type === 'cone';
  switch (p.rest) {
    case 'base':
      if (curved) return 'Divide it into 12 equal parts (generators 1–12).';
      return (p.orient || 'edgeParallel') === 'edgeParallel'
        ? `Keep one edge parallel to XY (that edge is ∥ ${W.Q}).`
        : 'Keep a corner on the centre line parallel to XY.';
    case 'edge': case 'face':
      return `Keep the resting edge (a–b) perpendicular to XY on the right-hand side. It has to be ⟂ ${W.Q} so it can act as the hinge when the solid tilts.`;
    case 'corner': case 'slantEdge': case 'suspend':
      return 'Keep the resting corner (a) on the right-hand side, on the centre line parallel to XY, so the tilt happens in a plane parallel to the ' + W.Q + '.';
    case 'point': case 'generator':
      return 'Divide the circle into 12 parts. Point 1, at the right end of the horizontal centre line, is the point the solid will rest on.';
    default: return '';
  }
}

function stage2Phrase(sol) {
  const p = sol.problem, W = words(sol), s2 = p.stage2, n = sol.numbers;
  switch (s2.tilt) {
    case 'axis':
      return s2.face
        ? `the ${s2.face} makes ${s2.angle}° with XY. That face contains the axis, so the axis is also at ${s2.angle}° to ${W.P}.`
        : `the axis makes ${s2.angle}° with XY (axis inclined ${s2.angle}° to ${W.P}, still parallel to ${W.Q}).`;
    case 'base': return `the base makes ${s2.angle}° with XY (so the axis is at ${f1(90 - s2.angle)}° to ${W.P}).`;
    case 'apexOn': return `the ${s2.element || 'face'} through the resting element lies on XY (the ${s2.element || 'face'} is on ${W.P}). The axis then makes ${f1(n.theta)}° with ${W.P}.`;
    case 'slantEdge': return `the slant edge through the resting corner (a–o) makes ${s2.angle}° with XY. The axis then makes ${f1(n.theta)}° with ${W.P}.`;
    case 'suspend': return `the line joining the corner of suspension and the centre of gravity G is perpendicular to XY, with the corner at the top. G lies on the axis at h/4 = ${f1(n.h / 4)} mm from the base. The axis then makes ${f1(n.theta)}° with ${W.P}.`;
    default: return '';
  }
}

function stage3Phrase(sol) {
  const p = sol.problem, W = words(sol), s3 = p.stage3, n = sol.numbers;
  const near = p.near === 'apex' ? ` with the apex nearer the ${W.Q}` : p.near === 'base' ? ` with the base nearer the ${W.Q}` : '';
  switch (s3.type) {
    case 'edgeQ': return `the resting edge makes ${s3.angle}° with XY. The edge lies on ${W.P}, so its ${W.tvName} shows its true inclination to ${W.Q}.`;
    case 'axisTV': return `the ${W.tvName} of the axis makes ${s3.angle}° with XY${near}.`;
    case 'plane': return `the ${W.tvName} of the axis makes ${s3.angle}° with XY. The plane containing the axis is ⟂ ${W.P}, so it appears as a line along the axis${near}.`;
    case 'axisTrue': return `the axis makes a TRUE angle of ${s3.angle}° with ${W.Q}. A true angle with ${W.Q} never shows directly in the ${W.tvName}; its apparent angle there is β = ${f1(n.beta)}°.`;
    default: return '';
  }
}

function buildSteps(sol) {
  const p = sol.problem, W = words(sol), n = sol.numbers, s = p.solid;
  const curved = s.type === 'cylinder' || s.type === 'cone';
  const pyr = s.type === 'pyramid' || s.type === 'tetra' || s.type === 'cone';
  const size = curved ? `diameter ${s.d} mm` : s.rect ? `${s.rect[0]} × ${s.rect[1]} mm` : `side ${s.side} mm`;
  const steps = [];
  const st = (stage, title, text, show) => steps.push({ stage, title, text, show });

  st(1, 'Stage 1: simple position',
    `Start with the axis perpendicular to ${W.P}. The base then shows its true shape in the ${W.tvName}. Draw a ${baseShapeName(s)} of ${size} ${W.side} XY, at a convenient distance. ${orientPhrase(sol)}${pyr && !curved ? ' Join the centre o to every corner; these are the slant edges.' : ''}${s.type === 'cone' ? ' Join the 12 points to the centre (the apex o).' : ''} Label the corners.`,
    [`s1.${W.tv}`, `s1.lab${W.tv}`]);
  st(1, 'Projectors',
    `Draw thin projectors from every point of the ${W.tvName} across XY.`,
    ['s1.vproj']);
  st(1, `Complete the ${W.ovName}`,
    `The base lies on XY (it is on ${W.P}) and the ${pyr ? 'apex' : 'other end'} is ${f1(n.h)} mm from XY. Complete the ${W.ovName}: thick lines for visible edges, dashed lines for hidden ones.`,
    [`s1.${W.ov}`, `s1.lab${W.ov}`]);
  st(1, 'Axis', 'Draw the axis as a chain line (long dash, short dash) in both views.', ['s1.axisFV', 's1.axisTV']);

  if (p.stage2 && (p.onlyStages || 3) >= 2) {
    st(2, 'Stage 2: tilt the solid',
      `Redraw the ${W.ovName} of stage 1 to the right, rotated about the resting ${p.rest === 'point' ? 'point' : p.rest === 'corner' || p.rest === 'slantEdge' || p.rest === 'suspend' ? 'corner' : 'edge'} until ${stage2Phrase(sol)} Keep every length; only the position changes. Tip: select the stage-1 ${W.ovName} and use the Rotate-copy tool.`,
      [`s2.${W.ov}`, `s2.axis${W.ov}`, `s2.lab${W.ov}`, 's2.cons']);
    st(2, 'Projectors',
      `Draw vertical projectors from each point of the new ${W.ovName}. Carry each point of the stage-1 ${W.tvName} across with a horizontal line. Their intersections are the new ${W.tvName} points.`,
      ['s2.vproj', 's2.hproj']);
    st(2, `Complete the ${W.tvName}`,
      `Join the points in the same order. Visibility: the parts nearest the observer are thick; anything hidden behind the solid is dashed.`,
      [`s2.${W.tv}`, `s2.axis${W.tv}`, `s2.lab${W.tv}`]);
  }
  if (p.stage3 && (p.onlyStages || 3) >= 3) {
    if (p.stage3.type === 'axisTrue') {
      st(3, 'Find the apparent angle β',
        `In stage 2 the axis is parallel to ${W.Q}, so its ${W.tvName} has length L·cosθ = ${f1(n.h)}·cos${f1(n.theta)}° = ${f1(n.h * Math.cos(n.theta * D2R))} mm. Take one end of the axis. Draw an arc of that radius, and a line parallel to XY at L·sinφ = ${f1(n.h)}·sin${p.stage3.angle}° = ${f1(n.h * Math.sin(p.stage3.angle * D2R))} mm from that end (the locus of the other end). They meet where the other end of the axis must be, which gives β = ${f1(n.beta)}°.`,
        ['s3.cons']);
    }
    st(3, 'Stage 3: rotate the solid',
      `Reproduce the ${W.tvName} of stage 2 further to the right, rotated so that ${stage3Phrase(sol)} Its shape doesn't change; only its position does (Rotate-copy tool).`,
      [`s3.${W.tv}`, `s3.axis${W.tv}`, `s3.lab${W.tv}`]);
    st(3, 'Projectors',
      `Draw vertical projectors from the new ${W.tvName}. Carry the heights of the stage-2 ${W.ovName} across with horizontal lines. The intersections give the final ${W.ovName}.`,
      ['s3.vproj', 's3.hproj']);
    st(3, `Final ${W.ovName}`,
      `Join the points and decide visibility. Thick lines for visible edges, dashed for hidden, chain line for the axis. Done!`,
      [`s3.${W.ov}`, `s3.axis${W.ov}`, `s3.lab${W.ov}`]);
  }
  return steps;
}

function buildHints(sol) {
  const p = sol.problem, W = words(sol);
  const hints = [];
  hints.push(`The solid rests on ${restPhrase(p)} on the ${W.P}. Every problem starts from a simple position with the axis ⟂ ${W.P}, so draw the ${W.tvName} (true shape of the base) first.`);
  hints.push(`Stage 1 orientation: ${orientPhrase(sol)}`);
  if (p.stage2 && (p.onlyStages || 3) >= 2) hints.push(`Stage 2: tilt the ${W.ovName} until ${stage2Phrase(sol)}`);
  if (p.stage3 && (p.onlyStages || 3) >= 3) hints.push(`Stage 3: rotate the ${W.tvName} until ${stage3Phrase(sol)}`);
  for (const n of p.notes || []) hints.push(n);
  return hints;
}

export { solidName };
