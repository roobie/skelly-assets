// A tapped glass or thin tube: a stiff bar's few long, narrow modes. It was meant as bone, but long, near-equal
// decays per mode are what glass sounds like, and its taps were kept as glass.
declare name "glass";
declare duration "1.2";
import("sfx.lib");

pitch = hslider("pitch [scale:log]", 900, 250, 3000, 1);
// Bends the bar's partials apart or together, from a tight knock to a split, cracked one.
spread = hslider("spread", 1, 0.85, 1.15, 0.01);
// Below about 60 ms the modes die inside the contact and only a tick is left.
ring = hslider("ring [scale:log]", 0.12, 0.06, 0.5, 0.001);
hardness = hslider("hardness [scale:log]", 4000, 800, 14000, 1);
hollow = hslider("hollow", 0.5, 0.1, 0.9, 0.01);

// A free-free bar's partial ratios.
ratios = (1, 2.756, 5.404, 8.933);

mode(k) = pm.modeFilter(audible(pitch * pow(r, spread)), ring / pow(r, 0.7), pow(hollow, k))
with { r = ba.take(k + 1, ratios); };

process = contact(hardness) <: par(k, 4, mode(k)) :> _;
