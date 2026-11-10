// An engine as a fused core and its class's salvageable accessories (`engine-classes.libsonnet`), and the two ways a
// vehicle fits it: one fused model, or the core with each accessory at its own site, so each is its own loot. Both are
// drawn from the same pieces and weigh the same, so a vehicle or a mod picks the detail without changing what it is.
// An engine's frame is `shared.libsonnet`'s: x forward along the crank, y up from the sump's base, centred on x and z.
local k = import 'kit.libsonnet';
local site = import 'site.libsonnet';
local classes = import 'engine-classes.libsonnet';
local engines = import 'engines.libsonnet';
local box = k.box;
local round(piece) = piece + { sides: 12 };
// How far a pulley stands out of the engine's front face, and the air box's duct out of its side.
local pulleyDepth = 0.03;
local ductLength = 0.06;

// Each accessory in its own frame, as its comment says, with the finish of each slot it draws.
// Lies along x on its axis, centred on its case; the pulley stands forward of the case.
local alternator(c) = {
  local a = c.alternator,
  pieces: [
    round(k.turned('case', 'case', 'x', k.disc(a.radius, -a.length / 2, a.length / 2))),
    round(k.turned('pulley', 'pulley', 'x', k.disc(c.drive.alternator.radius, a.length / 2, a.length / 2 + pulleyDepth))),
    box('bracket', 'case', [-a.length * 0.3, -0.02, -a.radius - 0.03], [a.length * 0.3, 0.02, -a.radius + 0.01]),
  ],
  finish: { case: 'alu-bare', pulley: 'steel-spall-black' },
};
// Lies along x on its axis, centred on its motor; the pinion's nose reaches back past the motor to the flywheel.
local starter(c) = {
  local s = c.starter,
  pieces: [
    round(k.turned('motor', 'motor', 'x', k.disc(s.radius, -s.length / 2, s.length / 2))),
    round(k.turned('nose', 'nose', 'x', k.disc(s.radius * 0.6, -s.length / 2 - 0.04, -s.length / 2))),
    round(k.turned('solenoid', 'nose', 'x', k.disc(s.radius * 0.55, -s.length * 0.1, s.length * 0.4), [0, s.radius * 1.3, 0])),
  ],
  finish: { motor: 'paint-charcoal', nose: 'steel-grey' },
};
// A box on its base with its duct out of the -z side, toward the intake it feeds.
local airBox(c) = {
  local b = c.airBox,
  pieces: [
    box('box', 'shell', [-b.length / 2, 0, -b.width / 2], [b.length / 2, b.height, b.width / 2]),
    box('lid', 'lid', [-b.length / 2 + 0.02, b.height, -b.width / 2 + 0.02], [b.length / 2 - 0.02, b.height + 0.02, b.width / 2 - 0.02]),
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
  // Each pulley's wrap, from the run arriving to the run leaving, as points on its rim.
  local wrap(i) =
    local p = pulleys[i];
    local from = angle(runNormal((i + n - 1) % n));
    local to0 = angle(runNormal(i));
    local to = if to0 < from then to0 + 2 * std.pi else to0;
    local steps = std.max(1, std.ceil((to - from) / (std.pi / 6)));
    [
      local a = from + (to - from) * j / steps;
      [p.at[0] + p.radius * std.cos(a), p.at[1] + p.radius * std.sin(a)]
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
local crankHeight(e) = e.height * 0.2;
// Where each accessory's origin sits in the engine's frame.
local mounts(name) =
  local e = engines[name];
  local c = classOf(name);
  local crank = crankHeight(e);
  {
    alternator: [e.length / 2 - c.alternator.length / 2, crank + c.drive.alternator.at[0], c.drive.alternator.at[1]],
    starter: [-e.length / 2 + 0.04 + c.starter.length / 2, crank, e.width / 2 + c.starter.radius],
    airBox: [0, e.height * 0.5, e.width * 0.68 + ductLength + c.airBox.width / 2],
    fuelPump: [-e.length * 0.47, e.height * 0.82, e.width * 0.15],
    driveBelt: [e.length / 2, crank, 0],
  };
local plus(a, b) = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// The block, head, valve cover, sump and manifolds, with the crank and water pump pulleys the belt runs round.
local core(name) =
  local e = engines[name];
  local c = classOf(name);
  local l = e.length;
  local w = e.width;
  local h = e.height;
  local pulley(id, at, radius) = round(k.turned(id, 'pulley', 'x', k.disc(radius, l / 2, l / 2 + pulleyDepth), [0, crankHeight(e) + at[0], at[1]]));
  {
    pieces: [
      box('sump', 'casting', [-l / 2, 0, -w * 0.42], [l / 2, h * 0.2, w * 0.42]),
      box('block', 'casting', [-l / 2, h * 0.2, -w / 2], [l / 2, h * 0.72, w / 2]),
      box('head', 'casting', [-l * 0.47, h * 0.72, -w * 0.44], [l * 0.47, h * 0.92, w * 0.44]),
      box('cover', 'cover', [-l * 0.43, h * 0.92, -w * 0.36], [l * 0.43, h, w * 0.36]),
      box('intake', 'casting', [-l * 0.38, h * 0.45, w / 2], [l * 0.38, h * 0.82, w * 0.68]),
      box('exhaust', 'exhaust', [-l * 0.38, h * 0.55, -w * 0.62], [l * 0.38, h * 0.7, -w / 2]),
      pulley('crank_pulley', c.drive.crank.at, c.drive.crank.radius),
      pulley('pump_pulley', c.drive.pump.at, c.drive.pump.radius),
    ],
    finish: { casting: 'steel-grey', cover: 'paint-charcoal', exhaust: 'steel-heat-tint', pulley: 'steel-spall-black' },
  };

// An accessory's pieces in the engine's frame, renamed after it so they cannot clash with the core's.
local fitted(drawn, role, at) = {
  pieces: [
    k.moved(piece, at) + { id: role + '_' + piece.id, slot: role + '_' + piece.slot }
    for piece in drawn.pieces
  ],
  finish: { [role + '_' + slot]: drawn.finish[slot] for slot in std.objectFields(drawn.finish) },
};

local engineRows(name) =
  local e = engines[name];
  local c = classOf(name);
  local body = core(name);
  local dressed = [fitted(a.draw(c), a.site, mounts(name)[a.key]) for a in accessories];
  local accessoryMass = std.sum([c[a.key].massKg for a in accessories]);
  assert accessoryMass < e.massKg : name + "'s accessories outweigh the whole engine";
  [
    k.compound(coreId(name), e.massKg - accessoryMass, body.pieces, body.finish),
    k.compound(fusedId(name), e.massKg, body.pieces + std.flattenArrays([d.pieces for d in dressed]), std.foldl(function(all, d) all + d.finish, dressed, body.finish)),
  ];

local accessoryRows(c) = [
  local drawn = a.draw(c);
  k.compound(c[a.key].id, c[a.key].massKg, drawn.pieces, drawn.finish)
  for a in accessories
];

{
  // Every engine's core and fused rows and every class's accessory rows.
  rows: std.flattenArrays([accessoryRows(classes[name]) for name in std.objectFields(classes)])
        + std.flattenArrays([engineRows(name) for name in std.objectFields(engines)]),
  // A vehicle's engine sites, the engine's frame placed at `at`. `detail` picks how much of it is salvageable:
  // 'fused' fits the whole engine as one model at the `engine` site, and 'assembly' fits the core there and each
  // accessory at its own site.
  sites(name, at, detail):
    assert std.member(['fused', 'assembly'], detail) : 'an engine is fused or an assembly, not ' + detail;
    if detail == 'fused' then [site.one('engine', fusedId(name), at)]
    else [site.one('engine', coreId(name), at)] + [
      site.one(a.site, classOf(name)[a.key].id, plus(at, mounts(name)[a.key]))
      for a in accessories
    ],
  // The radiator of the engine's class.
  radiator(name): classOf(name).radiator,
}
