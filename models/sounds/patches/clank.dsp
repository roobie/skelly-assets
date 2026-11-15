// A metallic clank or ring: many inharmonic modes in beating pairs, the long tail that tells metal from bone.
declare name "clank";
declare duration "3";
import("sfx.lib");

pitch = hslider("pitch [scale:log]", 500, 150, 2500, 1);
ring = hslider("ring [scale:log]", 0.8, 0.15, 2.5, 0.01);
// How much faster the upper modes die: low is a bell, high is a dull plate.
damping = hslider("damping", 0.6, 0.2, 1.4, 0.01);
hardness = hslider("hardness [scale:log]", 6000, 1000, 16000, 1);
beat = hslider("beat [scale:log]", 0.004, 0.0005, 0.03, 0.0001);
bright = hslider("bright", 0.6, 0.2, 1, 0.01);

// Risset's bell partials: inharmonic enough to read as cast or struck metal at any pitch.
ratios = (0.56, 0.92, 1.19, 1.71, 2, 2.74, 3, 3.76);

mode(k) = pm.modeFilter(audible(f), t60, g) + pm.modeFilter(audible(f * (1 + beat)), t60, g)
with {
  r = ba.take(k + 1, ratios);
  f = pitch * r;
  t60 = ring * pow(0.56 / r, damping);
  g = pow(bright, k);
};

process = contact(hardness) <: par(k, 8, mode(k)) :> _;
