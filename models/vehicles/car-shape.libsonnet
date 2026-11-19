// What a car's wheel arches and greenhouse share across its rows. `s.tumble` is how far the side glass, pillars and roof
// lean in from waist to roof; `s.archChamfer` is the cut off each top corner of a wheel arch. Prisms extrude straight
// along z, so legacy leaning pieces use one band per voxel of lean. `s.continuousCabin` instead clips a prism
// with sloping planes, keeping the authored lean continuous in both the mesh and its voxelized copy.
local k = import 'kit.libsonnet';
local grain = 0.03125;
local near(a, b) = std.abs(a - b) < 1e-6;
local clipY(poly, y, above) =
  local n = std.length(poly);
  local inside(p) = if above then p[1] >= y else p[1] <= y;
  std.flattenArrays([
    local a = poly[i];
    local b = poly[(i + 1) % n];
    (if inside(a) then [a] else [])
    + (if inside(a) != inside(b) then [[a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]), y]] else [])
    for i in std.range(0, n - 1)
  ]);
// Export refuses a repeated or collinear point, and a clip through a vertex makes both.
local tidy(poly) =
  local n = std.length(poly);
  local apart = [
    poly[i]
    for i in std.range(0, n - 1)
    if !(near(poly[i][0], poly[(i + 1) % n][0]) && near(poly[i][1], poly[(i + 1) % n][1]))
  ];
  local m = std.length(apart);
  local bends(i) =
    local p = apart[(i + m - 1) % m];
    local q = apart[(i + 1) % m];
    std.abs((apart[i][0] - p[0]) * (q[1] - apart[i][1]) - (apart[i][1] - p[1]) * (q[0] - apart[i][0])) > 1e-7;
  [apart[i] for i in std.range(0, m - 1) if bends(i)];
function(s) {
  local outer = self,
  grain: grain,
  tumble: std.get(s, 'tumble', 0.125),
  local steps = std.max(1, std.round(outer.tumble / grain)),
  local rise = s.roof - s.waist,
  local lineY(i) = s.waist + rise * i / steps,
  local insetOf(i) = outer.tumble * (i + 1) / steps,
  inset(y): insetOf(std.max(0, std.min(steps - 1, std.floor((y - s.waist) / rise * steps)))),
  // The height band `i` starts at, where a leaning piece steps in by one voxel.
  bandFoot(i): lineY(i),
  // The topmost band's id, for an anchor at the head of a leaning piece.
  top(id): id + '_' + (steps - 1),
  // The part of `profile` in each band; `range` gives its z span from that band's lean. The lowest band keeps whatever
  // lies below the waist and the highest whatever lies above the roof. `gap` stops each band short of the next one's
  // foot, so a moving piece clears the stepped piece that overhangs it there.
  band(id, slot, profile, range, gap=0):
    local slice(i) =
      local low = if i == 0 then profile else clipY(profile, lineY(i), true);
      tidy(if i == steps - 1 then low else clipY(low, lineY(i + 1) - gap, false));
    [
      k.prism(id + '_' + i, slot, slice(i), range(insetOf(i)))
      for i in std.range(0, steps - 1)
      if std.length(slice(i)) >= 3
    ],
  // A straight lean bounded by two planes, not a staircase. The profile bounds x/y; the planes bound z. As with `band`,
  // whatever lies below the waist keeps the waist's span and whatever lies above the roof keeps the roof's.
  continuous(id, slot, profile, range):
    local low = std.foldl(std.min, [p[1] for p in profile], profile[0][1]);
    local high = std.foldl(std.max, [p[1] for p in profile], profile[0][1]);
    assert high > low : id + ' has a flat profile, which leaves its lean no height to slope over';
    local at(y) = range(outer.tumble * (std.clamp(y, s.waist, s.roof) - s.waist) / rise);
    local foot = std.max(low, s.waist);
    local head = std.min(high, s.roof);
    local within(from, to) = tidy(clipY(clipY(profile, from, true), to, false));
    local upright(suffix, from, to, y) =
      local part = within(from, to);
      if std.length(part) >= 3 then [k.prism(id + suffix, slot, part, at(y))] else [];
    local a = at(foot);
    local b = at(head);
    local slope = [(b[i] - a[i]) / (head - foot) for i in [0, 1]];
    local leaning = if low >= s.waist && high <= s.roof then profile else within(foot, head);
    (if low < s.waist then upright('_foot', low, s.waist, s.waist) else [])
    + (if head > foot && std.length(leaning) >= 3 then [k.clipped(k.prism(id, slot, leaning, [std.min(a[0], b[0]), std.max(a[1], b[1])]), [
      { normal: [0, slope[0], -1], offset: slope[0] * foot - a[0] },
      { normal: [0, -slope[1], 1], offset: a[1] - slope[1] * foot },
    ])] else [])
    + (if high > s.roof then upright('_head', s.roof, high, s.roof) else []),
  // Whether this car's cabin leans continuously or in bands.
  continuousCabin: std.get(s, 'continuousCabin', false),
  local lean(id, slot, profile, range) =
    if outer.continuousCabin then outer.continuous(id, slot, profile, range) else outer.band(id, slot, profile, range),
  // Near side's z span at the waist, moved in whole.
  side(id, slot, profile, z): lean(id, slot, profile, function(inset) [z[0] - inset, z[1] - inset]),
  // Across the centre line, `half` at the waist.
  across(id, slot, profile, half): lean(id, slot, profile, function(inset) [inset - half, half - inset]),

  // The transmission tunnel is a hollow hump over the gearbox and shafts, so a car with an inline gearbox gives
  // `s.tunnel` the space its driveline needs inside it: a half width, a top and how far back it runs. Its outer
  // measures set the body's tunnel and the console that stands on it, where the gear lever sits.
  tunnel:
    local lift = std.get(s, 'lift', 0);
    local space = std.get(s, 'tunnel', {});
    local wall = 0.04;
    {
      wall: wall,
      half: std.get(space, 'half', 0.08) + wall,
      top: std.get(space, 'top', 0.41 + lift) + wall,
      back: std.get(space, 'back', s.rearFloorFront + 0.35),
      consoleTop: self.top + 0.1,
    },

  // The bonnet's top at `x` along the car, its front face's line and its thickness.
  hood(x): s.hoodBack - (x - s.aPost) * s.hoodFall,
  nose: s.front - 0.075,
  bonnetThick: 0.0625,
  // The bonnet hinges on its top rear edge, above its nose, so its nose swings forward as it lifts, its lower front edge
  // furthest. What stands ahead of the nose up to `top`, below the pins, must stand this far clear of it: how far that
  // edge has passed the nose by the time it rises to `top`.
  bonnetSweep(top):
    local pins = [s.aPost, outer.hood(s.aPost)];
    local reach = outer.nose - pins[0];
    local drop = pins[1] - (outer.hood(outer.nose) - outer.bonnetThick);
    assert top < pins[1] : 'the bonnet sweep is measured below its pins';
    std.max(0, std.sqrt(reach * reach + drop * drop - std.pow(pins[1] - top, 2)) - reach),

  chamfer: std.get(s, 'archChamfer', std.round(s.arch * 0.5 / grain) * grain),
  local c = outer.chamfer,
  aftCorner(id, slot, axle, z, top=s.archTop):
    local x = axle - s.arch;
    k.prism(id, slot, [[x, top - c], [x + c, top], [x, top]], z),
  foreCorner(id, slot, axle, z, top=s.archTop):
    local x = axle + s.arch;
    k.prism(id, slot, [[x, top - c], [x, top], [x - c, top]], z),
  // The arch's inner roof and wall, cut to the same five sides, so no square hole shows behind the panel. `thick` is
  // measured up from the opening.
  liner(id, slot, axle, low, zRoof, zWall, thick=0.0625, top=s.archTop):
    local x0 = axle - s.arch;
    local x1 = axle + s.arch;
    [
      k.box(id + '_top', slot, [x0 + c, top, zRoof[0]], [x1 - c, top + thick, zRoof[1]]),
      k.prism(id + '_top_aft', slot, [[x0, top - c], [x0 + c, top], [x0 + c, top + thick], [x0, top - c + thick]], zRoof),
      k.prism(id + '_top_fore', slot, [[x1 - c, top], [x1, top - c], [x1, top - c + thick], [x1 - c, top + thick]], zRoof),
      k.prism(id + '_wall', slot, [[x0, low], [x1, low], [x1, top - c + thick], [x1 - c, top + thick], [x0 + c, top + thick], [x0, top - c + thick]], zWall),
    ],
  // A moulded lip round the opening, `out` past it and `over` into it, from `low` up.
  flare(id, slot, axle, low, z, out, over, half=0.03):
    local halves = outer.flareHalves(id, slot, axle, low, z, out, over, half=half);
    halves.aft + halves.fore,
  // The lip in two, cut across its top at `shut`, for an arch whose fore edge lies on a door: the `fore` half rides it.
  flareHalves(id, slot, axle, low, z, out, over, shut=null, half=0.03):
    local x0 = axle - s.arch;
    local x1 = axle + s.arch;
    local top = s.archTop;
    local cut = if shut == null then x1 - c else std.clamp(shut, x0 + c, x1 - c);
    {
      aft: (if cut > x0 + c then [k.box(id + '_top', slot, [x0 + c, top - half, z[0]], [cut, top + half, z[1]])] else []) + [
        k.prism(id + '_aft_slant', slot, [[x0 - out, top - c], [x0 + over, top - c], [x0 + c, top - half], [x0 + c, top + half]], z),
        k.box(id + '_back', slot, [x0 - out, low, z[0]], [x0 + over, top - c, z[1]]),
      ],
      fore: (if cut < x1 - c then [k.box(id + '_top_fore', slot, [cut, top - half, z[0]], [x1 - c, top + half, z[1]])] else []) + [
        k.prism(id + '_fore_slant', slot, [[x1 - over, top - c], [x1 + out, top - c], [x1 - c, top + half], [x1 - c, top - half]], z),
        k.box(id + '_fore', slot, [x1 - over, low, z[0]], [x1 + out, top - c, z[1]]),
      ],
    },
}
