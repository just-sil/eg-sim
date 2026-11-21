// Problem bank: every problem from the playlist
// "KTU 2024 | MODULE 2 | PROJECTION OF SOLIDS" (Engineering Graphics by Nithin I K).
// All dimensions in mm. See stages.js for the meaning of each field.

export const PLAYLIST = 'https://www.youtube.com/playlist?list=PLbQL6jsbZ8PM4QXlMoOihTQBQloEF1sQq';
export const yt = (id) => `https://www.youtube.com/watch?v=${id}&list=PLbQL6jsbZ8PM4QXlMoOihTQBQloEF1sQq`;

const sqPyr = (side, h) => ({ type: 'pyramid', n: 4, side, h });
const pentPyr = (side, h) => ({ type: 'pyramid', n: 5, side, h });
const sqPrism = (side, h) => ({ type: 'prism', n: 4, side, h });
const cone = (d, h) => ({ type: 'cone', d, h });

export const PROBLEMS = [
  // ---------------- Simple positions ----------------
  {
    id: 'S1', group: 'simple', video: '2EE2zfejcu0', title: 'Square pyramid, base on HP',
    statement: 'Draw the projections of a square pyramid of base edge 30 mm and height 60 mm resting on its base on HP such that one base edge is parallel to VP.',
    frame: 'HP', solid: sqPyr(30, 60), rest: 'base', orient: 'edgeParallel',
  },
  {
    id: 'S2', group: 'simple', video: '2EE2zfejcu0', title: 'Hexagonal prism, base on VP',
    statement: 'A hexagonal prism of base side 30 mm and height 60 mm is resting on one of its hexagonal bases on VP with a rectangular face parallel to HP. Draw the projections.',
    frame: 'VP', solid: { type: 'prism', n: 6, side: 30, h: 60 }, rest: 'base', orient: 'edgeParallel',
  },
  {
    id: 'S3', group: 'simple', video: 'dD_GaM0_jEg', title: 'Cylinder, base on HP',
    statement: 'A cylinder of base circle diameter 40 mm and height 60 mm is resting on HP on its base. Draw the plan and elevation.',
    frame: 'HP', solid: { type: 'cylinder', d: 40, h: 60 }, rest: 'base',
  },
  {
    id: 'S4', group: 'simple', video: 'dD_GaM0_jEg', title: 'Cone, base on VP',
    statement: 'A cone is placed so that its base is touching the VP. Draw the projections of this cone of diameter 50 mm and height 60 mm.',
    frame: 'VP', solid: cone(50, 60), rest: 'base',
  },

  // ---------------- Inclined: change of position ----------------
  {
    id: 'P1', group: 'inclined', video: 'jGu2nsuW_m4', alt: 'JdiKIIdzhIM', title: 'Square prism, base edge on HP',
    statement: 'Draw the projections of a square prism of base edge 30 mm and height 60 mm resting on one of its base edges on HP such that the edge on which it rests is inclined 40° to VP and the axis is inclined 30° to HP.',
    frame: 'HP', solid: sqPrism(30, 60), rest: 'edge',
    stage2: { tilt: 'axis', angle: 30 }, stage3: { type: 'edgeQ', angle: 40 },
  },
  {
    id: 'P2', group: 'inclined', video: 'OGA4wFNZbKs', title: 'Square prism, base edge on VP',
    statement: 'A square prism of base side 30 mm and length 50 mm has a base edge on VP, axis inclined at 35° to VP and the resting base edge inclined at 45° to HP. Draw the projections of the solid.',
    frame: 'VP', solid: sqPrism(30, 50), rest: 'edge',
    stage2: { tilt: 'axis', angle: 35 }, stage3: { type: 'edgeQ', angle: 45 },
  },
  {
    id: 'P3', group: 'inclined', video: '4dQMXxyUSVg', title: 'Pentagonal pyramid, corner on HP (apparent angle)',
    statement: 'A pentagonal pyramid of base edge 30 mm and height 60 mm is resting on one of its base corners on HP such that the axis is inclined 30° to HP and 45° to VP. Draw the projections.',
    frame: 'HP', solid: pentPyr(30, 60), rest: 'corner',
    stage2: { tilt: 'axis', angle: 30 }, stage3: { type: 'axisTrue', angle: 45 },
  },
  {
    id: 'P4', group: 'inclined', video: 'o929xBYlumQ', title: 'Square pyramid, base edge on HP, apex away right',
    statement: 'A square pyramid, base edge 45 mm and height 65 mm, has its axis inclined 45° to HP. Draw its projections if one of its base edges is on HP and is inclined 60° to VP. Assume that the apex is away from VP and on the right side.',
    frame: 'HP', solid: sqPyr(45, 65), rest: 'edge',
    stage2: { tilt: 'axis', angle: 45 }, stage3: { type: 'edgeQ', angle: 60 },
  },
  {
    id: 'P5', group: 'inclined', video: 'WtH1WVCO26Q', title: 'Cone on base-circle point, true angles',
    statement: 'Draw the projections of a cone, base 45 mm diameter and axis 50 mm long, when it is resting on the ground on a point of its base circle with the axis making an angle of 30° with HP and 45° with VP.',
    frame: 'HP', solid: cone(45, 50), rest: 'point',
    stage2: { tilt: 'axis', angle: 30 }, stage3: { type: 'axisTrue', angle: 45 },
  },
  {
    id: 'P6', group: 'inclined', video: 'WtH1WVCO26Q', title: 'Cone on base-circle point, TV of axis given',
    statement: 'Draw the projections of a cone, base 45 mm diameter and axis 50 mm long, when it is resting on the ground on a point of its base circle with the axis making an angle of 30° with HP and its top view making 45° with the reference line.',
    frame: 'HP', solid: cone(45, 50), rest: 'point',
    stage2: { tilt: 'axis', angle: 30 }, stage3: { type: 'axisTV', angle: 45 },
  },
  {
    id: 'P7', group: 'inclined', video: 'rylX06KT8Rg', title: 'Cone on base-circle point on VP',
    statement: 'A cone with base diameter 40 mm and axis 60 mm long touches the VP at a point of its base circle. The axis is inclined at 30° to VP and the front view of its axis is inclined at 45° to the XY line. Draw its projections. (KTU Dec 2019)',
    frame: 'VP', solid: cone(40, 60), rest: 'point',
    stage2: { tilt: 'axis', angle: 30 }, stage3: { type: 'axisTV', angle: 45 },
  },
  {
    id: 'P8', group: 'inclined', video: 'N2tkF_9Xi8Y', title: 'Square pyramid, triangular face on HP',
    statement: 'A square pyramid of base edge 30 mm and height 60 mm is resting on HP on one of its triangular faces such that the square-face edge on HP is inclined 30° to VP. Draw its projections. (KTU Dec 2019)',
    frame: 'HP', solid: sqPyr(30, 60), rest: 'face',
    stage2: { tilt: 'apexOn', element: 'triangular face' }, stage3: { type: 'edgeQ', angle: 30 },
  },
  {
    id: 'P9', group: 'inclined', video: 'x6L2W8F2u44', title: 'Pentagonal prism, base edge on HP',
    statement: 'A pentagonal prism of 30 mm base edge and 60 mm height is on HP on one of its base edges so that the axis is inclined at 45° to HP and the base edge on which it rests is inclined at 30° to VP. Draw the projections of the solid. (KTU Dec 2020)',
    frame: 'HP', solid: { type: 'prism', n: 5, side: 30, h: 60 }, rest: 'edge',
    stage2: { tilt: 'axis', angle: 45 }, stage3: { type: 'edgeQ', angle: 30 },
  },
  {
    id: 'P10', group: 'inclined', video: 'kPjsTbh0lgE', title: 'Square pyramid, corner on HP (θ+φ > 90°)',
    statement: 'A square pyramid of base 25 mm side and axis 60 mm long has a corner of the base on the ground such that the square base is inclined at 30° to the ground and the two base edges containing that corner are equally inclined to HP. Draw the projections of the pyramid if its axis is inclined at 60° to the VP. (KTU July 2021)',
    frame: 'HP', solid: sqPyr(25, 60), rest: 'corner',
    stage2: { tilt: 'base', angle: 30 }, stage3: { type: 'axisTV', angle: 60 },
    notes: [
      'The base at 30° to HP makes the axis 60° to HP. A true angle of 60° to VP would make θ + φ = 120° > 90°, which is impossible, so the third stage cannot use a true angle. As in the video, the 60° is applied to the top view of the axis with XY.',
    ],
  },
  {
    id: 'P11', group: 'inclined', video: 'zzSbGoy3kO4', title: 'Cylinder on base-circle point on VP',
    statement: 'A cylinder of 40 mm diameter and 50 mm axis is resting on a point of its base circle on VP while its axis makes 45° with VP and the front view of the axis makes 35° with the XY line. Draw its projections. (KTU July 2021)',
    frame: 'VP', solid: { type: 'cylinder', d: 40, h: 50 }, rest: 'point',
    stage2: { tilt: 'axis', angle: 45 }, stage3: { type: 'axisTV', angle: 35 },
  },
  {
    id: 'P12', group: 'inclined', video: 'qDg6xT4xY3Y', title: 'Square pyramid freely suspended from a corner',
    statement: 'A square pyramid of base 40 mm side and axis 60 mm long is freely suspended from one of the corners of its base. Draw its projections when the axis makes an angle of 50° with the VP. (KTU Dec 2020)',
    frame: 'HP', solid: sqPyr(40, 60), rest: 'suspend',
    stage2: { tilt: 'suspend' }, stage3: { type: 'axisTrue', angle: 50 },
    notes: ['A freely suspended body hangs with its centre of gravity vertically below the point of suspension. For a pyramid, G is on the axis at h/4 from the base.'],
  },
  {
    id: 'P13', group: 'inclined', video: 'QJkcTNDAppc', title: 'Tetrahedron on an edge',
    statement: 'A tetrahedron of edge 35 mm is lying on the HP on one of its edges, such that the triangular face containing the resting edge is inclined at 30° to the HP and the resting edge is inclined at 50° to the VP. Draw its projections. (KTU June 2024)',
    frame: 'HP', solid: { type: 'tetra', side: 35 }, rest: 'edge',
    stage2: { tilt: 'base', angle: 30 }, stage3: { type: 'edgeQ', angle: 50 },
    notes: ['A tetrahedron is a triangular pyramid with all six edges equal. Its height is √(2/3) × edge = 28.6 mm. Use the face containing the resting edge as the base in stage 1.'],
  },
  {
    id: 'P14', group: 'inclined', video: 'sx2gGtx2wtE', title: 'Square prism, face at 40°, TV of axis 30°',
    statement: 'A square prism of base edge 30 mm and axis length 60 mm is resting on HP on one of its base edges such that the rectangular face containing the resting edge makes an angle of 40° with the HP. Draw its projections if the top view of the axis makes 30° with the VP. (KTU June 2024)',
    frame: 'HP', solid: sqPrism(30, 60), rest: 'edge',
    stage2: { tilt: 'axis', angle: 40, face: 'rectangular face containing the resting edge' }, stage3: { type: 'axisTV', angle: 30 },
  },
  {
    id: 'P15', group: 'inclined', video: 'yyVa_g5ILmk', title: 'Square prism, base edge on VP',
    statement: 'A square prism of base 30 mm and length 60 mm has a base edge on VP, axis inclined at 30° to VP and the resting base edge inclined at 40° to HP. Draw the projections of the solid. (KTU June 2024)',
    frame: 'VP', solid: sqPrism(30, 60), rest: 'edge',
    stage2: { tilt: 'axis', angle: 30 }, stage3: { type: 'edgeQ', angle: 40 },
  },
  {
    id: 'P16', group: 'inclined', video: 'Qb5sVgEeWoc', title: 'Cone on a generator, TV of axis 30°',
    statement: 'Draw the projections of a cone of base diameter 50 mm and height 50 mm resting on HP on its generator with the top view of the axis inclined 30° to VP. (KTU June 2024)',
    frame: 'HP', solid: cone(50, 50), rest: 'generator',
    stage2: { tilt: 'apexOn', element: 'generator' }, stage3: { type: 'axisTV', angle: 30 },
  },
  {
    id: 'P17', group: 'inclined', video: 'FNNHmyrVZBc', title: 'Rectangular prism, longer base edge on VP',
    statement: 'A rectangular prism of base 25 × 35 mm and height 50 mm is resting on VP on one of its longer base edges. Draw the projections when its axis is inclined at 35° to VP and the base edge resting on VP is inclined at 45° to HP. Assume that the end face visible in the front view is away from HP and on the right of the viewer. (KTU Dec 2022)',
    frame: 'VP', solid: { type: 'prism', rect: [25, 35], h: 50 }, rest: 'edge',
    stage2: { tilt: 'axis', angle: 35 }, stage3: { type: 'edgeQ', angle: 45 },
  },
  {
    id: 'P18', group: 'inclined', video: 'w3WIBbIdZ-I', title: 'Pentagonal pyramid, corner on HP, apex away right',
    statement: 'Draw the projections of a pentagonal pyramid of 30 mm base side and 65 mm long axis resting on one of the corners of its base on HP. The axis is inclined at 30° to HP and the top view of the axis is inclined at 35° to the XY line. The apex is away from VP and on the right of the viewer. (KTU Dec 2022)',
    frame: 'HP', solid: pentPyr(30, 65), rest: 'corner',
    stage2: { tilt: 'axis', angle: 30 }, stage3: { type: 'axisTV', angle: 35 },
  },
  {
    id: 'P19', group: 'inclined', video: 'kSFKuHQOVOk', title: 'Pentagonal pyramid, base edge on VP',
    statement: 'A pentagonal pyramid of base edge 30 mm and axis length 60 mm is resting on VP on one of its base edges. The axis of the pyramid is inclined at 35° to VP and the resting base edge is inclined at 45° to HP. Draw the projections of the pyramid. (KTU Dec 2021)',
    frame: 'VP', solid: pentPyr(30, 60), rest: 'edge',
    stage2: { tilt: 'axis', angle: 35 }, stage3: { type: 'edgeQ', angle: 45 },
  },
  {
    id: 'P20', group: 'inclined', video: 'MxiKvA-Ws9g', title: 'Cone on base-circle point, 45° HP & 40° VP',
    statement: 'A right circular cone, 40 mm base diameter and 60 mm long axis, is resting on HP on one point of its base circle such that its axis makes 45° with HP and 40° with VP. Draw its projections.',
    frame: 'HP', solid: cone(40, 60), rest: 'point',
    stage2: { tilt: 'axis', angle: 45 }, stage3: { type: 'axisTrue', angle: 40 },
  },
  {
    id: 'P21', group: 'inclined', video: '4RvATwhHDUo', title: 'Hexagonal pyramid, slant edge on ground',
    statement: 'A hexagonal pyramid, base 25 mm side and axis 55 mm long, has one of its slant edges on the ground. A plane containing that edge and the axis is perpendicular to HP and inclined at 45° to VP. Draw its projections when the apex is nearer the VP than the base.',
    frame: 'HP', solid: { type: 'pyramid', n: 6, side: 25, h: 55 }, rest: 'slantEdge', near: 'apex',
    stage2: { tilt: 'apexOn', element: 'slant edge' }, stage3: { type: 'plane', angle: 45 },
  },
  {
    id: 'P22', group: 'inclined', video: 'sTiaTVOtyxY', title: 'Pentagonal pyramid, triangular face on ground',
    statement: 'A pentagonal pyramid, base 30 mm side and height 80 mm, has a triangular face on the ground and the vertical plane containing the axis makes an angle of 30° with VP. Draw the projections of the solid. (KTU Dec 2023)',
    frame: 'HP', solid: pentPyr(30, 80), rest: 'face',
    stage2: { tilt: 'apexOn', element: 'triangular face' }, stage3: { type: 'plane', angle: 30 },
  },
  {
    id: 'P23', group: 'inclined', video: 'yGOwFFJB4Rg', title: 'Cone on a generator, plane at 60° to VP',
    statement: 'A cone of base 50 mm diameter and axis 75 mm long has one of its generators on the HP. A plane containing that generator and the axis is perpendicular to the HP and inclined at 60° to the VP. Draw the projections of the cone when the base is nearer to the VP than the apex. (KTU Dec 2023)',
    frame: 'HP', solid: cone(50, 75), rest: 'generator', near: 'base',
    stage2: { tilt: 'apexOn', element: 'generator' }, stage3: { type: 'plane', angle: 60 },
  },
  {
    id: 'P24', group: 'inclined', video: '_7hN0sf4PLA', title: 'Hexagonal prism, base edge on HP',
    statement: 'A hexagonal prism of base edge 25 mm and height 60 mm is resting on one of its base edges on HP. Draw its projections if the rectangular face carrying that base edge is inclined 35° to HP and the base edge on which it rests is inclined 40° to VP. (KTU June 2023)',
    frame: 'HP', solid: { type: 'prism', n: 6, side: 25, h: 60 }, rest: 'edge',
    stage2: { tilt: 'axis', angle: 35, face: 'rectangular face carrying the resting edge' }, stage3: { type: 'edgeQ', angle: 40 },
  },
  {
    id: 'P25', group: 'inclined', video: 'mEE5sf5zR7o', alt: '23RFZNvai24', title: 'Triangular pyramid, corner on HP, slant edge 30°',
    statement: 'Draw the projections of a triangular pyramid of 35 mm base side and 65 mm height resting on one of the corners of its base on HP, with the slant edge containing that base corner making an angle of 30° with HP and the top view of the axis making an angle of 45° with the XY line. (Also 2024 model QP, Q4)',
    frame: 'HP', solid: { type: 'pyramid', n: 3, side: 35, h: 65 }, rest: 'corner',
    stage2: { tilt: 'slantEdge', angle: 30 }, stage3: { type: 'axisTV', angle: 45 },
  },
  {
    id: 'P26', group: 'inclined', video: 'lUVQrc7JKac', title: 'Cone on a generator, plane at 45° to VP',
    statement: 'A cone of base 40 mm diameter and axis 70 mm long has one of its generators on the HP. A plane containing that generator and the axis is perpendicular to HP and inclined at 45° to the VP. Draw the projections when the base is nearer to the VP than the vertex. (2024 model QP, Q3)',
    frame: 'HP', solid: cone(40, 70), rest: 'generator', near: 'base',
    stage2: { tilt: 'apexOn', element: 'generator' }, stage3: { type: 'plane', angle: 45 },
  },
];

// "Pick the first stage" drills (videos 4 & 5): only stage 1 of an inclined problem.
for (const [id, src] of [['S5', 'P1'], ['S6', 'P3'], ['S7', 'P5'], ['S8', 'P9'], ['S9', 'P8'], ['S10', 'P2']]) {
  const p = PROBLEMS.find((q) => q.id === src);
  PROBLEMS.push({
    ...p, id, group: 'first', onlyStages: 1, video: src === 'P5' ? 'y0Pt9EuPm5s' : '9DU3dkEODnc',
    title: `First stage only: ${p.title}`,
    statement: `${p.statement}\n\nOnly draw the FIRST stage (the correct simple position) for this problem.`,
    sourceId: src,
  });
}

export const CONCEPTS = [
  {
    id: 'C1', video: 'mT22gALl1Uk', title: 'What is a solid? Types of solids',
    html: `
<p>A <b>solid</b> is a three-dimensional object with length, breadth and thickness, completely bounded by plane or curved surfaces. We describe it with orthographic views, usually on HP and VP (a side view is added when needed). Every solid is just a set of points, lines and planes, so projecting a solid comes down to projecting those.</p>
<h4>Polyhedra</h4>
<p>Polyhedra are bounded by plane <b>faces</b> that meet in straight <b>edges</b>. Examples: prism, pyramid, tetrahedron, cube (hexahedron), octahedron, dodecahedron, icosahedron.</p>
<ul>
<li><b>Prism</b>: two equal, parallel end faces (bases) joined by rectangular faces. Named by the shape of the base: triangular, square, pentagonal, hexagonal.</li>
<li><b>Pyramid</b>: a polygonal base and triangular faces meeting at the <b>apex</b> (vertex).</li>
<li><b>Tetrahedron</b>: four equal equilateral-triangle faces.</li>
</ul>
<h4>Solids of revolution</h4>
<ul>
<li><b>Cylinder</b>: a rectangle revolved about one of its sides.</li>
<li><b>Cone</b>: a right-angled triangle revolved about one of its perpendicular sides. Divide the base circle into 8 or 12 equal parts to draw the <b>generators</b>.</li>
<li>Sphere, ellipsoid, paraboloid, hyperboloid.</li>
</ul>
<h4>Terms</h4>
<ul>
<li><b>Axis</b>: the imaginary line joining the base centres (prism, cylinder), or the apex and base centre (pyramid, cone).</li>
<li><b>Right</b> solid: the axis is perpendicular to the base. <b>Regular</b> solid: the base is a regular polygon.</li>
<li><b>Frustum</b>: the part left when a pyramid or cone is cut by a plane parallel to its base and the top is removed. <b>Truncated</b>: the same, but the cutting plane is inclined to the base.</li>
</ul>`,
    demos: ['prism4', 'prism6', 'pyramid5', 'tetra', 'cylinder', 'cone'],
  },
  {
    id: 'C2', video: '2EE2zfejcu0', title: 'Simple positions',
    html: `
<p>A solid is in a <b>simple position</b> when its axis is <b>perpendicular to a reference plane</b> (HP, VP or PP). From Module 2 onwards the object is always in the first quadrant: <b>TV below XY, FV above XY</b>.</p>
<ul>
<li><b>Axis ⟂ HP</b> (base on HP): the TV is the true shape of the base. Draw it first, then project up to get the FV.</li>
<li><b>Axis ⟂ VP</b> (base on VP): the FV is the true shape. Draw it first, then project down.</li>
<li><b>Axis ⟂ PP</b>: the side view is the true shape.</li>
</ul>
<p>Line conventions: <b>thick</b> for visible edges, <b>dashed</b> for hidden edges, <b>chain</b> (long dash, short dash) for the axis, <b>thin</b> for construction and projectors.</p>
<p>Try S1–S4.</p>`,
  },
  {
    id: 'C3', video: 'y0Pt9EuPm5s', alt: '9DU3dkEODnc', title: 'Choosing the first stage (axis inclined)',
    html: `
<p>When the axis is inclined, solve the problem in stages (the <b>change-of-position method</b>). Getting stage 1 right is crucial: a wrong simple position makes the whole answer wrong.</p>
<ul>
<li>Axis inclined to <b>HP</b> → stage 1 has the axis <b>⟂ HP</b> (TV first).</li>
<li>Axis inclined to <b>VP</b> → stage 1 has the axis <b>⟂ VP</b> (FV first).</li>
<li>Axis inclined to <b>both</b> → start with the axis ⟂ the plane it rests on, or whose inclination is given first.</li>
</ul>
<h4>How to orient the base in stage 1</h4>
<ul>
<li><b>Resting on a base edge</b> → keep that edge <b>perpendicular to XY</b>, so it is ⟂ the other plane and can act as the hinge.</li>
<li><b>Resting on a base corner</b> → keep the corner on the centre line <b>parallel to XY</b>. For a square, the two edges at that corner are then equally inclined.</li>
<li><b>Triangular face / slant edge / generator on the plane</b> → also start with the base on the plane and orient by the edge or corner of that face or edge.</li>
<li><b>Cylinder / cone</b> → divide the circle into 12 and rest on point 1, at the end of the centre line ∥ XY.</li>
</ul>
<p>Practise with S5–S10, where you only draw stage 1.</p>`,
  },
  {
    id: 'C4', video: 'ofgWZej8xLg', title: 'Types of second stage',
    html: `
<p>Stage 2 tilts the stage-1 view about the resting edge, corner or point. Every length stays the same; only the position changes. The possible conditions:</p>
<ol>
<li><b>Axis at θ to the plane</b>: tilt until the axis makes θ with XY.</li>
<li><b>Base at θ to the plane</b>: tilt until the base makes θ with XY (axis at 90° − θ).</li>
<li><b>Rectangular face (containing the axis direction) at θ</b>: same as the axis at θ.</li>
<li><b>Triangular face on the plane</b>: tilt until that face line lies on XY.</li>
<li><b>Slant edge or generator on the plane</b>: tilt until that edge or generator lies on XY.</li>
<li><b>Slant edge at θ</b>: tilt until the slant edge through the resting corner makes θ with XY.</li>
<li><b>Freely suspended</b>: tilt until the line from the point of suspension to the centre of gravity G is vertical (G at h/2 for prisms and cylinders, h/4 for pyramids and cones).</li>
</ol>
<h4>Stage 3</h4>
<ul>
<li>A resting edge at φ to the other plane: that edge lies on the plane, so draw it at φ to XY directly.</li>
<li>The TV (or FV) of the axis at β to XY, or the plane containing the axis at φ: draw it at that angle directly.</li>
<li>The axis at a <b>true angle</b> φ to the other plane: find the <b>apparent angle β</b> first with the arc + locus construction (sin β = sin φ / cos θ). This needs θ + φ ≤ 90°.</li>
</ul>`,
  },
];
