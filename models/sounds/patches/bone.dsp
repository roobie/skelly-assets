// A struck bone: a stiff bar's few modes, short-lived, so it reads as dry and hollow rather than as metal.
declare name "bone";
declare duration "1.2";
import("sfx.lib");

pitch = hslider("pitch [scale:log]", 900, 250, 3000, 1);
// Bends the bar's partials apart or together, from a tight knock to a split, cracked one.
spread = hslider("spread", 1, 0.85, 1.15, 0.01);
ring = hslider("ring [scale:log]", 0.12, 0.02, 0.5, 0.001);
hardness = hslider("hardness [scale:log]", 4000, 800, 14000, 1);
hollow = hslider("hollow", 0.5, 0.1, 0.9, 0.01);

// A free-free bar's partial ratios, which is the nearest simple model of a long bone.
ratios = (1, 2.756, 5.404, 8.933);

mode(k) = pm.modeFilter(audible(pitch * pow(r, spread)), ring / pow(r, 0.7), pow(hollow, k))
with { r = ba.take(k + 1, ratios); };

process = contact(hardness) <: par(k, 4, mode(k)) :> _;
