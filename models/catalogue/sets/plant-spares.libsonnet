local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local tax(material) = { category: 'machinery', tags: { material: material, place: ['workshop'], setting: ['modern'] } };
local row(id, title, mass, pieces, finish, grip, material) =
  h.compound(id, mass, pieces, finish) + h.gripStanding(id, grip) + {
    title: title, exportMass: 'inventory-atom', voxelGrain: 0.002, taxonomy: tax(material),
  };
// A wound spring uses the existing bent-bar solid; its square wire section survives the item detail grain.
local spring(id, x, y, z, radius, length, turns, wire) =
  h.bentBar(id, 'steel', [
    local a = i * 2 * std.pi / 12;
    [x + length * i / (turns * 12), y + radius * std.cos(a), z + radius * std.sin(a)]
    for i in std.range(0, turns * 12)
  ], wire, wire);
[
  // Paired rectangular electrographite brushes, open brass guide boxes, pressure springs and copper shunts.
  row('exciter_brush_set', 'Exciter brush set', 0.3,
    std.flattenArrays([
      local x = side * 0.025;
      [
        h.box('carbon-%d' % side, 'carbon', [x - 0.010, 0, -0.008], [x + 0.010, 0.050, 0.008]),
        h.box('guide-left-%d' % side, 'brass', [x - 0.014, 0.020, -0.012], [x - 0.010, 0.064, 0.012]),
        h.box('guide-right-%d' % side, 'brass', [x + 0.010, 0.020, -0.012], [x + 0.014, 0.064, 0.012]),
        h.box('guide-back-%d' % side, 'brass', [x - 0.014, 0.020, -0.012], [x + 0.014, 0.064, -0.008]),
        h.box('spring-seat-%d' % side, 'brass', [x - 0.014, 0.082, -0.012], [x + 0.014, 0.086, 0.012]),
      ] + h.bentBar('pressure-%d' % side, 'steel', [
        local a = i * 2 * std.pi / 12;
        [x + 0.006 * std.cos(a), 0.050 + 0.032 * i / 48, 0.006 * std.sin(a)]
        for i in std.range(0, 48)
      ], 0.004, 0.004)
      + h.pipe('shunt-%d' % side, 'copper', [[x, 0.046], [x + side * 0.020, 0.070], [x + side * 0.020, 0.104]], 0.003, 0.016)
      + [h.box('terminal-%d' % side, 'copper', [x + side * 0.020 - 0.007, 0.100, 0.012], [x + side * 0.020 + 0.007, 0.112, 0.020])]
      for side in [-1, 1]
    ]) + [h.box('crossbar', 'brass', [-0.046, 0.030, -0.020], [0.046, 0.046, -0.012])],
    { carbon: 'paint-charcoal', brass: 'brass-dull', steel: 'steel-grey', copper: 'copper' }, 'crossbar', ['metal']),
  // A removable valve-control rod with forked clevises, locknuts, bell crank and a return spring.
  row('governor_linkage', 'Governor linkage', 2.5,
    [h.rod('rod', 'steel', 0.012, -0.140, 0.140, 0.040)]
    + std.flattenArrays([
      local x = side * 0.140;
      [
        h.prism('locknut-%d' % side, 'brass', 'x', [[0.040 + 0.020 * std.cos(i * std.pi / 3), 0.020 * std.sin(i * std.pi / 3)] for i in std.range(0, 5)], x - 0.008, x + 0.008),
        h.box('fork-top-%d' % side, 'steel', [x - 0.036, 0.052, -0.020], [x + 0.036, 0.060, 0.020]),
        h.box('fork-bottom-%d' % side, 'steel', [x - 0.036, 0.020, -0.020], [x + 0.036, 0.028, 0.020]),
        h.turned('pin-%d' % side, 'brass', 'y', [[0, 0], [0, 0.008], [0.048, 0.008], [0.048, 0]], [x + side * 0.026, 0.016, 0]),
      ] for side in [-1, 1]
    ])
    + h.bend('crank', 'steel', [[-0.026, 0.040], [0, 0.040], [0.044, 0.116]], 0.024, -0.010, 0.010)
    + [h.turned('pivot', 'brass', 'z', [[0, 0], [0, 0.020], [0.032, 0.020], [0.032, 0]], [0, 0.040, -0.016])]
    + spring('return', -0.100, 0.090, 0, 0.014, 0.130, 10, 0.004)
    + h.pipe('spring-end', 'steel', [[-0.100, 0.104], [-0.118, 0.104], [-0.118, 0.054]], 0.002)
    + h.pipe('spring-crank', 'steel', [[0.030, 0.104], [0.044, 0.104], [0.044, 0.116]], 0.002),
    { steel: 'steel-grey', brass: 'brass-dull' }, 'rod', ['metal']),
  // Industrial ceramic cartridge with ferrule contacts, rather than a domestic glass fuse.
  row('field_fuse', 'Field fuse', 0.15, [
    h.turned('ceramic', 'ceramic', 'y', [[0, 0], [0, 0.015], [0.085, 0.015], [0.085, 0]]),
    h.turned('lower-contact', 'steel', 'y', [[0, 0], [0, 0.016], [0.018, 0.016], [0.018, 0]]),
    h.turned('upper-contact', 'steel', 'y', [[0.067, 0], [0.067, 0.016], [0.085, 0.016], [0.085, 0]]),
    h.box('label', 'label', [-0.010, 0.032, 0.012], [0.010, 0.052, 0.016]),
    h.box('rating-band', 'ink', [-0.006, 0.038, 0.016], [0.006, 0.042, 0.018]),
  ], { ceramic: 'ceramic-white', steel: 'steel-grey', label: 'paper-pages-cream', ink: 'paint-charcoal' }, 'ceramic', ['metal', 'ceramic']),
  // Brass sight-feed lubricator: glass reservoir, tie rods, filler, needle adjuster and threaded outlet.
  row('bearing_oiler', 'Bearing oiler', 0.6, [
    h.turned('outlet', 'brass', 'y', [[0, 0], [0, 0.010], [0.026, 0.010], [0.026, 0]]),
    h.prism('hex-base', 'brass', 'y', [[0.022 * std.cos(i * std.pi / 3), 0.022 * std.sin(i * std.pi / 3)] for i in std.range(0, 5)], 0.020, 0.040),
    h.turned('sight-feed', 'glass', 'y', [[0.040, 0], [0.040, 0.014], [0.060, 0.014], [0.060, 0]]),
    h.turned('bottom', 'brass', 'y', [[0.060, 0], [0.060, 0.032], [0.070, 0.032], [0.070, 0]]),
    h.turned('reservoir', 'glass', 'y', [[0.070, 0], [0.070, 0.028], [0.130, 0.028], [0.130, 0]]),
    h.turned('oil', 'oil', 'y', [[0.070, 0], [0.070, 0.029], [0.100, 0.029], [0.100, 0]]),
    h.turned('lid', 'brass', 'y', [[0.130, 0], [0.130, 0.032], [0.140, 0.032], [0.140, 0]]),
    h.turned('needle', 'brass', 'y', [[0.140, 0], [0.140, 0.006], [0.162, 0.006], [0.162, 0]]),
    h.turned('adjuster', 'steel', 'y', [[0.158, 0], [0.158, 0.016], [0.166, 0.016], [0.166, 0]]),
    h.turned('filler', 'brass', 'y', [[0.140, 0], [0.140, 0.008], [0.150, 0.008], [0.150, 0]], [0.020, 0, 0]),
  ] + [
    h.turned('tie-%d' % side, 'brass', 'y', [[0.066, 0], [0.066, 0.003], [0.136, 0.003], [0.136, 0]], [side * 0.028, 0, 0])
    for side in [-1, 1]
  ], { brass: 'brass-dull', steel: 'steel-grey', glass: 'glass-grey', oil: 'fuel-amber' }, 'reservoir', ['metal', 'glass']),
]
