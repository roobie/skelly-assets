// The vehicles each pack builds, as names in `index.libsonnet`. A vehicle drives on the ground unless another pack
// claims it, so a new road vehicle needs no recipe edit and parallel authors never edit one shared list.
local fleet = import 'index.libsonnet';
local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local claimed = {};
local others = std.flattenArrays(std.objectValues(claimed));
{
  vehicles(pack): if pack == 'skelly.ground-vehicles'
  then [vehicle for vehicle in std.objectFields(fleet) if !std.member(others, vehicle)]
  else claimed[pack],
  // The ids of the part rows the pack's vehicles build.
  parts(pack): std.set([row.id for vehicle in $.vehicles(pack) for row in fleet[vehicle]]),
  // A vehicle part's recipe row. It takes the vehicle voxel class, so it matches the vehicle it sits on, and carries
  // baked collision, because a site places it on the vehicle.
  partRecipe(row): {
    id: row.id,
    kind: 'item',
    source: row.id,
    voxel: voxel.of(voxel.vehicle, row),
    options: { mass: row.exportMass, collision: true },
  } + taxonomy.of(row),
}
