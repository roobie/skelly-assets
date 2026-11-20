// Traced from one side photo; see `packages/gun-authoring-tool/docs/sks-export.md`.
local onReceiver = ['barrel', 'bolt-carrier', 'lower', 'stock', 'rear-sight', 'handguard'];
local onBarrel = ['front-sight', 'bayonet'];
{
  format: 1,
  template: 'sks-carbine',
  platform: { id: 'sks', sizeClass: 'sks' },
  calibre: '7.62x39',
  finish: { furniture: 'wood-walnut', metal: 'steel-blued' },
  assembly: {
    name: 'sks-carbine',
    description: 'Simonov SKS-45 carbine: one-piece walnut stock, fixed ten-round magazine, wooden handguard over the gas tube, tangent rear sight, hooded front sight and the bayonet folded under the barrel.',
    root: 'receiver',
    parts: { [slot]: { family: 'sks-' + slot } for slot in ['receiver'] + onReceiver + onBarrel },
    connections: [{ from: 'receiver.' + slot, to: slot + '.mount' } for slot in onReceiver] +
                 [{ from: 'barrel.' + slot, to: slot + '.mount' } for slot in onBarrel],
  },
  locks: { params: {}, optionalParts: [] },
  status: 'published',
}
