// Building placement facts share the geometry's specifications, not its drawn bounds.
local timber = import 'timber.spec.libsonnet';
local stone = import 'stone.spec.libsonnet';
local kit(id, s, width) = {
  version: 1, id: id, revision: 1,
  grid: { bay: s.bay, storey: s.storey, floorTop: 0, slabBottom: -s.floor },
  joins: { wall_node: { kind: 'square-node-infill', nodeWidth: width, depth: width, height: s.storey } },
};
local tk = kit('medieval_timber', timber, timber.timber);
local sk = kit('medieval_stone', stone, stone.wall);
local module(k, layout) = { version: 1, kit: { id: k.id, revision: k.revision }, layout: layout };
local wall(k) = module(k, { kind: 'wall-infill', join: 'wall_node', nodes: [[-k.grid.bay / 2, 0, 0], [k.grid.bay / 2, 0, 0]] });
local node(k) = module(k, { kind: 'shared-node', join: 'wall_node', at: [0, 0, 0] });
local floor(k) = module(k, { kind: 'surface', footprint: { x: [-k.grid.bay / 2, k.grid.bay / 2], z: [-k.grid.bay / 2, k.grid.bay / 2] }, bottom: k.grid.slabBottom, top: k.grid.floorTop });
{
  kits: [{ pack: 'skelly.structures', kit: tk }, { pack: 'skelly.structures', kit: sk }],
  timber: {
    medieval_timber_post: node(tk),
    medieval_timber_wall: wall(tk),
    medieval_timber_floor: floor(tk),
  },
  stone: {
    medieval_stone_pier: node(sk),
    medieval_stone_wall: wall(sk),
    medieval_stone_floor: floor(sk),
  },
}
