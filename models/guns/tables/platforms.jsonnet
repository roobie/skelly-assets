// Gun platforms and the interchange classes of their mount sites. A part swaps only onto a site of a design of the
// same platform whose size class matches, so a platform is a family of real guns whose parts interchange, not a
// builder template: several templates can share one platform, and one platform can span frames that differ in size.
local slot = { path: 'slot' };
local job(kind) = { path: 'job', job: kind };
local picatinny = { 'rail-top': 'picatinny', 'rail-side': 'picatinny', 'rail-bottom': 'picatinny' };

{
  // The job kinds a heavy part waits for, rather than going on in the slot UI.
  jobs: ['tool', 'bench'],

  // How the part met at each mount type comes off and goes on. Light parts (optics on the rails, magazines, stocks,
  // muzzle devices and add-ons) swap by hand; parts held by pins or screws need a tool; parts fitted, pressed or
  // timed into the gun need a bench.
  mounts: {
    magazine: { swap: slot },
    stock: { swap: slot },
    muzzle: { swap: slot },
    rail: { swap: slot },
    'rail-top': { swap: slot },
    'rail-side': { swap: slot },
    'rail-bottom': { swap: slot },
    bipod: { swap: slot },
    monopod: { swap: slot },

    grip: { swap: job('tool') },
    'revolver-grip': { swap: job('tool') },
    handguard: { swap: job('tool') },
    clamp: { swap: job('tool') },
    'bolt-carrier': { swap: job('tool') },
    'ar-charging-handle': { swap: job('tool') },
    'bolt-handle': { swap: job('tool') },
    'bolt-handle-knob': { swap: job('tool') },
    'smg-handle': { swap: job('tool') },
    'handle-strut': { swap: job('tool') },
    'handle-bar': { swap: job('tool') },
    'shroud-sight': { swap: job('tool') },

    barrel: { swap: job('bench') },
    'barrel-seat': { swap: job('bench') },
    'plain-muzzle': { swap: job('bench') },
    lower: { swap: job('bench') },
    trunnion: { swap: job('bench') },
    'sight-block': { swap: job('bench') },
    'gas-block': { swap: job('bench') },
    'gas-cylinder': { swap: job('bench') },
    lug: { swap: job('bench') },
    tube: { swap: job('bench') },
    forend: { swap: job('bench') },
    'slide-rails': { swap: job('bench') },
    'revolver-crane': { swap: job('bench') },
    'revolver-cylinder': { swap: job('bench') },
    'revolver-ejector': { swap: job('bench') },
    'revolver-hammer': { swap: job('bench') },
    'revolver-trigger': { swap: job('bench') },
    'revolver-trigger-guard': { swap: job('bench') },
  },

  // Each platform's size classes, one per frame size a design names, and the mount types whose class is shared
  // across those frames, because the real guns share that interface.
  platforms: {
    // The AR-15 and AR-10 frames share buffer-tube stocks, grips and rails, and nothing else.
    ar: {
      sizeClasses: ['ar-15', 'ar-10'],
      shared: picatinny { stock: 'ar-buffer-tube', grip: 'ar-grip' },
    },
    ak: { sizeClasses: ['ak'] },
    // Short and magnum actions share scope rails.
    'bolt-rifle': { sizeClasses: ['short-action', 'magnum-action'], shared: picatinny },
    'battle-rifle': { sizeClasses: ['battle-rifle'] },
    smg: { sizeClasses: ['smg'] },
    'compact-smg': { sizeClasses: ['compact-smg'] },
    pistol: { sizeClasses: ['pistol'] },
    revolver: { sizeClasses: ['revolver'] },
    'pump-shotgun': { sizeClasses: ['pump-shotgun'] },
    'anti-materiel': { sizeClasses: ['anti-materiel'] },
    // Improvised from scrap, so it shares no factory interface with the bolt rifles it imitates.
    'pipe-rifle': { sizeClasses: ['pipe-rifle'] },
  },
}
