// Vehicle parts carry baked collision because a fitting places it on the vehicle.
local vehicleParts = std.set([part.id for part in import 'models/vehicle-parts.libsonnet']);
local jacks = std.set(['bottle_jack', 'engine_hoist', 'scissor_jack']);
// A vehicle part takes the vehicle class, so it matches the vehicle it sits on; a jack is an ordinary item.
// A catalogue row may name its own grain in place of its class's.
local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
[
  {
    id: row.id,
    kind: 'item',
    source: row.id,
    voxel: voxel.of(if std.setMember(row.id, vehicleParts) then voxel.vehicle else voxel.item, row),
    options: { mass: row.exportMass }
             + (if std.setMember(row.id, vehicleParts) then { collision: true } else {}),
  } + taxonomy.of(row)
  for row in (import 'packages/thing-authoring-tool/items.jsonnet').items
  if std.setMember(row.id, vehicleParts) || std.setMember(row.id, jacks)
]
