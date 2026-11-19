// The retained roster is separate from per-pack recipe production. The export reads each row's head, not the row; see
// models/catalogue/heads.libsonnet.
local voxel = import '../../../jsonnet/lib/voxel-grains.libsonnet';
local taxonomy = import '../../../jsonnet/lib/taxonomy.libsonnet';
local title = import '../../../jsonnet/lib/title.libsonnet';
// models/export.json maps each roster pack id to its ids.
// A field per id, since std.member walks the whole list for every item row.
local roster = { [id]: true for id in std.set(std.flattenArrays(std.objectValues(import '../../../../models/export.json'))) };
[
  {
    id: row.id,
    kind: 'item',
    source: row.id,
    voxel: voxel.of(voxel.item, row),
    options: { mass: row.exportMass },
  } + title.of(row) + taxonomy.of(row)
  for row in (import 'tools/jsonnet/heads.libsonnet').under(import 'models/catalogue/heads.libsonnet', '')
  if std.objectHas(roster, row.id)
]
