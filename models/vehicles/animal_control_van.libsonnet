local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local van = import 'van-body.libsonnet';
local s = import 'animal_control_van.spec.libsonnet';
local vehicle = import 'animal_control_van.placements.libsonnet';
local box = k.box;
local b = s.box;
local wallIn = van.wallIn(b);
// Each cage stops short of the lips behind the hatches, so its barred gate lies just inside the open hatch.
local depth = wallIn - k.jambDepth - b.cageIn;
local tail = van.tail(s);
local hatch = b.hatches.size;
taxonomy.inherit({ tags: { 'vehicle-body': ['van'] } }, van.rows('animal_control_van', vehicle.title, s) + [
  k.compound('animal_control_van_cage', 26, [
    box('floor', 'steel', [0, 0, 0], [b.width, 0.03, depth]),
    box('top', 'steel', [0, b.cageHeight - 0.03, 0], [b.width, b.cageHeight, depth]),
    box('front', 'steel', [b.width - 0.02, 0, 0], [b.width, b.cageHeight, depth]),
    box('rear', 'steel', [0, 0, 0], [0.02, b.cageHeight, depth]),
    box('back', 'steel', [0, 0, 0], [b.width, b.cageHeight, 0.02]),
    box('door_rail', 'mesh', [0, 0.32, depth - 0.03], [b.width, 0.36, depth]),
  ] + [
    box('door_bar' + i, 'mesh', [0.04 + i * 0.14, 0.03, depth - 0.03], [0.08 + i * 0.14, b.cageHeight - 0.03, depth])
    for i in std.range(0, 3)
  ], { steel: 'steel-galvanised', mesh: 'steel-grey' }) + { title: 'Animal control van cage' },
  // One cage's hatch, drawn from its opening's rear lower corner. It hangs on its leading edge, as the cab doors do, so
  // the wind closes one left unlatched rather than tearing it open, and its pins stand on its outer face so its leading
  // edge swings back off the wall ahead. The vent grille and the latch ride it.
  local pins = k.hingePins('hinge', 'y', [hatch[0], 0.2 * hatch[1], b.side + k.grain], [hatch[0], 0.8 * hatch[1], b.side + k.grain]);
  local rear = k.doorTailGap(hatch[0], b.side + k.grain - wallIn);
  k.compound('animal_control_van_hatch', 6, [
    box('skin', 'paint', [rear, k.swingGap, wallIn + k.swingGap], [hatch[0] - k.swingGap, hatch[1] - k.swingGap, b.side]),
    box('vent', 'dark', [0.1, 0.06, b.side], [hatch[0] - 0.06, hatch[1] - 0.06, b.side + 0.012]),
    box('vent_head', 'steel', [0.1, hatch[1] - 0.1, b.side + 0.012], [hatch[0] - 0.06, hatch[1] - 0.06, b.side + 0.03]),
    box('vent_foot', 'steel', [0.1, 0.06, b.side + 0.012], [hatch[0] - 0.06, 0.1, b.side + 0.03]),
    box('latch', 'steel', [0.03, hatch[1] / 2 - 0.06, b.side], [0.07, hatch[1] / 2 + 0.06, b.side + 0.02]),
  ] + [
    box('vent_bar' + i, 'steel', [0.1 + i * 0.11, 0.06, b.side + 0.012], [0.14 + i * 0.11, hatch[1] - 0.06, b.side + 0.03])
    for i in std.range(0, 3)
  ] + pins, { paint: s.paint, dark: 'paint-charcoal', steel: 'steel-stainless' }, motion=k.motion.hinge(pins, 'near', 90)) + { title: 'Animal control van hatch' },
  // One rear leaf's grilles, whose face looks along x.
  k.compound('animal_control_van_rear_hatches', 8, std.flattenArrays([
    [
      box(tag[0] + '_plate', 'dark', [tail - 0.012, tag[1], 0.12], [tail, tag[2], 0.82]),
      box(tag[0] + '_head', 'steel', [tail - 0.03, tag[2] - 0.04, 0.12], [tail - 0.012, tag[2], 0.82]),
      box(tag[0] + '_foot', 'steel', [tail - 0.03, tag[1], 0.12], [tail - 0.012, tag[1] + 0.04, 0.82]),
    ] + [
      box(tag[0] + '_bar' + i, 'steel', [tail - 0.03, tag[1], 0.12 + i * 0.165], [tail - 0.012, tag[2], 0.16 + i * 0.165])
      for i in std.range(0, 4)
    ]
    for tag in [['low', 1.08, 1.54], ['high', 1.62, 2.1]]
  ]), { dark: 'paint-charcoal', steel: 'steel-stainless' }) + { title: 'Animal control van rear hatches' },
])
