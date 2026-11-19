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
local frame(at, normal=[0, 0, 1]) = { at: at, normal: normal, up: [0, 1, 0] };
local module(k, layout) = { version: 1, kit: { id: k.id, revision: k.revision }, layout: layout };
local wall(k) = module(k, { kind: 'wall-infill', join: 'wall_node', nodes: [[-k.grid.bay / 2, 0, 0], [k.grid.bay / 2, 0, 0]] });
local node(k) = module(k, { kind: 'shared-node', join: 'wall_node', at: [0, 0, 0] });
local surface(k, bottom, top) = module(k, { kind: 'surface', footprint: { x: [-k.grid.bay / 2, k.grid.bay / 2], z: [-k.grid.bay / 2, k.grid.bay / 2] }, bottom: bottom, top: top });
local aperture(id, profile, depth) = { id: id, basis: 'nominal', frame: frame([0, 0, 0]), profile: profile, through: [-depth / 2, depth / 2] };
local rectangle(x0, y0, x1, y1) = { kind: 'rectangle', x: [x0, x1], y: [y0, y1] };
local span(k, half, z0, z1) = module(k, { kind: 'span', supportX: [-half, half], extentZ: [z0, z1] });
local roof = { kind: 'pitched-shell', basis: 'nominal', halfSpan: timber.roofHalfSpan, rise: timber.roofRise, overhang: timber.eave, verticalThickness: timber.roofThickness };
local radius = stone.vault.radius + stone.vault.ring;
local shell = { kind: 'semicircular-shell', basis: 'nominal', innerRadius: stone.vault.radius, outerRadius: radius };
local arch(z0, z1) = span(sk, radius, z0, z1) + {
  layout+: { bearingX: [[-radius, -stone.vault.radius], [stone.vault.radius, radius]] },
  section: shell,
};
// Subtract integer lattice levels before scaling, so metadata records 0.14/0.16 rather than cancellation noise.
local treadLevels = [0] + [std.round(stone.stair.rise * (i + 1) / stone.stair.steps / stone.grain) for i in std.range(0, stone.stair.steps - 1)];
{
  kits: [{ pack: 'skelly.structures', kit: tk }, { pack: 'skelly.structures', kit: sk }],
  timber: {
    medieval_timber_post: node(tk),
    medieval_timber_wall: wall(tk),
    medieval_timber_braced_wall: wall(tk),
    medieval_timber_doorway: wall(tk) + {
      apertures: [aperture('door', rectangle(-timber.door.halfWidth, 0, timber.door.halfWidth, timber.door.height), timber.timber)],
    },
    medieval_timber_window: wall(tk) + {
      apertures: [aperture('window', rectangle(-timber.window.halfWidth, timber.window.bottom, timber.window.halfWidth, timber.window.top), timber.timber)],
    },
    medieval_plank_door: module(tk, { kind: 'static-insert', frame: frame([0, 0, 0]), opening: { model: 'medieval_timber_doorway', aperture: 'door' } }),
    medieval_timber_floor: surface(tk, tk.grid.slabBottom, tk.grid.floorTop),
    medieval_timber_gable_4m: span(tk, timber.roofHalfSpan, -timber.timber / 2, timber.timber / 2) + {
      section: { kind: 'triangular-panel', basis: 'nominal', halfSpan: timber.roofHalfSpan, rise: timber.roofRise },
    },
    medieval_tile_roof_4m: span(tk, timber.roofHalfSpan, -timber.bay / 2, timber.bay / 2) + {
      layout+: { repeat: [0, 0, timber.bay] }, section: roof,
      datums: { rear: frame([0, 0, -timber.bay / 2], [0, 0, -1]), front: frame([0, 0, timber.bay / 2]) },
    },
    medieval_tile_verge_4m: span(tk, timber.roofHalfSpan, 0, timber.verge) + {
      section: roof, datums: { attachment: frame([0, 0, 0], [0, 0, -1]) },
    },
  },
  stone: {
    medieval_stone_pier: node(sk),
    medieval_stone_wall: wall(sk),
    medieval_stone_slit_window: wall(sk) + {
      apertures: [aperture('window', rectangle(-stone.slit.halfWidth, stone.slit.bottom, stone.slit.halfWidth, stone.slit.top), stone.wall)],
    },
    medieval_stone_arch_doorway: wall(sk) + {
      apertures: [aperture('portal', { kind: 'semicircular-head', bottom: 0, spring: stone.door.spring, radius: stone.door.radius }, stone.wall)],
    },
    medieval_stone_floor: surface(sk, sk.grid.slabBottom, sk.grid.floorTop),
    medieval_stone_stair: module(sk, {
      kind: 'stair-flight', width: stone.stair.width, run: stone.stair.run, rise: stone.stair.rise,
      treadDepth: stone.stair.run / stone.stair.steps,
      risers: [(treadLevels[i + 1] - treadLevels[i]) * stone.grain for i in std.range(0, stone.stair.steps - 1)],
    }) + { datums: { lower_approach: frame([0, 0, -stone.stair.run / 2], [0, 0, -1]), upper_edge: frame([0, stone.stair.rise, stone.stair.run / 2]) } },
    medieval_stone_plinth: surface(sk, 0, stone.stair.rise),
    medieval_stone_battlement: module(sk, {
      kind: 'edge-run', extentX: [-stone.bay / 2, stone.bay / 2], depth: stone.wall,
      baseHeight: stone.parapet.base, height: stone.parapet.height, repeat: [stone.bay, 0, 0],
    }),
    medieval_stone_arch_4m: arch(-stone.wall / 2, stone.wall / 2),
    medieval_stone_vault_4m: arch(-stone.bay / 2, stone.bay / 2) + { layout+: { repeat: [0, 0, stone.bay] } },
    medieval_stone_vault_end_4m: span(sk, radius, -stone.wall / 2, stone.wall / 2) + {
      section: { kind: 'semicircular-panel', basis: 'nominal', radius: radius },
    },
    medieval_stone_buttress: module(sk, { kind: 'face-attachment', frame: frame([0, 0, 0], [0, 0, -1]) }),
  },
}
