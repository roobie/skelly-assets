// The places a fitted garment lets the doll poke through it at rest (tools/restPoke.mjs); why the build checks them is
// in docs/decisions/0019-garment-rest-check.md. Each entry names the garment, the doll bone whose part pokes out, the
// worn piece meant to cover it there and the depth (m) the poke may reach.
// A poke that is intended, with the reason it is.
local poke(garment, bone, piece, depth, why) = { garment: garment, bone: bone, piece: piece, depth: depth, why: why };
// A poke nobody has judged yet, capped at the depth it has now. It does not fail the build and is listed on every run
// until the garment or the doll is fixed or it becomes a `poke` with a reason.
local unjudged(garment, bone, piece, depth, note) = { garment: garment, bone: bone, piece: piece, depth: depth, note: note };
// The same unjudged poke on the doll's left and right, which the doll mirrors.
local bothSides(garment, bone, piece, depth, note) = [unjudged(garment, bone + side, piece, depth, note) for side in ['.L', '.R']];

local cuffNote = 'the forearm stands out of the glove cuff; found when the check first covered every garment';
local cuffNote191 = 'the cuff poke the old doll-pose test left out (#191)';
local handNote = 'the thigh the hanging hand lies against is charged to the palm piece; suspected to be how the probe assigns skin, not the fit';
local thighNote = 'the hanging hand reaches into the thigh guard at rest; the guard or the rest pose needs a look';
local shinNote = 'the foot is charged to the shin guard; suspected to be how the probe assigns skin, not the fit';
local armourNote = 'a few millimetres of the doll show through the plate; found when the check first covered every garment';

{
  pokes: [],
  unjudged: std.flattenArrays([
    bothSides('armor_heavy', 'upperArm', 'armor_heavy_worn_body', 0.002, armourNote),
    [unjudged('armor_heavy', 'spine', 'armor_heavy_worn_upper', 0.003, armourNote)],
    bothSides('armor_power', 'forearm', 'armor_power_worn_body', 0.004, armourNote),
    bothSides('armor_power', 'upperArm', 'armor_power_worn_body', 0.002, armourNote),
    [unjudged('armor_power', 'pelvis', 'armor_power_worn_fore', 0.008, armourNote)],
    bothSides('gauntlet_plate', 'forearm', 'gauntlet_plate_worn_palm', 0.002, cuffNote),
    bothSides('gauntlet_plate', 'thigh', 'gauntlet_plate_worn_palm', 0.142, handNote),
    bothSides('gloves_heavy', 'forearm', 'gloves_heavy_worn_palm', 0.002, cuffNote),
    bothSides('gloves_heavy', 'thigh', 'gloves_heavy_worn_palm', 0.113, handNote),
    bothSides('gloves_power', 'forearm', 'gloves_power_worn_palm', 0.002, cuffNote),
    bothSides('gloves_power', 'thigh', 'gloves_power_worn_palm', 0.134, handNote),
    bothSides('gloves_trooper', 'forearm', 'gloves_trooper_worn_palm', 0.002, cuffNote),
    bothSides('gloves_trooper', 'thigh', 'gloves_trooper_worn_palm', 0.154, handNote),
    bothSides('leather_gloves', 'forearm', 'leather_gloves_worn_palm', 0.002, cuffNote191),
    bothSides('legguard_heavy', 'foot', 'legguard_heavy_worn_shin', 0.083, shinNote),
    bothSides('legguard_heavy', 'hand', 'legguard_heavy_worn_thigh', 0.034, thighNote),
    bothSides('legguard_heavy', 'index', 'legguard_heavy_worn_thigh', 0.022, thighNote),
    bothSides('legguard_heavy', 'index2', 'legguard_heavy_worn_thigh', 0.015, thighNote),
    bothSides('legguard_heavy', 'index3', 'legguard_heavy_worn_thigh', 0.022, thighNote),
    bothSides('legguard_heavy', 'little', 'legguard_heavy_worn_thigh', 0.022, thighNote),
    bothSides('legguard_heavy', 'little2', 'legguard_heavy_worn_thigh', 0.017, thighNote),
    bothSides('legguard_heavy', 'little3', 'legguard_heavy_worn_thigh', 0.014, thighNote),
    bothSides('legguard_heavy', 'middle', 'legguard_heavy_worn_thigh', 0.022, thighNote),
    bothSides('legguard_heavy', 'middle2', 'legguard_heavy_worn_thigh', 0.015, thighNote),
    bothSides('legguard_heavy', 'middle3', 'legguard_heavy_worn_thigh', 0.022, thighNote),
    bothSides('legguard_heavy', 'ring', 'legguard_heavy_worn_thigh', 0.022, thighNote),
    bothSides('legguard_heavy', 'ring2', 'legguard_heavy_worn_thigh', 0.014, thighNote),
    bothSides('legguard_heavy', 'ring3', 'legguard_heavy_worn_thigh', 0.022, thighNote),
    bothSides('legguard_heavy', 'thumb', 'legguard_heavy_worn_thigh', 0.022, thighNote),
    bothSides('legguard_heavy', 'thumb2', 'legguard_heavy_worn_thigh', 0.016, thighNote),
    bothSides('legguard_heavy', 'thumb3', 'legguard_heavy_worn_thigh', 0.016, thighNote),
    bothSides('legguard_plate', 'foot', 'legguard_plate_worn_shin', 0.083, shinNote),
    bothSides('legguard_power', 'foot', 'legguard_power_worn_shin', 0.083, shinNote),
    bothSides('legguard_power', 'hand', 'legguard_power_worn_thigh', 0.034, thighNote),
    bothSides('legguard_power', 'index', 'legguard_power_worn_thigh', 0.010, thighNote),
    bothSides('legguard_power', 'index2', 'legguard_power_worn_thigh', 0.010, thighNote),
    bothSides('legguard_power', 'index3', 'legguard_power_worn_thigh', 0.010, thighNote),
    bothSides('legguard_power', 'middle', 'legguard_power_worn_thigh', 0.013, thighNote),
    bothSides('legguard_power', 'middle2', 'legguard_power_worn_thigh', 0.013, thighNote),
    bothSides('legguard_power', 'middle3', 'legguard_power_worn_thigh', 0.013, thighNote),
    bothSides('legguard_power', 'thumb', 'legguard_power_worn_thigh', 0.022, thighNote),
    bothSides('legguard_trooper', 'foot', 'legguard_trooper_worn_shin', 0.083, shinNote),
  ]),
}
