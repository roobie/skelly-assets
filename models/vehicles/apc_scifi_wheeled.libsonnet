local k = import 'kit.libsonnet';
local s = import 'apc_scifi_wheeled.spec.libsonnet';
local vehicle = import 'apc_scifi_wheeled.placements.libsonnet';
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local box = k.box;
local b = s.body;
local finish = { paint: s.paint, frame: s.frame, trim: s.trim, dark: 'plastic-black', glass: 'lens-smoke', cushion: 'cloth-seat' };
local part(name, label, kg, pieces, anchors={}) =
  k.compound('apc_scifi_wheeled_' + name, kg, pieces, finish, anchors) + { title: vehicle.title + ' ' + label, voxelGrain: s.grain };

// A block of the hull from x[0] to x[1], y[0] to y[1] and z[0] to z[1], cut by `cuts` where a sloped plate bounds it.
local slab(id, x, y, z, cuts=[], slot='paint') =
  local piece = k.prism(id, slot, [[x[0], y[0]], [x[1], y[0]], [x[1], y[1]], [x[0], y[1]]], z);
  if cuts == [] then piece else k.clipped(piece, cuts);
local plate(name) = k.plate(s.plates[name][0], s.plates[name][1], s.plates[name][2], b.inside);

local wall = b.wall;
local floorTop = b.belly + wall;
local glacis = plate('glacis');
local noseFoot = plate('noseFoot');
local cheek = plate('noseCheek');
local cheeks = [cheek, k.farCut(cheek)];
local brow = plate('fenderBrow');
local glacisSkin = k.skin(glacis, wall);
// The glacis runs forward from the roof's front edge; aft of it the roof covers its skin.
local glacisFrom = s.plates.glacis[0][0];

// Each wheel well is a box round its tyre, from the belly up to `wellTop`, outboard of the core, its top corners filled
// at 45 degrees where they touch the air round the tyre, so its outline is half an octagon.
local w = s.wheel;
local reach = w.radius + s.archGap;
local wellTop = w.radius + reach;
local fenderTop = wellTop + wall;
local front = [s.axles[0] - reach, s.axles[0] + reach];
local rear = [s.axles[1] - reach, s.axles[1] + reach];
local cornerSpan = reach * (std.sqrt(2) - 1);
local wellCorners(axle) = [
  {
    end: end[0],
    x: if end[1] > 0 then [axle - reach, axle - cornerSpan] else [axle + cornerSpan, axle + reach],
    y: [w.radius + cornerSpan, wellTop],
    cut: { normal: [end[1], -1, 0], offset: end[1] * axle - w.radius - reach * std.sqrt(2) },
  }
  for end in [['aft', 1], ['fore', -1]]
];

// Every outer joint of the hull is bevelled, each bevel a cut across two faces. The main hull's are mirrored onto the
// far side so pieces spanning the middle take both; each cut bites only near its own edge, so every piece of the main
// hull takes them all.
local leg = s.chamfer;
local face(normal, at) = { normal: normal, offset: at };
local bevel(a, c) = k.chamfer(a, c, leg);
local roofFace = face([0, 1, 0], b.top);
local sideFace = face([0, 0, 1], b.half);
local tailFace = face([-1, 0, 0], -b.rear);
local eaves = bevel(roofFace, sideFace);
local tail = bevel(roofFace, tailFace);
local glacisSide = bevel(glacis, sideFace);
local hullEdges = [tail, bevel(roofFace, glacis)]
  + std.flattenArrays([[c, k.farCut(c)] for c in [eaves, bevel(sideFace, tailFace), glacisSide]]);
local hull(id, x, y, z, cuts=[]) = slab(id, x, y, z, cuts + hullEdges);
// The fenders stand above the glacis, so they take bevels of their own: their tops, brows and fronts against their
// outer sides and the wedges' inner faces, wide enough that a bevel still leaves a wall's thickness behind it.
local wedgeInside = b.core - leg - wall;
local fenderTopFace = face([0, 1, 0], fenderTop);
local fenderFront = face([1, 0, 0], b.fender);
local fenderEdges = [bevel(a, c) for a in [fenderTopFace, brow, fenderFront] for c in [sideFace, face([0, 0, -1], -wedgeInside)]]
  + [bevel(fenderTopFace, brow), bevel(brow, fenderFront)];
// Where the glacis comes down to the fenders' top: aft of it the shoulder stands on a front well's top, so only what
// lies ahead takes the fender's bevels.
local shoulderEnd = (glacis.offset - glacis.normal[1] * fenderTop) / glacis.normal[0];
local fenderRun(id, x, y, cuts=[]) =
  (if x[0] < shoulderEnd then [hull(id + '_under', [x[0], std.min(x[1], shoulderEnd)], y, [b.core, b.half], cuts)] else [])
  + (if x[1] > shoulderEnd then [slab(id, [std.max(x[0], shoulderEnd), x[1]], y, [b.core, b.half], cuts + fenderEdges)] else []);

local rearDoor = s.doors.rear;
local sideDoor = s.doors.side;
local sl = s.slit;
local t = s.turret;
local ringTop = b.top + t.ring.height;
local rail = s.rails;
local o = s.optics;
local gun = o.gunner;
local cmd = o.commander;
local headY = t.top + cmd.mast;
local scope = o.periscope;
// Boxes lie along the axes, so a block turned to face out `facing` degrees is a y prism.
local block(id, slot, x, z, facing, depth, width, y) =
  local a = facing * std.pi / 180;
  local f = [std.cos(a) * depth / 2, std.sin(a) * depth / 2];
  local w = [-std.sin(a) * width / 2, std.cos(a) * width / 2];
  k.yPrism(id, slot, [[z + c[0] * f[1] + c[1] * w[1], x + c[0] * f[0] + c[1] * w[0]] for c in [[1, 1], [1, -1], [-1, -1], [-1, 1]]], y);
local periscope(id, x, z, facing) =
  local a = facing * std.pi / 180;
  local out = scope.depth / 2 + 0.005;
  local glass = [x + std.cos(a) * out, z + std.sin(a) * out];
  [
    block(id, 'paint', x, z, facing, scope.depth, scope.width, [b.top, b.top + scope.height]),
    block(id + '_glass', 'glass', glass[0], glass[1], facing, 0.01, scope.width - 0.04, [b.top + 0.02, b.top + scope.height - 0.02]),
  ];
local hatchScopes = o.hatch;
// Each hatch periscope stands as far from its hatch's centre as the lid's and its own half-diagonals together, so it
// clears the lid at any facing.
local hatchLid = [p for p in std.parseJson([r for r in import 'apc.libsonnet' if r.id == 'apc_hatch'][0].parts[0].params.pieces) if p.id == 'lid'][0];
local hatchRing = std.sqrt(2) * hatchLid.max[0] + std.sqrt(std.pow(scope.depth, 2) + std.pow(scope.width, 2)) / 2;
local driverScopes = o.driver;
local p = s.pannier;
local bench = s.bench;
local d = s.driver;
local seatTop = floorTop + d.seat;
local locker = s.locker;
local rack = s.rack;
taxonomy.inherit({ tags: { 'vehicle-body': ['armoured'], setting: ['sci-fi'] } }, [
  // The hull's shell: its floor and walls, the wheel wells boxed off from the crew space and the solid fenders round
  // them. The crew space runs the core's length and widens to the full width in the bay between the wells.
  part('hull', 'hull', 7000, [
    hull('floor', [b.rear, b.nose], [b.belly, floorTop], [-b.core, b.core], [noseFoot] + cheeks),
    hull('rear_lintel', [b.rear, b.rear + wall], [rearDoor.top, b.top], [-rearDoor.half, rearDoor.half]),
    hull('nose_foot', [b.rear, b.nose], [b.belly, b.top], [-b.core, b.core], [glacis] + cheeks + k.skin(noseFoot, wall)),
    box('tow_eye', 'frame', [3.78, 0.78, -0.12], [3.92, 0.88, 0.12]),
    // The far side's bay wall is whole; the near side's frames the side door.
    hull('bay_wall_far', [rear[1], front[0]], [b.belly, b.top], [-b.half, wall - b.half], [glacis]),
    hull('bay_wall_aft_near', [rear[1], sideDoor.x[0]], [b.belly, b.top], [b.half - wall, b.half]),
    hull('bay_wall_fore_near', [sideDoor.x[1], front[0]], [b.belly, b.top], [b.half - wall, b.half], [glacis]),
    hull('side_lintel_near', [sideDoor.x[0], sideDoor.x[1]], [sideDoor.top, b.top], [b.half - wall, b.half]),
    // The bevel across the roof's back edge is a skin of its own, as the roof and rear walls are thinner than it is.
    hull('tail_bevel', [b.rear, b.rear + leg], [b.top - leg, b.top], [-b.half, b.half], k.skin(tail, wall)),
  ] + k.bothSides([
    hull('bay_floor', [rear[1], front[0]], [b.belly, floorTop], [b.core, b.half]),
    hull('rear_wall', [b.rear, b.rear + wall], [b.belly, b.top], [rearDoor.half, b.core]),
    hull('rear_quarter', [b.rear, rear[0]], [b.belly, b.top], [b.core, b.half]),
    hull('rear_well_top', [rear[0], rear[1]], [wellTop, b.top], [b.core, b.half]),
    hull('side_wall_aft', [b.rear, rear[1]], [b.belly, b.top], [b.core - wall, b.core]),
    hull('bay_end_aft', [rear[1], rear[1] + wall], [b.belly, wellTop], [b.core, b.half]),
    hull('bay_end_fore', [front[0] - wall, front[0]], [b.belly, wellTop], [b.core, b.half]),
    hull('front_shoulder', [front[0], front[1]], [fenderTop, b.top], [b.core, b.half], [glacis]),
    hull('side_wall_fore', [front[0], b.nose], [b.belly, b.top], [b.core - wall, b.core], [glacis, noseFoot, cheek]),
    hull('nose_cheek', [front[0], b.nose], [b.belly, b.top], [0, b.core], [glacis, noseFoot] + k.skin(cheek, wall)),
    // The bevels along the top's outer edges, over the bay's thin walls, are skins of their own.
    hull('eave_bevel', [b.rear, glacisFrom], [b.top - leg, b.top], [b.half - leg, b.half], k.skin(eaves, wall)),
    hull('shoulder_bevel', [glacisFrom, front[0]], [b.belly, b.top], [b.half - leg, b.half], [glacis] + k.skin(glacisSide, wall)),
    // The well's inboard wall rises from the glacis to the fender's top, a wedge closing the well off from the nose.
    slab('well_wedge', [front[0], b.fender], [b.belly, fenderTop], [wedgeInside, b.core], [k.beyond(k.inset(glacis, wall)), brow] + fenderEdges),
  ]
  + fenderRun('front_well_top', front, [wellTop, fenderTop])
  + fenderRun('fender', [front[1], b.fender], [b.belly, fenderTop], [brow])
  + [hull('rear_well_corner_' + c.end, c.x, c.y, [b.core, b.half], [c.cut]) for c in wellCorners(s.axles[1])]
  + std.flattenArrays([fenderRun('front_well_corner_' + c.end, c.x, c.y, [c.cut]) for c in wellCorners(s.axles[0])]))),
  part('roof', 'roof', 900, [
    hull('plate', [b.rear, front[0]], [b.top - wall, b.top], [-b.half, b.half], [glacis]),
  ]),
  // The glacis is cut round the driver's slit, so the slit lies in the plate itself.
  part('glacis', 'glacis', 700, [
    hull('aft', [glacisFrom, sl.x[0]], [b.belly, b.top], [-b.core, b.core], glacisSkin),
    hull('fore', [sl.x[1], b.nose], [b.belly, b.top], [-b.core, b.core], glacisSkin + [noseFoot] + cheeks),
  ] + k.bothSides([
    hull('slit_side', [sl.x[0], sl.x[1]], [b.belly, b.top], [sl.half, b.core], glacisSkin),
    hull('outer', [glacisFrom, front[0]], [b.belly, b.top], [b.core, b.half], glacisSkin),
  ])),
  // The slit's glass, set back from the glacis's face.
  part('vision_block', 'vision block', 15, [
    slab('glass', [sl.x[0], sl.x[1]], [b.belly, b.top], [-sl.half, sl.half], [k.inset(glacis, sl.recess), k.beyond(k.inset(glacis, wall))], 'glass'),
  ]),
  // Each wheel turns on a stub out of its well's inboard wall, as hub drives need no axle across the crew space.
  part('axle', 'axle stubs', 120, k.bothSides([
    // The stub reaches out of the well wall to the face the brake disc's hat bolts to, inside the ring and clear of the
    // caliper.
    k.turned('stub', 'frame', 'z', k.disc(0.11, b.core, w.z + w.face)) + { sides: 24 },
  ])),
  part('ramp', 'ramp door', 400, [
    box('plate', 'paint', [b.rear, floorTop, -rearDoor.half], [b.rear + wall, rearDoor.top, rearDoor.half]),
    box('hinge_bar', 'frame', [b.rear - 0.06, floorTop, -rearDoor.half + 0.05], [b.rear, floorTop + 0.06, rearDoor.half - 0.05]),
    box('handle', 'trim', [b.rear - 0.05, 1.2, -0.14], [b.rear, 1.26, 0.14]),
  ] + k.bothSides([
    box('rib', 'paint', [b.rear - 0.04, floorTop + 0.12, rearDoor.half - 0.22], [b.rear, rearDoor.top - 0.1, rearDoor.half - 0.15]),
  ]), { hinge_a: ['hinge_bar', [0.5, 0.5, 0]], hinge_b: ['hinge_bar', [0.5, 0.5, 1]] }),
  // Hinged on its front edge, so it opens against the flow of a column on the move.
  part('side_door', 'side door', 250, [
    box('plate', 'paint', [sideDoor.x[0], floorTop, b.half - wall], [sideDoor.x[1], sideDoor.top, b.half]),
    box('hinge_bar', 'frame', [sideDoor.x[1] - 0.06, floorTop + 0.1, b.half], [sideDoor.x[1], sideDoor.top - 0.1, b.half + 0.04]),
    box('handle', 'trim', [sideDoor.x[0] + 0.08, 1.15, b.half], [sideDoor.x[0] + 0.14, 1.32, b.half + 0.05]),
    box('rib', 'paint', [sideDoor.x[0] + 0.2, 1.0, b.half], [sideDoor.x[1] - 0.2, 1.06, b.half + 0.03]),
  ], { hinge_a: ['hinge_bar', [0.5, 0, 0.5]], hinge_b: ['hinge_bar', [0.5, 1, 0.5]] }),
  // A troops' bench, its back against the wall at z = 0 and its seat inboard toward -z, standing on the floor at
  // y = 0, with stowage bins under the seat.
  part('bench', 'troop bench', 40, [
    box('seat', 'cushion', [0.02, bench.seat - 0.06, -bench.depth], [bench.length - 0.02, bench.seat, -0.04]),
    box('back', 'cushion', [0.02, bench.seat + 0.06, -0.08], [bench.length - 0.02, bench.seat + bench.back, 0]),
    box('rail', 'trim', [0, bench.seat - 0.1, -bench.depth], [bench.length, bench.seat - 0.06, 0]),
  ] + [
    box('leg_%d' % i, 'trim', [x, 0, -bench.depth], [x + 0.05, bench.seat - 0.1, 0.0 - bench.depth + 0.05])
    for i in [0, 1, 2] for x in [(bench.length - 0.05) * i / 2]
  ] + [
    box('bin_%d' % i, 'dark', [0.1 + i * 0.57, 0, 0.06 - bench.depth], [0.6 + i * 0.57, bench.seat - 0.14, 0])
    for i in [0, 1, 2]
  ]),
  part('driver_seat', 'driver seat', 25, [
    box('pedestal', 'trim', [d.x[0] + 0.1, floorTop, -0.15], [d.x[1] - 0.1, seatTop - 0.08, 0.15]),
    box('cushion', 'cushion', [d.x[0] + 0.04, seatTop - 0.08, -d.half], [d.x[1], seatTop, d.half]),
    box('back', 'cushion', [d.x[0], seatTop - 0.08, -d.half], [d.x[0] + 0.1, seatTop + 0.6, d.half]),
  ]),
  // A console under the glacis with a screen toward the driver, a yoke on a column and two pedals.
  part('controls', 'driver controls', 30, [
    box('console', 'frame', [1.45, floorTop, -0.35], [1.75, 1.25, 0.35]),
    box('screen', 'glass', [1.44, 1.0, -0.2], [1.45, 1.2, 0.2]),
    box('column', 'trim', [1.27, 1.05, -0.03], [1.45, 1.11, 0.03]),
    box('yoke', 'dark', [1.22, 1.05, -0.2], [1.27, 1.1, 0.2]),
  ] + k.bothSides([
    box('grip', 'dark', [1.22, 0.98, 0.15], [1.27, 1.18, 0.2]),
    box('pedal', 'dark', [1.38, floorTop, 0.08], [1.44, floorTop + 0.18, 0.16]),
  ])),
  part('locker', 'locker', 35, [
    box('cabinet', 'trim', [locker.x[0], floorTop, locker.z[0]], [locker.x[1], locker.top, locker.z[1]]),
    box('seam', 'dark', [locker.x[0] + 0.03, floorTop + 0.05, locker.z[0] - 0.01], [locker.x[1] - 0.03, floorTop + 0.06, locker.z[0]]),
    box('handle', 'dark', [locker.x[1] - 0.08, 1.0, locker.z[0] - 0.03], [locker.x[1] - 0.05, 1.15, locker.z[0]]),
  ]),
  // Upright posts with shelves of equipment boxes between them.
  part('rack', 'equipment rack', 60, [
    box('post_%d' % i, 'frame', [x, floorTop, rack.z[0]], [x + 0.04, rack.top, rack.z[1]])
    for i in [0, 1] for x in [rack.x[0] + i * (rack.x[1] - rack.x[0] - 0.04)]
  ] + [
    box('shelf_%d' % i, 'frame', [rack.x[0], y, rack.z[0]], [rack.x[1], y + 0.03, rack.z[1]])
    for i in [0, 1, 2] for y in [floorTop + 0.1 + i * 0.45]
  ] + [
    box('unit_%d' % i, 'dark', [rack.x[0] + 0.08, y + 0.03, rack.z[0] + 0.03], [rack.x[1] - 0.08, y + 0.3, rack.z[1]])
    for i in [0, 1] for y in [floorTop + 0.1 + i * 0.45]
  ]),
  part('weapon_station', 'weapon station', 380, [
    box('ring', 'frame', [t.x - t.ring.half, b.top, -t.ring.half], [t.x + t.ring.half, ringTop, t.ring.half]),
    k.clipped(k.yPrism('turret', 'paint', [[q[0], t.x + q[1]] for q in t.plan], [ringTop, t.top]), [k.plate(t.plates.front[0], t.plates.front[1], t.plates.front[2], t.inside)]),
  ]),
  part('cannon', 'cannon', 160, [
    box('mantlet', 'frame', [t.x + 0.55, t.gunY - 0.09, -0.14], [t.x + 0.78, t.gunY + 0.09, 0.14]),
    box('barrel', 'frame', [t.x + 0.78, t.gunY - 0.05, -0.05], [t.muzzle - 0.14, t.gunY + 0.05, 0.05]),
    box('muzzle', 'dark', [t.muzzle - 0.14, t.gunY - 0.075, -0.075], [t.muzzle, t.gunY + 0.075, 0.075]),
  ]),
  // A box of launch tubes on an arm off the turret's near cheek; the tubes' mouths face ahead.
  local pod = t.pod;
  part('launcher', 'launcher', 90, [
    box('arm', 'frame', [pod.x[0] + 0.25, pod.y[0], 0.5], [pod.x[1] - 0.25, pod.y[0] + 0.08, pod.z[0]]),
    box('pod', 'paint', [pod.x[0], pod.y[0], pod.z[0]], [pod.x[1], pod.y[1], pod.z[1]]),
  ] + [
    box('mouth_%d' % i, 'dark', [pod.x[1], pod.y[0] + 0.05, pod.z[0] + 0.03 + i * 0.11], [pod.x[1] + 0.01, pod.y[1] - 0.05, pod.z[0] + 0.10 + i * 0.11])
    for i in [0, 1]
  ]),
  part('sights', 'sights', 45, [
    box('gunner_box', 'paint', [t.x + gun.x[0], t.top, gun.z[0]], [t.x + gun.x[1], t.top + gun.height, gun.z[1]]),
    box('gunner_glass', 'glass', [t.x + gun.x[1], t.top + 0.04, gun.z[0] + 0.03], [t.x + gun.x[1] + 0.01, t.top + gun.height - 0.04, gun.z[1] - 0.03]),
    box('gunner_hood', 'frame', [t.x + gun.x[1], t.top + gun.height - 0.03, gun.z[0]], [t.x + gun.x[1] + 0.06, t.top + gun.height, gun.z[1]]),
    k.turned('commander_mast', 'frame', 'y', k.disc(0.06, t.top, headY), [t.x + cmd.x, 0, cmd.z]) + { sides: 12 },
    box('commander_head', 'paint', [t.x + cmd.x - cmd.head.half, headY, cmd.z - cmd.head.half], [t.x + cmd.x + cmd.head.half, headY + cmd.head.height, cmd.z + cmd.head.half]),
    box('commander_hood', 'frame', [t.x + cmd.x - cmd.head.half - 0.03, headY + cmd.head.height, cmd.z - cmd.head.half - 0.02], [t.x + cmd.x + cmd.head.half + 0.03, headY + cmd.head.height + 0.03, cmd.z + cmd.head.half + 0.02]),
  ] + [
    box('commander_glass_' + end, 'glass', [face, headY + 0.04, cmd.z - cmd.head.half + 0.03], [face + 0.01, headY + cmd.head.height - 0.03, cmd.z + cmd.head.half - 0.03])
    for end in ['fore', 'aft'] for face in [t.x + cmd.x + (if end == 'fore' then cmd.head.half else -cmd.head.half - 0.01)]
  ]),
  part('periscopes', 'periscopes', 60,
    periscope('driver', driverScopes.x, 0, 0)
    + k.bothSides(periscope('driver_side', driverScopes.x, driverScopes.z, driverScopes.turn)
      + std.flattenArrays([
        local a = facing * std.pi / 180;
        periscope('hatch_%d' % facing, s.hatches.x + std.cos(a) * hatchRing, s.hatches.z + std.sin(a) * hatchRing, facing)
        for facing in hatchScopes.facings
      ]))),
  // A grab rail along the hull's near side, the bar held off the armour by posts.
  part('grab_rail', 'grab rail', 20, [
    box('bar', 'trim', [rail.from, rail.y - rail.bar / 2, b.half + rail.standoff - rail.bar], [rail.to, rail.y + rail.bar / 2, b.half + rail.standoff]),
  ] + [
    box('post_%d' % i, 'trim', [rail.posts[i] - 0.03, rail.y - 0.03, b.half], [rail.posts[i] + 0.03, rail.y + 0.03, b.half + rail.standoff - rail.bar])
    for i in std.range(0, std.length(rail.posts) - 1)
  ]),
  // A stowage pannier between the arches, authored on the near side and fitted on the far.
  part('pannier', 'pannier', 60, [
    k.xPrism('box', 'paint', [[p.y[0], p.z[0]], [p.y[1], p.z[0]], [p.y[1], p.z[1]], [p.y[0] + 0.08, p.z[1]]], p.x),
    box('lid_seam', 'dark', [p.x[0] + 0.04, p.y[1] - 0.10, p.z[1]], [p.x[1] - 0.04, p.y[1] - 0.08, p.z[1] + 0.012]),
  ] + [
    box('latch_%d' % i, 'trim', [x - 0.05, p.y[1] - 0.18, p.z[1]], [x + 0.05, p.y[1] - 0.11, p.z[1] + 0.025])
    for i in [0, 1] for x in [p.x[0] + (p.x[1] - p.x[0]) * (0.25 + 0.5 * i)]
  ]),
])
