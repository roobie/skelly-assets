local infobox(field, verbatim) = { source: 'wikipedia', locator: 'infobox, ' + field, verbatim: verbatim };
local figure = { source: 'tm', locator: 'page 2-115, Cartridge, 120-Millimeter: HEAT-MP-T, M830, figure ARD 83-0667-A' };
local scaled(value, what, against) = {
  value: value,
  cite: figure,
  note: 'Scaled from the drawn round against its printed 981 mm length and the 169 mm rim (' + against + '); no source found prints ' + what,
};
local unsourced(what) = { value: null, cite: null, note: 'No source found gives ' + what };
{
  format: 1,
  kind: 'metallic',
  id: '120x570',
  designation: '120×570mm NATO',
  aliases: [],
  sources: {
    wikipedia: {
      body: 'Wikipedia', reliability: 'secondary', title: '120×570mm NATO',
      url: 'https://en.wikipedia.org/w/index.php?title=120%C3%97570mm_NATO&action=raw&oldid=1378450301',
      retrieved: '2026-11-12', revision: 'oldid 1378450301',
      sha256: '6c2c0047dc0def39f99795c3c508c5f8735ac38d15f800b295b587e8416248c5',
    },
    tm: {
      body: 'US Department of the Army', reliability: 'secondary',
      title: 'TM 43-0001-28, Army Ammunition Data Sheets: Artillery Ammunition',
      url: 'https://www.bulletpicker.com/pdf/TM-43-0001-28-1994.pdf',
      retrieved: '2026-11-12', revision: 'April 1994, through Change 11',
      sha256: '4b249477726e7d95e5b63da2e62e35c9df274ed5b792ee052664476ba7545026',
    },
    forum: {
      body: 'International Ammunition Association forum', reliability: 'secondary',
      title: 'Cartridge dimensions for 120mm?',
      url: 'https://forum.cartridgecollectors.org/t/cartridge-dimensions-for-120mm/14101',
      retrieved: '2026-11-12', revision: 'posts of 23 and 28 December 2013',
    },
  },
  primarySource: 'wikipedia',
  relatedTo: [],
  case: {
    length: { value: 570, cite: infobox('case_length', 'case_length = 570') } + {
      alternatives: [{
        value: 553,
        cite: { source: 'forum', locator: 'post of 23 December 2013', verbatim: 'case length 553mm' },
        note: 'The thread notes that the neck length depends on the projectile fitted',
      }],
    },
    bodyStart: unsourced('where the body starts above the rim'),
    rim: {
      diameter: { value: 169, cite: infobox('rim_dia', 'rim_dia = 169') },
      thickness: {
        value: 5.08,
        cite: { source: 'forum', locator: 'post of 28 December 2013', verbatim: 'From the “breach face” to the front of the rim .200' },
        note: 'Converted from inches; measured on one case with a caliper',
      },
    },
    head: { type: 'rimmed' },
    body: {
      type: 'bottleneck',
      diameterAtHead: { value: 160, cite: infobox('base', 'base = 160') },
      diameterAtShoulderStart: scaled(151, 'a shoulder diameter', 'radially'),
      shoulder: {
        startPosition: scaled(497, 'a shoulder position', 'axially'),
        endPosition: scaled(541, 'a shoulder position', 'axially'),
        angle: unsourced('a shoulder angle'),
      },
      neck: {
        diameterAtBase: scaled(122, 'a neck diameter', 'radially') + {
          note: 'Scaled from the drawn case adapter ring against the 169 mm rim; the short waist the figure draws between shoulder and adapter is left out, so the projectile seats in the neck',
        },
        diameterAtMouth: scaled(122, 'a mouth diameter', 'radially'),
      },
    },
    materials: [],
    primer: { options: [], diameter: unsourced('primer dimensions'), designation: unsourced('a primer designation') },
  },
  payload: {
    type: 'bullet',
    diameter: { value: 120, cite: infobox('bullet', 'bullet = 120'), note: 'The nominal bore; projectiles of this class are calibre-sized at the body' },
    length: { min: unsourced('a projectile length'), max: unsourced('a projectile length') },
    variants: [],
  },
  overallLength: {
    max: unsourced('a maximum loaded length'),
    typical: {
      value: 984,
      cite: { source: 'tm', locator: 'page 2-120.1, Cartridge, 120 Millimeter, HE-OR-T, M908, figure AR 4343-B', verbatim: '984MM' },
      alternatives: [{
        value: 980.44,
        cite: { source: 'tm', locator: 'page 2-115, Cartridge, 120-Millimeter: HEAT-MP-T, M830, Tabulated Data', verbatim: '38.6 in. (981 cm)' },
        note: 'Converted from inches; the printed cm is a misprint for mm',
      }],
    },
  },
  notes: [
    'A generic 120 mm smoothbore tank round, without a particular projectile or maker. No public standard drawing of the case was found, so the record rests on a secondary infobox, a collector measurement and one US Army figure scaled with care; the projectile shape is the shared modelling assumption, standing in for any HE or HEAT body.',
  ],
}
