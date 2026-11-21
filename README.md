# EG Sim: Projection of Solids playground

A drafting playground for **KTU Engineering Graphics, Module 2: Projection of Solids**. It includes every problem from the playlist
[KTU 2024 | Module 2 | Projection of Solids](https://www.youtube.com/playlist?list=PLbQL6jsbZ8PM4QXlMoOihTQBQloEF1sQq) (Engineering Graphics by Nithin I K).

## Run

```bash
python3 -m http.server 8000      # or: npm start
# open http://localhost:8000
```

No build step. three.js loads from cdnjs for the 3D view; everything else is plain ES modules.

## What's inside

| | |
|---|---|
| **Problem bank** | 4 concept cards, 4 simple-position problems, 6 "choose the first stage" drills, and 26 axis-inclined problems (all KTU exam questions from the playlist), each linked to its video. |
| **Drafting sheet** | XY line, mm grid, BIS line types (thick / dashed / chain / thin). Tools: line, polyline, regular polygon, circle, compass arc, smooth curve (for ellipses), projectors, angle line, parallel and perpendicular lines, divide circle into 12, rotate-copy, move-copy, measure, label, erase, undo/redo. |
| **Exact input** | While drawing, type `30` (length), `30<45` (length at an angle), `@dx,dh` (relative) or `x,h` (absolute). Shift snaps to 15°. Snaps to end points, intersections, midpoints and guide points. |
| **Hints** | Progressive hints generated from the problem: resting element → stage-1 orientation → stage-2 condition → stage-3 condition, plus notes for the tricky questions. |
| **Step-by-step** | Every construction step is drawn as a ghost overlay (current step in orange) that you can trace over. This includes projectors, the centre of gravity for suspended solids, and the arc + locus construction for the apparent angle β. |
| **Check** | Compares your drawing with the computed solution. You get a score per stage and view, and lines are marked correct, wrong line type, extra or missing. Each view may sit anywhere along XY or be mirrored. |
| **3D view** | The solid at each stage between HP and VP, with its FV and TV drawn on the planes. Drag to orbit. |
| **Random practice** | 🎲 builds new solvable problems from the same engine. |

Keyboard: `V` select · `L` line · `O` polyline · `G` polygon · `C` circle · `A` arc · `S` curve · `J`/`H` projectors · `N` angle line · `K` parallel · `U` perpendicular · `D` divide · `R` rotate copy · `M` move copy · `Q` measure · `T` label · `E` erase · `1–4` line type · `F` fit · `Space`-drag to pan · wheel to zoom · `Ctrl+Z / Ctrl+Y`.

URL shortcuts: `#P3`, `#P3?step=4`, `#P3?solution`, `#P3?tab=3d`.

## How it works

Answers are computed, not hand-drawn. `js/stages.js` takes a problem description and applies the
**change-of-position method**:

1. **Stage 1**: simple position with the base on HP (or VP) and the resting edge/corner placed as taught.
2. **Stage 2**: tilt about the resting element. The condition can be the axis angle, base angle, face/slant edge/generator on the plane, slant-edge angle, or freely suspended.
3. **Stage 3**: rotate about a vertical axis. The condition can be the edge angle, the TV of the axis, the plane containing the axis, or a true angle via the apparent angle β (sin β = sin φ / cos θ).

VP problems are solved as HP problems and mirrored (x, y, z) → (x, z, y). `js/projector.js` projects each
stage in first-angle projection. Because every solid here is convex, an edge is visible if any face next to it faces the viewer.

```
js/geometry.js   vector helpers
js/solids.js     prisms, pyramids, tetrahedron, cylinder, cone
js/stages.js     solver + overlay groups + hints/steps text
js/projector.js  FV/TV projection, hidden lines, labels
js/problems.js   problem bank + concept cards
js/checker.js    drawing ↔ solution matching
js/editor.js     SVG drafting editor
js/view3d.js     three.js view
js/generator.js  random problems
js/app.js        UI wiring
```

## Tests

```bash
npm test
```

The tests check that, for every problem, the computed final pose meets its statement: the measured angles to HP and VP are within 0.1°, the solid rests on the right element and stays in the first quadrant, the near/far conditions hold, and so on. They also check that the checker gives 100% for an exact (shifted or mirrored) copy, flags a missing edge, a wrong line type and an extra line, and that random problems are always solvable.
