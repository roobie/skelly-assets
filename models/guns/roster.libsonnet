// The guns and gun items the firearms pack exports; packages/gun-authoring-tool/exports/deadvox.jsonnet turns each into
// its export row. `weapon` is the weapon class (models/TAXONOMY.md) a gun is or an item serves; an item fitted to any
// gun names none. A design or attachment may also name `keywords` (models/TAXONOMY.md).
{
  // A curated design in models/guns/designs/, by file name.
  designs: [
    { id: 'rifle_assault', design: 'archetype-ar', weapon: 'rifle' },
    { id: 'rifle_ak', design: 'archetype-ak-akm', weapon: 'rifle' },
    { id: 'shotgun_pump', design: 'archetype-pump-shotgun', weapon: 'shotgun' },
    { id: 'rifle_hunting', design: 'hunting-rifle', weapon: 'rifle' },
    { id: 'revolver', design: 'archetype-revolver', weapon: 'handgun' },
    { id: 'pistol_service', design: 'service-nine', weapon: 'handgun' },
    { id: 'rifle_pipe', design: 'pipe-rifle', weapon: 'rifle', keywords: ['improvised'] },
  ],
  // A cartridge in models/guns/cartridges/, by file name, exported as its round and its case. `name` ends both ids. A
  // vehicle gun's shell has no weapon class to name.
  cartridges: [
    { name: '5_d_56x45', source: '5.56x45', weapon: 'rifle' },
    { name: '7_d_62x39', source: '7.62x39', weapon: 'rifle' },
    { name: '12_h_gauge_h_00_h_buck', source: '12-gauge-00-buck', weapon: 'shotgun' },
    { name: '308_h_winchester', source: '308-winchester', weapon: 'rifle' },
    { name: '338_h_lapua_h_magnum', source: '338-lapua-magnum', weapon: 'rifle' },
    { name: '7_d_62x54r', source: '7.62x54r', weapon: 'rifle' },
    { name: '50_h_bmg', source: '50-bmg', weapon: 'rifle' },
    { name: '40x365r', source: '40x365r', keywords: ['military'] },
    { name: '120x570', source: '120x570', keywords: ['military'] },
    { name: '357_h_magnum', source: '357-magnum', weapon: 'handgun' },
    { name: '9x19', source: '9x19', weapon: 'handgun' },
  ],
  // An attachment by its source id; its look, if any, is in models/guns/tables/appearance.jsonnet.
  attachments: [
    { source: 'ak-slant-compensator', weapon: 'rifle' },
    { source: 'foregrip' },
    { source: 'improvised-suppressor', keywords: ['silencer'] },
    { source: 'optic-digital-thermal', keywords: ['scope'] },
    { source: 'optic-fixed-prism-4x', keywords: ['scope'] },
    { source: 'optic-high-mag-5-25x', keywords: ['scope'] },
    { source: 'optic-holographic' },
    { source: 'optic-hunting-3-9x', keywords: ['scope'] },
    { source: 'optic-lpvo-1-6x', keywords: ['scope'] },
    { source: 'optic-mini-reflex' },
    { source: 'optic-tube-dot' },
    { source: 'rail-front-sight' },
    { source: 'rail-rear-sight' },
    { source: 'real-suppressor', keywords: ['silencer'] },
    { source: 'tactical-flashlight-mount' },
  ],
  // A magazine by its source id, loaded with a cartridge in models/guns/cartridges/ and drawn in an appearance profile.
  magazines: [
    { id: 'magazine_stanag_20', source: 'stanag-20', calibre: '5.56x45', appearanceProfile: 'ar', weapon: 'rifle' },
    { id: 'magazine_stanag_30', source: 'stanag-30', calibre: '5.56x45', appearanceProfile: 'ar', weapon: 'rifle' },
    { id: 'magazine_akm_30', source: 'akm-30', calibre: '7.62x39', appearanceProfile: 'ak', weapon: 'rifle' },
    { id: 'magazine_pistol_9', source: 'pistol-9', calibre: '9x19', appearanceProfile: 'pistol', weapon: 'handgun' },
  ],
  // Every catalogue part exports as its loose part. A part whose id names one of these actions or frames belongs to
  // its weapon class.
  partWeapons: { ak: 'rifle', ar: 'rifle', sporter: 'rifle', pipe: 'rifle', pump: 'shotgun', pistol: 'handgun', revolver: 'handgun' },
  // The keywords a part takes from the action or frame its id names, as its gun design does.
  partKeywords: { pipe: ['improvised'] },
}
