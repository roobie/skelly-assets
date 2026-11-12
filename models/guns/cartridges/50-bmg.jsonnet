local cite(locator, verbatim=null) = { source: 'cip', locator: 'Tab. I, ' + locator } + if verbatim == null then {} else { verbatim: verbatim };
local measure(value, locator, verbatim) = { value: value, cite: cite('CARTRIDGE MAXI, ' + locator, verbatim) };
local drawn = { note: 'Read from the C.I.P. drawing; the sheet has no symbol legend' };
local unsheeted(what) = { value: null, cite: null, note: 'The C.I.P. sheet does not give ' + what };
{
  format: 1,
  kind: 'metallic',
  id: '50-bmg',
  designation: '.50 BMG',
  aliases: [
    { name: '50 Browning', cite: cite('sheet title') },
    { name: '12,7 x 99', cite: cite('Alternative Names') },
  ],
  sources: {
    cip: {
      body: 'C.I.P.', reliability: 'standard',
      title: 'C.I.P. TDCC Tab. I, 50 Browning: cartridge maximum dimensions',
      url: 'https://bobp.cip-bobp.org/uploads/tdcc/tab-i/50-browning-en.pdf',
      retrieved: '2026-11-12', revision: 'sheet Date 95-05-31, Revision 18-10-17',
      sha256: 'b183f52668aa34b9e69f651dd2b2ea7f463f435c3bff591d475fa5ec3feaa543',
    },
  },
  primarySource: 'cip',
  relatedTo: [],
  case: {
    length: measure(99.31, 'Lengths: L3', 'L3 1) = 99.31'),
    bodyStart: measure(6.23, 'Case Head: E', 'E = 6.23') + drawn,
    rim: {
      diameter: measure(20.42, 'Case Head: R1', 'R1 = 20.42'),
      thickness: measure(2.26, 'Case Head: R', 'R = 2.26') + drawn,
    },
    head: {
      type: 'rimless',
      extractorGroove: {
        diameter: measure(17.27, 'Case Head: E1', 'E1 = 17.27'),
        width: measure(1.8, 'Case Head: e min', 'e min = 1.80'),
        bevelAngle: measure(36, 'Case Head: δ', 'δ = 36°') + drawn,
      },
    },
    body: {
      type: 'bottleneck',
      diameterAtHead: measure(20.42, 'Powder Chamber: P1', 'P1 = 20.42'),
      diameterAtShoulderStart: measure(18.14, 'Powder Chamber: P2', 'P2 1)* = 18.14 -0.20') + { tolerance: { minus: 0.2 }, basic: true },
      shoulder: {
        startPosition: measure(76.34, 'Lengths: L1', 'L1 1) = 76.34 -0.20') + { tolerance: { minus: 0.2 } },
        endPosition: measure(83.3, 'Lengths: L2', 'L2 1) = 83.30 -0.20') + { tolerance: { minus: 0.2 } },
        angle: measure(31.4667, 'Junction Cone: α', "α* = 31°28'") + {
          basic: true,
          note: 'Converted from the printed angle to decimal degrees; read from the C.I.P. drawing',
        },
      },
      neck: {
        diameterAtBase: measure(14.22, 'Collar: H1', 'H1 * = 14.22') + { basic: true },
        diameterAtMouth: measure(14.22, 'Collar: H2', 'H2 1) = 14.22'),
      },
    },
    materials: [],
    primer: { options: [], diameter: unsheeted('primer-pocket dimensions'), designation: unsheeted('a primer designation') },
  },
  payload: {
    type: 'bullet',
    diameter: measure(12.98, 'Projectile: G1', 'G1 1)* = 12.98') + { basic: true },
    length: { min: unsheeted('bullet length'), max: unsheeted('bullet length') },
    variants: [],
  },
  overallLength: {
    max: measure(138.43, 'Lengths: L6', 'L6 = 138.43'),
    typical: { value: null, cite: null, note: 'The governing drawing gives a maximum, not a typical loaded length.' },
  },
  notes: [
    'The C.I.P. sheet has no symbol legend. Mapped dimensions are read from its drawing and callouts; unmapped values, including the head chamfer f = 0.84, primer details, bullet length and case materials, remain unspecified. The C.I.P. footnote 1) says to check marked dimensions for safety reasons; the CHAMBER MINI column is not modelled.',
  ],
}
