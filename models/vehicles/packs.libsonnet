// The vehicles each pack builds, as names in `index.libsonnet`. A vehicle drives on the ground unless another pack
// claims it, so a new road vehicle needs no recipe edit and parallel authors never edit one shared list.
local fleet = import 'index.libsonnet';
local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local density = import 'models/measures/vehicle-part-density.libsonnet';
local claimed = {
  'skelly.aircraft': [
    'air_ambulance',
    'heavy_cargo_helicopter',
    'light_helicopter',
    'military_transport_helicopter',
    'news_helicopter',
    'police_helicopter',
  ],
  'skelly.vehicle-wrecks': [
    'abandoned_ambulance',
    'abandoned_army_truck',
    'abandoned_pickup',
    'burnt_out_bus',
    'burnt_out_saloon',
    'burnt_out_van',
    'crashed_hatchback',
    'crashed_light_helicopter',
    'crashed_military_helicopter',
    'jackknifed_lorry_cab',
    'overturned_delivery_van',
  ],
};
local others = std.flattenArrays(std.objectValues(claimed));
{
  vehicles(pack): if pack == 'skelly.ground-vehicles'
  then [vehicle for vehicle in std.objectFields(fleet) if !std.member(others, vehicle)]
  else claimed[pack],
  // The ids of the part rows the pack's vehicles build.
  parts(pack): std.set([row.id for vehicle in $.vehicles(pack) for row in fleet[vehicle]]),
  // A vehicle part's recipe row. It takes the vehicle voxel class, so it matches the vehicle it sits on, and carries
  // baked collision, because a site places it on the vehicle, and density bounds, so its mass stays one its geometry
  // can carry.
  partRecipe(row): {
    id: row.id,
    kind: 'item',
    source: row.id,
    voxel: voxel.of(voxel.vehicle, row),
    options: { mass: row.exportMass, collision: true, density: density },
  } + taxonomy.of(row),
}
