local base = import 'hunting-rifle.jsonnet';
base + {
  template: 'pipe-rifle',
  calibre: '9x19',
  finish: { furniture: 'wood-pine', metal: 'scrap-rusted' },
  assembly+: {
    name: 'pipe-rifle',
    description: 'Scavenged single-shot turn-bolt rifle: a rusted pipe strapped to a plank, with a taped board stock.',
    parts: {
      receiver: { item: 'receiver_pipe' },
      'bolt-carrier': { item: 'bolt_carrier_pipe' },
      'bolt-handle-arm': { item: 'bolt_handle_pipe' },
      'bolt-handle-knob': { item: 'bolt_knob_pipe' },
      lower: { item: 'lower_pipe' },
      barrel: { item: 'barrel_pipe' },
      handguard: { item: 'handguard_pipe' },
      stock: { item: 'stock_pipe' },
      'front-sight': { item: 'front_sight_sporter', params: { muzzleInsetRatio: '0.05' } },
      'rear-sight': { item: 'rear_sight_sporter' },
    },
    connections: [c for c in super.connections if c.to != 'magazine.top'],
  },
}
