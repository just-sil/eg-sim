// Guided tour: spotlights one part of the UI at a time with a short explanation.
const STEPS = [
  { title: 'Welcome to EG Sim', text: 'A drafting playground for Projection of Solids (KTU Module 2). This tour shows where everything is. It takes about a minute. Use ← → or the buttons.' },
  { sel: '#sidebar', title: 'Problems', text: 'Every problem from the playlist, grouped: concepts, simple positions, first-stage drills and the inclined (change-of-position) problems. A ✓ appears when you solve one.' },
  { sel: '#tabQ', title: 'The question', text: 'The problem statement, a link to the video solution, hints and the list of construction steps.' },
  { sel: '#toolbar .grp:nth-child(2)', title: 'Drawing tools', text: 'Point, line, polyline, regular polygon, circle, compass arc and smooth curve (for ellipses). Hover over any tool for help; every tool has a keyboard shortcut.' },
  { sel: '#toolbar .grp:nth-child(3)', title: 'Construction tools', text: 'Vertical and horizontal projectors, angle lines, parallel and perpendicular lines, and Divide ○, which marks the 12 generator points on a circle.' },
  { sel: '#toolbar .grp:nth-child(4)', title: 'Rotate copy and more', text: 'Select a view, then use Rotate copy to tilt it for stage 2 or 3, just as you would retrace it on paper. Measure, label and erase are here too.' },
  { sel: '#toolbar .grp:nth-child(5)', title: 'Line types', text: 'Thick for visible edges, dashed for hidden, chain for the axis, thin for construction. The checker looks at these. Shortcuts: 1–4.' },
  { sel: '#sheet', title: 'The sheet', text: 'Draw here in millimetres around the XY line. Scroll to zoom, hold Space (or the right mouse button) and drag to pan. Points snap to ends, midpoints and intersections; Shift locks the angle to 15° steps.' },
  { sel: '#cmd', title: 'Exact values', text: 'While drawing, type a value: 30 (length), 30<45 (length at 45°), @10,20 (relative) or x,h (absolute), then Enter. Just start typing; the box focuses itself.' },
  { sel: '#btnHint', title: 'Hints', text: 'Stuck? Reveal one hint at a time, from "what does it rest on" to the condition for each stage.' },
  { sel: '#btnGuide', title: 'Step-by-step', text: 'Walks through the construction. Each step is drawn on the sheet as a faint overlay (the current step pulses), and you can snap to it while you trace.' },
  { sel: '#btnSolution', title: 'Solution', text: 'Overlays the complete answer for all stages. Try not to peek too early!' },
  { sel: '#btnCheck', title: 'Check', text: 'Marks your drawing: a score per stage, and every line marked correct, wrong line type, extra or missing. Your views can sit anywhere along XY.' },
  { sel: '.tabs button[data-tab="3d"]', title: '3D view', text: 'Shows the solid at each stage between HP and VP, with its front and top views drawn on the planes. Drag to orbit.' },
  { sel: '#btnRandom', title: 'Random practice', text: 'Finished the playlist? Generate new solvable problems.' },
  { sel: '#btnTheme', title: 'Theme', text: 'Switch between black-on-white and white-on-black.' },
  { sel: '#btnTour', title: "That's it", text: 'Replay this tour any time from here. Happy drafting!' },
];

let idx = 0, spot = null, pop = null, onEnd = null;

const visible = (el) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
};

export function startTour(done, from = 0) {
  onEnd = done;
  idx = 0;
  document.body.classList.add('touring');
  spot = document.createElement('div');
  spot.className = 'tour-spot';
  pop = document.createElement('div');
  pop.className = 'tour-pop';
  pop.setAttribute('role', 'dialog');
  document.body.append(spot, pop);
  addEventListener('keydown', onKey, true);
  addEventListener('resize', place);
  show(Math.max(0, Math.min(STEPS.length - 1, from)), 1);
}

function end() {
  spot?.remove(); pop?.remove();
  spot = pop = null;
  document.body.classList.remove('touring');
  removeEventListener('keydown', onKey, true);
  removeEventListener('resize', place);
  onEnd && onEnd();
}

function onKey(e) {
  if (e.key === 'Escape') end();
  else if (e.key === 'ArrowRight' || e.key === 'Enter') show(idx + 1, 1);
  else if (e.key === 'ArrowLeft') show(idx - 1, -1);
  else return;
  e.preventDefault(); e.stopPropagation();
}

function show(i, dir) {
  // skip steps whose target is hidden (e.g. collapsed drawers on narrow screens)
  while (i >= 0 && i < STEPS.length && STEPS[i].sel && !visible(document.querySelector(STEPS[i].sel))) i += dir;
  if (i >= STEPS.length) return end();
  if (i < 0) return;
  idx = i;
  const st = STEPS[i];
  const last = !STEPS.slice(i + 1).some((s) => !s.sel || visible(document.querySelector(s.sel)));
  pop.innerHTML = `
    <div class="tour-count">${i + 1} / ${STEPS.length}</div>
    <h4>${st.title}</h4>
    <p>${st.text}</p>
    <div class="tour-btns">
      <button data-t="skip" class="ghost-btn">${last ? '' : 'Skip tour'}</button>
      <span></span>
      ${i > 0 ? '<button data-t="prev">Back</button>' : ''}
      <button data-t="next" class="primary">${last ? 'Finish' : 'Next'}</button>
    </div>`;
  pop.querySelector('[data-t="next"]').onclick = () => show(idx + 1, 1);
  pop.querySelector('[data-t="prev"]')?.addEventListener('click', () => show(idx - 1, -1));
  const sk = pop.querySelector('[data-t="skip"]');
  if (last) sk.style.visibility = 'hidden'; else sk.onclick = end;
  place();
  pop.querySelector('[data-t="next"]').focus();
}

function place() {
  if (!pop) return;
  const st = STEPS[idx];
  const el = st.sel && document.querySelector(st.sel);
  const pw = Math.min(340, innerWidth - 24);
  pop.style.width = pw + 'px';
  if (!el) {
    spot.style.cssText = `left:${innerWidth / 2}px;top:${innerHeight / 2}px;width:0;height:0`;
    pop.style.left = (innerWidth - pw) / 2 + 'px';
    pop.style.top = Math.max(12, innerHeight / 2 - pop.offsetHeight / 2) + 'px';
    return;
  }
  const r = el.getBoundingClientRect();
  const pad = 6;
  const x0 = Math.max(4, r.left - pad), y0 = Math.max(4, r.top - pad);
  const x1 = Math.min(innerWidth - 4, r.right + pad), y1 = Math.min(innerHeight - 4, r.bottom + pad);
  spot.style.cssText = `left:${x0}px;top:${y0}px;width:${x1 - x0}px;height:${y1 - y0}px`;
  const ph = pop.offsetHeight, gap = 12;
  let left, top;
  if (innerHeight - y1 > ph + gap) { top = y1 + gap; left = r.left + r.width / 2 - pw / 2; }
  else if (y0 > ph + gap) { top = y0 - ph - gap; left = r.left + r.width / 2 - pw / 2; }
  else if (innerWidth - x1 > pw + gap) { left = x1 + gap; top = r.top + r.height / 2 - ph / 2; }
  else if (x0 > pw + gap) { left = x0 - pw - gap; top = r.top + r.height / 2 - ph / 2; }
  else { left = (innerWidth - pw) / 2; top = innerHeight - ph - 16; }
  pop.style.left = Math.max(12, Math.min(innerWidth - pw - 12, left)) + 'px';
  pop.style.top = Math.max(12, Math.min(innerHeight - ph - 12, top)) + 'px';
}
