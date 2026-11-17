# Building metadata

Building placement metadata is optional. Ordinary models need none; a missing or unsupported block means **no
assembly interpretation**, not an instruction to stop rendering. This contract describes placement geometry, not
navigation, structural strength, collision policy or interaction.

Version 1 is being introduced against the medieval timber and stone kits. The first layouts cover their plain
walls, posts/piers and floors. Other modules retain their documented source placement conventions until described.

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
| `surface` | `footprint: {x: [min,max], z: [min,max]}`, `bottom`, `top`: plan extents and horizontal levels. Not a walkability declaration. |

Wall requirements refer to shared node **centres**, not male/female sockets on their mesh ends. Place exactly one
compatible node at each transformed requirement; adjacent and perpendicular walls reuse it. Deduplicate by full
3D position and qualified profile, not just x/z. Different requirements at the same position are conflicts, not a
reason to place overlapping posts. A repeated profile alone does not authorize arbitrary corner arrangements.

## Validation and extension

`@skelly/thing-core/building` exports strict producer schemas plus `readBuilding` and `readBuildingKit` for consumers.
The readers strip unfamiliar optional fields, but return `undefined` for invalid/unsupported semantics. They never
invent a role, datum or compatibility relationship. Consumers can still render the corresponding GLB.

- Add optional descriptive fields without changing existing meanings. Unknown optional information may be ignored;
  it must not be used to smuggle in a new mandatory fitting constraint.
- Add a layout kind for a demonstrated new placement case. Older readers leave its automatic assembly unsupported.
- Change kit revision when placement compatibility changes; existing id/revision/profile combinations are immutable.
- Change contract version when existing field meanings or required rules change. Do not reinterpret old fields.
- Keep producer validation strict so misspellings do not silently become extensions.

Source checks establish authored facts. Export tests separately verify critical snap planes with tight floating-point
tolerance in **both voxel and smooth** geometry. A voxel-sized tolerance must not hide a widened post or shifted slab.
Tests must also cover sidecars, pack indexes, manifest discovery, kit references and cache-hit outputs. See
`tools/test/building-metadata.test.mjs` for a small metadata-driven rotated-corner consumer and production fixture.
