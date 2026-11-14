// An engine as an assembly (`assembly.libsonnet`): a core and its class's salvageable accessories
// (`engine-classes.libsonnet`). An engine's frame is `shared.libsonnet`'s: x forward along the crank, y up from the
// sump's base, centred on x and z.
local k = import 'kit.libsonnet';
local assembly = import 'assembly.libsonnet';
local engines = import 'engines.libsonnet';
local box = k.box;
local round(piece) = piece + { sides: 12 };
// How far a pulley stands out of the engine's front face, and the air box's duct out of its side.
local pulleyDepth = 0.03;
local ductLength = 0.06;
local airBoxLid = 0.02;
// The core's block top, as a share of its height, and its head's half-width, as a share of its width, which a high
// alternator sits on and beside.
local blockTop = 0.72;
local headHalf = 0.44;
local crankHeight(e) = e.height * 0.2;
// Each class with its alternator pulley placed. A high alternator stands level with the block's top, hung from the side
// of the head of the class's tallest and widest engines, so one belt fits every engine of the class. It is on the
// exhaust side because the intake manifold stands higher than the block's top.
local classes =
  local listed = import 'engine-classes.libsonnet';
  local high(name, c) =
    local members = [e for e in std.objectValues(engines) if e.class == name];
    local r = c.alternator.radius;
    c + { drive+: { alternator+: { at: [
      std.foldl(std.max, [e.height * blockTop - crankHeight(e) for e in members], 0) + r,
      -(std.foldl(std.max, [e.width * headHalf for e in members], 0) + r),
    ] } } };
  {
    [name]: if std.get(listed[name].drive.alternator, 'high', false) then high(name, listed[name]) else listed[name]
    for name in std.objectFields(listed)
  };

// Each accessory in its own frame, as its comment says, with the finish of each slot it draws.
// Lies along x on its axis, centred on its case; the pulley stands forward of the case. Its mounting boss is cast on the
// engine's core, since how far it stands off the block differs between the engines of a class.
local alternator(c) = {
  local a = c.alternator,
  pieces: [
    round(k.turned('case', 'case', 'x', k.disc(a.radius, -a.length / 2, a.length / 2))),
    round(k.turned('pulley', 'pulley', 'x', k.disc(c.drive.alternator.radius, a.length / 2, a.length / 2 + pulleyDepth))),
  ],
  finish: { case: 'alu-bare', pulley: 'steel-spall-black' },
};
// Lies along x on its axis, centred on its motor; the pinion's nose reaches back past the motor to the flywheel, and
// the solenoid rides under the motor, clear of the intake above.
local starter(c) = {
  local s = c.starter,
  pieces: [
    round(k.turned('motor', 'motor', 'x', k.disc(s.radius, -s.length / 2, s.length / 2))),
    round(k.turned('nose', 'nose', 'x', k.disc(s.radius * 0.6, -s.length / 2 - 0.04, -s.length / 2))),
    round(k.turned('solenoid', 'nose', 'x', k.disc(s.radius * 0.55, -s.length * 0.1, s.length * 0.4), [0, -s.radius * 1.3, 0])),
  ],
  finish: { motor: 'paint-charcoal', nose: 'steel-grey' },
};
// A box on its base with its duct out of the -z side, toward the intake it feeds.
local airBox(c) = {
  local b = c.airBox,
  pieces: [
    box('box', 'shell', [-b.length / 2, 0, -b.width / 2], [b.length / 2, b.height, b.width / 2]),
    box('lid', 'lid', [-b.length / 2 + 0.02, b.height, -b.width / 2 + 0.02], [b.length / 2 - 0.02, b.height + airBoxLid, b.width / 2 - 0.02]),
    box('duct', 'shell', [-0.05, b.height * 0.3, -b.width / 2 - ductLength], [0.05, b.height * 0.7, -b.width / 2]),
  ],
  finish: { shell: 'polymer-black', lid: 'plastic-black' },
};
// Bolts to the rear of the head: the origin is on its mount face, centred, and the pump stands back along -x.
local fuelPump(c) = {
  local p = c.fuelPump,
  pieces: [
    box('body', 'body', [-p.size, -p.size / 2, -p.size / 2], [0, p.size / 2, p.size / 2]),
    round(k.turned('cap', 'cap', 'x', k.disc(p.size * 0.35, -p.size - 0.03, -p.size))),
    box('union', 'cap', [-p.size * 0.6, p.size / 2, -0.015], [-p.size * 0.3, p.size / 2 + 0.03, 0.015]),
  ],
  finish: { body: 'alu-bare', cap: 'steel-grey' },
};
// One loop round the class's pulleys in the y-z plane: the origin is the crank's centre on the engine's front face, and
// the belt rides the pulleys just forward of it. A prism must be convex, so the loop is short straight pieces, each
// wound counter-clockwise.
local driveBelt(c) =
  local b = c.driveBelt;
  local d = c.drive;
  local listed = [d.crank, d.pump, d.alternator];
  local turn(p, q, r) = (q.at[0] - p.at[0]) * (r.at[1] - p.at[1]) - (q.at[1] - p.at[1]) * (r.at[0] - p.at[0]);
  local pulleys = if turn(listed[0], listed[1], listed[2]) > 0 then listed else std.reverse(listed);
  local n = std.length(pulleys);
  // The outward normal of the straight run from pulley i to the next, tilted so the run is tangent to both.
  local runNormal(i) =
    local p = pulleys[i];
    local q = pulleys[(i + 1) % n];
    local du = q.at[0] - p.at[0];
    local dv = q.at[1] - p.at[1];
    local span = std.sqrt(du * du + dv * dv);
    local sin = (p.radius - q.radius) / span;
    local cos = std.sqrt(1 - sin * sin);
    [dv / span * cos + du / span * sin, -du / span * cos + dv / span * sin];
  local angle(v) = std.atan2(v[1], v[0]);
  // Each pulley's wrap, from the run arriving to the run leaving, as points just off its rim: far enough out that each
  // straight piece only grazes the pulley at its middle, so the belt rides the pulley without cutting into it.
  local wrap(i) =
    local p = pulleys[i];
    local from = angle(runNormal((i + n - 1) % n));
    local to0 = angle(runNormal(i));
    local to = if to0 < from then to0 + 2 * std.pi else to0;
    local steps = std.max(1, std.ceil((to - from) / (std.pi / 6)));
    local reach = p.radius / std.cos((to - from) / steps / 2);
    [
      local a = from + (to - from) * j / steps;
      [p.at[0] + reach * std.cos(a), p.at[1] + reach * std.sin(a)]
      for j in std.range(0, steps)
    ];
  local rim = std.flattenArrays([wrap(i) for i in std.range(0, n - 1)]);
  local piece(i) =
    local p = rim[i];
    local q = rim[(i + 1) % std.length(rim)];
    local du = q[0] - p[0];
    local dv = q[1] - p[1];
    local span = std.sqrt(du * du + dv * dv);
    local out = [dv / span * b.thickness, -du / span * b.thickness];
    k.xPrism('run_' + i, 'belt', [p, [p[0] + out[0], p[1] + out[1]], [q[0] + out[0], q[1] + out[1]], q], [(pulleyDepth - b.width) / 2, (pulleyDepth + b.width) / 2]);
  {
    pieces: [piece(i) for i in std.range(0, std.length(rim) - 1) if rim[i] != rim[(i + 1) % std.length(rim)]],
    finish: { belt: 'rubber-black' },
  };

// The accessories in the order a vehicle lists their sites: each one's site id, its class entry and how it is drawn.
local accessories = [
  { site: 'alternator', key: 'alternator', draw: alternator },
  { site: 'starter_motor', key: 'starter', draw: starter },
  { site: 'air_box', key: 'airBox', draw: airBox },
  { site: 'fuel_pump', key: 'fuelPump', draw: fuelPump },
  { site: 'drive_belt', key: 'driveBelt', draw: driveBelt },
];

local fusedId(name) = 'engine_' + name;
local coreId(name) = fusedId(name) + '_core';
local classOf(name) = classes[engines[name].class];
// Where each accessory's origin sits in the engine's frame.
local mounts(name) =
  local e = engines[name];
  local c = classOf(name);
  local crank = crankHeight(e);
  {
    alternator: [e.length / 2 - c.alternator.length / 2, crank + c.drive.alternator.at[0], c.drive.alternator.at[1]],
    starter: [-e.length / 2 + 0.04 + c.starter.length / 2, crank + c.starter.radius, e.width / 2 + c.starter.radius],
    airBox: [0, e.height * 0.5, e.width * 0.68 + ductLength + c.airBox.width / 2],
    fuelPump: [-e.length * 0.47, e.height * 0.82, e.width * 0.15],
    driveBelt: [e.length / 2, crank, 0],
  };
// The block, head, valve cover, sump and manifolds, with the crank and water pump pulleys the belt runs round.
local core(name) =
  local e = engines[name];
  local c = classOf(name);
  local l = e.length;
  local w = e.width;
  local h = e.height;
  local pulley(id, at, radius) = round(k.turned(id, 'pulley', 'x', k.disc(radius, l / 2, l / 2 + pulleyDepth), [0, crankHeight(e) + at[0], at[1]]));
  // The alternator's mounting boss bridges the side of the block, or of the head above it, to the class's alternator,
  // which the belt fixes in place.
  local alt = mounts(name).alternator;
  local side = if alt[1] > h * blockTop then w * headHalf else w / 2;
  local standOff = std.abs(alt[2]) - c.alternator.radius - side;
  assert standOff >= 0 : name + "'s block reaches into its class's alternator";
  local z = [std.sign(alt[2]) * side, std.sign(alt[2]) * (side + standOff)];
  local boss = if standOff > 0 then [
    box('alternator_boss', 'casting', [alt[0] - c.alternator.length * 0.3, alt[1] - 0.02, std.min(z[0], z[1])], [alt[0] + c.alternator.length * 0.3, alt[1] + 0.02, std.max(z[0], z[1])]),
  ] else [];
  {
    pieces: [
      box('sump', 'casting', [-l / 2, 0, -w * 0.42], [l / 2, h * 0.2, w * 0.42]),
      box('block', 'casting', [-l / 2, h * 0.2, -w / 2], [l / 2, h * blockTop, w / 2]),
      box('head', 'casting', [-l * 0.47, h * blockTop, -w * headHalf], [l * 0.47, h * 0.92, w * headHalf]),
      box('cover', 'cover', [-l * 0.43, h * 0.92, -w * 0.36], [l * 0.43, h, w * 0.36]),
      box('intake', 'casting', [-l * 0.38, h * 0.45, w / 2], [l * 0.38, h * 0.82, w * 0.68]),
      box('exhaust', 'exhaust', [-l * 0.38, h * 0.55, -w * 0.62], [l * 0.38, h * 0.7, -w / 2]),
      pulley('crank_pulley', c.drive.crank.at, c.drive.crank.radius),
      pulley('pump_pulley', c.drive.pump.at, c.drive.pump.radius),
    ] + boss,
    finish: { casting: 'steel-grey', cover: 'paint-charcoal', exhaust: 'steel-heat-tint', pulley: 'steel-spall-black' },
  };

// The engine's accessories as `assembly.libsonnet` fits them, in the order a vehicle lists their sites.
local fittings(name) =
  local c = classOf(name);
  [
    { site: a.site, id: c[a.key].id, massKg: c[a.key].massKg, drawn: a.draw(c), at: mounts(name)[a.key] }
    for a in accessories
  ];

{
  // Every engine's core and fused rows and every class's accessory rows.
  rows: [
    assembly.row(c[a.key].id, c[a.key].title, c[a.key].massKg, a.draw(c))
    for c in std.objectValues(classes)
    for a in accessories
  ] + std.flattenArrays([
    assembly.rows(fusedId(name), coreId(name), engines[name].title, engines[name].title + ' core', engines[name].massKg, core(name), fittings(name))
    for name in std.objectFields(engines)
  ]),
  // The engines, by the names `sites` takes.
  names: std.objectFields(engines),
  // The name of the engine whose fused part is `part`, as a spec names its engine.
  nameOf(part):
    local prefix = fusedId('');
    local name = std.substr(part, std.length(prefix), std.length(part) - std.length(prefix));
    assert std.startsWith(part, prefix) && std.objectHas(engines, name) : part + ' is not a fused engine';
    name,
  // Every site an engine can take, so a vehicle that loses its engine can drop them all.
  siteIds: assembly.siteIds('engine', fittings(self.names[0])),
  // A vehicle's engine sites, the engine's frame placed at `at`; `detail` is 'fused' or 'assembly', as
  // `assembly.libsonnet`, `sites`, says.
  sites(name, at, detail): assembly.sites('engine', fusedId(name), coreId(name), fittings(name), at, detail),
  // The radiator of the engine's class.
  radiator(name): classOf(name).radiator,
  // How far the air box of the engine's class rises from its base to its lid's top.
  airBoxHeight(name): classOf(name).airBox.height + airBoxLid,
}
