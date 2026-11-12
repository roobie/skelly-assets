local table(column, verbatim) = { source: 'dia', locator: 'Table I, 20- to 40-mm Cartridge Data, Index No. 76, ' + column, verbatim: verbatim };
local measure(value, column, verbatim) = { value: value, cite: table(column, verbatim) };
local scaled(value, what) = {
  value: value,
  cite: { source: 'dia', locator: 'printed page 54, case outline "40x365R Index No. 76"' },
  note: 'Scaled from the drawn case outline against its 365.0 mm case length; the guide prints no ' + what,
};
local unsourced(what) = { value: null, cite: null, note: 'No source found gives ' + what };
{
  format: 1,
  kind: 'metallic',
  id: '40x365r',
  designation: '40×365mmR',
  aliases: [{ name: '40-mm Bofors L-70', cite: { source: 'dia', locator: 'Index No. 76, Other Designation' } }],
  sources: {
    dia: {
      body: 'US Defense Intelligence Agency', reliability: 'secondary',
      title: 'Small-Caliber Ammunition Identification Guide, Volume 2: 20-mm to 40-mm Cartridges (DST-1160G-514-82-VOL 2)',
      url: 'https://archive.org/download/DTIC_ADA306170/DTIC_ADA306170.pdf',
      retrieved: '2026-11-12', revision: '13 September 1982, Change 1 30 August 1985',
      sha256: 'c8c242875dc610d5f4e45f2f1a365c9d0f77338c44dc45fb142197f0e43f070e',
    },
    tm: {
      body: 'US Department of the Army', reliability: 'secondary',
      title: 'TM 43-0001-28, Army Ammunition Data Sheets: Artillery Ammunition',
      url: 'https://www.bulletpicker.com/pdf/TM-43-0001-28-1994.pdf',
      retrieved: '2026-11-12', revision: 'April 1994, through Change 11',
      sha256: '4b249477726e7d95e5b63da2e62e35c9df274ed5b792ee052664476ba7545026',
    },
  },
  primarySource: 'dia',
  relatedTo: [],
  case: {
    length: measure(365.0, 'Case length', '365.0'),
    bodyStart: unsourced('where the body starts above the rim'),
    rim: {
      diameter: measure(65.0, 'Rim diameter', '65.0'),
      thickness: scaled(9.1, 'rim thickness'),
    },
    head: { type: 'rimmed' },
    body: {
      type: 'bottleneck',
      diameterAtHead: measure(57.8, 'Head/belt diameter', '57.8'),
      diameterAtShoulderStart: measure(48.0, 'Shoulder diameter', '48.0'),
      shoulder: {
        startPosition: scaled(310, 'shoulder position'),
        endPosition: scaled(343, 'shoulder position'),
        angle: unsourced('a shoulder angle'),
      },
      neck: {
        diameterAtBase: measure(41.5, 'Mouth diameter', '41.5') + { note: 'The outline draws the neck parallel, so the mouth diameter stands for its base' },
        diameterAtMouth: measure(41.5, 'Mouth diameter', '41.5'),
      },
    },
    materials: [],
    primer: { options: [], diameter: unsourced('primer dimensions'), designation: unsourced('a primer designation') },
  },
  payload: {
    type: 'bullet',
    diameter: measure(39.9, 'Projectile bourrelet diameter', '39.9') + {
      alternatives: [{
        value: 39.96,
        cite: { source: 'tm', locator: 'page 2-13, Cartridge, 40 Millimeter: HE M822, figure AR 5788', verbatim: '39.96 MAX' },
        note: 'A maximum for one US round, not the type as a whole',
      }],
    },
    length: { min: unsourced('a projectile length with its fuze'), max: unsourced('a projectile length with its fuze') },
    variants: [],
  },
  overallLength: {
    max: unsourced('a maximum loaded length'),
    typical: measure(534, 'Cartridge length', '534'),
  },
  notes: [
    'A generic round of the Bofors 40 mm L/70 class, without a particular projectile or maker. The guide tabulates the outer case and projectile; positions it does not print are scaled from its case outline, and the projectile shape is the shared modelling assumption.',
  ],
}
