// Module 3 problem bank, from the playlist
// "KTU 2024 | MODULE 3 | SECTION OF SOLIDS & DEVELOPMENT OF SURFACES" (Engineering Graphics by Nithin I K).
// Problems where the true shape is given (the 2019 scheme's "find the plane" questions) are
// excluded from the 2024 scheme and are left out. All dimensions in mm; see section.js.
export const PLAYLIST3 = 'https://www.youtube.com/playlist?list=PLbQL6jsbZ8PM-hQtvy7KPfhJejOJVAG6N';
export const yt3 = (id) => `https://www.youtube.com/watch?v=${id}&list=PLbQL6jsbZ8PM-hQtvy7KPfhJejOJVAG6N`;

const pyr = (n, side, h) => ({ type: 'pyramid', n, side, h });
const prism = (n, side, h) => ({ type: 'prism', n, side, h });
const cone = (d, h) => ({ type: 'cone', d, h });
const cyl = (d, h) => ({ type: 'cylinder', d, h });

export const PROBLEMS3 = [
  // ---------------- Section of solids ----------------
  {
    id: 'X1', group: 'section', video: 'PDBDgkHcvWM', title: 'Square pyramid, horizontal section',
    statement: 'A square pyramid of base edge 30 mm and height 60 mm rests on its base on HP with one base edge perpendicular to VP. It is cut by a horizontal section plane 20 mm below the apex. Draw the front view and the sectional top view.',
    solid: pyr(4, 30, 60), orient: 'edge', cut: { type: 'H', z: 40 },
  },
  {
    id: 'X2', group: 'section', video: 'E7s_pzm5OO4', title: 'Square prism, vertical section ∥ VP',
    statement: 'A square prism of base edge 35 mm and height 70 mm rests on its base on HP with two base edges equally inclined to VP. It is cut by a vertical section plane, perpendicular to HP and parallel to VP, 10 mm in front of the axis. Draw the top view and the sectional front view.',
    solid: prism(4, 35, 70), orient: 'corner', cut: { type: 'V', dist: 10 },
  },
  {
    id: 'X3', group: 'section', video: 'HLFNJzfusU0', title: 'Pentagonal pyramid, AIP bisecting the axis',
    statement: 'A pentagonal pyramid of base edge 30 mm and height 60 mm rests on its base on HP with one base edge perpendicular to VP. It is cut by a section plane inclined at 30° to HP and perpendicular to VP, bisecting the axis. Draw the front view, the sectional top view and the true shape of the section.',
    solid: pyr(5, 30, 60), orient: 'edge', cut: { type: 'AIP', angle: 30, z: 30 },
  },
  {
    id: 'X4', group: 'section', video: 'ZBMHDukmFCE', title: 'Pentagonal pyramid (edge ∥ VP), AIP',
    statement: 'A pentagonal pyramid of base edge 30 mm and height 60 mm rests on its base on HP with one base edge parallel to VP. An auxiliary inclined plane inclined at 30° to HP cuts it, meeting the axis 25 mm from the vertex. Draw the elevation, the sectional plan and the true shape of the section.',
    solid: pyr(5, 30, 60), orient: 'edgeParallel', cut: { type: 'AIP', angle: 30, z: 35 },
  },
  {
    id: 'X5', group: 'section', video: 'ck6TYGi-ajg', title: 'Cone, auxiliary vertical plane',
    statement: 'A cone of base diameter 50 mm and axis 65 mm rests on its base on HP. It is cut by a vertical section plane inclined at 45° to VP and 10 mm away from the axis. Draw the sectional front view and the true shape of the section.',
    solid: cone(50, 65), cut: { type: 'AVP', angle: 45, dist: 10 },
  },
  {
    id: 'X6', group: 'section', video: 'Jh21TsqIlMo', title: 'Cone, plane parallel to a generator',
    statement: 'A cone of base diameter 50 mm and axis 65 mm rests on its base on HP. It is cut by a section plane perpendicular to VP and parallel to the right extreme generator in the front view, 10 mm away from it. Draw the front view, the sectional top view and the true shape of the section.',
    solid: cone(50, 65), cut: { type: 'gen', offset: 10 },
  },
  {
    id: 'X7', group: 'section', video: 'IJ4WNokK1Ys', title: 'Square prism (face 30° to VP), AIP 45°',
    statement: 'A square prism of base side 40 mm and axis 60 mm rests on its base on HP with one of its vertical faces inclined at 30° to VP. It is cut by a section plane perpendicular to VP and inclined at 45° to HP, passing through the axis 20 mm below the top end. Draw the front view, the sectional top view and the true shape of the section.',
    solid: prism(4, 40, 60), orient: 'edgeParallel', rot: 30, rotWhat: 'one vertical face', cut: { type: 'AIP', angle: 45, z: 40 },
  },
  {
    id: 'X8', group: 'section', video: 'SblC14_XCWQ', title: 'Pentagonal pyramid, plane at 60° to the axis',
    statement: 'A pentagonal pyramid of base side 25 mm and height 70 mm rests on its base on the ground with one base side parallel to VP. It is cut by a section plane perpendicular to VP, passing through a point on the axis 25 mm below the apex and inclined at 60° to the axis. Draw the front view, the sectional top view and the true shape of the section.',
    solid: pyr(5, 25, 70), orient: 'edgeParallel', cut: { type: 'AIP', angle: 30, z: 45 },
    notes: ['60° to the axis means 90° − 60° = 30° to HP, because the axis is vertical.'],
  },
  {
    id: 'X9', group: 'section', video: 'JRdfZzkY4Cw', title: 'Hexagonal pyramid, plane 45° to VP',
    statement: 'A hexagonal pyramid of base side 30 mm and axis 70 mm rests on its base on HP with one base edge inclined at 30° to VP. It is cut by a section plane inclined at 45° to VP and perpendicular to HP, 10 mm in front of the axis. Draw the top view, the sectional front view and the true shape of the section.',
    solid: pyr(6, 30, 70), orient: 'edgeParallel', rot: 30, cut: { type: 'AVP', angle: 45, dist: 10 },
  },
  {
    id: 'X10', group: 'section', video: 'hFLvjUuvKt8', title: 'Cylinder, plane through the top of the axis',
    statement: 'A cylinder of base diameter 60 mm and axis 70 mm rests on its base on HP. It is cut by a section plane inclined at 60° to HP and perpendicular to VP, passing through the top end of the axis. Draw the front view, the sectional top view and the true shape of the section.',
    solid: cyl(60, 70), cut: { type: 'AIP', angle: 60, z: 70 },
  },
  {
    id: 'X11', group: 'section', video: 'scK0deDady4', title: 'Hexagonal prism, AIP 30° rising right',
    statement: 'A hexagonal prism of base side 35 mm and height 65 mm rests on its base on HP with one base edge parallel to VP. It is cut by a section plane inclined at 30° to HP towards the right, perpendicular to VP, meeting the axis 45 mm above the base. Draw the front view, the sectional top view and the true shape of the section.',
    solid: prism(6, 35, 65), orient: 'edgeParallel', cut: { type: 'AIP', angle: 30, z: 45 },
  },
  {
    id: 'X12', group: 'section', video: 'o4iIU4lxHvU', title: 'Square prism, AIP 60° near the top',
    statement: 'A square prism of base side 30 mm and height 75 mm rests on its base on HP with two of its rectangular faces equally inclined to VP. It is cut by a section plane perpendicular to VP and inclined at 60° to HP, meeting the axis 15 mm below the top. Draw the elevation, the sectional plan and the true shape of the section.',
    solid: prism(4, 30, 75), orient: 'corner', cut: { type: 'AIP', angle: 60, z: 60 },
  },
  {
    id: 'X13', group: 'section', video: '64GtGveOi3I', title: 'Hexagonal pyramid, AIP cutting the base',
    statement: 'A hexagonal pyramid of base edge 30 mm and axis 70 mm rests on its base on HP with two base edges parallel to VP. It is cut by a section plane perpendicular to VP and inclined at 45° to HP, through a point on the axis 15 mm above the base. Draw the front view, the sectional top view and the true shape of the section.',
    solid: pyr(6, 30, 70), orient: 'edgeParallel', cut: { type: 'AIP', angle: 45, z: 15 },
    notes: ['This plane also cuts the base, so the section has a straight side lying on the base.'],
  },

  // ---------------- Development of surfaces ----------------
  {
    id: 'D1', group: 'develop', video: 'uXir15z9nXA', title: 'Pentagonal prism',
    statement: 'Draw the development of the lateral surface of a pentagonal prism of base edge 20 mm and height 70 mm, resting on its base on the ground with one base edge parallel to VP.',
    solid: prism(5, 20, 70), orient: 'edgeParallel', develop: true,
  },
  {
    id: 'D2', group: 'develop', video: 'hJcoMTaXbpE', title: 'Cylinder',
    statement: 'Draw the development of the lateral surface of a cylinder of diameter 50 mm and height 60 mm resting on its base on HP.',
    solid: cyl(50, 60), develop: true,
  },
  {
    id: 'D3', group: 'develop', video: 'dmqaEAIO4Hw', title: 'Cone',
    statement: 'A cone of base diameter 50 mm and height 60 mm rests on its base on HP. Draw the development of its lateral surface.',
    solid: cone(50, 60), develop: true,
  },
  {
    id: 'D4', group: 'develop', video: 'LugSsp0iN84', title: 'Square pyramid',
    statement: 'Draw the development of the lateral surface of a square pyramid of base side 30 mm and altitude 60 mm, resting vertically on its base on the ground with two sides of the base perpendicular to VP.',
    solid: pyr(4, 30, 60), orient: 'edge', develop: true,
  },
  {
    id: 'D5', group: 'develop', video: '7LqWtsUEQ58', title: 'Truncated pentagonal prism',
    statement: 'A pentagonal prism of base side 30 mm and axis 70 mm rests on its base on HP with one rectangular face parallel to VP. It is cut by an auxiliary inclined plane inclined at 45° to HP, passing through the midpoint of the axis. Draw the sectional top view and the development of the lateral surface of the truncated prism.',
    solid: prism(5, 30, 70), orient: 'edgeParallel', cut: { type: 'AIP', angle: 45, z: 35 }, develop: true,
  },
  {
    id: 'D6', group: 'develop', video: 'pOki9Jg8Z58', title: 'Truncated cylinder',
    statement: 'A cylinder of diameter 50 mm and axis 70 mm rests on its base on HP. It is cut by a section plane inclined at 40° to HP and perpendicular to VP, bisecting the axis. Draw the development of the lower portion.',
    solid: cyl(50, 70), cut: { type: 'AIP', angle: 40, z: 35 }, develop: true,
  },
  {
    id: 'D7', group: 'develop', video: 'CWEOrpZ3XY8', title: 'Truncated cone',
    statement: 'A cone of base diameter 50 mm and axis 70 mm rests on its base on HP. It is cut by a section plane inclined at 45° to HP and perpendicular to VP, bisecting the axis. Draw the sectional top view and the development of the lateral surface of the remaining part.',
    solid: cone(50, 70), cut: { type: 'AIP', angle: 45, z: 35 }, develop: true,
  },
  {
    id: 'D8', group: 'develop', video: 'JORjSCqCG8U', title: 'Truncated square pyramid',
    statement: 'A square pyramid of base side 40 mm and height 60 mm rests on its base on HP with one base edge parallel to VP. It is cut by a section plane perpendicular to VP and inclined at 45° to HP, bisecting the axis. Draw the development of the remaining part of the pyramid.',
    solid: pyr(4, 40, 60), orient: 'edgeParallel', cut: { type: 'AIP', angle: 45, z: 30 }, develop: true,
  },
  {
    id: 'D9', group: 'develop', video: 'PBpqg1LHEo8', title: 'Shortest path: ant on a hexagonal prism',
    statement: 'A hexagonal prism of base edge 25 mm and height 60 mm rests on its base on HP with one base edge parallel to VP. An ant moves on its surface from a corner of the bottom base to the diametrically opposite corner of the top base by the shortest route. Show the path of the ant in the elevation.',
    solid: prism(6, 25, 60), orient: 'edgeParallel', path: { type: 'ant', views: ['FV'] },
    notes: ['The ant crosses half the lateral surface: three faces. On the development this is a straight line across 3 × 25 = 75 mm and up 60 mm.'],
  },
  {
    id: 'D10', group: 'develop', video: 'o8Bn_gKEddc', title: 'Shortest path: insect around a cone',
    statement: 'A right circular cone of base diameter 60 mm and height 64 mm rests on its base on HP. An insect starts from the extreme left point of the base circle, moves round the curved surface and comes back to the same point by the shortest path. Show the path in the front and top views.',
    solid: cone(60, 64), path: { type: 'loop', views: ['FV', 'TV'] },
    notes: ['Develop the cone with the seam through the starting point. The path is the straight chord joining the two ends of the sector.'],
  },
  {
    id: 'D11', group: 'develop', video: 'WPOlpHDC6ZM', title: 'Square prism with a circular hole',
    statement: 'A square prism of base side 40 mm and height 60 mm rests on its base on HP with its vertical faces equally inclined to VP. A horizontal hole of diameter 40 mm is drilled through it so that the axis of the hole passes through the centre of the prism and is perpendicular to VP. Develop the lateral surface of the prism.',
    solid: prism(4, 40, 60), orient: 'corner', hole: { d: 40, z: 30 }, develop: true,
  },
];

export const CONCEPTS3 = [
  {
    id: 'C5', video: 'XsSNRCSRAoE', alt: 'e5dFN-QGwqE', title: 'Section of solids: the idea and the planes', group: 'concept3',
    html: `
<p>A solid is imagined cut by a <b>section plane</b>. The part between you and the plane is removed, so you see the cut face. The cut face is the <b>section</b>. It is drawn <b>hatched</b>: thin lines at 45°, about 3 mm apart.</p>
<h4>The section planes in the syllabus</h4>
<ul>
<li><b>Horizontal plane</b> (∥ HP): its VT is a horizontal line. The sectional top view <b>is</b> the true shape.</li>
<li><b>Vertical plane</b> (∥ VP): its HT is a horizontal line in the TV. The sectional front view is the true shape.</li>
<li><b>Auxiliary inclined plane, AIP</b> (⟂ VP, inclined to HP): seen as a line (VT) in the FV. The top view is foreshortened, so the true shape is drawn on x₁y₁ ∥ VT.</li>
<li><b>Auxiliary vertical plane, AVP</b> (⟂ HP, inclined to VP): seen as a line (HT) in the TV. The true shape is drawn on x₁y₁ ∥ HT.</li>
<li>A plane ∥ the profile plane: the side view shows the true shape.</li>
</ul>
<h4>How every problem goes</h4>
<ol>
<li>Draw the full solid (TV first: it shows the base's true shape; then the FV).</li>
<li>Draw the plane as a line in the view where it is edge-on (VT or HT). Number where it cuts every edge or generator.</li>
<li>Project those points to the other view on the same edges. Join, draw only the remaining part, hatch.</li>
<li>True shape: x₁y₁ parallel to the VT/HT; perpendiculars from the points; transfer the distances from XY.</li>
</ol>
<h4>Shapes worth recognising (cone)</h4>
<ul>
<li>Plane through the apex: triangle. ∥ base: circle. Cutting all generators: ellipse.</li>
<li>∥ a generator: parabola. ∥ the axis (or steeper than the generators): hyperbola.</li>
</ul>
<p class="small muted">From the playlist intro: in the 2024 scheme, problems where the true shape is given and you have to find the plane are not included.</p>`,
  },
  {
    id: 'C6', video: 'qFhvs0-7z2U', alt: 'jz6fDgnn-7Y', title: 'Development of surfaces: the idea', group: 'concept3',
    html: `
<p>The <b>development</b> of a surface is that surface unrolled flat, like a paper pattern you could cut out and fold. Every line on it is <b>true length</b>.</p>
<h4>Two methods</h4>
<ul>
<li><b>Parallel-line method</b>: prisms and cylinders. The development is a rectangle. Length = perimeter (n × side, or πd), height = h. The edges or generators are parallel vertical lines.</li>
<li><b>Radial-line method</b>: pyramids and cones. The development is a sector centred at the apex with radius = <b>true length</b> of the slant edge or generator.
  <ul><li>Cone: L = √(h² + r²), sector angle θ = 360° × r / L.</li>
  <li>Pyramid: true slant edge = √(h² + R²) (R = centre to corner). Step off the base side n times as chords.</li></ul></li>
</ul>
<h4>Cut (truncated) solids</h4>
<ul>
<li>Prism/cylinder: project each cut point <b>horizontally</b> from the FV to its line in the development. Heights don't change.</li>
<li>Pyramid/cone: lines in the FV are not true length. Move each cut point <b>horizontally to the true-length line</b> (the extreme edge or generator), then measure from the apex.</li>
<li>Join with straight lines for flat faces, a smooth curve for curved surfaces. Outline thick, fold lines thin.</li>
</ul>
<h4>Shortest path</h4>
<p>On a development the shortest path between two points is a straight line. Draw it there, then carry the points where it crosses each fold line back to the views.</p>`,
  },
];
