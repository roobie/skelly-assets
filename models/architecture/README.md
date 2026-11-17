---
read_if:
  - assembling the medieval timber building modules
  - extending the medieval architecture kit or changing its grid and origins
---

# Medieval timber kit

The first kit is timber and pale plaster with a tiled pitched roof. It exports through the existing
`skelly.structures` pack, with the corresponding smooth copies in `skelly.structures.smooth`.
It is a cottage-width starter kit, not yet a complete castle, village or dungeon collection.

## Placement contract

Dimensions are metres in the shipped model frame: +y up, +z the exterior face of a wall. Nothing is
recentered on its bounding box. `timber.spec.libsonnet` owns the measures and `timber.libsonnet` owns the
pieces; `timber-cottage.example.jsonnet` demonstrates their placement using model ids, positions and
quaternions. The example is source-only composition data, not a shipped whole-building model or a vehicle.
A consumer selects its assets from the release manifest and places those models in its own scene.

- A bay is 2 m and a storey is 3 m. Wall modules run along x with their base at y=0 and centre line at z=0.
- A wall's infill spans x=-0.9 to +0.9 m. Separate 0.2 m square posts sit on the bay's end nodes, x=-1 and
  +1 m. Consecutive bays share one post; a corner shares that same post between perpendicular walls.
  Do not put two posts at a shared node. Turn walls by quarter turns about their origins.
- A floor bay spans x,z=-1 to +1 m. Its finished surface is y=0; the slab extends down to y=-0.2 m.
  Place wall bases at the floor's surface, not at the slab's underside. Floors meet at their edges and
  extend into the wall centre lines.
- The doorway has a 1.2 m wide, 2.2 m high through-opening, with no threshold across it. The separate
  plank leaf uses the same datum with 0.04 m clearance at its sides, head and foot. It is static;
  hinges, animation, collision rules and interaction are not promised by this first kit.
- The window is unglazed and genuinely open, 0.8 m wide from y=1 to 2.2 m. Shutters are later scope.
- A gable spans 4 m between wall centre lines. Place its base at y=3 m above a two-bay end wall.
- A roof bay uses the same base height, spans those 4 m at 45 degrees and repeats every 2 m along z.
  Its eaves overhang the side-wall centre lines by 0.3 m. The ridge underside is 2 m above the base.
  Roof verges extend from local z=0 to +0.3 m: put one at either end of the roof, turning the rear one
  180 degrees. End walls and gables sit underneath those ends.

The 0.02 m voxel grain preserves post and infill boundaries. Keep datum coordinates on that lattice:
source lengths alone do not guarantee that a coarser voxel export will still meet at the same boundaries.
The tests in `tools/test/medieval-timber.test.mjs` check both voxel and smooth exports, including the floor's
negative-y datum, and the cottage's post-to-wall joins.

## Extending it

The cottage example is 4 by 6 m on wall centre lines. Repeating its side walls, floor and roof bays makes
longer buildings, so the same fabric can start a narrow hall or tavern. Stacking wall storeys is possible
geometrically, but stairs and upper-floor access are not part of this kit yet. Wider roofs, intersections,
stonework, towers, dungeons and damaged variants need further modules and assembled examples rather than
scaling existing pieces and losing their shared grid.
