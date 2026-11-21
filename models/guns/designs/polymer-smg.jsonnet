local base = import 'archetype-smg.json';
local parts = base.assembly.parts;
base + {
  template: 'polymer-smg',
  platform: { id: 'polymer-smg', sizeClass: 'polymer-smg' },
  assembly: base.assembly + {
    name: 'polymer-smg',
    description: 'Polymer-framed submachine gun with a straight magazine and a side-folding skeleton stock.',
    // Its traced sights and rails are barrel, receiver and handguard solids, so the add-on sight parts stay off;
    // see `packages/gun-authoring-tool/docs/polymer-smg-export.md`.
    parts: {
      [name]: parts[name]
      for name in std.objectFields(parts)
      if name != 'front-sight' && name != 'sight'
    } + {
      receiver: parts.receiver + { params: parts.receiver.params + { section: 'polymer-smg', rail: 'none' } },
      barrel: parts.barrel + { params: parts.barrel.params + { muzzle: 'threaded' } },
      stock: parts.stock + { params: parts.stock.params + { style: 'skeleton-folding' } },
    },
    connections: [
      c
      for c in base.assembly.connections
      if c.to != 'sight.base' && c.to != 'front-sight.base'
    ],
  },
}
