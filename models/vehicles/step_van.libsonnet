local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local stow = import 'stowage-kit.libsonnet';
local s = import 'step_van.spec.libsonnet';
local van = import 'van-body.libsonnet';
local vehicle = import 'step_van.placements.libsonnet';
local box = k.box;
local grain = 1 / 32;
local band = s.bands[0].y;
// Parcel shelving along each wall, inboard of the upper wall's inner face, with the aisle between kept clear. Its
// uprights stand clear of the rear wheel tubs and its lowest shelf above them.
local uprights = [-2.5, -1.84, -0.7, -0.24];
local shelfYs = [1.0, 1.5, 2.0, 2.45];
local shelfZ = [s.glassIn - 0.4, s.glassIn - 0.01];
local shelfX = [uprights[0] + 0.04, uprights[3]];
// Each parcel: the shelf (or floor) it stands on, its span along the van, its height and depth, and its board.
local parcels = [
  [s.floor, -2.45, -2.0, 0.3, 0.34, 'parcel_a'],
  [s.floor, -0.62, -0.3, 0.25, 0.3, 'parcel_b'],
  [1.0, -2.45, -2.1, 0.3, 0.34, 'parcel_a'],
  [1.0, -2.07, -1.86, 0.22, 0.26, 'parcel_b'],
  [1.0, -1.78, -1.4, 0.38, 0.36, 'parcel_c'],
  [1.0, -1.37, -1.1, 0.2, 0.28, 'parcel_a'],
  [1.0, -1.06, -0.72, 0.3, 0.32, 'parcel_b'],
  [1.0, -0.64, -0.26, 0.25, 0.3, 'parcel_c'],
  [1.5, -2.45, -2.15, 0.2, 0.26, 'parcel_b'],
  [1.5, -2.12, -1.88, 0.35, 0.3, 'parcel_a'],
  [1.5, -1.76, -1.5, 0.25, 0.34, 'parcel_c'],
  [1.5, -1.45, -1.0, 0.32, 0.36, 'parcel_a'],
  [1.5, -0.95, -0.73, 0.18, 0.24, 'parcel_b'],
  [1.5, -0.63, -0.3, 0.38, 0.34, 'parcel_a'],
  [2.0, -2.45, -2.0, 0.3, 0.34, 'parcel_c'],
  [2.0, -1.76, -1.3, 0.22, 0.3, 'parcel_a'],
  [2.0, -1.25, -0.98, 0.35, 0.28, 'parcel_b'],
  [2.0, -0.62, -0.26, 0.2, 0.32, 'parcel_c'],
];
taxonomy.inherit({ tags: { 'vehicle-body': ['van'] } }, van.rows('step_van', vehicle.title, s) + [
  // The far wall's walk-in door, matching the near side's sliding door outline.
  k.compound('step_van_far_door_trim', 3, [
    box('seam_rear', 'paint', [s.slideRear, s.sill, -s.side - grain], [s.slideRear + grain, band[0], -s.skin]),
    box('seam_rear_mid', 'paint', [s.slideRear, band[1], -s.side - grain], [s.slideRear + grain, s.waist, -s.skin]),
    box('seam_rear_upper', 'paint', [s.slideRear, s.waist, -s.glassOut - grain], [s.slideRear + grain, s.doorTop, -s.glassIn]),
    box('seam_front', 'paint', [s.bRear - grain, s.sill, -s.side - grain], [s.bRear, band[0], -s.skin]),
    box('seam_front_mid', 'paint', [s.bRear - grain, band[1], -s.side - grain], [s.bRear, s.waist, -s.skin]),
    box('seam_front_upper', 'paint', [s.bRear - grain, s.waist, -s.glassOut - grain], [s.bRear, s.doorTop, -s.glassIn]),
    box('seam_top', 'paint', [s.slideRear, s.doorTop - grain, -s.glassOut - grain], [s.bRear, s.doorTop, -s.glassIn]),
    box('handle', 'trim', [s.bRear - 0.2, s.waist - 0.15, -s.side - grain], [s.bRear - 0.04, s.waist - 0.11, -s.side]),
  ], { trim: 'plastic-black', paint: s.paint }) + { title: 'Step van far-side door trim' },
  k.compound('step_van_parcel_shelves', 55, [
    box('upright_' + i + '_' + j, 'shelf', [uprights[i], s.floor, [shelfZ[0], shelfZ[1] - 0.04][j]], [uprights[i] + 0.04, shelfYs[3], [shelfZ[0] + 0.04, shelfZ[1]][j]])
    for i in std.range(0, std.length(uprights) - 1)
    for j in [0, 1]
  ] + std.flattenArrays([
    [
      stow.shelf('shelf_' + i, shelfX, shelfYs[i], shelfZ),
      box('shelf_' + i + '_lip', 'shelf', [shelfX[0], shelfYs[i], shelfZ[0]], [shelfX[1], shelfYs[i] + 0.0625, shelfZ[0] + 0.03125]),
    ]
    for i in std.range(0, std.length(shelfYs) - 1)
  ]) + [
    box('parcel_' + i, parcels[i][5], [parcels[i][1], parcels[i][0], shelfZ[1] - parcels[i][4]], [parcels[i][2], parcels[i][0] + parcels[i][3], shelfZ[1]])
    for i in std.range(0, std.length(parcels) - 1)
  ], stow.finish + { parcel_a: 'cardboard-corrugated', parcel_b: 'paperboard-brown', parcel_c: 'paperboard-tan' }) + { title: 'Step van parcel shelves' },
])
