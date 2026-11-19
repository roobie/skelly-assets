// Gun platforms and the interchange classes of their mount sites. A part swaps only onto a site of a design of the
// same platform whose size class matches, so a platform is a family of real guns whose parts interchange, not a
// builder template: several templates can share one platform, and one platform can span frames that differ in size.
local slot = { path: 'slot' };
local job(kind) = { path: 'job', job: kind };
// A dimension of an interface, in millimetres, with where it comes from: 'traced: <trace key>', 'sourced: <URL>' or
// 'derived: <reason>'.
local dim(mm, source) = { mm: mm, source: source };
// A port standard its mount type lists: the standards a mount type names are the only ones its ports may declare, and
// the dimensions are those that define the interface, not the dimensions of any one part.
local standard(dimensions={}) = { dimensions: dimensions };
local picatinny = { 'rail-top': 'picatinny', 'rail-side': 'picatinny', 'rail-bottom': 'picatinny' };
// The buffer a tube takes is what a stock fits against.
local bufferFit = 'sourced: https://blog.primaryarms.com/guide/ar15-stock-does-not-fit-buffer-tube-troubleshooting/';
// The bores a muzzle is cut for, so a rifle suppressor never certifies on a shotgun.
local bores = { rifled: standard(), smoothbore: standard() };
local tubeDiameter = dim(29.16, 'sourced: https://mountsplus.com/commercial-vs-mil-spec-buffer-tube.html');

{
  // The job kinds a heavy part waits for, rather than going on in the slot UI.
  jobs: ['tool', 'bench'],

  // How the part met at each mount type comes off and goes on. Light parts (optics on the rails, magazines, stocks,
  // muzzle devices and add-ons) swap by hand; parts held by pins or screws need a tool; parts fitted, pressed or
  // timed into the gun need a bench. A mount type's `standards` are the only ones its ports may declare.
  mounts: {
    // A well is cut for one family of magazines, so a magazine that fits it by size alone is still refused.
    magazine: { swap: slot, standards: { 'ar15-magazine': standard() } },
    // A stock slides on the receiver extension, so the extension's outside diameter defines its standard.
    stock: {
      swap: slot,
      standards: {
        'ar-tube-carbine': standard({
          outerDiameter: tubeDiameter,
          bufferLength: dim(82.55, bufferFit + ' (3.25 in)'),
        }),
        'ar-tube-rifle': standard({
          outerDiameter: tubeDiameter,
          bufferLength: dim(150.368, bufferFit + ' (5.92 in)'),
        }),
      },
    },
    // The thread is the muzzle port's size class; the standard is the bore the device is cut for.
    muzzle: { swap: slot, standards: bores },
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

    'ar-upper': { swap: job('tool') },
    'receiver-extension': { swap: job('bench'), standards: { 'ar-tube-thread': standard() } },
    // The upper's barrel thread is the same for every AR-15 handguard, so the size class carries it.
    'barrel-nut': { swap: job('tool') },
    'handguard-cap': { swap: job('tool') },
    'port-cover': { swap: job('tool') },

    barrel: { swap: job('bench') },
    'barrel-seat': { swap: job('bench') },
    'plain-muzzle': { swap: job('bench'), standards: bores },
    lower: { swap: job('bench') },
    trunnion: { swap: job('bench') },
    'sight-block': { swap: job('bench') },
    'gas-block': {
      swap: job('bench'),
      standards: {
        'ar-journal-750': standard({ journalDiameter: dim(19.05, 'derived: 0.750 in journal named by the standard') }),
      },
    },
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
  // across those frames, because the real guns share that interface. A frame class also names the interfaces only its
  // frame has, such as the muzzle thread (ar-15: 1/2x28) and the upper's barrel thread.
  platforms: {
    // The AR-15, AR-10 and AR-338 frames share buffer-tube stocks, grips and rails, and nothing else.
    ar: {
      sizeClasses: ['ar-15', 'ar-10', 'ar-338'],
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
