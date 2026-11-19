// What the site overlap and swing checks read of the vehicles, compiled to a twin (tools/sources.mjs) so a build
// reuses it until a file it imports changes; tools/siteOverlap.mjs, readSitePieces, gives its shape.
local k = import 'models/vehicles/kit.libsonnet';
local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
local placements = import 'models/vehicles/placements.libsonnet';
local ledger = import 'models/vehicles/unjudged-overlaps.libsonnet';
local rows = std.flattenArrays(std.objectValues(import 'models/vehicles/index.libsonnet'));
local drawn = { [row.id]: std.parseJson(row.parts[0].params.pieces) for row in rows };
local grains = { [row.id]: voxel.of(voxel.vehicle, row).grain for row in rows };
local placed(site) = [
  k.moved(if std.objectHas(site, 'mirror') then k.far(piece) else piece, site.at)
  for piece in drawn[site.part]
];
local moving = [row for row in rows if std.objectHas(row, 'motion')];
{
  grain: voxel.vehicle.grain,
  motions: { [row.id]: { stages: row.motion.stages, stops: row.motion.stops, pieces: drawn[row.id] } for row in moving },
  fits: (import 'models/vehicles/seating.libsonnet').fits,
  roles: std.set(std.flattenArrays([
    [site.id for site in placements[vehicle].sites if std.objectHas(drawn, site.part)]
    for vehicle in std.objectFields(placements)
    if std.objectHas(placements[vehicle], 'sites')
  ])),
  vehicles: {
    [vehicle]: {
      parent: std.get(placements[vehicle], 'parent'),
      forward: placements[vehicle].forward,
      sites: [site { grain: grains[site.part], pieces: placed(site) } for site in placements[vehicle].sites if std.objectHas(drawn, site.part)],
      overlaps: std.get(placements[vehicle], 'overlaps', []),
      unjudged: std.get(placements[vehicle], 'unjudged', []),
      ledger: std.get(ledger, vehicle, []),
      swingContacts: std.get(placements[vehicle], 'swingContacts', []),
      swingUnjudged: std.get(placements[vehicle], 'swingUnjudged', []),
    }
    for vehicle in std.objectFields(placements)
    if std.objectHas(placements[vehicle], 'sites')
  },
}
