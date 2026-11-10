// A turret as an assembly (`assembly.libsonnet`): an armoured core and its class's salvageable fittings
// (`turret-classes.libsonnet`). A turret's frame is `turrets.libsonnet`'s: x forward along the guns, y up from the ring,
// centred on the ring.
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local assembly = import 'assembly.libsonnet';
local classes = import 'turret-classes.libsonnet';
local turrets = import 'turrets.libsonnet';
local box = k.box;
local round(piece) = piece + { sides: 12 };
local steel = 'steel-parkerized';

// Each fitting in its own frame, as its comment says, with the finish of each slot it draws.
// Lies along x on its bore, the origin on the receiver's front face: the receiver stands back inside the turret and
// the barrel runs forward through the mask.
local heavyGun(c) = {
  local g = c.heavyGun,
  local r = g.receiver,
  pieces: [
    box('receiver', 'steel', [-r.length, -r.height / 2, -r.width / 2], [0, r.height / 2, r.width / 2]),
    box('feed_cover', 'steel', [-r.length * 0.75, r.height / 2, -r.width * 0.4], [-r.length * 0.2, r.height / 2 + 0.03, r.width * 0.4]),
    round(k.turned('buffer', 'steel', 'x', k.disc(r.height * 0.3, -r.length - 0.06, -r.length))),
    round(k.turned('barrel', 'barrel', 'x', k.disc(g.barrel.radius, 0, g.barrel.length))),
    round(k.turned('flash_hider', 'barrel', 'x', k.disc(g.flashHider.radius, g.barrel.length - g.flashHider.length, g.barrel.length))),
  ],
  finish: { steel: steel, barrel: 'steel-spall-black' },
};
// Framed as the heavy gun; its firing solenoid hangs under the receiver.
local coaxGun(c) = {
  local g = c.coaxGun,
  local r = g.receiver,
  pieces: [
    box('receiver', 'steel', [-r.length, -r.height / 2, -r.width / 2], [0, r.height / 2, r.width / 2]),
    box('feed_cover', 'steel', [-r.length * 0.7, r.height / 2, -r.width * 0.4], [-r.length * 0.25, r.height / 2 + 0.03, r.width * 0.4]),
    box('solenoid', 'steel', [-r.length * 0.6, -r.height / 2 - 0.03, -r.width * 0.3], [-r.length * 0.3, -r.height / 2, r.width * 0.3]),
    round(k.turned('barrel', 'barrel', 'x', k.disc(g.barrel.radius, 0, g.barrel.length))),
  ],
  finish: { steel: steel, barrel: 'steel-spall-black' },
};
// Stands on the roof, the origin under the centre of its base ring, the window facing forward.
local sight(c) = {
  local s = c.sight,
  pieces: [
    round(k.turned('base', 'steel', 'y', k.disc(s.width * 0.6, 0, 0.03))),
    box('head', 'paint', [-s.length / 2, 0.03, -s.width / 2], [s.length / 2, s.height, s.width / 2]),
    box('window', 'glass', [s.length / 2, s.height * 0.45, -s.width * 0.35], [s.length / 2 + 0.01, s.height * 0.85, s.width * 0.35]),
  ],
  finish: { paint: c.paint, steel: steel, glass: 'glass-grey' },
};
// Stands on a roof, the origin under the centre of its housing, the glass facing forward.
local periscope(c) = {
  local p = c.periscope,
  pieces: [
    box('housing', 'steel', [-p.length / 2, 0, -p.width / 2], [p.length / 2, p.height, p.width / 2]),
    box('glass', 'glass', [p.length / 2, p.height * 0.2, -p.width / 2 + 0.03], [p.length / 2 + 0.01, p.height * 0.8, p.width / 2 - 0.03]),
  ],
  finish: { steel: steel, glass: 'glass-grey' },
};
// Lies on the roof, the origin under the lid's centre, hinged at its rear.
local hatch(c) = {
  local h = c.hatch,
  pieces: [
    round(k.turned('lid', 'paint', 'y', k.disc(h.radius, 0, h.thickness))),
    box('hinge', 'steel', [-h.radius - 0.04, 0, -0.1], [-h.radius + 0.02, h.thickness + 0.03, 0.1]),
    box('handle', 'steel', [h.radius * 0.3, h.thickness, -0.06], [h.radius * 0.3 + 0.03, h.thickness + 0.03, 0.06]),
  ],
  finish: { paint: c.paint, steel: steel },
};
// Stands on its foot, the origin under the foot's centre, the tube raised forward by its elevation; the tube's lower
// rear edge rests on the foot.
local smokeLauncher(c) = {
  local l = c.smokeLauncher,
  local foot = 0.03,
  local half = l.bore / 2,
  local e = k.rad(l.elevation),
  local start = [-std.sin(e) * half, foot + std.cos(e) * half],
  pieces: [
    box('foot', 'steel', [-0.04, 0, -half - 0.005], [0.04, foot, half + 0.005]),
    k.bar('tube', 'paint', start, [start[0] + std.cos(e) * l.length, start[1] + std.sin(e) * l.length], l.bore, [-half, half]),
  ],
  finish: { paint: c.paint, steel: steel },
};

local classOf(name) = classes[turrets[name].class];
local coreId(name) = name + '_core';
local plus(a, b) = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
local band(t, i) = {
  bottom: t.height * i / t.bands,
  top: t.height * (i + 1) / t.bands,
  outer: t.baseRadius - (t.baseRadius - t.roofRadius) * i / (t.bands - 1),
  inner: self.outer - t.wall,
};
// The bands the gun mask passes through: those the heavy gun's receiver spans in height.
local gunBand(t, c, i) =
  local b = band(t, i);
  local half = c.heavyGun.receiver.height / 2;
  b.top > t.bore.height - half && b.bottom < t.bore.height + half;
local gunBands(t, c) = [i for i in std.range(0, t.bands - 1) if gunBand(t, c, i)];

// The fittings a class draws, each by its class entry.
local drawings = {
  heavyGun: heavyGun,
  coaxGun: coaxGun,
  sight: sight,
  periscope: periscope,
  hatch: hatch,
  smokeLauncher: smokeLauncher,
};

// The turret's fittings in the order a vehicle lists their sites: each one's site id, its class entry and where its
// origin sits in the turret's frame.
local fittings(name) =
  local t = turrets[name];
  local c = classOf(name);
  local on(site, key, at) = { site: site, id: c[key].id, massKg: c[key].massKg, drawn: drawings[key](c), at: at };
  local rack = t.smokeRack;
  [
    on('heavy_machine_gun', 'heavyGun', [t.mask.back, t.bore.height, t.bore.heavy]),
    on('coaxial_machine_gun', 'coaxGun', [t.mask.back, t.bore.height, t.bore.coax]),
    on('turret_sight', 'sight', [t.sight[0], t.height, t.sight[1]]),
    on('turret_periscope_0', 'periscope', [t.periscope[0], t.height, t.periscope[1]]),
    on('turret_periscope_1', 'periscope', [t.periscope[0], t.height, -t.periscope[1]]),
    on('turret_hatch', 'hatch', [t.hatch[0], t.height, t.hatch[1]]),
  ] + [
    on('smoke_launcher_' + i, 'smokeLauncher', [rack.x, rack.height, (i - (rack.count - 1) / 2) * rack.spacing])
    for i in std.range(0, rack.count - 1)
  ];

// A convex polygon cut to the side of a line where `side` is not negative; `side` is linear in the point.
local clip(polygon, side) =
  local n = std.length(polygon);
  std.flattenArrays([
    local p = polygon[i];
    local q = polygon[(i + 1) % n];
    local a = side(p);
    local b = side(q);
    (if a >= 0 then [p] else [])
    + (if (a >= 0) != (b >= 0) then [[p[0] + (q[0] - p[0]) * a / (a - b), p[1] + (q[1] - p[1]) * a / (a - b)]] else [])
    for i in std.range(0, n - 1)
  ]);
// A y prism's profile is (z, x): the corner of a `sides`-gon of circumradius `radius` at `angle` degrees from +x
// toward +z, so the first face looks forward.
local corner(radius, angle, sides) =
  local a = k.rad(angle);
  [radius * std.sin(a), radius * std.cos(a)];

// The welded shell, roof, gun mask and barrel jacket, and the rack the smoke launchers stand on.
local core(name) =
  local t = turrets[name];
  local c = classOf(name);
  local step = 360 / t.sides;
  local gun = gunBands(t, c);
  // Each band is a ring of flat faces, each face convex, wound counter-clockwise; the gun bands leave the front face
  // open for the mask.
  local face(i, j) =
    local b = band(t, i);
    local from = (j - 0.5) * step;
    local to = (j + 0.5) * step;
    k.yPrism('band_%d_face_%d' % [i, j], 'paint', [corner(b.inner, to, t.sides), corner(b.outer, to, t.sides), corner(b.outer, from, t.sides), corner(b.inner, from, t.sides)], [b.bottom, b.top]);
  local shell = [
    face(i, j)
    for i in std.range(0, t.bands - 1)
    for j in std.range(0, t.sides - 1)
    if !(j == 0 && std.member(gun, i))
  ];
  // The roof plate round the hatch's square opening, as the four convex pieces left when the opening is cut out.
  local roofPlate = [corner(t.roofRadius, -(j + 0.5) * step, t.sides) for j in std.range(0, t.sides - 1)];
  local open = c.hatch.opening / 2;
  local hx = t.hatch[0];
  local hz = t.hatch[1];
  local ahead(p) = p[1] - (hx + open);
  local behind(p) = (hx - open) - p[1];
  local roof = [
    k.yPrism('roof_' + piece.id, 'paint', piece.profile, [t.height - t.wall, t.height])
    for piece in [
      { id: 'front', profile: clip(roofPlate, ahead) },
      { id: 'rear', profile: clip(roofPlate, behind) },
      { id: 'near', profile: clip(clip(clip(roofPlate, function(p) -ahead(p)), function(p) -behind(p)), function(p) p[0] - (hz + open)) },
      { id: 'far', profile: clip(clip(clip(roofPlate, function(p) -ahead(p)), function(p) -behind(p)), function(p) (hz - open) - p[0]) },
    ]
  ];
  // The gun mask spans the gun bands, with a square port round each gun's barrel at the bore height.
  local m = t.mask;
  local low = band(t, gun[0]).bottom;
  local high = band(t, gun[std.length(gun) - 1]).top;
  local y = t.bore.height;
  local ports = std.sort([
    { at: t.bore.heavy, half: c.heavyGun.barrel.radius },
    { at: t.bore.coax, half: c.coaxGun.barrel.radius },
  ], function(p) p.at);
  local widest = std.max(ports[0].half, ports[1].half);
  local slab(id, z0, z1, y0, y1) = box('mask_' + id, 'paint', [m.back, y0, z0], [m.front, y1, z1]);
  local edges = [m.across[0]] + std.flattenArrays([[p.at - p.half, p.at + p.half] for p in ports]) + [m.across[1]];
  local mask = [
    slab('low', m.across[0], m.across[1], low, y - widest),
    slab('high', m.across[0], m.across[1], y + widest, high),
  ] + [
    slab('between_%d' % i, edges[2 * i], edges[2 * i + 1], y - widest, y + widest)
    for i in std.range(0, std.length(ports))
  ] + std.flattenArrays([
    if p.half < widest then [
      slab('under_%d' % i, p.at - p.half, p.at + p.half, y - widest, y - p.half),
      slab('over_%d' % i, p.at - p.half, p.at + p.half, y + p.half, y + widest),
    ] else []
    for i in std.range(0, std.length(ports) - 1)
    for p in [ports[i]]
  ]);
  local jacket = round(k.turned('jacket', 'jacket', 'x', k.annulus(c.heavyGun.barrel.radius, t.jacket.radius, m.front, m.front + t.jacket.length), [0, y, t.bore.heavy]));
  local rack = t.smokeRack;
  local reach = (rack.count - 1) / 2 * rack.spacing + c.smokeLauncher.bore;
  {
    pieces: shell + roof + mask + [
      jacket,
      box('smoke_rack', 'steel', [rack.x - 0.08, rack.height - 0.04, -reach], [rack.inset, rack.height, reach]),
    ],
    finish: { paint: t.paint, steel: steel, jacket: 'steel-spall-black' },
  };

{
  // Every class's fitting rows and every turret's core and fused rows.
  rows: [
    assembly.row(c[key].id, c[key].massKg, drawings[key](c)) + taxonomy.of(c[key])
    for c in std.objectValues(classes)
    for key in std.objectFields(drawings)
  ] + std.flattenArrays([
    assembly.rows(name, coreId(name), turrets[name].massKg, core(name), fittings(name))
    for name in std.objectFields(turrets)
  ]),
  // The turrets, by the names `sites` takes.
  names: std.objectFields(turrets),
  // A vehicle's turret sites, the turret's frame placed at `at`; `detail` is 'fused' or 'assembly', as
  // `assembly.libsonnet`, `sites`, says.
  sites(name, at, detail): assembly.sites('turret', name, coreId(name), fittings(name), at, detail),
}
