local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local catalogue = import 'models/catalogue/packs.libsonnet';
local owned = std.setUnion(std.set(['rag', 'stick', 'wax', 'nylon_cord', 'nails', 'scrap_metal', 'duct_tape', 'fastener_pack', 'small_spring', 'sewing_thread', 'electrical_tape']), catalogue.ids('skelly.materials'));
// These catalogue rows export under the model ids their items already name.
local renamed = { electrical_tape: 'tape_roll', sewing_thread: 'thread_spool', nylon_cord: 'cord_coil' };
taxonomy.inherit({ category: 'materials' }, [
  {
    id: std.get(renamed, row.id, row.id),
    kind: 'item',
    source: row.id,
    voxel: voxel.of(voxel.item, row),
    options: { mass: row.exportMass },
  } + taxonomy.of(row)
  for row in catalogue.rows(owned)
])
