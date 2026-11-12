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
// the barrel runs forward through the mask. A gun may end in a flash hider, and a large gun's barrel may carry a fume
// extractor, a collar `from` its origin along the barrel.
local gun(c, g) = {
  local r = g.receiver,
  local collar(id, radius, from, to) = round(k.turned(id, 'barrel', 'x', k.disc(radius, from, to))),
  pieces: [
    box('receiver', 'steel', [-r.length, -r.height / 2, -r.width / 2], [0, r.height / 2, r.width / 2]),
    box('feed_cover', 'steel', [-r.length * 0.75, r.height / 2, -r.width * 0.4], [-r.length * 0.2, r.height / 2 + 0.03, r.width * 0.4]),
    round(k.turned('buffer', 'steel', 'x', k.disc(r.height * 0.3, -r.length - 0.06, -r.length))),
    round(k.turned('barrel', 'barrel', 'x', k.disc(g.barrel.radius, 0, g.barrel.length))),
  ] + (if std.objectHas(g, 'flashHider') then [
         collar('flash_hider', g.flashHider.radius, g.barrel.length - g.flashHider.length, g.barrel.length),
       ] else [])
    + (if std.objectHas(g, 'fumeExtractor') then [
         collar('fume_extractor', g.fumeExtractor.radius, g.fumeExtractor.from, g.fumeExtractor.from + g.fumeExtractor.length),
       ] else []),
  finish: { steel: steel, barrel: 'steel-spall-black' },
};
// Framed as the main gun; its firing solenoid hangs under the receiver.
local coaxGun(c, g) = {
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
local sight(c, s) = {
  pieces: [
    round(k.turned('base', 'steel', 'y', k.disc(s.width * 0.6, 0, 0.03))),
    box('head', 'paint', [-s.length / 2, 0.03, -s.width / 2], [s.length / 2, s.height, s.width / 2]),
    box('window', 'glass', [s.length / 2, s.height * 0.45, -s.width * 0.35], [s.length / 2 + 0.01, s.height * 0.85, s.width * 0.35]),
  ],
  finish: { paint: c.paint, steel: steel, glass: 'glass-grey' },
};
// Stands on a roof, the origin under the centre of its housing, the glass facing forward.
local periscope(c, p) = {
  pieces: [
    box('housing', 'steel', [-p.length / 2, 0, -p.width / 2], [p.length / 2, p.height, p.width / 2]),
    box('glass', 'glass', [p.length / 2, p.height * 0.2, -p.width / 2 + 0.03], [p.length / 2 + 0.01, p.height * 0.8, p.width / 2 - 0.03]),
  ],
  finish: { steel: steel, glass: 'glass-grey' },
};
// Lies on the roof, the origin under the lid's centre, hinged at its rear.
local hatch(c, h) = {
  pieces: [
    round(k.turned('lid', 'paint', 'y', k.disc(h.radius, 0, h.thickness))),
    box('hinge', 'steel', [-h.radius - 0.04, 0, -0.1], [-h.radius + 0.02, h.thickness + 0.03, 0.1]),
    box('handle', 'steel', [h.radius * 0.3, h.thickness, -0.06], [h.radius * 0.3 + 0.03, h.thickness + 0.03, 0.06]),
  ],
  finish: { paint: c.paint, steel: steel },
};
// Stands on its foot, the origin under the foot's centre, the tube raised forward by its elevation; the tube's lower
// rear edge rests on the foot.
local smokeLauncher(c, l) = {
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

// Hangs off the turret's rear face, the origin at the middle of its floor's front edge: a slatted floor and a rail
// round its top on corner posts, open toward the turret it rests against.
local stowageBasket(c, b) = {
  local half = b.width / 2,
  local t = b.bar,
  local post(id, x, z) = box(id, 'steel', [x, 0, z], [x + t, b.height, z + t]),
  pieces: [
    box('slat_' + i, 'steel', [-b.depth, 0, -half + i * (b.width - t) / (b.slats - 1)], [0, t, -half + i * (b.width - t) / (b.slats - 1) + t])
    for i in std.range(0, b.slats - 1)
  ] + [
    box('floor_rail', 'steel', [-b.depth, 0, -half], [-b.depth + t, t, half]),
    box('rear_rail', 'steel', [-b.depth, b.height - t, -half], [-b.depth + t, b.height, half]),
    box('rail_near', 'steel', [-b.depth, b.height - t, half - t], [0, b.height, half]),
    box('rail_far', 'steel', [-b.depth, b.height - t, -half], [0, b.height, -half + t]),
    post('post_rear_near', -b.depth, half - t),
    post('post_rear_far', -b.depth, -half),
    post('post_front_near', -t, half - t),
    post('post_front_far', -t, -half),
  ],
  finish: { steel: steel },
};

local drawings = {
  gun: gun,
  coaxGun: coaxGun,
  sight: sight,
  periscope: periscope,
  hatch: hatch,
  smokeLauncher: smokeLauncher,
  stowageBasket: stowageBasket,
};
local guns = ['gun', 'coaxGun'];
local entries(c) = [c[key] for key in std.objectFields(c) if key != 'paint'];
local drawn(c, e) = drawings[e.draw](c, e);

local classOf(name) = classes[turrets[name].class];
local coreId(name) = name + '_core';
local launcherFrame = 0.08;

// The launchers each smoke rack stands in its row: `across` is the axis the rack reaches into the shell along.
local acrossOf(rack) = { x: 'z', z: 'x' }[rack.along];
local axis = { x: 0, y: 1, z: 2 };
local launchers(t) = std.flattenArrays([
  [
    local offset = (i - (rack.count - 1) / 2) * rack.spacing;
    [rack.at[a] + (if a == axis[rack.along] then offset else 0) for a in [0, 1, 2]]
    for i in std.range(0, rack.count - 1)
  ]
  for rack in t.smokeRacks
]);

// The turret's fittings in the order a vehicle lists their sites, the smoke launchers numbered across its racks.
local fittings(name) =
  local t = turrets[name];
  local c = classOf(name);
  local on(site, e, at) = { site: site, id: e.id, massKg: e.massKg, drawn: drawn(c, e), at: at, entry: e };
  [on(f.site, c[f.key], f.at) for f in t.fittings]
  + [on('smoke_launcher_' + i, c.smokeLauncher, launchers(t)[i]) for i in std.range(0, std.length(launchers(t)) - 1)];
local fittingsDrawn(name, draws) = [f for f in fittings(name) if std.member(draws, f.entry.draw)];

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
// A y prism's profile is (z, x). A cone's corners lie on a `sides`-gon round the ring, the first face looking forward.
local corner(radius, angle) =
  local a = k.rad(angle);
  [radius * std.sin(a), radius * std.cos(a)];
local plan(t) =
  local s = t.shell;
  if std.objectHas(s, 'sides') then
    local at(radius) = [corner(radius, (j - 0.5) * 360 / s.sides) for j in std.range(0, s.sides - 1)];
    { base: at(s.baseRadius), roof: at(s.roofRadius) }
  else s;
// A convex polygon, its corners running from +x toward +z, with each side moved `by` toward its inside.
local inset(polygon, by) =
  local n = std.length(polygon);
  local inward(p, q) =
    local d = [q[0] - p[0], q[1] - p[1]];
    local length = std.sqrt(d[0] * d[0] + d[1] * d[1]);
    [d[1] / length, -d[0] / length];
  [
    local a = inward(polygon[(i + n - 1) % n], polygon[i]);
    local b = inward(polygon[i], polygon[(i + 1) % n]);
    local scale = by / (1 + a[0] * b[0] + a[1] * b[1]);
    [polygon[i][0] + (a[0] + b[0]) * scale, polygon[i][1] + (a[1] + b[1]) * scale]
    for i in std.range(0, n - 1)
  ];
local band(t, i) =
  local p = plan(t);
  local f = i / (t.bands - 1);
  local outer = [[p.base[j][a] + (p.roof[j][a] - p.base[j][a]) * f for a in [0, 1]] for j in std.range(0, std.length(p.base) - 1)];
  {
    bottom: t.height * i / t.bands,
    top: t.height * (i + 1) / t.bands,
    outer: outer,
    inner: inset(outer, t.wall),
  };
// The guns' common bore height, and the bands the gun mask passes through: those the tallest receiver spans.
local boreOf(name) =
  local heights = std.set([g.at[1] for g in fittingsDrawn(name, guns)]);
  assert std.length(heights) == 1 : name + "'s guns share one bore height, so its mask has one row of ports";
  heights[0];
local maskBackOf(name) =
  local backs = std.set([g.at[0] for g in fittingsDrawn(name, guns)]);
  assert std.length(backs) == 1 : name + "'s guns abut its mask's back, so they share one x";
  backs[0];
local gunBands(name) =
  local t = turrets[name];
  local half = std.foldl(std.max, [g.entry.receiver.height / 2 for g in fittingsDrawn(name, guns)], 0);
  local y = boreOf(name);
  [i for i in std.range(0, t.bands - 1) if band(t, i).top > y - half && band(t, i).bottom < y + half];

// The welded shell, roof, gun mask and any barrel jacket, and the racks the smoke launchers stand on.
local core(name) =
  local t = turrets[name];
  local c = classOf(name);
  local gun = gunBands(name);
  // Each band is a ring of flat faces, each face convex, wound counter-clockwise; the gun bands leave the front face
  // open for the mask.
  local sides = std.length(plan(t).base);
  local face(i, j) =
    local b = band(t, i);
    local next = (j + 1) % sides;
    k.yPrism('band_%d_face_%d' % [i, j], 'paint', [b.inner[next], b.outer[next], b.outer[j], b.inner[j]], [b.bottom, b.top]);
  local shell = [
    face(i, j)
    for i in std.range(0, t.bands - 1)
    for j in std.range(0, sides - 1)
    if !(j == 0 && std.member(gun, i))
  ];
  // The roof plate round the hatches' square openings, which stand side by side across it: the convex pieces ahead of
  // and behind them, and between and beside them.
  local roofPlate = std.reverse(plan(t).roof);
  local hatches = std.sort(fittingsDrawn(name, ['hatch']), function(h) h.at[2]);
  local open = std.set([h.entry.opening / 2 for h in hatches]);
  local hx = std.set([h.at[0] for h in hatches]);
  assert std.length(hx) == 1 && std.length(open) == 1 : name + "'s hatches stand side by side, alike";
  local ahead(p) = p[1] - (hx[0] + open[0]);
  local behind(p) = (hx[0] - open[0]) - p[1];
  local strip = clip(clip(roofPlate, function(p) -ahead(p)), function(p) -behind(p));
  local edges = [null] + std.flattenArrays([[h.at[2] - open[0], h.at[2] + open[0]] for h in hatches]) + [null];
  local beside(from, to) = clip(clip(strip, function(p) if from == null then 1 else p[0] - from), function(p) if to == null then 1 else to - p[0]);
  local roof = [
    k.yPrism('roof_' + piece.id, 'paint', piece.profile, [t.height - t.wall, t.height])
    for piece in [
      { id: 'front', profile: clip(roofPlate, ahead) },
      { id: 'rear', profile: clip(roofPlate, behind) },
    ] + [
      { id: 'beside_%d' % i, profile: beside(edges[2 * i], edges[2 * i + 1]) }
      for i in std.range(0, std.length(hatches))
    ]
  ];
  // The gun mask spans the gun bands, with a square port round each gun's barrel at the bore height.
  local m = t.mask;
  local back = maskBackOf(name);
  local low = band(t, gun[0]).bottom;
  local high = band(t, gun[std.length(gun) - 1]).top;
  local y = boreOf(name);
  local ports = std.sort([{ at: g.at[2], half: g.entry.barrel.radius } for g in fittingsDrawn(name, guns)], function(p) p.at);
  local widest = std.foldl(std.max, [p.half for p in ports], 0);
  local slab(id, z0, z1, y0, y1) = box('mask_' + id, 'paint', [back, y0, z0], [m.front, y1, z1]);
  local portEdges = [m.across[0]] + std.flattenArrays([[p.at - p.half, p.at + p.half] for p in ports]) + [m.across[1]];
  local mask = [
    slab('low', m.across[0], m.across[1], low, y - widest),
    slab('high', m.across[0], m.across[1], y + widest, high),
  ] + [
    slab('between_%d' % i, portEdges[2 * i], portEdges[2 * i + 1], y - widest, y + widest)
    for i in std.range(0, std.length(ports))
  ] + std.flattenArrays([
    if p.half < widest then [
      slab('under_%d' % i, p.at - p.half, p.at + p.half, y - widest, y - p.half),
      slab('over_%d' % i, p.at - p.half, p.at + p.half, y + p.half, y + widest),
    ] else []
    for i in std.range(0, std.length(ports) - 1)
    for p in [ports[i]]
  ]);
  local jacket = if std.objectHas(t, 'jacket') then
    local g = [f for f in fittings(name) if f.site == t.jacket.gun][0];
    [round(k.turned('jacket', 'jacket', 'x', k.annulus(g.entry.barrel.radius, t.jacket.radius, m.front, m.front + t.jacket.length), [0, y, g.at[2]]))]
  else [];
  // Each rack runs the length of its row of launcher feet, and from just outside them into the shell.
  local rack(i, r) =
    local along = axis[r.along];
    local across = axis[acrossOf(r)];
    local spread = (r.count - 1) / 2 * r.spacing + c.smokeLauncher.bore;
    local out = r.at[across] - launcherFrame * std.sign(r.reach - r.at[across]);
    local lo = [if a == along then r.at[a] - spread else if a == across then std.min(out, r.reach) else r.at[1] - 0.04 for a in [0, 1, 2]];
    local hi = [if a == along then r.at[a] + spread else if a == across then std.max(out, r.reach) else r.at[1] for a in [0, 1, 2]];
    box(if std.length(t.smokeRacks) == 1 then 'smoke_rack' else 'smoke_rack_%d' % i, 'steel', lo, hi);
  {
    pieces: shell + roof + mask + jacket + [rack(i, t.smokeRacks[i]) for i in std.range(0, std.length(t.smokeRacks) - 1)],
    finish: { paint: t.paint, steel: steel } + (if std.objectHas(t, 'jacket') then { jacket: 'steel-spall-black' } else {}),
  };

// A fitting that names its own `voxelGrain` is drawn on that grain. Otherwise a gun's own row is a firearm, drawn on the
// gun class as a hand-held one is, since its barrel is thinner than a vehicle voxel; the fused turret draws every
// fitting on the vehicle class with the rest of the turret.
local voxelOf(e) =
  if std.objectHas(e, 'voxelGrain') then { voxelGrain: e.voxelGrain }
  else if std.member(guns, e.draw) then { voxelClass: 'gun' }
  else {};
local classRows(name) =
  local c = classes[name];
  [assembly.row(e.id, e.title, e.massKg, drawn(c, e)) + taxonomy.of(e) + voxelOf(e) for e in entries(c)];
local turretRows(name) =
  assembly.rows(name, coreId(name), turrets[name].title, turrets[name].title + ' core', turrets[name].massKg, core(name), fittings(name));

{
  // A class's fitting rows, which one vehicle on the class emits; and a turret's core and fused rows, which its vehicle
  // emits, so they carry its tags.
  classRows: classRows,
  turretRows: turretRows,
  // Every row the kit draws.
  rows: std.flattenArrays([classRows(name) for name in std.objectFields(classes)] + [turretRows(name) for name in std.objectFields(turrets)]),
  // The turrets, by the names `sites` takes.
  names: std.objectFields(turrets),
  // A vehicle's turret sites, the turret's frame placed at `at`; `detail` is 'fused' or 'assembly', as
  // `assembly.libsonnet`, `sites`, says.
  sites(name, at, detail): assembly.sites('turret', name, coreId(name), fittings(name), at, detail),
}
