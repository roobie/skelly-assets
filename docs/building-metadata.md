# Building metadata

Building placement metadata is optional. Ordinary models need none; a missing or unsupported block means **no
assembly interpretation**, not an instruction to stop rendering. This contract describes placement geometry, not
navigation, structural strength, collision policy or interaction.

Version 1 describes all 22 modules of the [medieval timber and stone kits](../models/architecture/README.md).
It started with walls, posts/piers and floors; the remaining layout kinds cover demonstrated pieces, not a generic
building editor or socket graph.

## Discovery and authority

A production manifest model with building semantics has:

```json
{
  "building": {
    "kit": { "id": "medieval_timber", "revision": 1 },
    "path": "things/medieval_timber_wall.model.json"
  }
}
```

`path` is relative to that model's base pack. Read the complete `building` block from that sidecar. Resolve the kit
reference using the manifest's `buildingKits` array, whose entries contain `id`, `revision`, `pack` and `path`.
Kit paths are likewise relative to their named pack. All referenced files appear in pack file accounting.
The manifest's `smooth` GLB uses the **same authored building metadata**; there is no separate smooth sidecar.
Bare GLBs do not carry this contract: keep the manifest, sidecar and referenced kit document with them.

Authoring authority is `models/architecture/metadata.libsonnet`, generated from the same timber/stone specifications
as the geometry. Module rows carry its blocks; `models/building-kits.jsonnet` selects the shipped kit documents.
Do not maintain another dimension table or infer placement from mesh bounds. Kit files regenerate independently of
model export caches; module metadata participates in model cache inputs.

## Frame and placements

All values are metres in the [shipped model frame](decisions/0002-model-frame.md): +y up, +z wall exterior. Origins
are placement datums, not bounding-box centres. Version 1 authoring currently requires metre, +z-forward source rows;
the exporter rejects other source conversions rather than silently misplacing metadata.

Existing composition instances retain `model`, `at` and `turn`. `turn` is a unit quaternion `[x,y,z,w]` and:

`point_world = at + R(turn) * point_local`

Directions rotate without translation. Fitted arrangements use quarter-turn yaw rotations in the assembly frame;
translation is unrestricted, and the whole assembly may receive a rigid scene transform. Scaling and mirroring are
not covered. A kit's grid is a convention, not a requirement to round placements onto it: raised supports may start
at negative slab thickness, for example.

## Kit document

Required: `version: 1`, `id`, positive integer `revision`, and
`grid: {bay, storey, floorTop, slabBottom}`. These are nominal dimensions/levels, not drawn bounds.
Optional `joins` maps profile ids to `{kind: "square-node-infill", nodeWidth, depth, height}`.
`nodeWidth` describes a square shared node; `depth` is the wall join envelope, not proof the whole envelope is solid.

A profile is qualified by **kit id, kit revision and profile id**. Equal bay sizes, equal dimensions or matching profile
names across kits do not establish compatibility. Timber posts cannot close thicker stone infill joins.

## Module block

Required: `version: 1`, `kit: {id, revision}` and a discriminated `layout`:

| `layout.kind` | Required fields and meaning |
| --- | --- |
| `wall-infill` | `join`, `nodes: [point, point]`: node bases one bay apart along local +x. Their coordinates are independent of infill ends. |
| `shared-node` | `join`, `at`: the node base supplied by this model. |
| `surface` | `footprint: {x: [min,max], z: [min,max]}`, `bottom`, `top`: plan extents and horizontal levels. Floors have top=0 and a negative bottom; landing plinths start at 0. Not a walkability declaration. |
| `span` | `supportX: [left,right]` at local y=0, `extentZ: [min,max]`; optional `bearingX: [[min,max],[min,max]]` and `repeat: [0,0,pitch]`. Roof/arch reference lines are not their overhanging bounds. |
| `stair-flight` | `width`, `run`, `rise`, `treadDepth`, ordered positive `risers`. Width/run are centred on x/z=0, base y=0, ascent +z. Number of treads equals riser count; their depths sum to run and rises to rise. |
| `edge-run` | `extentX`, `depth`, `baseHeight`, `height`, `repeat: [pitch,0,0]`. Base y=0, depth centred on z=0. The parapet repeats across its full bay, without intermediate piers. |
| `face-attachment` | `frame`: the attachment face, whose normal opposes the host's. Buttress local z=0 seats against the wall exterior face, not its centre line. |
| `static-insert` | `frame`, `opening: {model, aperture}`: align this frame with the named aperture frame in that model of the same kit. Positions, normals and up align; no animation or collision behavior follows. |

A span's optional repeat equals its axial length; a run's repeat equals its x extent. Absence of repeat means no
repeat convention is described. Four-metre vaults use local y=0 at the **spring**, not the floor; their bearing
strips occupy the inner half of the supporting wall caps. Standalone arch/end panels are only 0.4 m deep and do not
inherit a vault bay's 2 m pitch. `supportX`/`bearingX` describe placement geometry, not certified structural support.

### Datums, openings and sections

Optional `datums` maps local names to `{at, normal, up}` frames. Normal and up are perpendicular unit vectors;
frame +z is normal, +y is up, +x is `up × normal`. Face abutments coincide with opposing normals and aligned up.
Static inserts instead align both frames in the same direction. These are model-level placement frames, not the
construct library's part ports. Known examples name roof `front`/`rear`, verge `attachment`, and stair
`lower_approach`/`upper_edge` datums. Stair lower approach is at `[0,0,-run/2]`; upper edge at `[0,rise,run/2]`.

Optional `apertures` is a nonempty list of `{id, basis: "nominal", frame, profile, through: [min,max]}`.
Profiles lie in frame-local xy; through-depth lies along frame-local z:

- `rectangle`: `x: [min,max]`, `y: [min,max]`.
- `semicircular-head`: `bottom`, `spring`, `radius`, centred on x=0. Below the spring the width is `2*radius`;
  above it the boundary is `x² + (y-spring)² = radius²`, reaching `spring+radius` at its crown.

For example, the stone doorway's aperture is:

```json
{
  "id": "portal",
  "basis": "nominal",
  "frame": { "at": [0,0,0], "normal": [0,0,1], "up": [0,1,0] },
  "profile": { "kind": "semicircular-head", "bottom": 0, "spring": 1.6, "radius": 0.6 },
  "through": [-0.2,0.2]
}
```

This is **not guaranteed clearance**. Faceting and voxelization approximate curves even in the smooth file. Inset
mesh probes protect the existing openings, but the nominal profile does not certify every boundary point is empty.
The timber leaf names its rectangular doorway explicitly; equal nominal width/head height cannot make it fit the
stone arch. Complete builds validate insert references; targeted builds may omit the target but not alter that rule.

Optional `section` describes a nominal cross-section in model-local xy, extending along z. Every section has
`basis: "nominal"`, with one of:

- `triangular-panel`: `halfSpan`, `rise` from y=0.
- `pitched-shell`: `halfSpan`, `rise`, horizontal `overhang` beyond each support, `verticalThickness` along +y.
  The pitch continues down across the overhang. Raised tile lips are not part of this nominal skin.
- `semicircular-shell`: `innerRadius`, `outerRadius` about `[0,0]` above the spring.
- `semicircular-panel`: `radius` about `[0,0]` above the spring.

These descriptions do not replace actual meshes, collision or navigation. A missing section, opening or datum is
**not described**, not necessarily absent geometry or a forbidden placement.

Wall requirements refer to shared node **centres**, not male/female sockets on their mesh ends. Place exactly one
compatible node at each transformed requirement; adjacent and perpendicular walls reuse it. Deduplicate by full
3D position and qualified profile, not just x/z. Different requirements at the same position are conflicts, not a
reason to place overlapping posts. A repeated profile alone does not authorize arbitrary corner arrangements.

## Validation and extension

`@skelly/thing-core/building` exports strict producer schemas plus `readBuilding` and `readBuildingKit` for consumers.
The readers strip unfamiliar optional fields, but return `undefined` for invalid/unsupported semantics, including
unknown layout/profile kinds. `NeutralModelSchema` uses the same tolerant boundary: unsupported building data does
not reject an otherwise renderable model. Authoring rows instead use the strict producer schema. Consumers pinned
to a pre-building strict neutral schema must update it to recognize this new optional field. The readers never
invent a role, datum or compatibility relationship. Consumers can still render the corresponding GLB.

- Add optional descriptive fields without changing existing meanings. Unknown optional information may be ignored;
  it must not be used to smuggle in a new mandatory fitting constraint.
- Add a layout kind for a demonstrated new placement case. Older readers leave its automatic assembly unsupported.
- Change kit revision when placement compatibility changes; existing id/revision/profile combinations are immutable.
- Change contract version when existing field meanings or required rules change. Do not reinterpret old fields.
- Keep producer validation strict so misspellings do not silently become extensions.

Source checks establish authored facts. Export tests separately verify critical snap planes with tight floating-point
tolerance in **both voxel and smooth** geometry. A voxel-sized tolerance must not hide a widened post or shifted slab.
Tests also cover sidecars, pack indexes, manifest discovery, kit/insert references, cache-hit outputs and
metadata-only cache invalidation. `tools/test/building-metadata.test.mjs` drives corners and all three accepted
compositions from shipped metadata, including translated/elevated quarter turns and a rigidly tilted assembly.
It checks actual voxel/smooth join planes, aperture samples and every stair tread; existing geometry/coplanar tests
remain independent. Timber and stone export tests cover every module in both representations.
