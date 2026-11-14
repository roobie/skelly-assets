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
// The core's block top, as a share of its height, and the half-widths of its block and of the head or bank beside its
// top, as shares of its width, which the starter and a high alternator sit on and beside, by the row's `layout`. An
// inline's cylinders stand in one row under one head; a vee's stand in two banks over a narrow block, an exhaust
// manifold down each bank's outer face and the intake ports on their valley faces.
local layouts = {
  inline: { blockTop: 0.72, blockHalf: 0.5, headHalf: 0.44 },
  vee: { blockTop: 0.55, blockHalf: 0.32, headHalf: 0.5 },
};
local isVee(e) = std.get(e, 'layout', 'inline') == 'vee';
local shapeOf(e) = layouts[std.get(e, 'layout', 'inline')];
local crankHeight(e) = e.height * 0.2;
// A vee's valley is as wide as its class's air box with the duct, so the box stands in it on the intake, its lid level
// with the covers, and its duct meets the far bank's valley face: a car's bonnet leaves no room above a vee, nor its
// wheels beside one.
local valleyHalf(c) = (c.airBox.width + ductLength) / 2;
// Each class with its alternator pulley placed. A high alternator stands level with the block's top, hung from the side
// of the head of the class's tallest and widest engines, so one belt fits every engine of the class. It is on the
// exhaust side because the intake manifold stands higher than the block's top.
local classes =
  local listed = import 'engine-classes.libsonnet';
  local high(name, c) =
    local members = [e for e in std.objectValues(engines) if e.class == name];
    local r = c.alternator.radius;
    c + { drive+: { alternator+: { at: [
      std.foldl(std.max, [e.height * shapeOf(e).blockTop - crankHeight(e) for e in members], 0) + r,
      -(std.foldl(std.max, [e.width * shapeOf(e).headHalf for e in members], 0) + r),
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
// A box on its base with its duct out of the -z side, toward what it feeds: at 'side', it stands beside an inline's
// intake manifold, its duct in to it; at 'valley', in a vee's valley, its duct in to the far bank's intake ports; at
// 'over', on the valve cover, its duct out toward the turbo on the exhaust side.
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
// Where the engine's air box stands: at `place` when its vehicle names one, else a vee's in its valley and an inline's
// where its class says.
local airBoxAt(name, place=null) =
  local e = engines[name];
  local at = if place != null then place else if isVee(e) then 'valley' else classOf(name).airBox.at;
  assert std.member(['side', 'over'], classOf(name).airBox.at) : engines[name].class + "'s air box stands 'side' or 'over', not " + classOf(name).airBox.at;
  assert std.member(['side', 'over', 'valley'], at) : name + "'s air box stands 'side', 'over' or 'valley', not " + at;
  assert at != 'over' || std.objectHas(e, 'turbo') : name + "'s air box over its cover has no turbo to feed";
  assert (at == 'valley') == isVee(e) : name + "'s air box stands in a valley exactly when it is a vee";
  at;
// Where each accessory's origin sits in the engine's frame.
local mounts(name, airBoxPlace=null) =
  local e = engines[name];
  local c = classOf(name);
  local crank = crankHeight(e);
  {
    alternator: [e.length / 2 - c.alternator.length / 2, crank + c.drive.alternator.at[0], c.drive.alternator.at[1]],
    starter: [-e.length / 2 + 0.04 + c.starter.length / 2, crank + c.starter.radius, e.width * shapeOf(e).blockHalf + c.starter.radius],
    // An air box over the cover sits on its rear half, clear of a turbo's charge pipe, which crosses the front half.
    airBox: {
      over: [-e.length / 4, e.height, 0],
      valley: [0, e.height - c.airBox.height - airBoxLid, valleyHalf(c) - c.airBox.width / 2],
      side: [0, e.height * 0.5, e.width * 0.68 + ductLength + c.airBox.width / 2],
    }[airBoxAt(name, airBoxPlace)],
    fuelPump: [-e.length * 0.47, e.height * 0.82, e.width * 0.15],
    driveBelt: [e.length / 2, crank, 0],
  };
// What an engine shows of those `engines.libsonnet` names, on its core. The turbo stands on the exhaust manifold behind
// the engine's middle; its charge pipe runs forward, over the head and down into the intake.
local shown(e) =
  local l = e.length;
  local w = e.width;
  local h = e.height;
  local crank = crankHeight(e);
  local turbo(t) =
    local at = { x: -l * 0.05, y: h * 0.86, z: -w * 0.6 };
    local pipe = { x: l * 0.3, y: h + t.pipe, z: w * 0.58 };
    [
      box('turbo_foot', 'exhaust', [at.x - 0.06, h * 0.7, at.z - 0.05], [at.x + 0.06, at.y, at.z + 0.05]),
      round(k.turned('turbine', 'exhaust', 'x', k.disc(t.radius, -0.1, 0), [at.x, at.y, at.z])),
      round(k.turned('compressor', 'pipe', 'x', k.disc(t.radius * 0.9, 0, 0.1), [at.x, at.y, at.z])),
      round(k.turned('outlet', 'exhaust', 'y', k.disc(t.pipe * 1.2, 0, h * 0.24), [at.x - 0.05, at.y, at.z])),
      round(k.turned('charge_feed', 'pipe', 'x', k.disc(t.pipe, 0.1, pipe.x - at.x), [at.x, at.y, at.z])),
      round(k.turned('charge_rise', 'pipe', 'y', k.disc(t.pipe, at.y, pipe.y), [pipe.x, 0, at.z])),
      round(k.turned('charge_cross', 'pipe', 'z', k.disc(t.pipe, at.z, pipe.z), [pipe.x, pipe.y, 0])),
      round(k.turned('charge_drop', 'pipe', 'y', k.disc(t.pipe, h * 0.8, pipe.y), [pipe.x, 0, pipe.z])),
    ];
  local damper(d) = [round(k.turned('damper', 'pulley', 'x', k.disc(d.radius, l / 2 + pulleyDepth, l / 2 + pulleyDepth + d.depth), [0, crank, 0]))];
  local bellHousing(b) = [round(k.turned('bell_housing', 'casting', 'x', k.disc(b.radius, -l / 2 - b.depth, -l / 2), [0, crank, 0]))];
  local drawn = { turbo: turbo, damper: damper, bellHousing: bellHousing };
  std.flattenArrays([drawn[f](e[f]) for f in std.objectFields(drawn) if std.objectHas(e, f)]);
// The block, heads, valve covers, sump and manifolds of each layout.
local body(e, c) =
  local l = e.length;
  local w = e.width;
  local h = e.height;
  local shape = shapeOf(e);
  if !isVee(e) then [
    box('sump', 'casting', [-l / 2, 0, -w * 0.42], [l / 2, h * 0.2, w * 0.42]),
    box('block', 'casting', [-l / 2, h * 0.2, -w / 2], [l / 2, h * shape.blockTop, w / 2]),
    box('head', 'casting', [-l * 0.47, h * shape.blockTop, -w * shape.headHalf], [l * 0.47, h * 0.92, w * shape.headHalf]),
    box('cover', 'cover', [-l * 0.43, h * 0.92, -w * 0.36], [l * 0.43, h, w * 0.36]),
    box('intake', 'casting', [-l * 0.38, h * 0.45, w / 2], [l * 0.38, h * 0.82, w * 0.68]),
    box('exhaust', 'exhaust', [-l * 0.38, h * 0.55, -w * 0.62], [l * 0.38, h * 0.7, -w / 2]),
  ] else
    local valley = valleyHalf(c);
    [
      box('sump', 'casting', [-l / 2, 0, -w * 0.3], [l / 2, h * 0.2, w * 0.3]),
      box('block', 'casting', [-l / 2, h * 0.2, -w * shape.blockHalf], [l / 2, h * shape.blockTop, w * shape.blockHalf]),
      box('intake', 'casting', [-l * 0.47, h * shape.blockTop, -valley], [l * 0.47, h - c.airBox.height - airBoxLid, valley]),
    ] + k.bothSides([
      box('bank', 'casting', [-l * 0.47, h * shape.blockTop, valley], [l * 0.47, h * 0.9, w * shape.headHalf]),
      box('cover', 'cover', [-l * 0.43, h * 0.9, valley], [l * 0.43, h, w * 0.44]),
      box('exhaust', 'exhaust', [-l * 0.38, h * shape.blockTop, w * shape.headHalf], [l * 0.38, h * 0.7, w * 0.62]),
    ]);
// The engine's body with the crank and water pump pulleys the belt runs round, and what the engine shows besides.
local core(name) =
  local e = engines[name];
  local c = classOf(name);
  local l = e.length;
  local w = e.width;
  local h = e.height;
  local shape = shapeOf(e);
  local pulley(id, at, radius) = round(k.turned(id, 'pulley', 'x', k.disc(radius, l / 2, l / 2 + pulleyDepth), [0, crankHeight(e) + at[0], at[1]]));
  // The alternator's mounting boss bridges the side of the block, or of the head above it, to the class's alternator,
  // which the belt fixes in place.
  local alt = mounts(name).alternator;
  local side = w * (if alt[1] > h * shape.blockTop then shape.headHalf else shape.blockHalf);
  local standOff = std.abs(alt[2]) - c.alternator.radius - side;
  assert standOff >= 0 : name + "'s block reaches into its class's alternator";
  local z = [std.sign(alt[2]) * side, std.sign(alt[2]) * (side + standOff)];
  local boss = if standOff > 0 then [
    box('alternator_boss', 'casting', [alt[0] - c.alternator.length * 0.3, alt[1] - 0.02, std.min(z[0], z[1])], [alt[0] + c.alternator.length * 0.3, alt[1] + 0.02, std.max(z[0], z[1])]),
  ] else [];
  {
    pieces: body(e, c) + [
      pulley('crank_pulley', c.drive.crank.at, c.drive.crank.radius),
      pulley('pump_pulley', c.drive.pump.at, c.drive.pump.radius),
    ] + boss + shown(e),
    finish: { casting: 'steel-grey', cover: 'paint-charcoal', exhaust: 'steel-heat-tint', pulley: 'steel-spall-black' }
      + (if std.objectHas(e, 'turbo') then { pipe: 'alu-bare' } else {}),
  };

// The engine's accessories as `assembly.libsonnet` fits them, in the order a vehicle lists their sites.
local fittings(name, airBoxPlace=null) =
  local c = classOf(name);
  [
    { site: a.site, id: c[a.key].id, massKg: c[a.key].massKg, drawn: a.draw(c), at: mounts(name, airBoxPlace)[a.key] }
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
  // Every site an engine can take, so a vehicle that loses its engine can drop them all.
  siteIds: assembly.siteIds('engine', fittings(self.names[0])),
  // A vehicle's engine sites, the engine's frame placed at `at`; `detail` is 'fused' or 'assembly', as
  // `assembly.libsonnet`, `sites`, says. `airBox` names where the air box stands when the default place does not fit
  // the vehicle's bay; see `airBoxAt`. Only an assembly takes it, since the fused row draws the default.
  sites(name, at, detail, airBox=null):
    assert airBox == null || detail == 'assembly' : "a fused engine's air box stands where its row draws it";
    assembly.sites('engine', fusedId(name), coreId(name), fittings(name, airBox), at, detail),
  // The radiator of the engine's class.
  radiator(name): classOf(name).radiator,
}
