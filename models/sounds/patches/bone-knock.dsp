// A knock on bone: a lossy bar's modes, which die within a few tens of milliseconds and the upper ones first,
// over a dull thud. Equal, long decays are what made the first bone patch sound like glass.
declare name "bone-knock";
declare duration "0.35";
import("sfx.lib");

pitch = hslider("pitch [scale:log]", 450, 220, 1100, 1);
// Internal friction: lossy enough that the fundamental is gone within a quarter second, which reads as bone, not glass.
loss = hslider("loss [scale:log]", 0.06, 0.035, 0.12, 0.001);
// Bends the partials apart or together, so no two bones share one neat set of ratios.
warp = hslider("warp", 1, 0.92, 1.08, 0.01);
// A bone is not round: its second axis gives a second set of modes just above the first.
split = hslider("split", 1.08, 1.02, 1.3, 0.01);
// Milliseconds of contact: a longer contact is a softer, duller knock.
touch = hslider("contact [scale:log]", 2, 1, 5, 0.01);
bright = hslider("bright", 0.5, 0.25, 0.8, 0.01);
thud = hslider("thud [scale:log]", 120, 60, 260, 1);
body = hslider("body", 0.5, 0.1, 1, 0.01);
// The unpitched part of the contact, which modal tools keep because modes alone sound too clean.
click = hslider("click", 0.2, 0, 0.6, 0.01);

// A free-free bar's partial ratios, the nearest simple model of a long bone.
ratios = (1, 2.756, 5.404, 8.933, 13.344, 18.638);
nRatios = 6;
nModes = 2 * nRatios;

freq(i) = audible(pitch * pow(ba.take(i % nRatios + 1, ratios), warp) * ba.if(i < nRatios, 1, split));
gain(i) = pow(bright, i % nRatios) * ba.if(i < nRatios, 1, 0.6);

modes = pm.modalModel(nModes, par(i, nModes, freq(i)), par(i, nModes, frictionT60(loss, freq(i))), par(i, nModes, gain(i)));

// pm.strike rises and falls over 2 ms each per unit of sharpness, so a contact of `touch` ms is touch / 4.
excitation = pm.strike(0.5, touch / 4, 1, strike);

thump = no.noise * riseFall(0.002, 0.04) : fi.lowpass(2, thud);

// The modes ring far louder than the contact that feeds them; these gains keep the raw render near full scale.
process = excitation <: modes * 0.1, *(click * 2) :> _ : +(body * 0.3 * thump);
