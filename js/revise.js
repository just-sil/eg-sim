// Last-day revision mode. Hidden: there is no link to it in the UI; open it with #revise
// (or #revise/cram, #revise/quiz, #revise/pyq, #revise/mock).
//   0. Crash course: zero to exam-ready in one day, lesson by lesson (watch → trace → solo)
//   1. Night-before sheet: the method, phrase → construction translator, formulas, mistakes
//   2. Spot drill: read a KTU question and choose the stage 1 / 2 / 3 set-up (plus β when needed)
//   3. PYQ list: every exam question as a one-line recipe, with solved / weak status
//   4. Mock: a random question drawn on the sheet against a timer, no hints, auto-checked
import { PROBLEMS } from './problems.js';
import { PROBLEMS3 } from './problems3.js';
import { solve } from './stages.js';
import { solidName } from './solids.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const f1 = (x) => (Math.round(x * 10) / 10).toString();
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const PYQ = PROBLEMS.filter((p) => p.group === 'inclined');
const M3EXAM = PROBLEMS3.filter((p) => p.cut || p.path || p.hole); // the full exam-style questions
const PYQIDS = new Set(PYQ.map((p) => p.id)), M3IDS = new Set(PROBLEMS3.map((p) => p.id));
const SOL = new Map();
const solOf = (p) => { if (!SOL.has(p.id)) SOL.set(p.id, solve(p)); return SOL.get(p.id); };

// ------------------------------------------------------------ classification of a problem
const ORIENT_OPTS = [
  'Resting edge ⟂ XY (it becomes the hinge)',
  'Resting corner on the centre line ∥ XY',
  'Divide the circle into 12, rest on point 1',
  'Any edge ∥ XY',
];
const orientKey = (p) => ({ edge: 0, face: 0, corner: 1, slantEdge: 1, suspend: 1, point: 2, generator: 2 }[p.rest] ?? 3);

const S2_OPTS = [
  'Axis (or a face containing it) at θ to XY',
  'Base at θ to XY (axis at 90° − θ)',
  'Face / slant edge / generator lies on XY',
  'Slant edge through the corner at θ to XY',
  'Line from corner to G is vertical (suspended)',
];
const s2Key = (p) => ({ axis: 0, base: 1, apexOn: 2, slantEdge: 3, suspend: 4 }[p.stage2.tilt]);

const S3_OPTS = [
  'Resting edge at φ to XY, drawn directly',
  'TV/FV of the axis at φ to XY, drawn directly',
  'True angle: find the apparent angle β first',
];
const s3Key = (p) => ({ edgeQ: 0, axisTV: 1, plane: 1, axisTrue: 2 }[p.stage3.type]);

function recipe(p) {
  const sol = solOf(p), n = sol.numbers;
  const P = sol.frame, Q = P === 'HP' ? 'VP' : 'HP', tv = P === 'HP' ? 'TV' : 'FV';
  const rest = { edge: 'base edge', corner: 'base corner', point: 'rim point', face: 'triangular face', slantEdge: 'slant edge', generator: 'generator', suspend: 'suspended from a corner' }[p.rest];
  const s1 = ['edge ⟂ XY', 'corner on ℄ ∥ XY', '12 divisions, point 1', 'edge ∥ XY'][orientKey(p)];
  const s2 = p.stage2;
  const t2 = {
    axis: `axis ${s2.angle}°${s2.face ? ' (via face)' : ''}`,
    base: `base ${s2.angle}° → axis ${f1(90 - s2.angle)}°`,
    apexOn: `${s2.element} on ${P} → axis ${f1(n.theta)}°`,
    slantEdge: `slant edge ${s2.angle}° → axis ${f1(n.theta)}°`,
    suspend: `G (h/4 = ${f1(n.h / 4)}) below corner → axis ${f1(n.theta)}°`,
  }[s2.tilt];
  const s3 = p.stage3;
  const t3 = {
    edgeQ: `edge ${s3.angle}° in ${tv}`,
    axisTV: `${tv} of axis ${s3.angle}°`,
    plane: `${tv} of axis ${s3.angle}° (plane)`,
    axisTrue: `true ${s3.angle}° to ${Q} → β = ${f1(n.beta)}°`,
  }[s3.type];
  return { rest: p.rest === 'suspend' ? `${rest} (${P} frame)` : `${rest} on ${P}`, s1, s2: t2, s3: t3, beta: s3.type === 'axisTrue' };
}

// ------------------------------------------------------------ cram sheet (static)
const CRAM = `
<section class="rv-card rv-wide">
  <h3>The method: always three stages</h3>
  <ol class="rv-flow">
    <li><b>Stage 1: simple position.</b> Axis ⟂ the plane it rests on. Draw the <b>true shape of the base first</b> (TV if it rests on HP, FV if on VP), then project the other view.</li>
    <li><b>Stage 2: tilt.</b> Redraw the <i>other</i> view, rotated about the resting edge, corner or point, until the stage-2 condition holds. Keep every length. Project the true-shape view: vertical projectors × horizontal lines from stage 1.</li>
    <li><b>Stage 3: rotate.</b> Reproduce the stage-2 TV (or FV) at the stage-3 angle. Project the final view: vertical projectors × heights carried across from stage 2.</li>
  </ol>
  <p class="muted small">Problem on VP? Swap the words: HP ↔ VP, TV ↔ FV, "above XY" ↔ "below XY". The construction is the same.</p>
</section>

<section class="rv-card">
  <h3>Stage 1: how to place the base</h3>
  <table class="rv-t">
    <tr><th>Rests on</th><th>Keep in the true-shape view</th></tr>
    <tr><td>Base edge / triangular face</td><td>That edge <b>⟂ XY</b>, on the right</td></tr>
    <tr><td>Base corner / slant edge / suspended</td><td>That corner on the <b>centre line ∥ XY</b>, on the right</td></tr>
    <tr><td>Rim point / generator</td><td>Divide into <b>12</b>; rest on point 1 (right end of the ℄)</td></tr>
    <tr><td>Base (simple position only)</td><td>One edge ∥ XY, unless told otherwise</td></tr>
  </table>
</section>

<section class="rv-card">
  <h3>Stage 2: read the phrase</h3>
  <table class="rv-t">
    <tr><th>Question says</th><th>Tilt until</th></tr>
    <tr><td>axis inclined θ to HP</td><td>axis at θ to XY</td></tr>
    <tr><td>base inclined θ to HP</td><td>base at θ, so the axis is at <b>90° − θ</b></td></tr>
    <tr><td>rectangular face containing the edge at θ</td><td>same as the axis at θ (the face ∥ axis)</td></tr>
    <tr><td>triangular face / slant edge / generator on HP</td><td>that line lies <b>on XY</b></td></tr>
    <tr><td>slant edge (at the corner) at θ</td><td>line a–o at θ to XY</td></tr>
    <tr><td>freely suspended from a corner</td><td>corner–G line <b>⟂ XY</b>, with the corner on top</td></tr>
  </table>
</section>

<section class="rv-card">
  <h3>Stage 3: direct or β?</h3>
  <table class="rv-t">
    <tr><th>Question says</th><th>Do</th></tr>
    <tr><td>resting edge inclined φ to VP</td><td>Edge at φ in the TV. <b>Direct</b> (the edge lies on HP).</td></tr>
    <tr><td>top view of the axis at φ to XY / VP</td><td>Axis at φ in the TV. <b>Direct.</b></td></tr>
    <tr><td>(vertical) plane containing the axis at φ to VP</td><td>Axis at φ in the TV. <b>Direct.</b> Watch "apex / base nearer VP".</td></tr>
    <tr><td><b>axis inclined φ to VP</b> (true angle)</td><td><b>Apparent angle β</b> first. Never draw φ directly.</td></tr>
  </table>
</section>

<section class="rv-card">
  <h3>β construction (true angle φ)</h3>
  <p class="rv-formula">sin β = sin φ / cos θ  &nbsp;·&nbsp; needs θ + φ ≤ 90°</p>
  <ol class="small">
    <li>The stage-2 axis has true length L. Its TV length is <b>L cos θ</b> (measure it from stage 2).</li>
    <li>From one end of the axis (in a fresh spot), draw a line ∥ XY at a distance <b>L sin φ</b> (the locus).</li>
    <li>From the same end, an arc of radius <b>L cos θ</b> cuts that locus. The line to the cut is the TV of the axis, at β to XY.</li>
  </ol>
  <p class="muted small">θ + φ > 90° is impossible as a pair of true angles. If you meet one, the angle is meant for the TV of the axis (see P10).</p>
</section>

<section class="rv-card">
  <h3>Numbers worth memorising</h3>
  <table class="rv-t rv-num">
    <tr><th>Base (side a)</th><th>Circumradius R</th><th>Apothem r</th></tr>
    <tr><td>Triangle</td><td>0.577 a</td><td>0.289 a</td></tr>
    <tr><td>Square</td><td>0.707 a</td><td>0.5 a</td></tr>
    <tr><td>Pentagon</td><td>0.851 a</td><td>0.688 a</td></tr>
    <tr><td>Hexagon</td><td>a</td><td>0.866 a</td></tr>
  </table>
  <ul class="small">
    <li>Centre of gravity G: on the axis at <b>h/2</b> (prism, cylinder) or <b>h/4 from the base</b> (pyramid, cone).</li>
    <li>Tetrahedron height = √(2/3)·a ≈ <b>0.816 a</b>. All six edges are equal.</li>
    <li>Element on HP, so the axis to HP = tan⁻¹(R/h) for a slant edge, tan⁻¹(r/h) for a triangular face, tan⁻¹(radius/h) for a generator.</li>
    <li>Slant edge = √(h² + R²). Slant height of a face = √(h² + r²).</li>
  </ul>
</section>

<section class="rv-card">
  <h3>Lines & visibility</h3>
  <ul class="small">
    <li><b>Thick</b>: visible edges. <b>Dashed</b>: hidden. <b>Chain</b>: axis. <b>Thin</b>: projectors and construction.</li>
    <li>First angle: <b>FV above XY, TV below</b>.</li>
    <li>The outline of every view is always visible.</li>
    <li>In the TV, the higher points are visible. In the FV, the points farther in front of VP are visible.</li>
    <li>Label the corners in every stage (a, b, c… in the TV, a′, b′, c′… in the FV).</li>
  </ul>
</section>

<section class="rv-card">
  <h3>Mistakes that cost marks</h3>
  <ul class="rv-x small">
    <li>Starting stage 1 on the wrong plane.</li>
    <li>Resting edge drawn ∥ XY instead of ⟂ XY, so it can't act as the hinge.</li>
    <li>Using φ directly when it is a true angle of the axis (β needed).</li>
    <li>Changing a length while tilting or rotating. Reproduce the view exactly.</li>
    <li>Base angle given but θ used as the axis angle (it is 90° − θ).</li>
    <li>G at h/2 for a pyramid or cone (it is at h/4).</li>
    <li>Skipping the 12 divisions on a cone or cylinder, so the generators are missing.</li>
    <li>Hidden edges left thick, the outline drawn dashed, or no chain line for the axis.</li>
    <li>Ignoring "apex nearer VP" or "on the right of the viewer".</li>
  </ul>
</section>

<section class="rv-card">
  <h3>In the exam hall (≈ 25 min)</h3>
  <table class="rv-t">
    <tr><td><b>2 min</b></td><td>Underline: solid, size, what it rests on, the stage-2 phrase, the stage-3 phrase. Decide direct or β.</td></tr>
    <tr><td><b>5 min</b></td><td>Stage 1, with space to the right for two more stages.</td></tr>
    <tr><td><b>7 min</b></td><td>Stage 2: tilt, project, visibility.</td></tr>
    <tr><td><b>8 min</b></td><td>Stage 3 (β construction first if needed), project, visibility.</td></tr>
    <tr><td><b>3 min</b></td><td>Thicken outlines, dash hidden lines, chain axes, labels, dimensions, title.</td></tr>
  </table>
  <p class="muted small">Leave ~70 mm between stages. A cramped sheet is the most common reason stage 3 runs off the page.</p>
</section>`;


// ------------------------------------------------------------ one-day crash course
// From zero to exam-ready in one sitting. Each lesson: a short explanation in plain words, how to
// spot the question type in the exam, then tasks that get harder: watch → trace → solo (timed).
//   read  : open a concept card (tick it yourself)
//   watch : step through the guide to the last step       → done automatically
//   trace : draw over the guide, press Check, score ≥ 70%  → done automatically
//   solo  : timed mock, nothing to copy, score ≥ 60%       → done automatically
//   drill : the "spot the set-up" quiz, 10 correct answers → done automatically
export const COURSE = [
  {
    title: 'The drawing sheet: HP, VP, front view, top view', min: 15,
    body: `
<p>Imagine the corner of a room. The <b>floor is HP</b> (horizontal plane) and the <b>wall in front of you is VP</b> (vertical plane). The line where they meet is <b>XY</b>.</p>
<ul>
<li><b>Front view (FV)</b>: what you see looking at the object from the front. It is drawn <b>above XY</b>.</li>
<li><b>Top view (TV)</b>: what you see looking down from above. It is drawn <b>below XY</b>.</li>
<li>A point's <b>height above HP</b> shows in the FV as its distance above XY. Its <b>distance in front of VP</b> shows in the TV as its distance below XY.</li>
<li>The same point in both views lies on one <b>vertical line (projector)</b>. That is the single most-used fact in this whole chapter.</li>
</ul>
<p>Lines: <b>thick</b> = visible edge, <b>dashed</b> = hidden edge, <b>chain</b> (long-short dash) = axis, <b>thin</b> = construction/projectors. Examiners check these.</p>`,
    tasks: [
      { type: 'read', id: 'C2', text: 'Read "Simple positions"' },
      { type: 'read', id: 'C1', q: 'tab=3d', text: 'Open the 3D view, orbit the solids, see FV on VP and TV on HP' },
    ],
  },
  {
    title: 'Simple positions: the solid stands straight', min: 35,
    body: `
<p>When the base sits flat on a plane, the view <b>on that plane shows the base in its true shape</b>. So:</p>
<ul>
<li><b>Base on HP</b> → draw the TV first (true square/hexagon/circle below XY), then send projectors up. The FV base lies <b>on XY</b>, the top is <b>h</b> above it.</li>
<li><b>Base on VP</b> → the same with the roles swapped: FV first (above XY), project down.</li>
<li>Pyramid/cone: join every corner to the centre, which is the apex. Cylinder/cone: divide the circle into <b>12</b> equal parts.</li>
</ul>
<p>Every hard problem starts with exactly this drawing, so get fast at it.</p>`,
    tasks: [
      { type: 'watch', id: 'S1', text: 'Watch: square pyramid, base on HP' },
      { type: 'trace', id: 'S3', text: 'Trace: cylinder, base on HP' },
      { type: 'trace', id: 'S2', text: 'Trace: hexagonal prism, base on VP' },
    ],
  },
  {
    title: 'The 3-stage trick (how every exam question is solved)', min: 35,
    body: `
<p>Exam questions tilt the solid. You never draw the tilted solid directly. You get there in <b>3 stages</b>, drawn left to right:</p>
<ol>
<li><b>Stage 1</b>: draw it standing straight (the simple position from lesson 2), on the plane it rests on. Place the base so the resting part is ready to act as a hinge:
  <ul><li>Rests on a <b>base edge</b> → keep that edge <b>⟂ XY</b>.</li>
  <li>Rests on a <b>corner</b> / <b>rim point</b> → keep that corner on the <b>horizontal centre line</b>, on the right.</li></ul></li>
<li><b>Stage 2</b>: copy the <i>other</i> view (the FV, for HP problems) <b>tilted</b> about the resting point. Copy, don't redraw: same lengths. The new TV = vertical projectors from the new FV × horizontal lines from the stage-1 TV.</li>
<li><b>Stage 3</b>: copy the stage-2 TV <b>turned</b> to the final angle. The final FV = vertical projectors from it × horizontal lines from the stage-2 FV.</li>
</ol>
<p><b>The rule that never changes:</b> the view you <i>copy and turn</i> keeps its shape. The other view is found with projectors.</p>
<p>First practise stage 1 alone. Choosing it right is half the marks.</p>`,
    tasks: [
      { type: 'read', id: 'C3', text: 'Read "Choosing the first stage"' },
      { type: 'trace', id: 'S5', text: 'Stage 1 only: square prism on a base edge' },
      { type: 'trace', id: 'S6', text: 'Stage 1 only: pentagonal pyramid on a corner' },
      { type: 'trace', id: 'S7', text: 'Stage 1 only: cone on a rim point' },
    ],
  },
  {
    title: 'Type A: resting on a base edge (the most common question)', min: 60,
    spot: '"…resting on a base edge on HP… axis inclined θ to HP… the edge inclined φ to VP"',
    body: `
<ol>
<li>Stage 1: base on HP, TV first, resting edge ⟂ XY on the right.</li>
<li>Stage 2: tilt the FV about that edge until the <b>axis makes θ with XY</b>.</li>
<li>Stage 3: turn the TV until the <b>resting edge makes φ with XY</b>. The edge lies on HP, so φ is drawn <b>directly</b>.</li>
</ol>
<p>Watch the full construction once, then trace it, then do one alone against the clock.</p>`,
    tasks: [
      { type: 'watch', id: 'P1', text: 'Watch: square prism on a base edge' },
      { type: 'trace', id: 'P9', text: 'Trace: pentagonal prism on a base edge' },
      { type: 'solo', id: 'P4', text: 'Alone, 25 min: square pyramid on a base edge' },
    ],
  },
  {
    title: 'Type A on VP: same thing, mirrored', min: 40,
    spot: '"…a base edge on VP… axis inclined θ to VP… edge inclined φ to HP"',
    body: `
<p>Swap every word: HP ↔ VP, TV ↔ FV, above ↔ below. Stage 1 draws the <b>FV first</b> (true shape above XY). Stage 2 tilts the <b>TV</b>. Stage 3 turns the <b>FV</b>. Nothing else changes.</p>`,
    tasks: [
      { type: 'watch', id: 'P2', text: 'Watch: square prism, base edge on VP' },
      { type: 'trace', id: 'P19', text: 'Trace: pentagonal pyramid, base edge on VP' },
      { type: 'solo', id: 'P15', text: 'Alone, 25 min: square prism, base edge on VP' },
    ],
  },
  {
    title: 'Type B: on a corner or rim point, "top view of the axis" given', min: 50,
    spot: '"…on a base corner / a point of its base circle… axis θ to HP… the TOP VIEW of the axis makes φ with XY" (FRONT view for a VP problem)',
    body: `
<ol>
<li>Stage 1: corner (or point 1 of the 12 divisions) on the horizontal centre line, on the right.</li>
<li>Stage 2: tilt the FV about that corner/point until the axis makes θ with XY.</li>
<li>Stage 3: the question gives the <b>top view</b> of the axis, so turn the TV until the axis line makes φ with XY. <b>Direct.</b></li>
</ol>
<p>Cones/cylinders: carry all 12 points through every stage and join them with a smooth curve (ellipse).</p>`,
    tasks: [
      { type: 'watch', id: 'P6', text: 'Watch: cone on a rim point' },
      { type: 'trace', id: 'P18', text: 'Trace: pentagonal pyramid on a corner' },
      { type: 'solo', id: 'P11', text: 'Alone, 25 min: cylinder on a rim point (VP)' },
    ],
  },
  {
    title: 'Type C: the axis at TRUE angles to both planes (β)', min: 60,
    spot: '"…the axis inclined θ to HP and φ to VP" (no "top view of" in front of the angle)',
    body: `
<p>Stages 1 and 2 are the same as Type B. In stage 3, φ is a <b>true</b> angle, and a true angle with VP <b>does not appear</b> in the TV. You draw the axis at a different angle <b>β</b>, found like this:</p>
<ol>
<li>Measure the stage-2 TV of the axis. Its length is <b>L cos θ</b>.</li>
<li>Pick one end of the axis. Draw a line ∥ XY at a distance <b>L sin φ</b> from it.</li>
<li>From the same end, swing an arc of radius L cos θ. It cuts the line. Joining the end to that cut gives the axis at <b>β</b>.</li>
</ol>
<p>Check: <b>sin β = sin φ / cos θ</b>. Turn the stage-2 TV until its axis lies along that line.</p>
<p class="muted small">This is the type students lose most marks on. Drawing φ directly gets the whole stage wrong.</p>`,
    tasks: [
      { type: 'watch', id: 'P3', text: 'Watch: pentagonal pyramid, β construction' },
      { type: 'trace', id: 'P5', text: 'Trace: cone, 30° to HP and 45° to VP' },
      { type: 'solo', id: 'P20', text: 'Alone, 25 min: cone, 45° to HP and 40° to VP' },
    ],
  },
  {
    title: 'Type D: a face, slant edge or generator lies on HP', min: 60,
    spot: '"…a triangular face on HP" / "…a slant edge on the ground" / "…a generator on HP"',
    body: `
<ol>
<li>Stage 1: base on HP. Face → its base edge ⟂ XY. Slant edge or generator → its corner/point on the centre line.</li>
<li>Stage 2: tilt the FV until that <b>face line / slant edge / generator lies on XY</b>. No angle is given; the tilt is fixed by the shape.</li>
<li>Stage 3, read the phrase:
  <ul><li>"edge on HP inclined φ to VP" → that edge at φ in the TV.</li>
  <li>"top view of axis at φ" or "<b>plane containing the axis</b> … inclined φ to VP" → axis at φ in the TV. Watch for "apex/base nearer VP".</li></ul></li>
</ol>`,
    tasks: [
      { type: 'watch', id: 'P8', text: 'Watch: square pyramid on a triangular face' },
      { type: 'trace', id: 'P16', text: 'Trace: cone on a generator' },
      { type: 'solo', id: 'P23', text: 'Alone, 25 min: cone on a generator, plane at 60°' },
    ],
  },
  {
    title: 'Twists that appear in the exam (if you have time)', min: 45,
    body: `
<ul>
<li><b>"Base inclined θ to HP"</b> → the axis is at <b>90° − θ</b>. Tilt by the base, not the axis.</li>
<li><b>"Rectangular face containing the resting edge inclined θ"</b> (prism) → the same as the axis at θ.</li>
<li><b>"Freely suspended from a corner"</b> → the centre of gravity G hangs straight below the corner. G is on the axis at <b>h/4</b> from the base (pyramid, cone) or <b>h/2</b> (prism, cylinder). Tilt until corner–G is vertical.</li>
<li><b>Tetrahedron</b>: all edges equal. Treat the face containing the resting edge as the base.</li>
<li>If θ + φ > 90°, it can't be two true angles. Treat φ as the top-view angle.</li>
</ul>`,
    tasks: [
      { type: 'watch', id: 'P12', text: 'Watch: pyramid freely suspended' },
      { type: 'watch', id: 'P10', text: 'Watch: base at 30° (axis 60°)' },
      { type: 'trace', id: 'P24', text: 'Trace: hexagonal prism, face at 35°' },
    ],
  },
  {
    title: 'Final check: tonight and tomorrow morning', min: 40,
    body: `
<p>You now know every type that appears. Lock it in:</p>
<ol>
<li>The <b>spot drill</b>: read real questions and choose the set-up for each stage. Get 10 right.</li>
<li>One <b>mock</b> on a random question, as in the exam.</li>
<li>Read the <b>night-before sheet</b> once before sleeping and once in the morning.</li>
</ol>
<p>In the exam: underline what it rests on, the stage-2 phrase and the stage-3 phrase. Decide <b>direct or β</b> before you draw a single line. Leave ~70 mm between stages.</p>`,
    tasks: [
      { type: 'drill', text: 'Spot drill: 10 correct answers' },
      { type: 'solo', id: 'any', text: 'One random mock (any question you have not solved alone)' },
      { type: 'sheet', text: 'Read the night-before sheet' },
    ],
  },
];

// Module 3: sections of solids and development of surfaces.
export const COURSE3 = [
  {
    title: 'What a "section" is, and the five section planes', min: 20,
    body: `
<p>Picture slicing a solid with a knife. The knife is the <b>section plane</b>. You throw away the piece between you and the knife and look at the cut face. That cut face, drawn <b>hatched</b> (thin 45° lines, 3 mm apart), is the <b>section</b>.</p>
<ul>
<li>The plane is always ⟂ HP or ⟂ VP, so in one view it is just a <b>line</b>: the <b>VT</b> (in the front view) or the <b>HT</b> (in the top view).</li>
<li>Everything is found from that line: number where it cuts each edge, then project those points to the other view.</li>
<li>If the plane is ∥ HP or ∥ VP, the sectional view already shows the <b>true shape</b>. If it is inclined, the true shape needs one extra view.</li>
</ul>`,
    tasks: [{ type: 'read', id: 'C5', text: 'Read "Section of solids: the idea and the planes"' }],
  },
  {
    title: 'Horizontal and vertical planes (true shape for free)', min: 35,
    spot: '"…cut by a horizontal plane…" or "…a vertical plane parallel to VP…"',
    body: `
<ol>
<li>Draw the whole solid: top view first (the base's true shape), then the front view.</li>
<li><b>Horizontal plane</b>: VT = a horizontal line at the given height. Points where it cuts the edges are projected down. The <b>sectional top view</b> shows the true shape.</li>
<li><b>Vertical plane ∥ VP</b>: HT = a line ∥ XY in the top view, the given distance in front of the axis. Project the points up. The part in front is removed; the <b>sectional front view</b> shows the true shape.</li>
</ol>`,
    tasks: [
      { type: 'watch', id: 'X1', text: 'Watch: square pyramid, horizontal plane' },
      { type: 'trace', id: 'X2', text: 'Trace: square prism, vertical plane ∥ VP' },
    ],
  },
  {
    title: 'The AIP on a pyramid (asked most often)', min: 60,
    spot: '"…cut by a plane inclined at θ to HP and perpendicular to VP…" (an auxiliary inclined plane)',
    body: `
<ol>
<li>Full solid: TV, then FV.</li>
<li>Draw the <b>VT</b> at θ to XY through the given point on the axis. Number the cut points 1′, 2′, 3′… on the slant edges.</li>
<li>Project each point down onto <b>the same edge</b> in the TV. An edge that looks vertical in the FV can't be projected straight down: swing it onto the extreme edge or carry it across horizontally.</li>
<li><b>Sectional TV</b>: join 1, 2, 3…, keep only the part below the plane, hatch it.</li>
<li><b>True shape</b>: draw x₁y₁ ∥ VT. Draw perpendiculars from 1′, 2′… On each, mark from x₁y₁ the distance of that point from XY in the TV. Join and hatch.</li>
</ol>
<p class="muted small">"At 60° to the axis" = 30° to HP when the axis is vertical. Watch for it.</p>`,
    tasks: [
      { type: 'watch', id: 'X3', text: 'Watch: pentagonal pyramid, AIP bisecting the axis' },
      { type: 'trace', id: 'X4', text: 'Trace: pentagonal pyramid (edge ∥ VP), AIP' },
      { type: 'solo', id: 'X8', text: 'Alone, 25 min: pentagonal pyramid, plane at 60° to the axis' },
    ],
  },
  {
    title: 'AIP on prisms and cylinders', min: 50,
    spot: '"A … prism / cylinder … cut by a plane ⟂ VP, inclined at θ to HP…"',
    body: `
<p>Exactly the same steps. The only new thing: when the VT runs off the side or <b>cuts the top face</b>, the section gets extra corners where the VT crosses the top (or base) line. For a cylinder, use the 12 generators: each gives a point, and the true shape is an <b>ellipse</b> (join with a smooth curve).</p>`,
    tasks: [
      { type: 'watch', id: 'X11', text: 'Watch: hexagonal prism, 7-sided section' },
      { type: 'trace', id: 'X12', text: 'Trace: square prism, AIP 60°' },
      { type: 'solo', id: 'X10', text: 'Alone, 25 min: cylinder, plane through the top of the axis' },
    ],
  },
  {
    title: 'Cone sections and the AVP', min: 55,
    spot: '"…a vertical plane inclined at φ to VP…" (AVP) or "…parallel to a generator…"',
    body: `
<ul>
<li><b>AVP</b> (⟂ HP, inclined to VP): now the plane is a line in the <b>top view</b> (HT). Number the cut points there, project them <b>up</b>. The part in front of the plane is removed, so the <b>sectional front view</b> is hatched. True shape: x₁y₁ ∥ HT, distances = <b>heights</b> from XY in the FV.</li>
<li>Cone: a point on a generator in the TV is projected up onto the same generator in the FV. For points the generators don't give, draw a horizontal circle through the point in the TV and find its height in the FV.</li>
<li>Shapes: plane ∥ a generator gives a <b>parabola</b>. Plane ∥ the axis gives a <b>hyperbola</b>. Plane cutting all generators gives an <b>ellipse</b>.</li>
</ul>`,
    tasks: [
      { type: 'watch', id: 'X5', text: 'Watch: cone, auxiliary vertical plane (hyperbola)' },
      { type: 'trace', id: 'X6', text: 'Trace: cone, plane ∥ generator (parabola)' },
      { type: 'trace', id: 'X9', text: 'Trace: hexagonal pyramid, AVP 45°' },
    ],
  },
  {
    title: 'Development: unrolling the four basic solids', min: 45,
    body: `
<ul>
<li><b>Prism / cylinder → a rectangle.</b> Length = perimeter (n × side, or πd), height = h. Draw it in line with the FV base so heights project straight across.</li>
<li><b>Cone → a sector.</b> Radius L = √(h² + r²) (the extreme generator in the FV is already true length). Angle θ = 360° × r / L.</li>
<li><b>Pyramid → triangles round a point.</b> Radius = true length of a slant edge = √(h² + R²), with R = centre to corner. Step off the base side n times as chords.</li>
<li>Outline thick, fold lines thin, letter the folds A, B, C… (or 1–12).</li>
</ul>`,
    tasks: [
      { type: 'read', id: 'C6', text: 'Read "Development of surfaces: the idea"' },
      { type: 'watch', id: 'D1', text: 'Watch: pentagonal prism' },
      { type: 'trace', id: 'D3', text: 'Trace: cone (sector)' },
      { type: 'trace', id: 'D4', text: 'Trace: square pyramid' },
    ],
  },
  {
    title: 'Development of cut solids (exam favourite)', min: 60,
    spot: '"…cut by a plane… Draw the development of the remaining/lower portion / truncated solid"',
    body: `
<ol>
<li>Draw FV + TV, then the VT, and number the cut points (as in the section lessons).</li>
<li>Draw the full development.</li>
<li><b>Prism / cylinder</b>: carry each cut point <b>horizontally</b> from the FV to its fold line. Same height.</li>
<li><b>Pyramid / cone</b>: a cut point on a slant line is <b>not</b> at true distance. Slide it horizontally onto the true-length (extreme) line, then measure from the apex along the matching fold line.</li>
<li>Join: straight lines on flat faces, a smooth curve on curved ones. Draw only the remaining part thick.</li>
</ol>`,
    tasks: [
      { type: 'watch', id: 'D5', text: 'Watch: truncated pentagonal prism' },
      { type: 'trace', id: 'D7', text: 'Trace: truncated cone' },
      { type: 'solo', id: 'D8', text: 'Alone, 25 min: truncated square pyramid' },
      { type: 'trace', id: 'D6', text: 'Trace: truncated cylinder' },
    ],
  },
  {
    title: 'Shortest path and holes', min: 40,
    spot: '"…an ant / insect moves… by the shortest path" or "…a hole is drilled…"',
    body: `
<ul>
<li><b>Shortest path</b> = a <b>straight line on the development</b>. Mark where it crosses each fold line, carry those points back to the same lines in the FV (and TV), and join smoothly. Parts on the back are dashed.</li>
<li>Round trip on a cone: open the cone through the start point. The path is the chord joining the two ends of the sector.</li>
<li><b>Hole</b>: divide the hole circle (in the FV) into 12. For each point, its height comes from the FV and its distance along the face from the TV. Plot it on the development and join smoothly.</li>
</ul>`,
    tasks: [
      { type: 'watch', id: 'D9', text: 'Watch: ant on a hexagonal prism' },
      { type: 'trace', id: 'D10', text: 'Trace: insect round a cone' },
      { type: 'watch', id: 'D11', text: 'Watch: square prism with a hole' },
    ],
  },
  {
    title: 'Final check', min: 40,
    body: `
<p>The whole of Module 3 on one card:</p>
<ul>
<li>Plane ⟂ VP → line in the FV (VT) → project <b>down</b> → sectional TV. Plane ⟂ HP → line in the TV (HT) → project <b>up</b> → sectional FV.</li>
<li>True shape: x₁y₁ ∥ VT/HT; distances come from the <b>other</b> view.</li>
<li>Development: prism/cylinder = rectangle (perimeter × h); pyramid/cone = sector (true length; θ = 360 r / L).</li>
<li>Cut points onto a development: straight across for prisms/cylinders; via the true-length line for pyramids/cones.</li>
<li>Hatching thin at 45°. Outline thick. Hidden dashed. Axis chain. VT/HT chain with labels.</li>
</ul>`,
    tasks: [
      { type: 'solo', id: 'any', pool: 'm3', text: 'One random Module 3 mock' },
      { type: 'solo', id: 'X13', text: 'Alone, 25 min: hexagonal pyramid, plane cutting the base' },
    ],
  },
];

// ------------------------------------------------------------ exam plan (#exam)
// Only the topics on the exam blueprint, grouped by the marks they carry.
export const EXAM_PARTS = [
  { title: 'Solids', marks: 15, note: 'One question: draw the projections of one of these four solids, usually resting on an edge, corner or face with the axis inclined.' },
  { title: 'Solids: methods', marks: 15, note: 'The ideas examiners test inside every solids question.' },
  { title: 'Sections', marks: 10, note: 'A solid cut by a plane: sectional view and true shape.' },
];
export const EXAM = [
  // ---------------- Part 1: the four solids ----------------
  {
    part: 0, title: 'Square pyramid', min: 50,
    body: `
<ul>
<li><b>Base</b>: a square of side a. Its corners are R = 0.707 a from the centre; the middle of a side is r = a/2 from it.</li>
<li><b>Slant edges</b> join the corners to the apex o, h above the base. True slant edge = √(h² + R²).</li>
<li>Base on HP: the TV is the square with its diagonals to o. The FV is a triangle (or two triangles side by side).</li>
<li>Resting on a <b>base edge</b> → keep that edge ⟂ XY in stage 1. On a <b>corner</b> → corner on the centre line. On a <b>triangular face</b> → tilt until that face lies on XY; the axis is then at tan⁻¹(r/h) to HP.</li>
</ul>`,
    tasks: [
      { type: 'watch', id: 'S1', text: 'Watch: square pyramid standing on HP' },
      { type: 'trace', id: 'P4', text: 'Trace: square pyramid on a base edge, axis 45°' },
      { type: 'solo', id: 'P8', text: 'Alone, 25 min: square pyramid on a triangular face' },
    ],
  },
  {
    part: 0, title: 'Pentagonal pyramid', min: 50,
    body: `
<ul>
<li><b>Drawing the pentagon</b>: each interior angle is 108°. Or draw a circle of radius R = 0.851 a and step off the side a five times.</li>
<li>One base edge ⟂ XY gives a corner opposite it on the centre line, and vice versa. Read which one the question wants.</li>
<li>Label the corners a, b, c, d, e going round, and keep the same letters in every stage: that's how you find the points after tilting.</li>
<li>Visibility: an edge is hidden only if a face is in front of it. The outline of every view is always thick.</li>
</ul>`,
    tasks: [
      { type: 'watch', id: 'P18', text: 'Watch: pentagonal pyramid on a corner, TV of axis 35°' },
      { type: 'trace', id: 'P19', text: 'Trace: pentagonal pyramid, base edge on VP' },
      { type: 'solo', id: 'P22', text: 'Alone, 25 min: pentagonal pyramid on a triangular face' },
    ],
  },
  {
    part: 0, title: 'Square prism', min: 45,
    body: `
<ul>
<li>Two equal square ends joined by four rectangular faces. Height h, base side a.</li>
<li>Base on HP: the TV is the square, the FV a rectangle (with a dashed line if a back edge is hidden behind a face).</li>
<li>Resting on a <b>base edge</b> (the most common): the edge ⟂ XY in stage 1, tilt the FV about it, then turn the TV.</li>
<li>"Rectangular face containing the resting edge at θ to HP" = the axis at θ: that face is parallel to the axis.</li>
</ul>`,
    tasks: [
      { type: 'watch', id: 'P1', text: 'Watch: square prism on a base edge' },
      { type: 'trace', id: 'P14', text: 'Trace: square prism, face at 40°, TV of axis 30°' },
      { type: 'solo', id: 'P2', text: 'Alone, 25 min: square prism, base edge on VP' },
    ],
  },
  {
    part: 0, title: 'Cone', min: 50,
    body: `
<ul>
<li>Divide the base circle into <b>12</b> equal parts and number them. Each point joined to the apex is a <b>generator</b>.</li>
<li>Carry all 12 points through every stage, then join the base points with a smooth curve (an ellipse once the cone is tilted).</li>
<li>Resting on a <b>point of the base circle</b>: point 1 at the right end of the centre line. On a <b>generator</b>: tilt until that generator lies on XY.</li>
<li>Outline = the two extreme generators, tangent to the ellipse. Generators on the back are dashed (or left out).</li>
</ul>`,
    tasks: [
      { type: 'watch', id: 'P6', text: 'Watch: cone on a rim point, TV of axis 45°' },
      { type: 'trace', id: 'P16', text: 'Trace: cone on a generator' },
      { type: 'solo', id: 'P23', text: 'Alone, 25 min: cone on a generator, plane at 60° to VP' },
    ],
  },
  // ---------------- Part 2: the methods ----------------
  {
    part: 1, title: 'Inclination of the axis', min: 55,
    spot: '"axis inclined θ to HP" → stage 2 · "top view of the axis at φ" → direct · "axis inclined φ to VP" → true angle, β needed',
    body: `
<ul>
<li>The axis can't be tilted to both planes in one step. Tilt to the plane it rests on first (stage 2), then turn (stage 3).</li>
<li><b>Axis at θ to HP</b>: in stage 2 tilt the FV until the axis makes θ with XY. It stays parallel to VP, so θ shows true.</li>
<li><b>Top view of the axis at φ</b>: turn the TV until the axis line makes φ with XY. Direct.</li>
<li><b>Axis at a true φ to VP</b>: φ never shows directly in the TV. Use the apparent angle β: sin β = sin φ / cos θ. Construction: TV length of the axis L cos θ; locus line L sin φ from one end; arc cuts it. Needs θ + φ ≤ 90°.</li>
</ul>`,
    tasks: [
      { type: 'watch', id: 'P3', text: 'Watch: pentagonal pyramid, 30° to HP and 45° to VP (β)' },
      { type: 'trace', id: 'P5', text: 'Trace: cone, 30° to HP and 45° to VP' },
      { type: 'solo', id: 'P20', text: 'Alone, 25 min: cone, 45° to HP and 40° to VP' },
    ],
  },
  {
    part: 1, title: 'Inclination of base edges', min: 45,
    spot: '"resting edge inclined φ to VP" · "base inclined θ to HP" · "two base edges equally inclined"',
    body: `
<ul>
<li><b>Resting edge at φ to VP</b>: that edge lies on HP, so its top view shows φ directly. In stage 3 turn the TV until the edge makes φ with XY.</li>
<li><b>Base at θ to HP</b>: the axis is perpendicular to the base, so the axis is at <b>90° − θ</b>. Tilt by the base line in the FV.</li>
<li><b>Two base edges equally inclined to HP/VP</b> (square base on a corner): keep the corner on the centre line, so the two edges meeting there are symmetric.</li>
<li><b>Base edge ∥ / ⟂ VP</b> in the simple position: read it carefully. It decides which way the base is drawn in the TV.</li>
</ul>`,
    tasks: [
      { type: 'watch', id: 'P10', text: 'Watch: square pyramid, base at 30° (axis 60°)' },
      { type: 'trace', id: 'P15', text: 'Trace: square prism, resting edge at 40° to HP' },
      { type: 'trace', id: 'S10', text: 'Stage 1 only: square prism with a base edge on VP' },
    ],
  },
  {
    part: 1, title: 'Change of position method', min: 45,
    body: `
<ol>
<li><b>Stage 1</b>: the simple position. Axis ⟂ the plane it rests on, base in true shape (TV for HP, FV for VP). Place the resting edge ⟂ XY, or the resting corner on the centre line.</li>
<li><b>Stage 2</b>: copy the other view tilted about the resting edge/corner. Same lengths. The new TV = vertical projectors × horizontal lines from stage 1.</li>
<li><b>Stage 3</b>: copy the stage-2 TV turned to the final angle. The final FV = vertical projectors × horizontal lines from stage 2.</li>
</ol>
<p>Rule: the view you copy keeps its shape. The other view is always found by projectors. Leave ~70 mm between stages.</p>`,
    tasks: [
      { type: 'trace', id: 'S5', text: 'Stage 1 only: square prism on a base edge' },
      { type: 'trace', id: 'S6', text: 'Stage 1 only: pentagonal pyramid on a corner' },
      { type: 'trace', id: 'S7', text: 'Stage 1 only: cone on a rim point' },
      { type: 'trace', id: 'S9', text: 'Stage 1 only: square pyramid on a triangular face' },
    ],
  },
  {
    part: 1, title: 'Auxiliary views (auxiliary plane method)', min: 50,
    body: `
<p>The same answer as stage 3, without redrawing the top view. Instead of turning the <i>object</i>, you turn the <i>reference line</i>:</p>
<ol>
<li>Draw stages 1 and 2 as usual.</li>
<li>Draw a new reference line <b>x₁y₁</b> at the required angle to the stage-2 top view (to the axis or to the resting edge), a little away from the drawing.</li>
<li>Draw projectors from every point of the stage-2 TV, <b>perpendicular to x₁y₁</b>.</li>
<li>On each one, measure from x₁y₁ the <b>height</b> of that point above XY in the stage-2 FV. Join: this is the <b>auxiliary front view</b>.</li>
</ol>
<p>Rule of every auxiliary view: <b>projectors ⟂ the new line; distances copied from the view two steps back.</b> The true shape of a section (Part 3) uses the same rule.</p>`,
    tasks: [
      { type: 'watch', id: 'A1', text: 'Watch: square prism by the auxiliary plane method' },
      { type: 'trace', id: 'A3', text: 'Trace: pentagonal pyramid, auxiliary front view' },
      { type: 'trace', id: 'A4', text: 'Trace: square prism on a base edge, auxiliary view' },
      { type: 'solo', id: 'A2', text: 'Alone, 25 min: cone, auxiliary front view' },
    ],
  },
  // ---------------- Part 3: sections ----------------
  {
    part: 2, title: 'Section of a prism', min: 45,
    spot: '"…cut by a plane ⟂ VP, inclined θ to HP…" (AIP) or "…a vertical plane ∥ VP…"',
    body: `
<ol>
<li>Draw the whole prism: TV first, then FV.</li>
<li>Draw the plane as a line where it is edge-on: the <b>VT</b> in the FV for a plane ⟂ VP. Number where it cuts each edge: 1′, 2′, 3′… If it crosses the top face, those crossing points count too.</li>
<li>Project the points down onto the same edges in the TV. Join them, keep the part below the plane, and <b>hatch</b> the cut face (thin, 45°, 3 mm apart). That is the <b>sectional top view</b>.</li>
</ol>`,
    tasks: [
      { type: 'watch', id: 'X2', text: 'Watch: square prism, vertical plane ∥ VP' },
      { type: 'trace', id: 'X12', text: 'Trace: square prism, AIP 60°' },
      { type: 'solo', id: 'X7', text: 'Alone, 25 min: square prism (face 30° to VP), AIP 45°' },
    ],
  },
  {
    part: 2, title: 'Section of a pyramid', min: 50,
    body: `
<p>Same steps as the prism. One trap: an edge that looks <b>vertical in the FV</b> (it's ⟂ to XY in both views) can't be projected straight down. Carry the point horizontally to the extreme (true-length) edge, project that down, then swing it back with an arc about the centre.</p>
<p class="muted small">"At 60° to the axis" = 30° to HP, because the axis is vertical.</p>`,
    tasks: [
      { type: 'watch', id: 'X1', text: 'Watch: square pyramid, horizontal section' },
      { type: 'trace', id: 'X3', text: 'Trace: pentagonal pyramid, AIP through the axis' },
      { type: 'solo', id: 'X8', text: 'Alone, 25 min: pentagonal pyramid, plane at 60° to the axis' },
    ],
  },
  {
    part: 2, title: 'Section of a cone', min: 50,
    body: `
<ul>
<li>Use the 12 generators. Each one the plane crosses gives a point. Project it to the same generator in the other view and join smoothly.</li>
<li>A point that falls between generators: draw a horizontal circle (in the TV) through it and take its height from the FV.</li>
<li>Shapes: plane cuts all generators → <b>ellipse</b>; ∥ a generator → <b>parabola</b>; ∥ the axis → <b>hyperbola</b>; through the apex → triangle; ∥ base → circle.</li>
<li>Plane ⟂ HP (an AVP): it's a line in the TV (HT). Project up, keep the part behind it, hatch the <b>sectional front view</b>.</li>
</ul>`,
    tasks: [
      { type: 'watch', id: 'X6', text: 'Watch: cone, plane ∥ a generator (parabola)' },
      { type: 'trace', id: 'X5', text: 'Trace: cone, vertical plane at 45° to VP (hyperbola)' },
    ],
  },
  {
    part: 2, title: 'True shape of the section', min: 45,
    body: `
<ol>
<li>The true shape is an <b>auxiliary view</b> looking straight at the cut. Draw <b>x₁y₁ parallel to the VT</b> (or the HT), a little away.</li>
<li>From each numbered point on the VT, draw a perpendicular across x₁y₁.</li>
<li>On each one, mark from x₁y₁ the distance of the same point <b>from XY in the top view</b> (for an HT: its height in the front view).</li>
<li>Join (smooth curve for a cone) and hatch. A horizontal plane or a plane ∥ VP needs none of this: the sectional view already is the true shape.</li>
</ol>`,
    tasks: [
      { type: 'trace', id: 'X4', text: 'Trace: pentagonal pyramid (edge ∥ VP), true shape' },
      { type: 'trace', id: 'X9', text: 'Trace: hexagonal pyramid, AVP, true shape from the HT' },
      { type: 'solo', id: 'X13', text: 'Alone, 25 min: hexagonal pyramid, plane cutting the base, with true shape' },
    ],
  },
];

export const COURSES = [
  { key: 'm2', title: 'Module 2 · Projection of solids', short2: 'M2', lessons: COURSE, covers: 'Every question type KTU has asked is covered.', doneText: 'Read the night-before sheet once more in the morning.', short: 'Short on time? Lessons 1–7 cover most exam questions.' },
  { key: 'ex', hidden: true, title: 'Exam plan', short2: 'Exam', lessons: EXAM, covers: '', doneText: '', short: '' },
  { key: 'm3', title: 'Module 3 · Sections & development', short2: 'M3', lessons: COURSE3, covers: 'All 13 section problems and the development problems from the 2024-scheme playlist.', doneText: 'Read lesson 9 once more in the morning.', short: 'Short on time? Do lessons 1, 3, 6 and 7 first: AIP sections and developments come up most.' },
];

// ------------------------------------------------------------ module
export function mountRevision(api) {
  // api: { store, done(), openProblem(id, query), close() }
  const root = document.createElement('div');
  root.id = 'revise';
  root.className = 'revise';
  root.hidden = true;
  root.innerHTML = `
    <header class="rv-top">
      <button class="icon-btn" id="rvBack" title="Back to the sheet">←</button>
      <div class="rv-brand">One-day crash course <small>Projection of Solids</small></div>
      <nav class="rv-tabs" role="tablist">
        <button data-rv="course">Course</button>
        <button data-rv="cram">Night-before sheet</button>
        <button data-rv="quiz">Spot drill</button>
        <button data-rv="pyq">All PYQs</button>
        <button data-rv="mock">Mock exam</button>
      </nav>
    </header>
    <div class="rv-body" id="rvBody"></div>`;
  document.body.append(root);

  const body = root.querySelector('#rvBody');
  const weak = () => api.store.get('rev.weak', {});
  const setWeak = (id, on) => { const w = weak(); if (on) w[id] = true; else delete w[id]; api.store.set('rev.weak', w); };
  let tab = 'course';

  root.querySelector('#rvBack').onclick = api.close;
  root.querySelector('.rv-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-rv]');
    if (b) history.replaceState(null, '', '#revise/' + b.dataset.rv), show(b.dataset.rv);
  });

  function show(t = 'course') {
    tab = ['course', 'cram', 'quiz', 'pyq', 'mock', 'exam'].includes(t) ? t : 'course';
    root.hidden = false;
    root.classList.toggle('rv-exam', tab === 'exam');
    root.querySelector('.rv-brand').innerHTML = tab === 'exam' ? 'Exam plan <small>40 marks · step by step</small>' : 'One-day crash course <small>Projection of Solids</small>';
    document.body.classList.add('revising');
    root.querySelectorAll('[data-rv]').forEach((b) => b.classList.toggle('active', b.dataset.rv === tab));
    ({ exam: renderExam, course: renderCourse, cram: renderCram, quiz: renderQuiz, pyq: renderPyq, mock: renderMock })[tab]();
    body.scrollTop = 0;
  }
  function hide() { root.hidden = true; document.body.classList.remove('revising'); }

  // ---------------- course
  // Module 2 keeps its original task keys ("l.k") so saved progress survives; Module 3 uses "m3.l.k".
  const FLAT = COURSES.flatMap((C) => C.lessons.flatMap((L, l) => L.tasks.map((t, k) => ({ ...t, mod: C.key, l, k, key: C.key === 'm2' ? `${l}.${k}` : `${C.key}.${l}.${k}` }))));
  const courseOf = (key) => COURSES.find((C) => C.key === key) || COURSES[0];
  const VERB = { read: 'Read', watch: 'Watch', trace: 'Trace', solo: 'Alone', drill: 'Drill', sheet: 'Read' };
  const HOW = {
    read: 'Read the card. You can tick it off yourself.',
    watch: 'Press ▶ in the step bar (bottom) and read every step to the end. It ticks itself when you reach the last step.',
    trace: 'The guide is on. Draw each step over the faint ghost lines (they snap), move on with ▶, then press Check. 70% or more ticks it.',
    solo: 'No hints, no ghost lines. Draw it like the exam, then press Submit. 60% or more ticks it.',
  };
  function taskDone(t) {
    const st = api.store;
    if (st.get('course.tick', {})[t.key]) return true;
    const pool = t.pool === 'm3' ? M3IDS : PYQIDS;
    switch (t.type) {
      case 'watch': return !!st.get('watched', {})[t.id];
      case 'trace': return (st.get('best', {})[t.id] || 0) >= 70;
      case 'solo': return st.get('rev.mocks', []).some((m) => (t.id === 'any' ? pool.has(m.id) : m.id === t.id) && m.pct >= 60);
      case 'drill': return st.get('rev.quizRight', 0) >= 10;
      default: return false;
    }
  }
  function tick(key, on = true) { const k = api.store.get('course.tick', {}); if (on) k[key] = true; else delete k[key]; api.store.set('course.tick', k); }
  function tickTask(type) { FLAT.filter((t) => t.type === type).forEach((t) => tick(t.key)); }
  const nextUndone = (mod, after = -1) => FLAT.find((t, i) => i > after && t.mod === mod && !taskDone(t)) || null;

  function startTask(t) {
    api.store.set('course.cur', t.key);
    api.store.set('course.mod', t.mod);
    if (t.type === 'read') { tick(t.key); api.openProblem(t.id, t.q); return; }
    if (t.type === 'sheet') { history.replaceState(null, '', '#revise/cram'); show('cram'); return; }
    if (t.type === 'drill') { history.replaceState(null, '', '#revise/quiz'); show('quiz'); return; }
    if (t.type === 'solo') {
      let id = t.id;
      if (id === 'any') {
        const all = t.pool === 'm3' ? M3EXAM : PYQ;
        const soloDone = new Set(api.store.get('rev.mocks', []).filter((m) => m.pct >= 60).map((m) => m.id));
        const pool = all.filter((p) => !soloDone.has(p.id));
        const from = pool.length ? pool : all;
        id = from[Math.floor(Math.random() * from.length)].id;
        api.store.set('course.anyId', id);
      }
      api.openProblem(id, 'mock=25');
      return;
    }
    api.openProblem(t.id, 'step=0');
  }

  function renderCourse() {
    let C = courseOf(api.store.get('course.mod', 'm2'));
    if (C.hidden) C = COURSES[0];
    const mine = FLAT.filter((t) => t.mod === C.key);
    const done = new Map(mine.map((t) => [t.key, taskDone(t)]));
    const nDone = [...done.values()].filter(Boolean).length;
    const minsLeft = C.lessons.reduce((s, L, l) => s + (mine.filter((t) => t.l === l).every((t) => done.get(t.key)) ? 0 : L.min), 0);
    const nxt = nextUndone(C.key);
    const openL = nxt ? nxt.l : C.lessons.length - 1;
    body.innerHTML = `
      <div class="rv-course">
        <div class="seg rv-modsel">${COURSES.filter((x) => !x.hidden).map((x) => `<button data-mod="${x.key}" class="${x.key === C.key ? 'active' : ''}">${esc(x.title)}</button>`).join('')}</div>
        <section class="rv-hero">
          <h2>Haven't studied yet? Start here.</h2>
          <p>${C.lessons.length} short lessons in the order you need them. Each one explains one idea in plain words, shows you how to recognise that question in the exam, then has you <b>watch</b> it, <b>trace</b> it and <b>draw it alone</b>. ${esc(C.covers)}</p>
          <div class="rv-pyqhead">
            <div class="rv-meter"><div style="width:${(nDone / mine.length) * 100}%"></div></div>
            <span><b>${nDone}/${mine.length}</b> tasks · about <b>${Math.floor(minsLeft / 60)} h ${minsLeft % 60} min</b> left</span>
          </div>
          ${nxt ? `<p><button class="primary rv-big" id="rvGo">${nDone ? 'Continue' : 'Start'}: ${esc(VERB[nxt.type])} · ${esc(nxt.text)} →</button></p>` : `<p><b>All done. You are ready. 🎉</b> ${esc(C.doneText)}</p>`}
          <p class="muted small">${esc(C.short)} Take a 5-minute break after every lesson.</p>
        </section>
        ${C.lessons.map((L, l) => {
          const ts = mine.filter((t) => t.l === l);
          const all = ts.every((t) => done.get(t.key));
          return `<details class="rv-lesson${all ? ' done' : ''}" ${l === openL ? 'open' : ''}>
            <summary><span class="rv-ln">${all ? '✓' : l + 1}</span><span class="rv-lt">${esc(L.title)}</span><span class="muted small">${L.min} min</span></summary>
            <div class="rv-lbody">
              ${L.body}
              ${L.spot ? `<p class="rv-spot"><b>Spot it in the exam:</b> ${esc(L.spot)}</p>` : ''}
              <ul class="rv-tasks">${ts.map((t) => {
                const d = done.get(t.key);
                return `<li class="${d ? 'done' : ''}">
                  <button class="rv-check" data-tick="${t.key}" title="${d ? 'Mark as not done' : 'Mark as done'}">${d ? '✓' : ''}</button>
                  <span class="rv-verb">${VERB[t.type]}</span>
                  <span class="rv-ttext">${esc(t.text)}</span>
                  <button data-task="${t.key}" class="${!d && nxt && nxt.key === t.key ? 'primary' : ''}">${d ? 'Again' : 'Go'} →</button>
                </li>`;
              }).join('')}</ul>
            </div>
          </details>`;
        }).join('')}
      </div>`;
    body.querySelectorAll('[data-mod]').forEach((b) => { b.onclick = () => { api.store.set('course.mod', b.dataset.mod); renderCourse(); }; });
    body.querySelector('#rvGo')?.addEventListener('click', () => startTask(nxt));
    body.querySelectorAll('[data-task]').forEach((b) => { b.onclick = () => startTask(FLAT.find((t) => t.key === b.dataset.task)); });
    body.querySelectorAll('[data-tick]').forEach((b) => {
      b.onclick = () => { const t = FLAT.find((x) => x.key === b.dataset.tick); tick(t.key, !taskDone(t)); renderCourse(); };
    });
  }

  // ---------------- exam plan
  function renderExam() {
    const mine = FLAT.filter((t) => t.mod === 'ex');
    const done = new Map(mine.map((t) => [t.key, taskDone(t)]));
    const nDone = [...done.values()].filter(Boolean).length;
    const lessonDone = (l) => mine.filter((t) => t.l === l).every((t) => done.get(t.key));
    const minsLeft = EXAM.reduce((s, L, l) => s + (lessonDone(l) ? 0 : L.min), 0);
    const nxt = nextUndone('ex');
    const openL = nxt ? nxt.l : -1;
    const partPct = (pi) => {
      const ts = mine.filter((t) => EXAM[t.l].part === pi);
      return ts.length ? ts.filter((t) => done.get(t.key)).length / ts.length : 0;
    };
    let n = 0;
    body.innerHTML = `
      <div class="rv-course">
        <section class="rv-hero">
          <h2>Your exam, topic by topic</h2>
          <p>Only what's on your paper: <b>40 marks</b> in three parts. Each topic explains the idea in plain words, then you <b>watch</b> the construction, <b>trace</b> it on the sheet and <b>draw one alone</b> against the clock. Go in order: later topics build on earlier ones.</p>
          <div class="rv-parts">${EXAM_PARTS.map((P, pi) => `<div class="rv-part"><b>${P.marks}</b><span>marks</span><em>${esc(P.title)}</em><div class="rv-meter"><div style="width:${partPct(pi) * 100}%"></div></div></div>`).join('')}</div>
          <div class="rv-pyqhead">
            <div class="rv-meter"><div style="width:${(nDone / mine.length) * 100}%"></div></div>
            <span><b>${nDone}/${mine.length}</b> tasks · about <b>${Math.floor(minsLeft / 60)} h ${minsLeft % 60} min</b> left</span>
          </div>
          ${nxt ? `<p><button class="primary rv-big" id="rvGo">${nDone ? 'Continue' : 'Start'}: ${esc(VERB[nxt.type])} · ${esc(nxt.text)} →</button></p>` : '<p><b>Every topic done. 🎉</b> Before the exam, skim the topic cards once more.</p>'}
        </section>
        ${EXAM_PARTS.map((P, pi) => `
          <h3 class="rv-parth"><span>Part ${pi + 1} · ${esc(P.title)}</span><span class="rv-marks">${P.marks} marks</span></h3>
          <p class="muted small rv-partnote">${esc(P.note)}</p>
          ${EXAM.map((L, l) => {
            if (L.part !== pi) return '';
            n++;
            const ts = mine.filter((t) => t.l === l);
            const all = lessonDone(l);
            return `<details class="rv-lesson${all ? ' done' : ''}" ${l === openL ? 'open' : ''}>
              <summary><span class="rv-ln">${all ? '✓' : n}</span><span class="rv-lt">${esc(L.title)}</span><span class="muted small">${L.min} min</span></summary>
              <div class="rv-lbody">
                ${L.body}
                ${L.spot ? `<p class="rv-spot"><b>Spot it in the question:</b> ${esc(L.spot)}</p>` : ''}
                <ul class="rv-tasks">${ts.map((t) => {
                  const d = done.get(t.key);
                  return `<li class="${d ? 'done' : ''}">
                    <button class="rv-check" data-tick="${t.key}" title="${d ? 'Mark as not done' : 'Mark as done'}">${d ? '✓' : ''}</button>
                    <span class="rv-verb">${VERB[t.type]}</span>
                    <span class="rv-ttext">${esc(t.text)}</span>
                    <button data-task="${t.key}" class="${!d && nxt && nxt.key === t.key ? 'primary' : ''}">${d ? 'Again' : 'Go'} →</button>
                  </li>`;
                }).join('')}</ul>
              </div>
            </details>`;
          }).join('')}`).join('')}
        <section class="rv-card rv-examday">
          <h3>In the exam hall</h3>
          <ol class="small">
            <li>Underline: the solid and its size, what it rests on, every angle and what it's measured to (HP, VP, the axis, its top view).</li>
            <li>Decide stage 1 before drawing: which view first, and how the base is placed.</li>
            <li>Leave ~70 mm between stages. Label every corner with the same letter in every stage.</li>
            <li>Sections: VT/HT first, number the cut points, project, hatch, then the true shape on x₁y₁.</li>
            <li>Finish: outlines thick, hidden lines dashed, axes chain, hatching thin.</li>
          </ol>
        </section>
      </div>`;
    body.querySelector('#rvGo')?.addEventListener('click', () => startTask(nxt));
    body.querySelectorAll('[data-task]').forEach((b) => { b.onclick = () => startTask(FLAT.find((t) => t.key === b.dataset.task)); });
    body.querySelectorAll('[data-tick]').forEach((b) => {
      b.onclick = () => { const t = FLAT.find((x) => x.key === b.dataset.tick); tick(t.key, !taskDone(t)); renderExam(); };
    });
  }

  // Info for the bar shown on the sheet while a course task is open.
  function courseBar(id) {
    const key = api.store.get('course.cur', null);
    const t = FLAT.find((x) => x.key === key);
    if (!t || !['read', 'watch', 'trace', 'solo'].includes(t.type)) return null;
    const tid = t.id === 'any' ? api.store.get('course.anyId', null) : t.id;
    if (tid !== id) return null;
    const i = FLAT.indexOf(t);
    const C = courseOf(t.mod);
    return { home: t.mod === 'ex' ? '#exam' : '#revise', lesson: t.l + 1, of: C.lessons.length, mod: C.short2, verb: VERB[t.type], text: t.text, how: HOW[t.type], done: taskDone(t), hasNext: !!nextUndone(t.mod, i) };
  }
  function courseNext() {
    const cur = FLAT.find((x) => x.key === api.store.get('course.cur', null));
    const mod = cur ? cur.mod : 'm2';
    const n = nextUndone(mod, cur ? FLAT.indexOf(cur) : -1) || nextUndone(mod);
    if (!n) { location.hash = mod === 'ex' ? '#exam' : '#revise'; return; }
    startTask(n);
  }

  // ---------------- cram
  function renderCram() {
    body.innerHTML = `<div class="rv-grid">${CRAM}</div>
      <p class="rv-next"><button data-go="quiz" class="primary">Test yourself: Spot drill →</button></p>`;
    tickTask('sheet');
    body.querySelector('[data-go]').onclick = () => { history.replaceState(null, '', '#revise/quiz'); show('quiz'); };
  }

  // ---------------- quiz
  const quiz = { deck: [], i: 0, step: 0, right: 0, asked: 0, miss: false };
  function newDeck() {
    const w = weak();
    // weak problems first, then the rest shuffled
    quiz.deck = [...shuffle(PYQ.filter((p) => w[p.id])), ...shuffle(PYQ.filter((p) => !w[p.id]))];
    quiz.i = 0; quiz.step = 0; quiz.right = 0; quiz.asked = 0; quiz.miss = false;
  }
  function questions(p) {
    const sol = solOf(p);
    const qs = [
      { q: 'Stage 1: which view shows the true shape (draw it first)?', opts: ['Top view (axis ⟂ HP)', 'Front view (axis ⟂ VP)'], a: sol.frame === 'HP' ? 0 : 1 },
      { q: 'Stage 1: how do you place the base?', opts: ORIENT_OPTS, a: orientKey(p) },
      { q: 'Stage 2: tilt until…', opts: S2_OPTS, a: s2Key(p) },
      { q: 'Stage 3: how do you set the last angle?', opts: S3_OPTS, a: s3Key(p) },
    ];
    if (p.stage3.type === 'axisTrue') {
      qs.push({ q: `Work out β. θ = ${f1(sol.numbers.theta)}°, φ = ${p.stage3.angle}° (sin β = sin φ / cos θ). Within ±1°.`, num: sol.numbers.beta });
    }
    return qs;
  }
  function renderQuiz() {
    if (!quiz.deck.length || quiz.i >= quiz.deck.length) newDeck();
    const p = quiz.deck[quiz.i];
    const qs = questions(p);
    const done = quiz.step >= qs.length;
    const r = recipe(p);
    let qhtml = '';
    if (!done) {
      const q = qs[quiz.step];
      qhtml = q.num !== undefined
        ? `<p class="rv-q">${esc(q.q)}</p><form class="rv-numf"><input id="rvNum" type="number" step="0.1" inputmode="decimal" placeholder="β in degrees" autocomplete="off"><button class="primary">Check</button></form>`
        : `<p class="rv-q">${esc(q.q)}</p><div class="rv-opts">${q.opts.map((o, k) => `<button data-opt="${k}">${esc(o)}</button>`).join('')}</div>`;
    }
    const w = weak();
    body.innerHTML = `
      <div class="rv-quiz">
        <div class="rv-qhead">
          <span class="chip">${esc(p.id)} · ${quiz.i + 1}/${quiz.deck.length}</span>
          <span class="chip">${esc(solidName(p.solid))}</span>
          ${w[p.id] ? '<span class="chip rv-weak">weak</span>' : ''}
          <span class="rv-score">${quiz.right}/${quiz.asked} correct</span>
        </div>
        <div class="statement">${esc(p.statement)}</div>
        <div class="rv-progress">${qs.map((_, k) => `<i class="${k < quiz.step ? 'on' : k === quiz.step ? 'now' : ''}"></i>`).join('')}</div>
        <div id="rvQ">${qhtml}</div>
        <div id="rvFeedback"></div>
        ${done ? `
          <div class="rv-recipe">
            <h4>${quiz.miss ? 'Recipe (added to your weak list)' : 'Recipe: all correct ✓'}</h4>
            ${recipeHtml(r)}
          </div>
          <div class="rv-actions">
            <button class="primary" id="rvNextQ">Next question →</button>
            <button id="rvDraw">Draw it on the sheet</button>
            <button id="rvMockIt">Draw it timed (20 min)</button>
          </div>` : ''}
      </div>`;
    if (!done) {
      const q = qs[quiz.step];
      const answer = (ok, msg) => {
        quiz.asked++;
        if (ok) { quiz.right++; api.store.set('rev.quizRight', api.store.get('rev.quizRight', 0) + 1); } else quiz.miss = true;
        body.querySelector('#rvFeedback').innerHTML = `<p class="rv-fb ${ok ? 'ok' : 'no'}">${ok ? '✓ Correct.' : '✗ ' + esc(msg)}</p><button class="primary" id="rvCont">Continue →</button>`;
        body.querySelectorAll('[data-opt], #rvNum, .rv-numf button').forEach((b) => { b.disabled = true; });
        const cont = body.querySelector('#rvCont');
        cont.onclick = () => { quiz.step++; if (quiz.step >= qs.length) setWeak(p.id, quiz.miss); renderQuiz(); };
        cont.focus();
      };
      if (q.num !== undefined) {
        const inp = body.querySelector('#rvNum');
        inp.focus();
        body.querySelector('.rv-numf').onsubmit = (e) => {
          e.preventDefault();
          const v = parseFloat(inp.value);
          if (!Number.isFinite(v)) return;
          answer(Math.abs(v - q.num) <= 1, `β = sin⁻¹(sin ${p.stage3.angle}° / cos ${f1(solOf(p).numbers.theta)}°) = ${f1(q.num)}°.`);
        };
      } else {
        body.querySelectorAll('[data-opt]').forEach((b) => {
          b.onclick = () => {
            const k = +b.dataset.opt;
            b.classList.add(k === q.a ? 'rv-right' : 'rv-wrong');
            body.querySelector(`[data-opt="${q.a}"]`).classList.add('rv-right');
            answer(k === q.a, `It is: ${q.opts[q.a]}.`);
          };
        });
      }
    } else {
      body.querySelector('#rvNextQ').onclick = () => { quiz.i++; quiz.step = 0; quiz.miss = false; renderQuiz(); };
      body.querySelector('#rvDraw').onclick = () => api.openProblem(p.id);
      body.querySelector('#rvMockIt').onclick = () => api.openProblem(p.id, 'mock=20');
      body.querySelector('#rvNextQ').focus();
    }
  }
  const recipeHtml = (r) => `<ol class="rv-rec">
      <li><b>Rests on</b> ${esc(r.rest)}</li>
      <li><b>Stage 1</b> ${esc(r.s1)}</li>
      <li><b>Stage 2</b> ${esc(r.s2)}</li>
      <li><b>Stage 3</b> ${esc(r.s3)}</li></ol>`;

  // ---------------- PYQ list
  let pyqFilter = 'all';
  function renderPyq() {
    const done = api.done(), w = weak();
    const rows = PYQ.filter((p) => pyqFilter === 'all'
      || (pyqFilter === 'todo' && !done[p.id])
      || (pyqFilter === 'weak' && w[p.id])
      || (pyqFilter === 'beta' && p.stage3.type === 'axisTrue')
      || (pyqFilter === 'vp' && p.frame === 'VP'));
    const solvedN = PYQ.filter((p) => done[p.id]).length;
    const chip = (k, label) => `<button data-f="${k}" class="${pyqFilter === k ? 'active' : ''}">${label}</button>`;
    body.innerHTML = `
      <div class="rv-pyqhead">
        <div class="rv-meter"><div style="width:${(solvedN / PYQ.length) * 100}%"></div></div>
        <span><b>${solvedN}/${PYQ.length}</b> solved on the sheet · <b>${Object.keys(w).length}</b> marked weak</span>
      </div>
      <div class="seg rv-filters">${chip('all', 'All')}${chip('todo', 'Not solved')}${chip('weak', 'Weak')}${chip('beta', 'Needs β')}${chip('vp', 'On VP')}</div>
      <div class="rv-pyq">
        ${rows.map((p) => {
          const r = recipe(p);
          return `<article class="rv-row">
            <div class="rv-rowhead">
              <span class="pid">${p.id}</span>
              <b>${esc(p.title)}</b>
              ${done[p.id] ? '<span class="rv-tag">✓ solved</span>' : ''}
              ${w[p.id] ? '<span class="rv-tag rv-weak">weak</span>' : ''}
              ${r.beta ? '<span class="rv-tag">β</span>' : ''}
            </div>
            <div class="rv-steps"><span>${esc(r.rest)}</span><span>① ${esc(r.s1)}</span><span>② ${esc(r.s2)}</span><span>③ ${esc(r.s3)}</span></div>
            <details><summary class="muted small">Question</summary><p class="small">${esc(p.statement)}</p></details>
            <div class="rv-rowact">
              <button data-open="${p.id}">Draw</button>
              <button data-mock="${p.id}">Timed</button>
              <button data-weak="${p.id}">${w[p.id] ? 'Unmark weak' : 'Mark weak'}</button>
            </div>
          </article>`;
        }).join('') || '<p class="muted">Nothing here. 🎉</p>'}
      </div>`;
    body.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { pyqFilter = b.dataset.f; renderPyq(); }; });
    body.querySelectorAll('[data-open]').forEach((b) => { b.onclick = () => api.openProblem(b.dataset.open); });
    body.querySelectorAll('[data-mock]').forEach((b) => { b.onclick = () => api.openProblem(b.dataset.mock, 'mock=20'); });
    body.querySelectorAll('[data-weak]').forEach((b) => { b.onclick = () => { setWeak(b.dataset.weak, !weak()[b.dataset.weak]); renderPyq(); }; });
  }

  // ---------------- mock
  function renderMock() {
    const hist = api.store.get('rev.mocks', []);
    const mins = api.store.get('rev.mockMin', 20);
    const pool = api.store.get('rev.mockPool', 'smart');
    const avg = hist.length ? Math.round(hist.reduce((s, h) => s + h.pct, 0) / hist.length) : null;
    body.innerHTML = `
      <div class="rv-mock">
        <section class="rv-card">
          <h3>Timed mock</h3>
          <p class="small">You get one KTU question on the sheet with a countdown. Hints, the step-by-step guide, the solution and the 3D view are locked. Press <b>Submit</b> when you finish; at 0:00 it is checked automatically.</p>
          <label class="rv-field">Time
            <div class="seg" id="rvMin">${[15, 20, 25, 30].map((m) => `<button data-min="${m}" class="${m === mins ? 'active' : ''}">${m} min</button>`).join('')}</div>
          </label>
          <label class="rv-field">Question
            <div class="seg" id="rvPool">
              <button data-pool="smart" class="${pool === 'smart' ? 'active' : ''}">Weak & unsolved first</button>
              <button data-pool="any" class="${pool === 'any' ? 'active' : ''}">Any PYQ</button>
              <button data-pool="beta" class="${pool === 'beta' ? 'active' : ''}">β problems</button>
              <button data-pool="m3" class="${pool === 'm3' ? 'active' : ''}">Module 3</button>
            </div>
          </label>
          <p><button class="primary" id="rvStart">Start mock ▶</button></p>
        </section>
        <section class="rv-card">
          <h3>History ${avg !== null ? `<span class="muted small">· average ${avg}%</span>` : ''}</h3>
          ${hist.length ? `<table class="rv-t"><tr><th>When</th><th>Q</th><th>Score</th><th>Time</th></tr>${hist.slice(0, 10).map((h) => `<tr><td>${esc(new Date(h.at).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }))}</td><td><a href="#${h.id}">${h.id}</a></td><td><b>${h.pct}%</b></td><td>${Math.floor(h.used / 60)}:${String(h.used % 60).padStart(2, '0')}${h.timeout ? ' ⏰' : ''}</td></tr>`).join('')}</table>` : '<p class="muted small">No mocks yet.</p>'}
        </section>
      </div>`;
    body.querySelectorAll('[data-min]').forEach((b) => { b.onclick = () => { api.store.set('rev.mockMin', +b.dataset.min); renderMock(); }; });
    body.querySelectorAll('[data-pool]').forEach((b) => { b.onclick = () => { api.store.set('rev.mockPool', b.dataset.pool); renderMock(); }; });
    body.querySelector('#rvStart').onclick = () => {
      const done = api.done(), w = weak();
      let list = PYQ;
      if (pool === 'beta') list = PYQ.filter((p) => p.stage3.type === 'axisTrue');
      if (pool === 'm3') list = M3EXAM;
      if (pool === 'smart') {
        const pri = PYQ.filter((p) => w[p.id] || !done[p.id]);
        if (pri.length) list = pri;
      }
      const p = list[Math.floor(Math.random() * list.length)];
      api.openProblem(p.id, `mock=${mins}`);
    };
  }

  return { show, hide, isOpen: () => !root.hidden, markWeak: setWeak, courseBar, courseNext };
}
