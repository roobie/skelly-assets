// A track as an assembly (`assembly.libsonnet`): a band of its class's links (`track-classes.libsonnet`) as the core,
// and its sprocket, idler and wheels as fittings, so a vehicle fits the whole track as one model or each wheel at a site
// of its own, where a game can turn it. The band cannot turn at a site, so it stays still while the wheels turn.
// A track's frame is `tracks.libsonnet`'s: x forward, y up from the ground, centred across z with +z outboard.
local k = import 'kit.libsonnet';
local assembly = import 'assembly.libsonnet';
local site = import 'site.libsonnet';
local classes = import 'track-classes.libsonnet';
local tracks = import 'tracks.libsonnet';
local turned(piece) = piece + { sides: 24 };
local deg(radians) = radians * 180 / std.pi;

// Each part in its own frame, as its comment says, with the finish of each slot it draws.
// A link lies along x, centred on it, its inner face at y = 0: the shoe and its lug or pad below, toward the ground,
// and its guide horn above, toward the wheels. Its pieces are z prisms, so the band can roll each link round a wheel.
local link(c) = {
  local l = c.link,
  local half = l.width / 2,
  local slab(id, slot, x, y, z) = k.prism(id, slot, [[x[0], y[0]], [x[1], y[0]], [x[1], y[1]], [x[0], y[1]]], z),
  local outside = -l.thickness,
  pieces: [slab('shoe', 'shoe', [-l.pitch / 2, l.pitch / 2], [outside, 0], [-half, half])]
          + (if std.objectHas(l, 'lug') then [slab('lug', 'shoe', [-l.lug.length / 2, l.lug.length / 2], [outside - l.lug.height, outside], [-half, half])] else [])
          + (if std.objectHas(l, 'pad') then [slab('pad', 'pad', [-l.pitch / 2 + 0.02, l.pitch / 2 - 0.02], [outside - l.pad.height, outside], [-half + l.pad.inset, half - l.pad.inset])] else [])
          + (if std.objectHas(l, 'horn') then [
               local h = l.horn;
               k.prism('horn', 'horn', [[-h.length / 2, 0], [h.length / 2, 0], [h.length / 4, h.height], [-h.length / 4, h.height]], [-h.width / 2, h.width / 2]),
             ] else []),
  finish: l.finish,
};
// The origin is the axle's centre: a disc, or twin discs either side of the horns' gap, each with its rubber tyre, on a
// hub that runs through them and stands its stub inboard (-z).
local wheel(w) = {
  local half = w.width / 2,
  local spans = if w.gap > 0 then [[-half, -w.gap / 2], [w.gap / 2, half]] else [[-half, half]],
  local rim = w.radius - w.tyre,
  pieces: std.flattenArrays([
    [turned(k.turned('disc_%d' % i, 'wheel', 'z', k.disc(rim, spans[i][0], spans[i][1])))]
    + (if w.tyre > 0 then [turned(k.turned('tyre_%d' % i, 'tyre', 'z', k.annulus(rim, w.radius, spans[i][0], spans[i][1])))] else [])
    for i in std.range(0, std.length(spans) - 1)
  ]) + [
    k.turned('hub', 'hub', 'z', k.disc(w.hub.radius, -half - w.hub.stub, half + 0.02)) + { sides: 12 },
  ],
  finish: w.finish,
};

local classOf(name) = classes[tracks[name].class];
local wheelsOf(name) = { [w.site]: w + { radius: classOf(name)[w.key].radius } for w in tracks[name].wheels };

// The band's inner face as a convex loop round the wheels it wraps: a straight run tangent to each wheel and the next,
// and an arc round each wheel from the run arriving to the run leaving.
local runNormal(p, q) =
  local du = q.at[0] - p.at[0];
  local dv = q.at[1] - p.at[1];
  local span = std.sqrt(du * du + dv * dv);
  local sin = (p.radius - q.radius) / span;
  local cos = std.sqrt(1 - sin * sin);
  [dv / span * cos + du / span * sin, -du / span * cos + dv / span * sin];
local plus(a, b, s) = [a[0] + b[0] * s, a[1] + b[1] * s];
// Each link's centre on the loop and the degrees its x is rolled to: along a run they lie end to end, a little closer
// than their pitch so the run closes; round a wheel each is tangent to the wheel at its centre, and they overlap at
// their ends rather than open a gap.
local links(name) =
  local c = classOf(name);
  local pitch = c.link.pitch;
  local byId = wheelsOf(name);
  local loop = [byId[id] for id in tracks[name].loop];
  local n = std.length(loop);
  local normals = [runNormal(loop[i], loop[(i + 1) % n]) for i in std.range(0, n - 1)];
  local run(i) =
    local p = loop[i];
    local q = loop[(i + 1) % n];
    local a = plus(p.at, normals[i], p.radius);
    local b = plus(q.at, normals[i], q.radius);
    local length = std.sqrt(std.pow(b[0] - a[0], 2) + std.pow(b[1] - a[1], 2));
    local count = std.ceil(length / pitch);
    local roll = deg(std.atan2(b[1] - a[1], b[0] - a[0]));
    [{ at: [a[0] + (b[0] - a[0]) * (j + 0.5) / count, a[1] + (b[1] - a[1]) * (j + 0.5) / count], roll: roll } for j in std.range(0, count - 1)];
  local wrap(i) =
    local w = loop[i];
    local from = std.atan2(normals[(i + n - 1) % n][1], normals[(i + n - 1) % n][0]);
    local to0 = std.atan2(normals[i][1], normals[i][0]);
    local to = if to0 < from then to0 + 2 * std.pi else to0;
    local count = std.ceil((to - from) / (2 * std.atan(pitch / (2 * w.radius))));
    [
      local a = from + (to - from) * (j + 0.5) / count;
      { at: [w.at[0] + w.radius * std.cos(a), w.at[1] + w.radius * std.sin(a)], roll: deg(a) + 90 }
      for j in std.range(0, count - 1)
    ];
  std.flattenArrays([wrap(i) + run(i) for i in std.range(0, n - 1)]);

// The band of links, and a machine's track frame between its wheels.
local core(name) =
  local t = tracks[name];
  local l = link(classOf(name));
  local laid = links(name);
  {
    pieces: std.flattenArrays([
      [k.moved(k.rolled(p, laid[i].roll), [laid[i].at[0], laid[i].at[1], 0]) + { id: 'link_%d_%s' % [i, p.id] } for p in l.pieces]
      for i in std.range(0, std.length(laid) - 1)
    ]) + (if std.objectHas(t, 'frame') then [
      k.box('frame', 'frame', [t.frame.x[0], t.frame.y[0], -t.frame.halfWidth], [t.frame.x[1], t.frame.y[1], t.frame.halfWidth]),
    ] else []),
    finish: l.finish + (if std.objectHas(t, 'frame') then { frame: 'paint-charcoal' } else {}),
  };
// The band weighs its links, with a machine's frame.
local bandMass(name) =
  local t = tracks[name];
  std.length(links(name)) * classOf(name).link.massKg + (if std.objectHas(t, 'frame') then t.frame.massKg else 0);

local fittings(name) =
  local c = classOf(name);
  [
    { site: w.site, id: c[w.key].id, massKg: c[w.key].massKg, drawn: wheel(c[w.key]), at: [w.at[0], w.at[1], 0] }
    for w in tracks[name].wheels
  ];
local bandId(name) = name + '_band';
local wheelKeys = ['sprocket', 'idler', 'roadWheel', 'roller'];

local classRows(name) =
  local c = classes[name];
  (if std.objectHas(c.link, 'id') then [k.compound(c.link.id, c.link.massKg, link(c).pieces, link(c).finish)] else [])
  + [k.compound(c[key].id, c[key].massKg, wheel(c[key]).pieces, wheel(c[key]).finish) for key in wheelKeys if std.objectHas(c, key)];
local trackRows(name) =
  local accessories = fittings(name);
  assembly.rows(name, bandId(name), bandMass(name) + std.sum([a.massKg for a in accessories]), core(name), accessories);

{
  // A class's link and wheel rows, which one vehicle on the class emits; and a track's band and fused rows,
  // which its vehicle emits, so they carry its tags.
  classRows: classRows,
  trackRows: trackRows,
  // Every row the kit draws.
  rows: std.flattenArrays([classRows(name) for name in std.objectFields(classes)] + [trackRows(name) for name in std.objectFields(tracks)]),
  // The tracks, by the names `sites` takes.
  names: std.objectFields(tracks),
  // One track's sites, its frame placed at `at`; `detail` is 'fused' or 'assembly', as `assembly.libsonnet`, `sites`,
  // says. The band's site is `track`, each wheel's is the wheel's site in `tracks.libsonnet`.
  sites(name, at, detail): assembly.sites('track', name, bandId(name), fittings(name), at, detail),
  // A vehicle's near and far tracks, each site a near-side site and its mirrored far-side twin (`site.libsonnet`, `pair`).
  pair(name, at, detail): std.flattenArrays([site.pair(s.id, s.part, s.at) for s in $.sites(name, at, detail)]),
}
