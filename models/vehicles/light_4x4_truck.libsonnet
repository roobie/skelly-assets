local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local t = import 'truck-cab.libsonnet';
local k = import 'kit.libsonnet';
local mk = import 'machine-kit.libsonnet';
local s = t.spec(import 'light_4x4_truck.spec.libsonnet');
local box = k.box;
local id = 'light_4x4_truck';
local vehicle = import 'light_4x4_truck.placements.libsonnet';
// A compound row of this vehicle, titled with its title and the part's `label`.
local part(suffix, label, massKg, pieces, finish, anchors={}) = k.compound(id + suffix, massKg, pieces, finish, anchors) + { title: vehicle.title + ' ' + label };
local finish = { boards: s.paint, floor: 'wood-pine', frame: s.framePaint, steel: 'steel-grey' };
local sills = [s.deckRear + 0.1 + i * (s.deckFront - s.deckRear - 0.26) / 5 for i in std.range(0, 5)];
// Steel straps binding a board's planks, evenly along it: `along` spans the board, `face` is the strap's thickness off it.
local straps(name, n, along, face, alongX) = [
  local c = along[0] + (i + 0.5) * (along[1] - along[0]) / n;
  local y = [s.deckBottom, s.boardTop];
  if alongX then box(name + '_' + i, 'frame', [c - 0.03, y[0], face[0]], [c + 0.03, y[1], face[1]])
  else box(name + '_' + i, 'frame', [face[0], y[0], c - 0.03], [face[1], y[1], c + 0.03])
  for i in std.range(0, n - 1)
];
local tyreWidth = s.wheelW;
local tyreBody = s.r - 0.035;
local rim = 0.2286;
local spareFace = 0.04;
taxonomy.inherit({ tags: { 'vehicle-body': ['truck'] } }, t.rows(id, vehicle.title, s) + [
  mk.wheel(id + '_wheel', s.wheelMass, tyreWidth, rim, s.r, 22, 0.035, s.paint) + { title: vehicle.title + ' wheel' },
  // Carried upright behind the cab and seen end on, so it turns about x: the mount face is x = 0 on the wheel's axis
  // and the tyre stands rearward of it.
  part('_spare_wheel', 'spare wheel', s.wheelMass + 12, [
    box('bracket', 'frame', [-spareFace, -0.14, -0.14], [0, 0.14, 0.14]),
    k.turned('tyre', 'tyre', 'x', k.tyreProfile(tyreWidth, rim, tyreBody, 0.08), [-spareFace - tyreWidth / 2, 0, 0]) + { sides: 24 },
    k.turned('rim', 'rim', 'x', k.disc(rim, -tyreWidth * 0.36, tyreWidth * 0.36), [-spareFace - tyreWidth / 2, 0, 0]) + { sides: 24 },
  ], { tyre: 'rubber-black', rim: s.paint, frame: s.framePaint }),
  mk.driveAxle(id + '_front_axle', s.frontAxleMass, s.frontZ - 0.03, true, s.frontSeat.z) + { title: vehicle.title + ' front axle' },
  mk.driveAxle(id + '_axle', s.axleMass, s.rearZ - 0.03, false, s.rearSeat.z) + { title: vehicle.title + ' rear axle' },
  part('_transfer_case', 'transfer case', s.transferCaseMass, [
    box('case', 'casting', [-0.2, 0, -0.18], [0.2, 0.36, 0.18]),
  ], { casting: 'steel-grey' }),
  local shaft = (s.frontAxle - 0.2) - (s.transferX + 0.2);
  part('_front_shaft', 'front shaft', s.frontShaftMass, [
    k.turned('tube', 'steel', 'x', k.disc(0.04, -shaft / 2, shaft / 2)),
  ], { steel: 'steel-grey' }),
  part('_platform', 'platform', s.platformMass, [
    box('floor', 'floor', [s.deckRear, s.deckBottom, -s.deckSide], [s.deckFront - 0.05, s.deckTop, s.deckSide]),
    box('headboard', 'boards', [s.deckFront - 0.05, s.deckBottom, -s.deckSide], [s.deckFront, s.boardTop, s.deckSide]),
    box('headboard_cap', 'frame', [s.deckFront - 0.07, s.boardTop, -s.deckSide], [s.deckFront + 0.01, s.boardTop + 0.03125, s.deckSide]),
  ] + straps('headboard_strap', 4, [-s.deckSide, s.deckSide], [s.deckFront, s.deckFront + 0.01], false) + [
    box('sill_' + i, 'frame', [sills[i] - 0.04, s.deckBottom - 0.0625, -s.deckSide], [sills[i] + 0.04, s.deckBottom, s.deckSide])
    for i in std.range(0, 5)
  ] + k.bothSides([
    box('runner', 'frame', [s.deckRear + 0.04, s.railTop, s.railZ - 0.12], [s.deckFront, s.deckBottom - 0.0625, s.railZ]),
  ]), finish),
  // A side board hinged along its foot, so it drops outward to load from the side.
  part('_dropside', 'dropside', s.dropsideMass, [
    box('board', 'boards', [s.deckRear, s.deckBottom, s.deckSide], [s.deckFront - 0.05, s.boardTop, s.deckSide + 0.04]),
    box('rub', 'frame', [s.deckRear, s.boardTop - 0.04, s.deckSide + 0.04], [s.deckFront - 0.05, s.boardTop, s.deckSide + 0.05]),
  ] + straps('strap', 4, [s.deckRear, s.deckFront - 0.05], [s.deckSide + 0.04, s.deckSide + 0.05], true),
  finish, { hinge_a: ['board', [0.2, 0, 1]], hinge_b: ['board', [0.8, 0, 1]] }),
  local gate = s.deckSide + 0.04;
  part('_tailgate', 'tailgate', s.tailgateMass, [
    box('board', 'boards', [s.deckRear - 0.04, s.deckBottom, -gate], [s.deckRear, s.boardTop, gate]),
    box('rub', 'frame', [s.deckRear - 0.05, s.boardTop - 0.04, -gate], [s.deckRear - 0.04, s.boardTop, gate]),
  ] + straps('strap', 4, [-gate, gate], [s.deckRear - 0.05, s.deckRear - 0.04], false), finish, { hinge_a: ['board', [0, 0, 0.2]], hinge_b: ['board', [0, 0, 0.8]] }),
])
