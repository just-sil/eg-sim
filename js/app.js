import { Editor, TOOLS, STYLES } from './editor.js';
import { PROBLEMS, CONCEPTS, yt } from './problems.js';
import { solve } from './stages.js';
import { check } from './checker.js';
import { View3D } from './view3d.js';
import { randomProblem } from './generator.js';
import { solidName } from './solids.js';
import { startTour } from './tour.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Surface unexpected errors in the status bar instead of failing silently.
window.addEventListener('error', (e) => { const el = document.getElementById('prompt'); if (el) el.textContent = `⚠ ${e.message}`; });
window.addEventListener('unhandledrejection', (e) => { const el = document.getElementById('prompt'); if (el) el.textContent = `⚠ ${e.reason}`; });

// ------------------------------------------------------------ storage (best effort)
const store = {
  get(k, d) { try { const v = localStorage.getItem('egsim.v1.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('egsim.v1.' + k, JSON.stringify(v)); } catch { /* ignore */ } },
};

// ------------------------------------------------------------ state
const state = {
  item: null, // problem or concept
  sol: null,
  hintsShown: 0,
  step: -1, // guide step index (-1 = closed)
  showSolution: false,
  v3stage: 0,
  done: store.get('done', {}),
  randoms: store.get('randoms', []),
};

// ------------------------------------------------------------ editor
const editor = new Editor($('#sheet'), {
  onChange: () => { if (state.item && !state.item.html) store.set('draw.' + state.item.id, editor.elements); updateUndo(); },
  onStatus: (s) => {
    if (s.prompt !== undefined) $('#prompt').textContent = s.prompt;
    if (s.coords !== undefined) $('#coords').textContent = s.coords;
    if (s.snap !== undefined) $('#snapinfo').textContent = s.snap;
    if (s.tool) $$('.tbtn[data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === s.tool));
  },
  onSelection: (n) => { $('#selinfo').textContent = n ? `${n} selected` : ''; },
});

// ------------------------------------------------------------ toolbar
const ICONS = {
  select: '<path d="M6 3l12 8-5.5 1.2L10 18z"/>',
  pan: '<path d="M12 3v18M3 12h18M12 3l-2.5 2.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5"/>',
  point: '<circle cx="12" cy="12" r="3" fill="currentColor"/>',
  segment: '<path d="M5 19L19 5"/><circle cx="5" cy="19" r="1.8" fill="currentColor"/><circle cx="19" cy="5" r="1.8" fill="currentColor"/>',
  polyline: '<path d="M3 18l5-9 6 7 7-12"/>',
  polygon: '<path d="M12 3l8 4.6v8.8L12 21l-8-4.6V7.6z"/>',
  circle: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  arc: '<path d="M4 17a9 9 0 0 1 15-9"/><circle cx="13" cy="17" r="1.3" fill="currentColor"/><path d="M13 17L19 8" stroke-dasharray="2 2"/>',
  curve: '<path d="M3 17c3-12 8 8 18-9"/>',
  vline: '<path d="M12 2v20" stroke-dasharray="3 2"/><circle cx="12" cy="14" r="2" fill="currentColor"/>',
  hline: '<path d="M2 12h20" stroke-dasharray="3 2"/><circle cx="14" cy="12" r="2" fill="currentColor"/>',
  angle: '<path d="M3 19h18M3 19L17 5"/><path d="M10 19a7 7 0 0 0-2-5"/>',
  parallel: '<path d="M4 17L16 5M8 21L20 9"/>',
  perp: '<path d="M4 19h16M12 19V4"/><path d="M12 15h4v4"/>',
  divide: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3L6.3 17.7"/>',
  rotate: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/>',
  copy: '<rect x="3" y="8" width="11" height="11" rx="1"/><path d="M10 5h9v9" /><path d="M16 2l3 3-3 3" />',
  measure: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
  label: '<path d="M6 19l5-14h2l5 14M8.5 13h7"/>',
  erase: '<path d="M4 16l9-9 7 7-6 6H8z"/><path d="M9 11l7 7"/>',
};
const GROUPS = [
  ['select', 'pan'],
  ['point', 'segment', 'polyline', 'polygon', 'circle', 'arc', 'curve'],
  ['vline', 'hline', 'angle', 'parallel', 'perp', 'divide'],
  ['rotate', 'copy', 'measure', 'label', 'erase'],
];
const STYLE_ICON = {
  visible: '<line x1="1" y1="4" x2="25" y2="4" stroke="currentColor" stroke-width="2.6"/>',
  hidden: '<line x1="1" y1="4" x2="25" y2="4" stroke="currentColor" stroke-width="1.8" stroke-dasharray="4 2.5"/>',
  axis: '<line x1="1" y1="4" x2="25" y2="4" stroke="currentColor" stroke-width="1.2" stroke-dasharray="8 2 2 2"/>',
  construction: '<line x1="1" y1="4" x2="25" y2="4" stroke="currentColor" stroke-width=".8"/>',
};

function buildToolbar() {
  const tb = $('#toolbar');
  let html = '';
  for (const g of GROUPS) {
    html += '<div class="grp">';
    for (const t of g) {
      const info = TOOLS[t];
      const key = info.key === ' ' ? 'Space' : info.key.toUpperCase();
      html += `<button class="tbtn" data-tool="${t}" title="${esc(info.label)} (${key}) – ${esc(info.tip)}"><svg viewBox="0 0 24 24">${ICONS[t]}</svg></button>`;
    }
    if (g.includes('polygon')) {
      html += `<select id="polyN" title="Sides of the regular polygon">${[3, 4, 5, 6, 7, 8].map((n) => `<option value="${n}" ${n === 4 ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
    }
    html += '</div>';
  }
  html += '<div class="grp">';
  for (const [k, s] of Object.entries(STYLES)) {
    html += `<button class="sbtn" data-style="${k}" title="${esc(s.tip)} (${s.key})"><svg viewBox="0 0 26 8">${STYLE_ICON[k]}</svg>${s.label}</button>`;
  }
  html += '</div><div class="grp">';
  html += '<button class="tbtn" id="btnUndo" title="Undo (Ctrl+Z)"><svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg></button>';
  html += '<button class="tbtn" id="btnRedo" title="Redo (Ctrl+Y)"><svg viewBox="0 0 24 24"><path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/></svg></button>';
  html += '<button class="tbtn" id="btnFit" title="Fit to the problem (F)"><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>';
  html += '<button class="tbtn" id="btnClear" title="Clear the sheet"><svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg></button>';
  html += '<label title="Snap to the 1 mm grid"><input type="checkbox" id="gridSnap"> grid</label>';
  html += '<span id="selinfo" class="muted small"></span></div>';
  tb.innerHTML = html;

  tb.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tool]');
    if (t) { editor.setTool(t.dataset.tool); return; }
    const s = e.target.closest('[data-style]');
    if (s) setStyle(s.dataset.style);
  });
  $('#polyN').addEventListener('change', (e) => { editor.polyN = +e.target.value; setTool('polygon'); });
  $('#btnUndo').onclick = () => editor.undo();
  $('#btnRedo').onclick = () => editor.redo();
  $('#btnFit').onclick = () => fit();
  $('#btnClear').onclick = () => { if (confirm('Clear your drawing for this problem?')) editor.clear(); };
  $('#gridSnap').onchange = (e) => { editor.gridSnap = e.target.checked; };
}
function setTool(t) { editor.setTool(t); }
function setStyle(s) {
  editor.setStyle(s);
  $$('.sbtn').forEach((b) => b.classList.toggle('active', b.dataset.style === s));
}
function updateUndo() {
  $('#btnUndo').disabled = !editor.undoStack.length;
  $('#btnRedo').disabled = !editor.redoStack.length;
}

// ------------------------------------------------------------ sidebar
const GROUP_TITLES = {
  concept: 'Concepts (videos 1, 4, 5, 9)',
  simple: 'Simple positions (videos 2–3)',
  first: 'Drill: choose the first stage',
  inclined: 'Axis inclined: change of position',
  random: 'Random practice',
};
function allItems() {
  return [
    ...CONCEPTS.map((c) => ({ ...c, group: 'concept' })),
    ...PROBLEMS,
    ...state.randoms,
  ];
}
function renderList() {
  const q = $('#search').value.trim().toLowerCase();
  const items = allItems().filter((p) => !q || `${p.id} ${p.title} ${p.statement || ''}`.toLowerCase().includes(q));
  let html = '';
  for (const g of Object.keys(GROUP_TITLES)) {
    const list = items.filter((p) => p.group === g);
    if (!list.length) continue;
    html += `<div class="pgroup">${GROUP_TITLES[g]}</div>`;
    for (const p of list) {
      const active = state.item && state.item.id === p.id ? ' active' : '';
      html += `<button class="pitem${active}" data-id="${p.id}"><span class="pid">${esc(p.id.startsWith('R') ? 'R' : p.id)}</span><span>${esc(p.title)}</span>${state.done[p.id] ? '<span class="tick">✓</span>' : ''}</button>`;
    }
  }
  $('#plist').innerHTML = html || '<p class="muted" style="padding:14px">No match.</p>';
}
$('#plist').addEventListener('click', (e) => {
  const b = e.target.closest('.pitem');
  if (!b) return;
  open(b.dataset.id);
  $('#sidebar').classList.remove('open');
});
$('#search').addEventListener('input', renderList);
$('#btnRandom').onclick = () => {
  const p = randomProblem();
  if (!p) return;
  state.randoms = [p, ...state.randoms].slice(0, 12);
  store.set('randoms', state.randoms);
  open(p.id);
};

// ------------------------------------------------------------ open an item
function open(id) {
  const item = allItems().find((p) => p.id === id);
  if (!item) return;
  state.item = item;
  state.hintsShown = 0;
  state.step = -1;
  state.showSolution = false;
  store.set('last', id);
  history.replaceState(null, '', '#' + id);
  $('#ptitle').textContent = `${item.id} · ${item.title}`;
  editor.highlight = null;
  if (item.html) {
    state.sol = null;
    editor.load(store.get('draw.scratch', []));
  } else {
    state.sol = solve(item);
    editor.load(store.get('draw.' + id, []));
  }
  ['#btnHint', '#btnGuide', '#btnSolution', '#btnCheck'].forEach((s) => { $(s).disabled = !state.sol; });
  updateOverlay();
  renderQuestion();
  renderList();
  $('#tabChk').innerHTML = '<p class="muted">Draw your answer on the sheet and press <b>Check</b>.</p>';
  state.v3stage = state.sol ? state.sol.stages.length - 1 : 0;
  render3D();
  fit();
  requestAnimationFrame(() => requestAnimationFrame(fit));
  updateUndo();
  if (item.html) showTab('q');
}

function solutionBounds() {
  if (!state.sol) return [-10, -90, 200, 70];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const st of state.sol.stages) for (const v of ['FV', 'TV']) for (const s of st[v].segs) for (const p of [s.a, s.b]) {
    x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
  }
  return [Math.min(0, x0), Math.min(-10, y0), x1, Math.max(10, y1)];
}
function fit() {
  const b = solutionBounds();
  const u = editor.bounds();
  if (u) { b[0] = Math.min(b[0], u[0]); b[1] = Math.min(b[1], u[1]); b[2] = Math.max(b[2], u[2]); b[3] = Math.max(b[3], u[3]); }
  editor.fitTo(b, 18);
}

// ------------------------------------------------------------ question tab
function renderQuestion() {
  const it = state.item;
  const tab = $('#tabQ');
  if (it.html) {
    tab.innerHTML = `<div class="meta"><span class="chip"><a href="${yt(it.video)}" target="_blank" rel="noopener">▶ Watch the video</a></span>${it.alt ? `<span class="chip"><a href="${yt(it.alt)}" target="_blank" rel="noopener">▶ Related video</a></span>` : ''}</div><div class="card">${it.html}</div>${it.demos ? '<p><button id="qDemo3d">Explore these solids in 3D</button></p>' : ''}`;
    $('#qDemo3d')?.addEventListener('click', () => showTab('3d'));
    return;
  }
  const sol = state.sol, n = sol.numbers;
  const meta = [
    `<span class="chip">${esc(solidName(it.solid))}</span>`,
    `<span class="chip">rests on ${sol.frame}</span>`,
    `<span class="chip">${sol.stages.length} stage${sol.stages.length > 1 ? 's' : ''}</span>`,
    it.video ? `<span class="chip"><a href="${yt(it.video)}" target="_blank" rel="noopener">▶ Watch the solution</a></span>` : '',
    it.alt ? `<span class="chip"><a href="${yt(it.alt)}" target="_blank" rel="noopener">▶ Alt video</a></span>` : '',
  ].join('');
  const hints = sol.hints.slice(0, state.hintsShown).map((h, i) => `<div class="hint"><b>Hint ${i + 1}.</b> ${esc(h)}</div>`).join('');
  const steps = sol.steps.map((s, i) => {
    const cls = i < state.step ? 'done' : i === state.step ? 'now' : '';
    return `<li class="${cls}" data-step="${i}"><div class="st">Stage ${s.stage}</div><b>${esc(s.title)}</b>${i === state.step ? `<div>${esc(s.text)}</div>` : ''}</li>`;
  }).join('');
  const nums = [];
  if (n.theta !== undefined) nums.push(`axis to ${sol.frame} θ = ${n.theta.toFixed(1)}°`);
  if (n.beta !== undefined) nums.push(`apparent angle β = ${n.beta.toFixed(1)}°`);
  nums.push(`final axis: ${n.final.hp.toFixed(1)}° to HP, ${n.final.vp.toFixed(1)}° to VP`);
  tab.innerHTML = `
    <div class="statement">${esc(it.statement)}</div>
    <div class="meta">${meta}</div>
    <h4>Hints <span class="muted small">(${state.hintsShown}/${sol.hints.length})</span></h4>
    ${hints || '<p class="muted small">Stuck? Press Hint to reveal one hint at a time.</p>'}
    <button id="qHint" ${state.hintsShown >= sol.hints.length ? 'disabled' : ''}>Next hint</button>
    <h4>Step-by-step guide</h4>
    <p class="muted small">Each step draws its construction on the sheet as a ghost overlay. The current step pulses. Ghost points are snappable, so you can trace over them.</p>
    <ol class="steps">${steps}</ol>
    <details ${state.showSolution ? 'open' : ''}><summary class="muted small">Key numbers (spoiler)</summary><div class="numbers">${nums.map(esc).join('<br>')}</div></details>`;
  $('#qHint').onclick = nextHint;
  $$('.steps li', tab).forEach((li) => { li.onclick = () => goStep(+li.dataset.step); });
}
function nextHint() {
  if (!state.sol) return;
  state.hintsShown = Math.min(state.sol.hints.length, state.hintsShown + 1);
  showTab('q');
  renderQuestion();
}

// ------------------------------------------------------------ guide / overlay
function goStep(i) {
  if (!state.sol) return;
  const n = state.sol.steps.length;
  state.step = Math.max(-1, Math.min(n - 1, i));
  updateOverlay();
  renderQuestion();
  const li = $(`.steps li[data-step="${state.step}"]`);
  li?.scrollIntoView({ block: 'nearest' });
}
function updateOverlay() {
  const sol = state.sol;
  const bar = $('#stepbar');
  if (!sol) { editor.setOverlay([]); bar.hidden = true; return; }
  const items = [];
  const snap = [];
  const addGroup = (key, cls) => {
    const g = sol.groups[key];
    if (!g) return;
    items.push({ segs: g.segs || [], labels: g.labels || [], cls });
    for (const s of g.segs || []) if (s.style !== 'construction') snap.push(s.a, s.b);
  };
  if (state.showSolution) {
    for (const k of Object.keys(sol.groups)) if (!k.endsWith('cons') || state.step >= 0) addGroup(k, 'solution');
  } else if (state.step >= 0) {
    sol.steps.forEach((st, i) => {
      if (i > state.step) return;
      for (const k of st.show) addGroup(k, i === state.step ? 'ghost-now' : 'ghost');
    });
  }
  editor.setOverlay(items, snap);
  if (state.step >= 0) {
    const st = sol.steps[state.step];
    bar.hidden = false;
    $('#stepTitle').textContent = `Step ${state.step + 1}/${sol.steps.length} · ${st.title}`;
    $('#stepText').textContent = st.text;
    $('#stepPrev').disabled = state.step <= 0;
    $('#stepNext').disabled = state.step >= sol.steps.length - 1;
  } else bar.hidden = true;
  $('#btnSolution').classList.toggle('active', state.showSolution);
  $('#btnGuide').classList.toggle('active', state.step >= 0);
}
$('#btnHint').onclick = nextHint;
$('#btnGuide').onclick = () => { if (state.step >= 0) goStep(-1); else { showTab('q'); goStep(0); } };
$('#btnSolution').onclick = () => { state.showSolution = !state.showSolution; updateOverlay(); renderQuestion(); };
$('#stepPrev').onclick = () => goStep(state.step - 1);
$('#stepNext').onclick = () => goStep(state.step + 1);
$('#stepClose').onclick = () => goStep(-1);

// ------------------------------------------------------------ check
$('#btnCheck').onclick = runCheck;
function runCheck() {
  if (!state.sol) return;
  const r = check(state.sol, editor.userPrims(), editor.userKeyPoints());
  editor.setHighlight({ status: r.status, missing: $('#showMissing')?.checked ?? true ? r.missing : [] });
  // every stage counts (the construction is part of the answer); the final stage counts double
  let sum = 0, wsum = 0;
  r.stages.forEach((st, i) => {
    const w = i === r.stages.length - 1 ? 2 : 1;
    sum += w * (st.views.FV.score + st.views.TV.score) / 2; wsum += w;
  });
  const pct = Math.round((sum / wsum) * 100);
  const extra = Object.values(r.status).filter((s) => s === 'extra').length;
  const wrongEls = Object.values(r.status).filter((s) => s === 'wrong').length;
  const rows = r.stages.map((st) => ['FV', 'TV'].map((v) => {
    const x = st.views[v];
    const label = `Stage ${st.no} · ${v === 'FV' ? 'Front view' : 'Top view'}`;
    if (!x.found) return `<tr><td>${label}</td><td colspan="3" class="muted">not found on the sheet</td></tr>`;
    return `<tr><td>${label}${x.mirrored ? ' <span class="muted small">(mirrored)</span>' : ''}</td><td><b>${Math.round(x.score * 100)}%</b></td><td>${x.ok}/${x.total} ✓</td><td>${x.wrong ? `${x.wrong} style` : ''} ${x.missingN ? `${x.missingN} missing` : ''}</td></tr>`;
  }).join('')).join('');
  const verdict = pct >= 95 && !extra ? 'Excellent: every stage matches the solution.'
    : pct >= 95 ? 'All views are complete. Remove the extra lines shown in red.'
      : pct >= 60 ? 'Good progress. Look at the missing (dotted) and wrong line-type lines.'
        : 'Keep going. Use a hint or the step-by-step guide if you are stuck.';
  $('#tabChk').innerHTML = `
    <div class="score ${pct >= 95 ? 'good' : pct >= 60 ? 'mid' : 'low'}">${pct}%</div>
    <p>${verdict}</p>
    <table class="res-table"><tr><th>View</th><th>Score</th><th>Edges</th><th>Issues</th></tr>${rows}</table>
    <div class="legend">
      <span><i style="background:var(--ok)"></i>correct</span>
      <span><i style="background:var(--wrong)"></i>wrong line type</span>
      <span><i style="background:var(--bad)"></i>extra</span>
      <span><i style="background:repeating-linear-gradient(90deg,var(--bad) 0 3px,transparent 3px 6px)"></i>missing</span>
    </div>
    <p class="small muted">${extra} extra · ${wrongEls} wrong line type. Each view can sit anywhere along XY and may be mirrored. Thin construction lines are never counted. Generators and axes are optional.</p>
    <label class="chk"><input type="checkbox" id="showMissing" checked> show missing lines</label>
    <p><button id="clearMarks">Clear marks</button></p>`;
  $('#showMissing').onchange = (e) => editor.setHighlight({ status: r.status, missing: e.target.checked ? r.missing : [] });
  $('#clearMarks').onclick = () => editor.setHighlight(null);
  showTab('chk');
  if (pct >= 95 && !extra) {
    state.done[state.item.id] = true;
    store.set('done', state.done);
    renderList();
  }
}

// ------------------------------------------------------------ 3D tab
let v3 = null;
const DEMOS = {
  prism4: { title: 'Square prism', solid: { type: 'prism', n: 4, side: 30, h: 50 } },
  prism6: { title: 'Hexagonal prism', solid: { type: 'prism', n: 6, side: 25, h: 50 } },
  pyramid5: { title: 'Pentagonal pyramid', solid: { type: 'pyramid', n: 5, side: 30, h: 55 } },
  tetra: { title: 'Tetrahedron', solid: { type: 'tetra', side: 40 } },
  cylinder: { title: 'Cylinder', solid: { type: 'cylinder', d: 40, h: 50 } },
  cone: { title: 'Cone', solid: { type: 'cone', d: 45, h: 55 } },
};
function render3D(demoKey) {
  if (!v3) return;
  const it = state.item;
  let sol = state.sol;
  if (!sol && it && it.demos) {
    const d = DEMOS[demoKey || it.demos[0]];
    sol = solve({ id: 'demo', solid: d.solid, rest: 'base', frame: 'HP' });
  }
  if (!sol) return;
  state.v3sol = sol;
  const k = Math.min(state.v3stage, sol.stages.length - 1);
  $('#v3stages').innerHTML = sol.stages.map((s, i) => `<button class="${i === k ? 'active' : ''}" data-stage="${i}">Stage ${s.no}</button>`).join('');
  $('#v3demos').innerHTML = it && it.demos ? it.demos.map((d) => `<button data-demo="${d}">${DEMOS[d].title}</button>`).join('') : '';
  v3.show(sol.stages[k]);
}
$('#v3stages').addEventListener('click', (e) => {
  const b = e.target.closest('[data-stage]');
  if (!b || !state.v3sol) return;
  state.v3stage = +b.dataset.stage;
  $$('#v3stages button').forEach((x) => x.classList.toggle('active', x === b));
  v3.show(state.v3sol.stages[state.v3stage], { keepCamera: true });
});
$('#v3demos').addEventListener('click', (e) => {
  const b = e.target.closest('[data-demo]');
  if (b) render3D(b.dataset.demo);
});
$$('[data-cam]').forEach((b) => { b.onclick = () => v3 && v3.preset(b.dataset.cam); });
$('#v3proj').onchange = (e) => { if (!v3) return; v3.showProj = e.target.checked; v3.show(v3.stage, { keepCamera: true }); };

// ------------------------------------------------------------ tabs & narrow-screen drawers
function showTab(name) {
  $$('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  $$('.tab').forEach((t) => { t.hidden = t.dataset.tab !== name; });
  if (name === '3d') {
    if (!v3) { v3 = new View3D($('#v3host')); render3D(); } else v3.resize();
  }
}
$$('.tabs button').forEach((b) => { b.onclick = () => showTab(b.dataset.tab); });
$('#btnMenu').onclick = () => { $('#sidebar').classList.toggle('open'); $('#panel').classList.remove('open'); };
$('#btnPanel').onclick = () => { $('#panel').classList.toggle('open'); $('#sidebar').classList.remove('open'); };

// ------------------------------------------------------------ keyboard
const cmd = $('#cmd');
cmd.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const ok = editor.typed(cmd.value);
    if (!ok && cmd.value.trim()) { $('#prompt').textContent = `Couldn't use "${cmd.value}" here. ${$('#prompt').textContent}`; }
    cmd.value = '';
    cmd.blur();
    e.preventDefault();
  } else if (e.key === 'Escape') { cmd.value = ''; cmd.blur(); editor.cancelOp(); }
  e.stopPropagation();
});
window.addEventListener('keydown', (e) => {
  if (document.body.classList.contains('touring')) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? editor.redo() : editor.undo(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); editor.redo(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === ' ') { editor.spaceDown = true; e.preventDefault(); return; }
  if (e.key === 'Escape') { editor.cancelOp(); editor.selected.clear(); editor.render(); return; }
  if (e.key === 'Enter') { if (editor.op && editor.op.pts) editor.finishPath(false); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') { editor.deleteSelected(); e.preventDefault(); return; }
  // start typing a value straight into the command box
  if (/^[\d.@\-<]$/.test(e.key)) { cmd.focus(); return; }
  const k = e.key.toLowerCase();
  if (k === 'f') { fit(); return; }
  const style = Object.entries(STYLES).find(([, s]) => s.key === k);
  if (style) { setStyle(style[0]); return; }
  const tool = Object.entries(TOOLS).find(([, t]) => t.key === k);
  if (tool) setTool(tool[0]);
});
window.addEventListener('keyup', (e) => { if (e.key === ' ') editor.spaceDown = false; });

// ------------------------------------------------------------ theme & tour
const THEMES = ['light', 'dark'];
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  store.set('theme', t);
  if (v3 && v3.stage) v3.show(v3.stage, { keepCamera: true });
}
applyTheme(store.get('theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
$('#btnTheme').onclick = () => applyTheme(THEMES[(THEMES.indexOf(document.documentElement.dataset.theme) + 1) % 2]);
function tour(from = 0) {
  $('#sidebar').classList.remove('open'); $('#panel').classList.remove('open');
  showTab('q');
  startTour(() => store.set('toured', true), from);
}
$('#btnTour').onclick = () => tour();

// ------------------------------------------------------------ boot
buildToolbar();
setTool('segment');
setStyle('visible');
renderList();
// URL: #P1  or  #P1?solution  #P1?step=4  #P1?tab=3d  (handy for sharing a view)
const [hashId, hashQ] = decodeURIComponent(location.hash.slice(1)).split('?');
const start = hashId || store.get('last', 'C1');
open(allItems().some((p) => p.id === start) ? start : 'C1');
if (hashQ) {
  const q = new URLSearchParams(hashQ);
  if (q.has('solution')) { state.showSolution = true; updateOverlay(); renderQuestion(); }
  if (q.has('step')) goStep(+q.get('step'));
  if (q.has('hints')) { state.hintsShown = +q.get('hints'); renderQuestion(); }
  if (q.has('tab')) showTab(q.get('tab'));
}
if (hashQ && /(^|&)tour/.test(hashQ)) tour(+(new URLSearchParams(hashQ).get('tour')) || 0);
else if (!store.get('toured', false) && !(hashQ && hashQ.includes('notour'))) setTimeout(tour, 400);
