// A radiator as an assembly (`assembly.libsonnet`): its core and its class's fan and hoses
// (`cooling-classes.libsonnet`).
// A radiator's frame has the core's middle plane at x = 0, its base at y = 0, centred on z, the
// engine behind it along -x.
local k = import 'kit.libsonnet';
local assembly = import 'assembly.libsonnet';
local site = import 'site.libsonnet';
local classes = import 'cooling-classes.libsonnet';
local radiators = import 'radiators.libsonnet';
local box = k.box;
local round(piece) = piece + { sides: 16 };
// The core's half depth, how far its side tanks stand proud of it and how wide they are.
local core = { half: 0.03, tank: 0.015, tankWidth: 0.04 };
// The fan's shroud wall, and how far in from the core's edges the hoses leave its side tanks.
local shroud = 0.02;
local hoseInset = 0.06;

// Each part in its own frame, as its comment says, drawn as `assembly.libsonnet` takes a drawing.
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

local fusedId(name) = name;
local coreId(name) = name + '_core';
local classOf(name) = classes[radiators[name].class];
// Each part as `assembly.libsonnet` fits it: the fan centred on the core's back, the upper hose off the near-side
// tank's top and the lower off the far-side tank's foot, so coolant crosses the core.
local fittings(name) =
  local r = radiators[name];
  local c = classOf(name);
  local back = -core.half - core.tank;
  local z = r.width / 2 - core.tankWidth / 2;
  local fanFitting = { id: c.fan.id, massKg: c.fan.massKg, drawn: fan(c) };
  local hoseFitting = { id: c.hose.id, massKg: c.hose.massKg, drawn: hose(c) };
  assert c.fan.radius + shroud < std.min(r.width / 2 - core.tankWidth, r.height / 2) : name + "'s core is too small for its class's fan";
  [
    fanFitting { site: 'cooling_fan', at: [-core.half, r.height / 2, 0] },
    hoseFitting { site: 'radiator_hose_upper', at: [back, r.height - hoseInset, z] },
    hoseFitting { site: 'radiator_hose_lower', at: [back, hoseInset, -z] },
  ];

{
  // Every class's fan and hose rows and every radiator's core and fused rows.
  rows: std.flattenArrays([
    [assembly.row(c.fan.id, c.fan.massKg, fan(c)), assembly.row(c.hose.id, c.hose.massKg, hose(c))]
    for c in std.objectValues(classes)
  ]) + std.flattenArrays([
    assembly.rows(fusedId(name), coreId(name), radiators[name].massKg, coreDrawn(radiators[name], classOf(name)), fittings(name))
    for name in std.objectFields(radiators)
  ]),
  // The radiators, by the names `sites` takes.
  names: std.objectFields(radiators),
  // Every site a radiator can take, so a vehicle that loses its engine can drop them all.
  siteIds: assembly.siteIds('radiator', fittings(self.names[0])),
  // A vehicle's radiator sites, the radiator's frame placed at `at`, as `assembly.libsonnet`, `sites`, says.
  sites(name, at, detail, kit=site.kit, supportedBy=[]):
    assembly.sites('radiator', fusedId(name), coreId(name), fittings(name), at, detail, kit, supportedBy),
}
