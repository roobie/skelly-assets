// The welded hull a tracked armoured vehicle shares, pressed from the vehicle's spec:
// a belly between the tracks, sponsons over them, a nose of two glacis plates, a roof carrying the turret ring, and
// the road arms, sponson fuel tanks, ready rack and cross-drive gearbox inside. Every plate's outer face lies on the
// hull's line and its thickness goes inward, so a fitting seated on the line sits on the plate and the plates meet
// without crossing. The vehicle draws its own rear, skirts and stowage, which differ by role.
local k = import 'kit.libsonnet';
local site = import 'site.libsonnet';
local engine = import 'engine-kit.libsonnet';
local track = import 'track-kit.libsonnet';
local trackClasses = import 'track-classes.libsonnet';
local tracks = import 'tracks.libsonnet';
local turret = import 'turret-kit.libsonnet';
local box = k.box;
local prism = k.prism;
local one = site.one;
local pair = site.pair;
local steel = 'steel-parkerized';

// Lines in the side view, (x, y): a point and a direction, and where two of them cross.
local line(p, d) = { p: p, d: d };
local vertical(x) = line([x, 0], [0, 1]);
local level(y) = line([0, y], [1, 0]);
local meet(l, m) =
  local det = l.d[0] * m.d[1] - l.d[1] * m.d[0];
  local t = ((m.p[0] - l.p[0]) * m.d[1] - (m.p[1] - l.p[1]) * m.d[0]) / det;
  [l.p[0] + t * l.d[0], l.p[1] + t * l.d[1]];
// The inner face of a plate `thick` deep whose outer face runs from a to b with the hull on its left.
local inner(a, b, thick) =
  local d = [b[0] - a[0], b[1] - a[1]];
  local n = std.sqrt(d[0] * d[0] + d[1] * d[1]);
  line([a[0] - d[1] / n * thick, a[1] + d[0] / n * thick], d);

// The nose in the side view: the lower glacis from its foot on the belly up to the tip, the upper glacis from the tip
// back up to the roof, and the inner faces, which meet in a mitre behind the tip.
local nose(s) = {
  local a = s.armour,
  foot: [s.lowerGlacisX, s.belly],
  tip: [s.nose, s.noseTop],
  top: [s.glacisTop, s.roofTop],
  lowerInner: inner(self.foot, self.tip, a.lowerGlacis),
  upperInner: inner(self.tip, self.top, a.upperGlacis),
  mitre: meet(self.lowerInner, self.upperInner),
  upperOuter: line(self.tip, [s.glacisTop - s.nose, s.roofTop - s.noseTop]),
  lowerOuter: line(self.foot, [s.nose - s.lowerGlacisX, s.noseTop - s.belly]),
};
// The height of the upper glacis's outer face at x, for what stands on it.
local glacisY(s, x) = s.noseTop + (s.nose - x) * (s.roofTop - s.noseTop) / (s.nose - s.glacisTop);
local floorTop(s) = s.floor + s.armour.deck;
local shelfTop(s) = s.shelf + s.armour.shelf;
// Behind the rear plate, which the vehicle draws.
local back(s) = s.rear + s.armour.rear;
local innerWall(s) = s.wall - s.armour.lowerWall;
local sprocketOf(s) = [w for w in tracks[s.track].wheels if w.key == 'sprocket'][0];
// The turret's frame stands on the ring.
local turretAt(s) = [s.turretX, s.roofTop + s.ring.height, 0];
// As the APC's: far enough ahead of the driver's hatch that the periscopes clear its lid.
local periscopeAhead = 0.42;
local periscopeReach = 0.12;
// `headlamp_military`'s bowl reaches this far behind its origin, where the glacis under it is highest, and
// `tail_lamp_small`'s lens is centred on its origin, half this deep.
local headlampBack = 0.06;
local tailLampDepth = 0.06;

local rows(s) =
  local a = s.armour;
  local n = nose(s);
  local paint = { paint: s.paint };
  local upperAtX(x) = meet(n.upperInner, vertical(x));
  local upperAtY(y) = meet(n.upperInner, level(y));
  local roadWheel = trackClasses[tracks[s.track].class].roadWheel;
  // A road arm reaches from the hull's wall out to its wheel's hub stub.
  local armOut = s.trackZ - roadWheel.width / 2 - roadWheel.hub.stub;
  local d = s.engineDeck;
  local pitch = (d.x[1] - d.x[0]) / d.louvres;
  local f = s.fuelTank;
  local r = s.ammoRack;
  local t = s.transmission;
  local below = sprocketOf(s).at[1] - floorTop(s);
  // The lower walls' tops run up under the upper glacis where its inner face comes down below the shelf.
  local wallFront =
    if upperAtX(s.lowerGlacisX)[1] < s.shelf then [upperAtX(s.lowerGlacisX), upperAtY(s.shelf)] else [[s.lowerGlacisX, s.shelf]];
  assert f.x[1] <= upperAtY(s.roof - 0.02)[0] : s.id + "'s fuel tank reaches into the upper glacis";
  [
    // The lower hull between the tracks: its belly, floor and side walls.
    k.compound(s.id + '_hull_belly', s.massKg.belly, [
      k.xPrism('belly', 'paint', [[s.belly, -s.wall + a.chine], [s.floor, -s.wall], [s.floor, s.wall], [s.belly, s.wall - a.chine]], [back(s), s.lowerGlacisX]),
      box('deck', 'floor', [back(s), s.floor, -innerWall(s)], [s.lowerGlacisX, floorTop(s), innerWall(s)]),
    ] + k.bothSides([
      prism('lower_wall', 'paint', [[back(s), s.floor], [s.lowerGlacisX, s.floor]] + wallFront + [[back(s), s.shelf]], [innerWall(s), s.wall]),
    ]), paint + { floor: 'steel-grey' }),
    // The near side's sponson over the track: its shelf and its upper wall up to the roof, both ending at the upper
    // glacis.
    k.compound(s.id + '_hull_side', s.massKg.side, [
      prism('shelf', 'paint', [[back(s), s.shelf], upperAtY(s.shelf), upperAtY(shelfTop(s)), [back(s), shelfTop(s)]], [s.wall, s.side]),
      prism('wall', 'paint', [[back(s), shelfTop(s)], upperAtY(shelfTop(s)), upperAtY(s.roof), [back(s), s.roof]], [s.side - a.upperWall, s.side]),
    ], paint),
    // The glacis plates, mitred where they meet and the upper one level with the roof at its top; its wings over the
    // sponsons from the shelf up; the nose's
    // cheeks between the plates; and its towing eyes, hung under the lower glacis.
    k.compound(s.id + '_hull_nose', s.massKg.nose, [
      prism('lower_glacis', 'paint', [n.foot, n.tip, n.mitre, meet(n.lowerInner, vertical(s.lowerGlacisX))], [-s.wall, s.wall]),
      prism('upper_glacis', 'paint', [n.tip, n.top, upperAtY(s.roofTop), n.mitre], [-s.wall, s.wall]),
    ] + k.bothSides([
      prism('glacis_wing', 'paint', [meet(n.upperOuter, level(s.shelf)), n.top, upperAtY(s.roofTop), upperAtY(s.shelf)], [s.wall, s.side]),
      prism('cheek', 'paint', [meet(n.lowerInner, vertical(s.lowerGlacisX)), n.mitre, upperAtX(s.lowerGlacisX)], [innerWall(s), s.wall]),
      local e = s.towEye;
      local x = s.nose - 0.04;
      local y = meet(n.lowerOuter, vertical(x - e.length))[1];
      box('tow_eye', 'steel', [x - e.length, y - e.height, e.z], [x, y, e.z + e.width]),
    ]), paint + { steel: steel }),
    // The roof, its front edge bevelled to the upper glacis's inner face.
    k.compound(s.id + '_hull_roof', s.massKg.roof, [
      k.prism('plate', 'paint', [[back(s), s.roof], upperAtY(s.roof), upperAtY(s.roofTop), [back(s), s.roofTop]], [-s.side, s.side]),
    ], paint),
    k.compound(s.id + '_turret_ring', s.ring.massKg, [
      k.turned('ring', 'steel', 'y', k.annulus(s.ring.inner, s.ring.outer, 0, s.ring.height)) + { sides: s.ring.sides },
    ], { steel: steel }),
    // The engine deck's frame on the roof, its louvres spread along it.
    k.compound(s.id + '_engine_deck', d.massKg, [
      box('frame', 'paint', [d.x[0], s.roofTop, d.z[0]], [d.x[1], s.roofTop + 0.02, d.z[1]]),
    ] + [
      box('louvre_' + i, 'grille', [d.x[0] + (i + 0.2) * pitch, s.roofTop + 0.02, d.z[0] + 0.05], [d.x[0] + (i + 0.8) * pitch, s.roofTop + 0.05, d.z[1] - 0.05])
      for i in std.range(0, d.louvres - 1)
    ], paint + { grille: 'plastic-black' }),
    // A road wheel's trailing torsion-bar arm, near side: the origin is the wheel's axle, the arm runs back and up to its
    // pivot on the hull's wall and its hub end meets the wheel's stub.
    local arm = s.roadArm;
    k.compound(s.id + '_road_arm', arm.massKg, [
      k.bar('arm', 'steel', [0, 0], arm.pivot, arm.thick, [s.wall, armOut]),
      k.turned('pivot', 'steel', 'z', k.disc(arm.pivotRadius, s.wall, armOut), [arm.pivot[0], arm.pivot[1], 0]) + { sides: 12 },
    ], { steel: steel }),
    // A fuel tank in the near sponson over the track, its filler under the roof.
    local mid = (f.x[0] + f.x[1]) / 2;
    local across = (s.wall + s.side) / 2;
    k.compound(s.id + '_fuel_tank', f.massKg, [
      box('tank', 'paint', [f.x[0], shelfTop(s), s.wall + 0.02], [f.x[1], s.roof - 0.02, s.side - a.upperWall - 0.02]),
      box('filler', 'steel', [mid - 0.05, s.roof - 0.02, across - 0.05], [mid + 0.05, s.roof, across + 0.05]),
    ], paint + { steel: steel }),
    // Ready rounds standing on the floor behind an armoured door on the rack's near face.
    k.compound(s.id + '_ammo_rack', r.massKg, [
      box('rack', 'steel', [r.x[0], floorTop(s), r.z[0]], [r.x[1], r.top, r.z[1]]),
      box('door', 'paint', [r.x[0] + 0.05, floorTop(s) + 0.1, r.z[1]], [r.x[1] - 0.05, r.top - 0.05, r.z[1] + 0.03]),
    ], paint + { steel: 'steel-grey' }),
    // A cross-drive automatic gearbox and steering unit standing on the floor, its output shafts on the drive sprockets'
    // axis out to the hull's walls, where the final drives take them on: the origin is on that axis, so the sprockets'
    // axle places it, and the case's middle stands `offset` along x from it, clear of the glacis.
    k.compound(s.id + '_transmission', t.massKg, [
      box('case', 'casting', [t.offset - t.length / 2, -below, -t.width / 2], [t.offset + t.length / 2, t.above, t.width / 2]),
      k.turned('output_shafts', 'shaft', 'z', k.disc(t.shaft, -innerWall(s), innerWall(s))) + { sides: 12 },
    ], { casting: 'steel-grey', shaft: 'steel-spall-black' }),
  ];

local sites(s) =
  local roadWheels = [w for w in tracks[s.track].wheels if w.key == 'roadWheel'];
  local sprocket = sprocketOf(s);
  local floor = floorTop(s);
  assert s.hatchX + periscopeAhead + periscopeReach <= s.glacisTop : s.id + "'s driver's periscopes overhang the upper glacis";
  [
    one('belly', s.id + '_hull_belly'),
    one('nose', s.id + '_hull_nose'),
    one('roof', s.id + '_hull_roof'),
    one('engine_deck', s.id + '_engine_deck'),
    one('turret_ring', s.id + '_turret_ring', [s.turretX, s.roofTop, 0]),
  ] + turret.sites(s.turret, turretAt(s), 'assembly')
  + engine.sites(s.engine, [s.engineX, floor, s.engineZ], 'assembly') + [
    one('radiator', engine.radiator(s.engine), [s.radiatorX, floor, s.radiatorZ]),
    one('transmission', s.id + '_transmission', [sprocket.at[0], sprocket.at[1], 0]),
    one('driver_hatch', 'apc_hatch', [s.hatchX, s.roofTop, s.driverZ]),
    one('driver_seat', 'front_seat', [s.driverX, floor, s.driverZ]),
    one('ammo_rack', s.id + '_ammo_rack'),
  ] + [
    one('driver_periscope_' + i, 'apc_periscope', [s.hatchX + periscopeAhead, s.roofTop, s.driverZ + (i - 1) * 0.3])
    for i in std.range(0, 2)
  ]
  + track.pair(s.track, [0, 0, s.trackZ], 'assembly')
  + std.flattenArrays([pair('road_arm_' + i, s.id + '_road_arm', [roadWheels[i].at[0], roadWheels[i].at[1], 0]) for i in std.range(0, std.length(roadWheels) - 1)])
  + pair('side', s.id + '_hull_side')
  + pair('fuel_tank', s.id + '_fuel_tank')
  + pair('headlamp', 'headlamp_military', [s.headlamp.x, glacisY(s, s.headlamp.x - headlampBack), s.headlamp.z])
  + pair('tail_lamp', 'tail_lamp_small', [s.rear - tailLampDepth / 2, s.tailLamp.y, s.tailLamp.z])
  + site.batteryBay('truck_battery_tray', [s.battery.x, floor, s.battery.z]);

{
  // The hull's rows and sites; the vehicle adds its own and its track and turret rows.
  rows: rows,
  sites: sites,
  // The height of the floor deck's top, for what the vehicle stands on it.
  floorTop: floorTop,
  // The height of the shelf's top, for what the vehicle hangs on the sponson's edge.
  shelfTop: shelfTop,
  innerWall: innerWall,
}
