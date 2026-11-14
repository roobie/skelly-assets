local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local stow = import 'stowage-kit.libsonnet';
local s = import 'cube_van.spec.libsonnet';
local van = import 'van-body.libsonnet';
local vehicle = import 'cube_van.placements.libsonnet';
local b = s.box;
local box = k.box;
local tail = s.rear + 0.08;
// Load-restraint track along each wall, below and above the waist, where the wall's inner face steps in; the near
// side's stops short of the side door.
local rails = { near: [tail + 0.1, s.slideRear - 0.05], far: [tail + 0.1, b.front - 0.1] };
local railYs = [[b.floor + 0.6, b.skin], [b.floor + 1.3, b.glassIn]];
local track(id, x, y, face) = box(id, 'track', [x[0], y, face - 0.03125], [x[1], y + 0.1, face]);
local mirrored(piece) = k.far(piece) + { id: piece.id };
local shelfX = [b.front - 0.55, b.front - 0.08];
// Folded blankets stacked on the shelf high across the box's front wall, in alternating colours so each fold reads.
local stacks = [-0.7, 0, 0.7];
local blankets = [
  box('blanket_' + j + '_' + i, if (i + j) % 2 == 0 then 'blanket' else 'blanket_b', [shelfX[0] + 0.05, 2.25 + i * 0.0625, stacks[j] - 0.3], [shelfX[1] - 0.04, 2.25 + (i + 1) * 0.0625, stacks[j] + 0.3])
  for j in std.range(0, std.length(stacks) - 1)
  for i in std.range(0, 3)
];
taxonomy.inherit({ tags: { 'vehicle-body': ['van'] } }, van.rows('cube_van', vehicle.title, s) + [
  // The box's overhang above the cab roof.
  // Continues the box's own section, so its walls and roof line run on unbroken.
  k.compound('cube_van_peak', 70, [
    {
      id: 'peak', kind: 'prism', slot: 'paint', axis: 'x', start: 0, end: 0.85,
      profile: [[s.cabRoof, -b.glassOut], [b.canton, -b.glassOut], [b.roof, -b.roofSide], [b.roof, b.roofSide], [b.canton, b.glassOut], [s.cabRoof, b.glassOut]],
    },
    k.prism('nose', 'paint', [[0.85, s.cabRoof], [1.0, s.cabRoof + 0.2], [1.0, b.canton], [0.85, b.canton]], [-b.glassOut, b.glassOut]),
    k.prism('nose_top', 'paint', [[0.85, b.canton], [1.0, b.canton], [0.85, b.roof]], [-b.roofSide, b.roofSide]),
  ], { paint: s.paint }) + { title: 'Cube van peak' },
  // A removal van's kit, kept to the walls and high on the front wall so the load floor stays free for cargo.
  k.compound('cube_van_removal_stowage', 60, [
    track('track_near_' + i, rails.near, railYs[i][0], railYs[i][1])
    for i in [0, 1]
  ] + [
    mirrored(track('track_far_' + i, rails.far, railYs[i][0], railYs[i][1]))
    for i in [0, 1]
  ] + [
    mirrored(box('strap_' + i, 'strap', [-2.9 + i * 0.25, b.floor + 0.85, b.glassIn - 0.0625], [-2.85 + i * 0.25, b.floor + 1.4, b.glassIn - 0.03125]))
    for i in std.range(0, 3)
  ] + [
    stow.shelf('shelf', shelfX, 2.25, [-b.glassIn + 0.02, b.glassIn - 0.02]),
  ] + blankets + std.map(mirrored, [
    box('sack_truck_rail_a', 'steel', [-0.62, b.floor + 0.03, 0.97], [-0.58, b.floor + 1.15, 1.01]),
    box('sack_truck_rail_b', 'steel', [-0.34, b.floor + 0.03, 0.97], [-0.3, b.floor + 1.15, 1.01]),
    box('sack_truck_bar', 'steel', [-0.62, b.floor + 0.5, 0.97], [-0.3, b.floor + 0.54, 1.01]),
    box('sack_truck_toe', 'steel', [-0.65, b.floor, 0.78], [-0.27, b.floor + 0.03, 1.01]),
    box('sack_truck_grip', 'lid', [-0.64, b.floor + 1.1, 0.97], [-0.28, b.floor + 1.15, 1.01]),
    k.turned('sack_truck_wheel_a', 'lid', 'x', k.disc(0.1, -0.7, -0.64), [0, b.floor + 0.1, 1.0]) + { sides: 16 },
    k.turned('sack_truck_wheel_b', 'lid', 'x', k.disc(0.1, -0.28, -0.22), [0, b.floor + 0.1, 1.0]) + { sides: 16 },
  ]), stow.finish + { track: 'steel-galvanised', strap: 'cloth-yellow', blanket: 'cloth-blue', blanket_b: 'felt-grey' }) + { title: 'Cube van removal stowage' },
])
