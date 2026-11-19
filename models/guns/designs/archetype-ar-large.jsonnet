local base = import 'archetype-ar-free-float.json';
base + {
  calibre: '308-winchester',
  platform+: { sizeClass: 'ar-10' },
  assembly: base.assembly + {
    name: 'archetype-ar-large',
    description: 'AR-10 class rifle in 7.62×51 on the large AR frame, with a free-floating rail and a front sight on it.',
    parts: { [id]: base.assembly.parts[id] for id in std.objectFields(base.assembly.parts) if id != 'sight' } + {
      receiver: { item: 'receiver_ar_large' },
      'charging-handle': { item: 'charging_handle_ar_large' },
      'bolt-carrier': { item: 'bolt_carrier_ar_large' },
      lower: { item: 'lower_ar_large' },
      barrel: { item: 'barrel_ar_large_long' },
      handguard: { item: 'handguard_ar_large_free_float' },
      magazine: { family: 'magazine', params: { length: 'M', profile: 'sr25-straight' } },
      grip: { item: 'grip_ar_long' },
      stock: { item: 'stock_m4_long' },
    },
    // The traced rail's front sight stands 31.6u ahead of the receiver, slot 34 of its rail.
    connections: [
      if c.to == 'rail-front-sight.base' then c + { slot: 34 } else c
      for c in base.assembly.connections
      if c.to != 'sight.base'
    ],
  },
}
