local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
// Severed shambler parts and the loose flesh chunks torn from bodies.
local bodyPieces = std.set([
  'shambler_torso', 'shambler_head', 'shambler_left_arm', 'shambler_right_arm', 'shambler_left_leg', 'shambler_right_leg',
  'flesh_chunk_small', 'flesh_chunk_medium', 'flesh_chunk_large', 'flesh_chunk_strip',
]);
[
  {
    id: row.id,
    kind: 'item',
    source: row.id,
    voxel: voxel.of(voxel.item, row),
    options: { mass: row.exportMass },
  } + taxonomy.of(row)
  for row in (import 'packages/thing-authoring-tool/items.jsonnet').items
  if std.setMember(row.id, bodyPieces)
]
