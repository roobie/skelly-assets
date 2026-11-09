local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local catalogue = import 'models/catalogue/packs.libsonnet';
local owned = std.setUnion(std.set(['player_bust', 'player_arm', 'player_leg']), catalogue.ids('skelly.body'));
[
  {
    id: row.id,
    kind: 'item',
    source: row.id,
    voxel: voxel.of(voxel.item, row),
    options: { mass: row.exportMass },
  } + taxonomy.of(row)
  for row in catalogue.rows(owned)
]
