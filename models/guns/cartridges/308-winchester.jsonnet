local cite(locator, verbatim=null) = { source: 'cip308', locator: 'Tab. I, ' + locator } + if verbatim == null then {} else { verbatim: verbatim };
local measure(value, locator, verbatim) = { value: value, cite: cite('CARTRIDGE MAXI, ' + locator, verbatim) };
local drawn = { note: 'Read from the C.I.P. drawing; the sheet has no symbol legend' };
local unsheeted(what) = { value: null, cite: null, note: 'The C.I.P. sheet does not give ' + what };
{
  format: 1,
  kind: 'metallic',
  id: '308-winchester',
  designation: '.308 Winchester',
  aliases: [
    { name: '308 Win.', cite: cite('sheet title') },
    { name: '7,62 x 51', cite: cite('Alternative Names') },
  ],
  sources: {
    cip308: {
      body: 'C.I.P.', reliability: 'standard',
      title: 'C.I.P. TDCC Tab. I, 308 Win.: cartridge maximum dimensions',
      url: 'https://bobp.cip-bobp.org/uploads/tdcc/tab-i/tabical-en-page125.pdf',
      retrieved: '2026-10-08', revision: 'sheet Date 84-06-14, Revision 08-09-23',
      sha256: '428efd5c2ffdda8fd7844d870523fa2df40f60a1810b3a2f175eba0c26ccadef',
    },
  },
  primarySource: 'cip308',
  relatedTo: [],
  case: {
    length: measure(51.18, 'Lengths: L3', 'L3 1) = 51.18'),
    bodyStart: measure(3.85, 'Case Head: E', 'E = 3.85') + drawn,
    rim: {
      diameter: measure(12.01, 'Case Head: R1', 'R1 = 12.01'),
      thickness: measure(1.37, 'Case Head: R', 'R = 1.37') + drawn,
    },
    head: {
      type: 'rimless',
      extractorGroove: {
        diameter: measure(10.39, 'Case Head: E1', 'E1 = 10.39'),
        width: measure(1.4, 'Case Head: e min', 'e min = 1.40'),
        bevelAngle: measure(36, 'Case Head: δ', 'δ = 36°') + drawn,
      },
    },
    body: {
      type: 'bottleneck',
      diameterAtHead: measure(11.96, 'Powder Chamber: P1', 'P1 = 11.96'),
      diameterAtShoulderStart: measure(11.53, 'Powder Chamber: P2', 'P2 1)* = 11.53 -0.20') + { tolerance: { minus: 0.2 }, basic: true },
      shoulder: {
        startPosition: measure(39.62, 'Lengths: L1', 'L1 1) = 39.62 -0.20') + { tolerance: { minus: 0.2 } },
        endPosition: measure(43.48, 'Lengths: L2', 'L2 1) = 43.48 -0.20') + { tolerance: { minus: 0.2 } },
        angle: measure(40, 'Junction Cone: α', 'α* = 40°') + drawn + { basic: true },
      },
      neck: {
        diameterAtBase: measure(8.72, 'Collar: H1', 'H1* = 8.72') + { basic: true },
        diameterAtMouth: measure(8.72, 'Collar: H2', 'H2 1) = 8.72'),
      },
    },
    materials: [],
    primer: { options: [], diameter: unsheeted('primer-pocket dimensions'), designation: unsheeted('a primer designation') },
  },
  payload: {
    type: 'bullet',
    diameter: measure(7.85, 'Projectile: G1', 'G1 1) = 7.85'),
    length: { min: unsheeted('bullet length'), max: unsheeted('bullet length') },
    variants: [],
  },
  overallLength: {
    max: measure(71.12, 'Lengths: L6', 'L6 = 71.12'),
    typical: { value: null, cite: null, note: 'The governing drawing gives a maximum, not a typical loaded length.' },
  },
  notes: [
    'This record also serves 7.62×51mm, which the C.I.P. sheet lists as an alternative name: until a NATO drawing is sourced, one model stands for both. Sharing the external profile does not claim chamber compatibility or cross-loading.',
    'The C.I.P. sheet has no symbol legend. Mapped dimensions are read from its drawing and callouts; unmapped values, including primer details, bullet length and case materials, remain unspecified. The C.I.P. footnote 1) says to check marked dimensions for safety reasons; the CHAMBER MINI column is not modelled.',
  ],
}
