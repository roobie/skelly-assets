local cite(locator, verbatim=null) = { source: 'cip', locator: 'Tab. II, ' + locator } + if verbatim == null then {} else { verbatim: verbatim };
local measure(value, locator, verbatim) = { value: value, cite: cite('CARTRIDGE MAXI, ' + locator, verbatim) };
local drawn = { note: 'Read from the C.I.P. drawing; the sheet has no symbol legend' };
local unsheeted(what) = { value: null, cite: null, note: 'The C.I.P. sheet does not give ' + what };
{
  format: 1,
  kind: 'metallic',
  id: '7.62x54r',
  designation: '7.62×54mmR',
  aliases: [{ name: '7,62 x 54 R', cite: cite('sheet title') }],
  sources: {
    cip: {
      body: 'C.I.P.', reliability: 'standard',
      title: 'C.I.P. TDCC Tab. II, 7,62 x 54 R: cartridge maximum dimensions',
      url: 'https://bobp.cip-bobp.org/uploads/tdcc/tab-ii/7-62-x-54-r-en.pdf',
      retrieved: '2026-11-12', revision: 'sheet Date 84-06-14, Revision 14-05-20',
      sha256: '4a9e923b1a7fc10bbc2b9b73fb083874312a024d2ca1f820dadf82bb2977de61',
    },
  },
  primarySource: 'cip',
  relatedTo: [],
  case: {
    length: measure(53.72, 'Lengths: L3', 'L3 1) = 53.72'),
    bodyStart: unsheeted('where the body starts above a rimmed head'),
    rim: {
      diameter: measure(14.48, 'Case Head: R1', 'R1 = 14.48'),
      thickness: measure(1.6, 'Case Head: R', 'R 1) = 1.60 -0.25') + drawn + { tolerance: { minus: 0.25 } },
    },
    head: { type: 'rimmed' },
    body: {
      type: 'bottleneck',
      diameterAtHead: measure(12.37, 'Powder Chamber: P1', 'P1 = 12.37'),
      diameterAtShoulderStart: measure(11.61, 'Powder Chamber: P2', 'P2 * = 11.61') + { basic: true },
      shoulder: {
        startPosition: measure(39.7, 'Lengths: L1', 'L1 * = 39.70') + { basic: true },
        endPosition: measure(44.3, 'Lengths: L2', 'L2 * = 44.30') + { basic: true },
        angle: measure(37.0192, 'Junction Cone: α', 'α = 37°01\'9"') + {
          note: 'Converted from the printed angle to decimal degrees; read from the C.I.P. drawing',
        },
      },
      neck: {
        diameterAtBase: measure(8.53, 'Collar: H1', 'H1 * = 8.53') + { basic: true },
        diameterAtMouth: measure(8.53, 'Collar: H2', 'H2 1) = 8.53'),
      },
    },
    materials: [],
    primer: { options: [], diameter: unsheeted('primer-pocket dimensions'), designation: unsheeted('a primer designation') },
  },
  payload: {
    type: 'bullet',
    diameter: measure(7.92, 'Projectile: G1', 'G1 1) = 7.92'),
    length: { min: unsheeted('bullet length'), max: unsheeted('bullet length') },
    variants: [],
  },
  overallLength: {
    max: measure(77.16, 'Lengths: L6', 'L6 = 77.16'),
    typical: { value: null, cite: null, note: 'The governing drawing gives a maximum, not a typical loaded length.' },
  },
  notes: [
    'The C.I.P. sheet has no symbol legend. Mapped dimensions are read from its drawing and callouts; unmapped values, including the head chamfer f = 0.60, primer details, bullet length and case materials, remain unspecified. The C.I.P. footnote 1) says to check marked dimensions for safety reasons; the CHAMBER MINI column is not modelled.',
  ],
}
