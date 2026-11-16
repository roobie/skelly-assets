local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local s = import 'double_decker.spec.libsonnet';
local vehicle = import 'double_decker.placements.libsonnet';
local count = 10;
local low = s.floor;
local high = s.decks[1].floor;
local rise = (high - low) / count;
local run = (s.stairs.low - s.stairs.high) / count;
local bus = import 'bus-body.libsonnet';
local locker = bus.layout(s).locker;
// What stands against the far skin under the stairs: the front wheelhouse and the battery locker, each up to its lid.
local blocks = [{ x: [s.frontAxle - s.arch, s.frontAxle + s.arch], wall: -s.frontWell, lid: s.archTop + 0.06 }]
               + (if locker == null then [] else [{ x: locker.footprint, wall: locker.back + locker.wall, lid: locker.top + locker.wall }]);
taxonomy.inherit({ tags: { 'vehicle-body': ['bus'] } }, bus.rows('double_decker', vehicle.title, s) + [
  // Treads beside a block stop at its wall and only widen to the skin above its lid.
  k.compound('double_decker_stairs', 90, std.flattenArrays([
    local x0 = s.stairs.low - run * (i + 1);
    local x1 = s.stairs.low - run * i;
    local top = low + rise * (i + 1);
    local over = [b for b in blocks if x1 > b.x[0] && x0 < b.x[1]];
    local wall = std.foldl(std.max, [b.wall for b in over], -s.skin);
    local lid = std.foldl(std.max, [b.lid for b in over], low);
    [
      k.box('tread_' + i, 'tread', [x0, low, wall], [x1, top, s.stairs.inner]),
      k.box('toe_' + i, 'edge', [x1 - 0.015, top - 0.03, if top > lid then -s.skin else wall], [x1, top, s.stairs.inner]),
    ] + (if over != [] && top > lid then [
           k.box('tread_over_' + i, 'tread', [x0, lid, -s.skin], [x1, top, wall]),
         ] else [])
    for i in std.range(0, count - 1)
  ]), { tread: 'plastic-charcoal', edge: 'paint-crane-yellow' }) + { title: 'Double-decker bus stairs' },
  // The rails around the stairwell are bright, so the stairs read through the upper windows.
  k.compound('double_decker_stair_rail', 14, [
    k.box('top', 'bright', [s.stairWell.x[0], 0.86, -0.02], [s.stairWell.x[1], 0.9, 0.02]),
    k.turned('post_a', 'bright', 'y', k.disc(0.02, 0, 0.86), [s.stairWell.x[0] + 0.03, 0, 0]),
    k.turned('post_b', 'bright', 'y', k.disc(0.02, 0, 0.86), [s.stairWell.x[1] - 0.03, 0, 0]),
  ], { bright: 'paint-crane-yellow' }) + { title: 'Double-decker bus stair rail' },
])
