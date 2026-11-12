// The guns and gun items the firearms pack exports; packages/gun-authoring-tool/exports/deadvox.jsonnet turns each into
// its export row. `weapon` is the weapon class (models/TAXONOMY.md) a gun is or an item serves; an item fitted to any
// gun names none. Any row may also name `keywords` (models/TAXONOMY.md). Every design, attachment and magazine row
// authors its player-facing `title`; a cartridge row authors its `designation`, which its round, case and magazines name.
{
  // A curated design in models/guns/designs/, by file name.
  designs: [
    { id: 'rifle_assault', title: 'Assault rifle', design: 'archetype-ar', weapon: 'rifle' },
    { id: 'rifle_ak', title: 'Long-stroke rifle', design: 'archetype-ak-akm', weapon: 'rifle' },
    { id: 'shotgun_pump', title: 'Pump-action shotgun', design: 'archetype-pump-shotgun', weapon: 'shotgun' },
    { id: 'rifle_anti_materiel', title: 'Anti-materiel rifle', design: 'archetype-anti-materiel', weapon: 'rifle' },
    { id: 'rifle_hunting', title: 'Hunting rifle', design: 'hunting-rifle', weapon: 'rifle' },
    { id: 'revolver', title: 'Revolver', design: 'archetype-revolver', weapon: 'handgun' },
    { id: 'pistol_service', title: 'Service pistol', design: 'service-nine', weapon: 'handgun' },
    { id: 'rifle_pipe', title: 'Pipe rifle', design: 'pipe-rifle', weapon: 'rifle', keywords: ['improvised'] },
  ],
  // A cartridge in models/guns/cartridges/, by file name, exported as its round and its case. `name` ends both ids; `designation` is the cartridge's own name.
  cartridges: [
    { name: '5_d_56x45', designation: '5.56×45', source: '5.56x45', weapon: 'rifle' },
    { name: '7_d_62x39', designation: '7.62×39', source: '7.62x39', weapon: 'rifle' },
    { name: '12_h_gauge_h_00_h_buck', designation: '12 gauge 00 buckshot', source: '12-gauge-00-buck', weapon: 'shotgun' },
    { name: '308_h_winchester', designation: '.308', source: '308-winchester', weapon: 'rifle' },
    { name: '338_h_lapua_h_magnum', designation: '.338 Magnum', source: '338-lapua-magnum', weapon: 'rifle' },
    { name: '7_d_62x54r', designation: '7.62×54R', source: '7.62x54r', weapon: 'rifle' },
    { name: '50_h_bmg', designation: '.50 BMG', source: '50-bmg', weapon: 'rifle' },
    { name: '40x365r', designation: '40×365R', source: '40x365r', weapon: 'cannon', keywords: ['military'] },
    { name: '120x570', designation: '120×570 mm', source: '120x570', weapon: 'cannon', keywords: ['military'] },
    { name: '357_h_magnum', designation: '.357 Magnum', source: '357-magnum', weapon: 'handgun' },
    { name: '9x19', designation: '9×19', source: '9x19', weapon: 'handgun' },
  ],
  // An attachment by its source id; its look, if any, is in models/guns/tables/appearance.jsonnet.
  attachments: [
    { source: 'ak-slant-compensator', title: 'Slant compensator', weapon: 'rifle' },
    { source: 'foregrip', title: 'Foregrip' },
    { source: 'improvised-suppressor', title: 'Improvised suppressor', keywords: ['silencer'] },
    { source: 'optic-digital-thermal', title: 'Digital thermal optic', keywords: ['scope'] },
    { source: 'optic-fixed-prism-4x', title: 'Fixed 4x prism optic', keywords: ['scope'] },
    { source: 'optic-high-mag-5-25x', title: 'High-magnification 5-25x scope', keywords: ['scope'] },
    { source: 'optic-holographic', title: 'Holographic sight' },
    { source: 'optic-hunting-3-9x', title: 'Hunting 3-9x scope', keywords: ['scope'] },
    { source: 'optic-lpvo-1-6x', title: 'Variable 1-6x optic', keywords: ['scope'] },
    { source: 'optic-mini-reflex', title: 'Mini reflex sight' },
    { source: 'optic-tube-dot', title: 'Tube dot sight' },
    { source: 'rail-front-sight', title: 'Front sight rail' },
    { source: 'rail-rear-sight', title: 'Rear sight rail' },
    { source: 'real-suppressor', title: 'Suppressor', keywords: ['silencer'] },
    { source: 'tactical-flashlight-mount', title: 'Tactical flashlight mount' },
  ],
  // A magazine by its source id, loaded with a cartridge in models/guns/cartridges/ and drawn in an appearance profile.
  // Its title is its authored `form` and "for" the cartridge's `designation`.
  magazines: [
    { id: 'magazine_stanag_20', form: '20-round magazine', source: 'stanag-20', calibre: '5.56x45', appearanceProfile: 'ar', weapon: 'rifle' },
    { id: 'magazine_stanag_30', form: '30-round magazine', source: 'stanag-30', calibre: '5.56x45', appearanceProfile: 'ar', weapon: 'rifle' },
    { id: 'magazine_akm_30', form: '30-round curved magazine', source: 'akm-30', calibre: '7.62x39', appearanceProfile: 'ak', weapon: 'rifle' },
    { id: 'magazine_pistol_9', form: 'Pistol magazine', source: 'pistol-9', calibre: '9x19', appearanceProfile: 'pistol', weapon: 'handgun' },
    { id: 'magazine_bmg_10', form: '10-round magazine', source: 'bmg-10', calibre: '50-bmg', appearanceProfile: 'anti-materiel', weapon: 'rifle' },
  ],
  // Every catalogue part exports as its loose part. A part whose id names one of these actions or frames belongs to
  // its weapon class.
  partWeapons: { ak: 'rifle', ar: 'rifle', sporter: 'rifle', pipe: 'rifle', pump: 'shotgun', pistol: 'handgun', revolver: 'handgun' },
  // The keywords a part takes from the action or frame its id names, as its gun design does.
  partKeywords: { pipe: ['improvised'] },
}
