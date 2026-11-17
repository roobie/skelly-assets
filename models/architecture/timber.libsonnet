// The first medieval building kit: infill stops short of grid nodes, where separate posts close both straight and
// perpendicular joins. Source rows stay plain data; functions and shared measures belong here, not in the row set.
local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local s = import 'timber.spec.libsonnet';
local metadata = (import 'metadata.libsonnet').timber;
local half = (s.bay - s.timber) / 2;
local finish = { plaster: 'chalk-white', timber: 'wood-walnut', board: 'wood-oak', roof: 'clay-terracotta', iron: 'iron-dull' };
local taxonomy = { category: 'structures', tags: { setting: ['medieval'] } };
local row(id, title, kg, pieces, materials=['wood']) =
  h.compound(id, kg, pieces, finish) + { title: title, voxelGrain: s.grain, taxonomy: taxonomy + { tags+: { material: materials } } }
  + (if std.objectHas(metadata, id) then { building: metadata[id] } else {});
local panel(id, x0, y0, x1, y1) = h.box(id, 'plaster', [x0, y0, -s.plaster / 2], [x1, y1, s.plaster / 2]);
local beam(id, x0, y0, x1, y1) = h.box(id, 'timber', [x0, y0, -s.timber / 2], [x1, y1, s.timber / 2]);
local cap = beam('cap', -half, s.storey - s.timber, half, s.storey);
local sill = beam('sill', -half, 0, half, s.timber);
local wall = [panel('infill', -half, s.timber, half, s.storey - s.timber), cap, sill];
// Roof strips repeat along z. Both slopes share their ridge; their undersides meet the gable's 45-degree outline.
local roof(length, z0) =
  local reach = s.roofHalfSpan + s.eave;
  local y(x) = s.roofRise * (1 - x / s.roofHalfSpan);
  std.flattenArrays([
    local xa = reach * i / 10, xb = reach * (i + 1) / 10;
    local outline = [[side * xa, y(xa)], [side * xb, y(xb)], [side * xb, y(xb) + s.roofThickness], [side * xa, y(xa) + s.roofThickness]];
    [h.prism('tile-%d-%d-%d' % [side, i, j], 'roof', 'z', outline, z0 + length * j / 4, z0 + length * (j + 1) / 4)]
    // A raised lower edge gives each course a readable step without making gaps through the roof.
    + [h.prism('lip-%d-%d-%d' % [side, i, j], 'roof', 'z', [
      [side * (xb - 0.04), y(xb - 0.04) + s.roofThickness], [side * xb, y(xb) + s.roofThickness],
      [side * xb, y(xb) + s.roofThickness + 0.04], [side * (xb - 0.04), y(xb - 0.04) + s.roofThickness + 0.04],
    ], z0 + length * j / 4 + 0.01, z0 + length * (j + 1) / 4 - 0.01)]
    for side in [-1, 1]
    for i in std.range(0, 9)
    for j in std.range(0, 3)
  ]);
{
  rows: [
    row('medieval_timber_post', 'Medieval timber post', 84, [beam('post', -s.timber / 2, 0, s.timber / 2, s.storey)]),
    row('medieval_timber_wall', 'Medieval timber and plaster wall', 420, wall, ['wood', 'stone']),
    row('medieval_timber_braced_wall', 'Medieval braced timber wall', 440,
      wall + h.bend('brace', 'timber', [[-half + 0.08, s.timber + 0.08], [half - 0.08, s.storey - s.timber - 0.08]], 0.12, -s.timber / 2, s.timber / 2), ['wood', 'stone']),
    local d = s.door;
    local outer = d.halfWidth + d.jamb;
    row('medieval_timber_doorway', 'Medieval timber doorway', 220, [
      panel('infill-left', -half, 0, -outer, s.storey - s.timber),
      panel('infill-right', outer, 0, half, s.storey - s.timber),
      panel('infill-top', -outer, d.height + d.jamb, outer, s.storey - s.timber),
      beam('jamb-left', -outer, 0, -d.halfWidth, d.height + d.jamb),
      beam('jamb-right', d.halfWidth, 0, outer, d.height + d.jamb),
      beam('lintel', -d.halfWidth, d.height, d.halfWidth, d.height + d.jamb), cap,
    ], ['wood', 'stone']),
    local w = s.window;
    local outer = w.halfWidth + w.frame;
    row('medieval_timber_window', 'Medieval timber window wall', 330, [
      panel('infill-left', -half, s.timber, -outer, s.storey - s.timber),
      panel('infill-right', outer, s.timber, half, s.storey - s.timber),
      panel('infill-below', -outer, s.timber, outer, w.bottom - w.frame),
      panel('infill-above', -outer, w.top + w.frame, outer, s.storey - s.timber),
      beam('jamb-left', -outer, w.bottom - w.frame, -w.halfWidth, w.top + w.frame),
      beam('jamb-right', w.halfWidth, w.bottom - w.frame, outer, w.top + w.frame),
      beam('window-sill', -w.halfWidth, w.bottom - w.frame, w.halfWidth, w.bottom),
      beam('window-lintel', -w.halfWidth, w.top, w.halfWidth, w.top + w.frame), cap, sill,
    ], ['wood', 'stone']),
    local d = s.door;
    local hw = d.halfWidth - d.clearance;
    row('medieval_plank_door', 'Medieval plank door', 38, [
      h.box('back', 'board', [-hw, d.clearance, -0.04], [hw, d.height - d.clearance, 0]),
    ] + [
      h.box('plank-%d' % i, 'board', [-hw + 2 * hw * i / 7 + s.grain, d.clearance, 0], [-hw + 2 * hw * (i + 1) / 7 - s.grain, d.height - d.clearance, 0.04])
      for i in std.range(0, 6)
    ] + [
      h.box('strap-%d' % i, 'iron', [-hw, y, 0.04], [hw, y + 0.08, 0.08])
      for i in [0, 1] for y in [0.36 + i * 1.32]
    ] + [h.box('latch', 'iron', [0.32, 0.96, 0.04], [0.44, 1.08, 0.12])], ['wood', 'metal']),
    row('medieval_timber_floor', 'Medieval timber floor bay', 150, [
      h.box('deck', 'board', [-s.bay / 2, -s.floor, -s.bay / 2], [s.bay / 2, -0.04, s.bay / 2]),
    ] + [
      h.box('board-%d' % i, 'board', [-s.bay / 2, -0.04, -s.bay / 2 + s.bay * i / 10 + s.grain], [s.bay / 2, 0, -s.bay / 2 + s.bay * (i + 1) / 10 - s.grain])
      for i in std.range(0, 9)
    ]),
    row('medieval_timber_gable_4m', 'Medieval timber gable, four metre span', 380, [
      h.prism('infill', 'plaster', 'z', [[-s.roofHalfSpan, 0], [s.roofHalfSpan, 0], [0, s.roofRise]], -s.plaster / 2, s.plaster / 2),
      // Clip the tie's ends to the roof pitch; a rectangular tie pokes through the roof at the eaves.
      h.prism('tie', 'timber', 'z', [[-s.roofHalfSpan, 0], [s.roofHalfSpan, 0],
        [s.roofHalfSpan - s.timber, s.timber], [-s.roofHalfSpan + s.timber, s.timber]], -s.timber / 2, s.timber / 2),
      beam('king-post', -s.timber / 2, 0, s.timber / 2, s.roofRise - s.timber),
    ] + [
      h.prism('rafter-%d' % side, 'timber', 'z', [[side * s.roofHalfSpan, 0], [0, s.roofRise],
        [0, s.roofRise - 0.16], [side * (s.roofHalfSpan - 0.16), 0]], -s.timber / 2, s.timber / 2)
      for side in [-1, 1]
    ], ['wood', 'stone']),
    row('medieval_tile_roof_4m', 'Medieval tiled roof bay, four metre span', 440, roof(s.bay, -s.bay / 2), ['ceramic']),
    row('medieval_tile_verge_4m', 'Medieval tiled roof verge, four metre span', 66, roof(s.verge, 0), ['ceramic']),
  ],
}
