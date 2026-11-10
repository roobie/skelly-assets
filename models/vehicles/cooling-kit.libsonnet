// A radiator as its core and its class's fan and hoses (`cooling-classes.libsonnet`), and the two ways a vehicle fits
// it: one fused model, or each part at its own site, so each is its own loot. Both are drawn from the same pieces and
// weigh the same.
// A radiator's frame has the core's middle plane at x = 0, its base at y = 0, centred on z, the
// engine behind it along -x.
local k = import 'kit.libsonnet';
local classes = import 'cooling-classes.libsonnet';
local radiators = import 'radiators.libsonnet';
local box = k.box;
local round(piece) = piece + { sides: 16 };
// The core's half depth, how far its side tanks stand proud of it and how wide they are.
local core = { half: 0.03, tank: 0.015, tankWidth: 0.04 };
// The fan's shroud wall, and how far in from the core's edges the hoses leave its side tanks.
local shroud = 0.02;
local hoseInset = 0.06;

// Each part in its own frame, as its comment says, with the finish of each slot it draws.
// The core and its side tanks, in the radiator's frame.
local coreDrawn(r, c) = {
  pieces: [
    box('core', 'core', [-core.half, 0, -r.width / 2 + core.tankWidth], [core.half, r.height, r.width / 2 - core.tankWidth]),
  ] + k.bothSides([
    box('tank', 'tanks', [-core.half - core.tank, 0, r.width / 2 - core.tankWidth], [core.half + core.tank, r.height, r.width / 2]),
  ]),
  finish: { core: 'paint-charcoal', tanks: c.tanks },
};
// The origin is the middle of the shroud's front rim, which stands against the core's back; the fan turns about x
// inside the shroud, its hub and blades standing back along -x.
local fan(c) = {
  local f = c.fan,
  local hub = f.radius * 0.25,
  local blade(i) =
    local a = 2 * std.pi * (i + 0.5) / f.blades;
    local along = [std.cos(a), std.sin(a)];
    local across(half) = [-along[1] * half, along[0] * half];
    local at(radius, half, sign) = [along[0] * radius + sign * across(half)[0], along[1] * radius + sign * across(half)[1]];
    k.xPrism('blade_' + i, 'fan', [at(hub * 0.8, hub * 0.5, -1), at(f.radius - 0.01, f.radius * 0.3, -1), at(f.radius - 0.01, f.radius * 0.3, 1), at(hub * 0.8, hub * 0.5, 1)], [-f.depth * 0.6, -f.depth * 0.4]),
  pieces: [
    round(k.turned('shroud', 'shroud', 'x', k.annulus(f.radius, f.radius + shroud, -f.depth, 0))),
    round(k.turned('hub', 'fan', 'x', k.disc(hub, -f.depth * 0.8, -f.depth * 0.2))),
  ] + [blade(i) for i in std.range(0, f.blades - 1)],
  finish: { shroud: 'plastic-black', fan: f.finish },
};
// A straight hose from its end on a side tank, the origin, back along -x toward the engine.
local hose(c) = {
  local h = c.hose,
  pieces: [round(k.turned('hose', 'hose', 'x', k.disc(h.radius, -h.length, 0)))],
  finish: { hose: 'rubber-black' },
};

local coreId(name) = name + '_core';
local classOf(name) = classes[radiators[name].class];
// Where each part's origin sits in the radiator's frame: the fan centred on the core's back, the upper hose off the
// near-side tank's top and the lower off the far-side tank's foot, so coolant crosses the core.
local mounts(name) =
  local r = radiators[name];
  local back = -core.half - core.tank;
  local z = r.width / 2 - core.tankWidth / 2;
  {
    cooling_fan: [-core.half, r.height / 2, 0],
    radiator_hose_upper: [back, r.height - hoseInset, z],
    radiator_hose_lower: [back, hoseInset, -z],
  };
local parts(c) = { cooling_fan: { draw: fan(c), id: c.fan.id, massKg: c.fan.massKg }, hose: { draw: hose(c), id: c.hose.id, massKg: c.hose.massKg } };
// Each site's part, by the site's id.
local fitted = { cooling_fan: 'cooling_fan', radiator_hose_upper: 'hose', radiator_hose_lower: 'hose' };
local plus(a, b) = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

local radiatorRows(name) =
  local r = radiators[name];
  local c = classOf(name);
  local body = coreDrawn(r, c);
  assert c.fan.radius + shroud < std.min(r.width / 2 - core.tankWidth, r.height / 2) : name + "'s core is too small for its class's fan";
  local placed = [
    local p = parts(c)[fitted[id]];
    { id: id, massKg: p.massKg, pieces: [k.moved(piece, mounts(name)[id]) + { id: id + '_' + piece.id } for piece in p.draw.pieces], finish: p.draw.finish }
    for id in std.objectFields(fitted)
  ];
  local partMass = std.sum([p.massKg for p in placed]);
  assert partMass < r.massKg : name + "'s fan and hoses outweigh the whole radiator";
  [
    k.compound(coreId(name), r.massKg - partMass, body.pieces, body.finish),
    k.compound(name, r.massKg, body.pieces + std.flattenArrays([p.pieces for p in placed]), std.foldl(function(all, p) all + p.finish, placed, body.finish)),
  ];

local partRows(c) = [
  local p = parts(c)[key];
  k.compound(p.id, p.massKg, p.draw.pieces, p.draw.finish)
  for key in ['cooling_fan', 'hose']
];

{
  // Every radiator's core and fused rows and every class's fan and hose rows.
  rows: std.flattenArrays([partRows(classes[name]) for name in std.objectFields(classes)])
        + std.flattenArrays([radiatorRows(name) for name in std.objectFields(radiators)]),
  // Every site a radiator can take, so a vehicle that loses its engine can drop them all.
  siteIds: ['radiator'] + std.objectFields(fitted),
  // A vehicle's radiator sites through a vehicle kit (`site.libsonnet`, `kit`), the radiator's frame placed at `at`.
  // `detail` is 'fused', one model at the `radiator` site, or 'assembly', the core there and each part at its own site.
  sites(kit, name, at, detail, supportedBy=[]):
    assert std.member(['fused', 'assembly'], detail) : 'a radiator is fused or an assembly, not ' + detail;
    if detail == 'fused' then [kit.fitting('radiator', name, at, supportedBy)]
    else [kit.fitting('radiator', coreId(name), at, supportedBy)] + [
      kit.fitting(id, parts(classOf(name))[fitted[id]].id, plus(at, mounts(name)[id]), supportedBy)
      for id in std.objectFields(fitted)
    ],
}
