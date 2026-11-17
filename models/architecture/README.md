---
read_if:
  - assembling the medieval timber building modules
  - extending the medieval architecture kit or changing its grid and origins
---

# Medieval architecture

The [timber kit](#timber-kit) and [stone kit](#stone-kit) export through `skelly.structures`, with
corresponding smooth copies in `skelly.structures.smooth`. They share 2 m bays, 3 m storeys and finished
floor datums, but stone uses thicker walls and different infill ends. These are building fabrics, not yet
a complete castle, village or dungeon collection.

Plain walls, posts/piers and floors now ship optional [building placement metadata](../../docs/building-metadata.md).
Its kit profiles distinguish timber and stone joins; the other modules still use the placement conventions below.

## Timber kit

Timber and pale plaster with a tiled pitched roof, demonstrated by a cottage-width assembly.

### Placement contract

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

### Extending it

The cottage example is 4 by 6 m on wall centre lines. Repeating its side walls, floor and roof bays makes
longer buildings, so the same fabric can start a narrow hall or tavern. The stone kit below supplies stairs
on the same storey grid, but timber stair enclosures and a taller timber building still need their own
assembled example. Wider roofs, intersections, towers and damaged variants need further modules rather
than scaling existing pieces and losing their shared grid.

## Stone kit

Grey ashlar with pale limestone variation, recessed mortar, a semicircular doorway and a faceted barrel
vault. `stone.spec.libsonnet` records the grid and opening measures; `stone.libsonnet` builds the rows.
All twelve ids start with `medieval_stone_`:

| Suffix | Module |
| --- | --- |
| `pier` | Shared square pier, 0.4 × 0.4 m, 3 m high |
| `wall` | Ashlar infill wall |
| `slit_window` | Infill with an open narrow window |
| `arch_doorway` | Infill with an open semicircular portal |
| `floor` | 2 × 2 m flagstone floor bay |
| `stair` | 1.6 m wide half-storey stair flight |
| `plinth` | 2 × 2 m solid landing/support, 1.5 m high |
| `battlement` | 2 m long crenellated parapet, 1.2 m high |
| `arch_4m` | 0.4 m deep semicircular arch ring at its spring datum |
| `vault_4m` | 2 m deep barrel vault bay at its spring datum |
| `vault_end_4m` | Solid semicircular end panel at its spring datum |
| `buttress` | 3 m high stepped buttress, 0.6 m wide, 1 m projection at its foot |

### Placement contract

- Frame, units and quarter-turn placement are the same as timber. Wall bases are y=0, the centre line is
  z=0, and +z is exterior. Infill spans x=-0.8 to +0.8 m, with 0.4 m depth. Separate piers occupy shared
  end nodes at x=-1 and +1 m, closing straight and perpendicular joins. Use one pier per node, not one
  per wall. Timber posts do **not** close these thicker stone joins.
- Flagstone floors span x,z=-1 to +1 m with their top at y=0 and bed down to y=-0.2 m. Their 4 cm joints
  are recessed, not holes through the slab. Floor beds keep the footprint closed beneath those joints.
- The doorway has no threshold. Its clear width is 1.2 m up to the spring at y=1.6 m, followed by a
  faceted semicircle of radius 0.6 m (nominal crown y=2.2 m). It is **not** a rectangular 1.2 × 2.2 m
  opening: the timber door leaf does not fit. An arched door/portcullis is later scope.
- The unglazed slit is 0.24 m wide, open from y=0.9 to 2.1 m through the full 0.4 m wall depth.
- Arch rings and vault bays use their spring as y=0, not the floor or their bounding-box centre. Their
  inner radius is 1.8 m and outer radius 2 m. Above walls at x=-2/+2 m, place the spring at y=3 m:
  the soffit starts on the walls' inside faces and the nominal crown reaches y=4.8 m inside, 5 m outside.
  Twelve straight facets approximate the semicircle; voxel silhouettes follow the 0.02 m grain.
- A vault bay spans z=-1 to +1 m and repeats every 2 m. The standalone arch and end panel span
  z=-0.2 to +0.2 m. Put these beyond the ends of a vault run, abutting rather than overlapping its
  curved skins. A solid end panel closes the half-circle above a rear wall; a ring leaves the front open.
- Stairs climb local +z, from z=-1 to +1 m, with their first riser at z=-1. Their base is y=0 and final
  tread is y=1.5 m. Ten 0.2 m treads use alternating 0.14/0.16 m risers to stay on the voxel lattice;
  the landing datum is exact. Two flights and a 2 m landing reach the 3 m storey. The plinth provides a
  solid intermediate landing and bearing beneath the elevated flight; no floating stair support is implied.
- A parapet spans the full 2 m bay, unlike wall infill: do not insert piers between repeated parapets.
  Its base runs y=0 to 0.4 m, with merlons reaching y=1.2 m. Half-merlons at x=-1/+1 m combine into
  full 0.4 m merlons at straight repeats. At the wall-walk's end, the return is offset outward by 0.2 m
  so it abuts the side bays instead of overlapping their coplanar skins. Other corner arrangements need
  their own fitted junctions.
- Buttresses attach at local z=0 and project along +z. Place that datum on a wall's exterior face,
  not its centre line; rotate with that wall's exterior direction.

### Assembled examples and checks

`stone-dungeon.example.jsonnet` demonstrates a 4 × 6 m passage on wall centre lines, three repeating vault
bays, a closed rear half-circle, an open arched front, a rear doorway, slit windows and external buttresses.
`stone-wallwalk.example.jsonnet` demonstrates two flights, their solid landing/support and a 3 m high
crenellated wall-walk. Its supporting walls and piers start at y=-0.2 m so their caps meet the deck's
underside at y=2.8 m; the finished deck remains at y=3 m, matching the stair head exactly.

Like the cottage, these are source-only compositions using existing model ids, positions and quaternions,
not whole-building exports. Select the models from a release manifest and place them in a consumer scene.
`tools/test/medieval-stone.test.mjs` checks joins, openings, vault seams, stair/landing levels and exported
bounds for every module in both voxel and smooth form. Raycasts also check the actual exported doorway
and slit apertures. Facing-stone overlap checks protect the doorway crown from coplanar colour artifacts.

This increment does not supply vaulted intersections, round towers, ruins, arched door leaves, glazing,
stair handrails, interaction, navigation or a gameplay collision policy. Vault width and stair pitch are
fixed; extend by repeating bays instead of rescaling the shared grid.
