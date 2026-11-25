// Compare the user's drawing with the computed solution.
// Each stage/view is matched independently: the student may draw it anywhere
// along XY (any x shift; any distance from the free reference plane) and may
// mirror it, since a mirrored solid is an equally valid answer when the
// statement does not fix the side.
import { dist2, closestOnSeg, lerp2 } from './geometry.js';
import { distToPrim } from './editor.js';

const TOL = 1.6; // mm

function hashPts(pts, cell) {
  const m = new Map();
  for (const p of pts) {
    const k = `${Math.floor(p[0] / cell)},${Math.floor(p[1] / cell)}`;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(p);
  }
  return {
    near(q, tol) {
      const cx = Math.floor(q[0] / cell), cy = Math.floor(q[1] / cell);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const arr = m.get(`${cx + i},${cy + j}`);
        if (arr) for (const p of arr) if (dist2(p, q) <= tol) return true;
      }
      return false;
    },
  };
}

function uniq(pts) {
  const out = [];
  for (const p of pts) if (!out.some((q) => dist2(p, q) < 0.2)) out.push(p);
  return out;
}

function samplePrim(pr) {
  if (pr.kind === 'seg') {
    const L = dist2(pr.a, pr.b);
    const n = Math.max(2, Math.ceil(L / 2));
    const out = [];
    for (let i = 0; i < n; i++) out.push(lerp2(pr.a, pr.b, (i + 0.5) / n));
    return out;
  }
  if (pr.kind === 'circle') {
    const a0 = pr.a0 ?? 0;
    let sw = pr.a0 === undefined ? 2 * Math.PI : ((pr.a1 - pr.a0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const n = Math.max(6, Math.ceil((sw * pr.r) / 2));
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = a0 + (sw * (i + 0.5)) / n;
      out.push([pr.c[0] + pr.r * Math.cos(a), pr.c[1] + pr.r * Math.sin(a)]);
    }
    return out;
  }
  return [];
}

const segLen = (s) => dist2(s.a, s.b);

/**
 * @param sol      solution from solve()
 * @param prims    editor.userPrims()  [{kind,a,b|c,r..., style, id}]
 * @param keys     editor.userKeyPoints()
 */
export function check(sol, prims, keys) {
  const freeView = sol.frame === 'HP' ? 'TV' : 'FV';
  const results = [];
  const explained = new Map(); // prim id -> {ok, wrong}
  const missingAll = [];

  for (const st of sol.stages) {
    if (st.noCheck) continue;
    const stageRes = { no: st.no, views: {}, list: [] };
    // Module 2 stages carry FV/TV; Module 3 stages carry a list of views (sectional views,
    // true shape, development) that may sit anywhere on the sheet ("free").
    const views = st.views || ['FV', 'TV'].map((v) => ({
      key: v, name: v === 'FV' ? 'Front view' : 'Top view', segs: st[v].segs, keyPts: st[v].keyPts,
      side: v === 'FV' ? 'above' : 'below', flipY: v === freeView,
    }));
    for (const view of views) {
      const v = view.key;
      const side = view.side === 'above' ? (p) => p[1] <= 0.8 : view.side === 'below' ? (p) => p[1] >= -0.8 : () => true;
      const uKeys = keys.filter(side);
      const uPrims = prims;
      // a development may be opened along any edge: try each seam, keep the best
      let res = null;
      for (const cand of [view, ...(view.alts || [])]) {
        const solSegs = cand.segs;
        const solKeys = uniq(cand.keyPts.concat(solSegs.filter((s) => s.kind === 'edge').flatMap((s) => [s.a, s.b])));
        const r = fit(solSegs, solKeys, uKeys, uPrims, !!view.flipY);
        if (!res || (r.summary.found && (!res.summary.found || r.summary.score > res.summary.score))) res = r;
      }
      stageRes.views[v] = res.summary;
      stageRes.list.push({ key: v, name: view.name, ...res.summary });
      if (res.summary.found) {
        for (const [i, s] of res.primStatus) {
          const cur = explained.get(i);
          if (!cur || (s === 'ok' && cur !== 'ok')) explained.set(i, s);
        }
        missingAll.push(...res.missing);
      }
    }
    results.push(stageRes);
  }

  // per element: the worst status of its pieces wins
  const RANK = { ok: 0, wrong: 1, extra: 2 };
  const status = {};
  prims.forEach((pr, i) => {
    let s = explained.get(i);
    if (!s) { if (pr.style === 'construction') return; s = 'extra'; }
    if (!status[pr.id] || RANK[s] > RANK[status[pr.id]]) status[pr.id] = s;
  });
  return { stages: results, status, missing: missingAll };
}

function fit(solSegs, solKeys, uKeys, uPrims, allowFlipY) {
  const empty = { summary: { found: false, score: 0, ok: 0, wrong: 0, total: solSegs.filter((s) => !s.optional).length }, primStatus: new Map(), missing: [] };
  if (!uKeys.length || !solKeys.length) return empty;
  const hash = hashPts(uKeys, TOL);
  const cx = solKeys.reduce((s, p) => s + p[0], 0) / solKeys.length;
  const cy = solKeys.reduce((s, p) => s + p[1], 0) / solKeys.length;
  const sorted = solKeys.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const anchors = [];
  const nA = Math.min(8, sorted.length);
  for (let i = 0; i < nA; i++) anchors.push(sorted[Math.floor((i * (sorted.length - 1)) / Math.max(1, nA - 1))]);

  let best = null;
  const flips = [[1, 1], [-1, 1]];
  if (allowFlipY) flips.push([1, -1], [-1, -1]);
  for (const [mx, my] of flips) {
    const M = (p) => [mx * (p[0] - cx), my * (p[1] - cy)];
    const mk = solKeys.map(M);
    for (const A of anchors) {
      const mA = M(A);
      for (const U of uKeys) {
        const t = [U[0] - mA[0], U[1] - mA[1]];
        let score = 0;
        for (const k of mk) if (hash.near([k[0] + t[0], k[1] + t[1]], TOL)) score++;
        const pen = (mx < 0 ? 0.01 : 0) + (my < 0 ? 0.01 : 0);
        if (!best || score - pen > best.score - best.pen) best = { score, pen, mx, my, t };
      }
    }
  }
  if (!best || best.score < Math.min(3, solKeys.length) || best.score < solKeys.length * 0.3) return empty;

  const T = (p) => [best.mx * (p[0] - cx) + best.t[0], best.my * (p[1] - cy) + best.t[1]];
  const segs = solSegs.map((s) => ({ ...s, a: T(s.a), b: T(s.b) }));

  // solution segments -> present / wrong style / missing
  let okLen = 0, totLen = 0, ok = 0, wrong = 0, total = 0;
  const missing = [];
  for (const s of segs) {
    const samples = samplePrim({ kind: 'seg', a: s.a, b: s.b });
    let hit = 0, styleHit = 0;
    for (const q of samples) {
      let any = false, same = false;
      for (const pr of uPrims) {
        if (distToPrim(q, pr).d <= TOL) { any = true; if (pr.style === s.style) { same = true; break; } }
      }
      if (any) hit++;
      if (same) styleHit++;
    }
    const present = hit >= samples.length * 0.75;
    if (s.optional) continue;
    total++; totLen += segLen(s);
    if (present && (s.anyStyle || styleHit >= samples.length * 0.75)) { ok++; okLen += segLen(s); }
    else if (present) { wrong++; okLen += segLen(s) * 0.5; }
    else missing.push(s);
  }

  // user prims explained by this view?
  const primStatus = new Map();
  uPrims.forEach((pr, i) => {
    const samples = samplePrim(pr);
    if (!samples.length) return;
    let hit = 0, styleHit = 0;
    for (const q of samples) {
      let any = false, same = false;
      for (const s of segs) {
        if (closestOnSeg(q, s.a, s.b).d <= TOL) { any = true; if (s.style === pr.style || s.anyStyle) { same = true; break; } }
      }
      if (any) hit++;
      if (same) styleHit++;
    }
    if (hit >= samples.length * 0.75) {
      primStatus.set(i, styleHit >= samples.length * 0.75 ? 'ok' : 'wrong');
    }
  });
  return {
    summary: { found: true, score: totLen ? okLen / totLen : 0, ok, wrong, total, missingN: missing.length, mirrored: best.mx < 0 || best.my < 0 },
    primStatus, missing,
  };
}
