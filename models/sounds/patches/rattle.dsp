// A rattle or clatter: random clicks thinning out over time into two small resonator sets, like loose bones
// or pebbles knocking each other until they settle.
declare name "rattle";
declare duration "2";
import("sfx.lib");

// The clicks expected over the whole rattle, not a rate, so a short span still clatters instead of one knock.
clicks = hslider("clicks [scale:log]", 12, 4, 60, 0.1);
span = hslider("span [scale:log]", 0.5, 0.2, 1.5, 0.01);
pitch = hslider("pitch [scale:log]", 1200, 300, 4000, 1);
// The pitch gap between the two sets: near 1 they sound like one object, wide like two different ones.
spread = hslider("spread", 1.6, 1.1, 2.5, 0.01);
ring = hslider("ring [scale:log]", 0.03, 0.005, 0.1, 0.0001);
hardness = hslider("hardness [scale:log]", 5000, 1000, 14000, 1);

// Quadratic, so the clicks reach none at `span` and the render ends in silence; its integral is span / 3.
density = 3 * clicks / span * pow(clamp01(1 - seconds / span), 2);
chance = no.noises(3, 0) : +(1) : *(0.5);
knocks = (chance < density / ma.SR) * (no.noises(3, 1) : abs) * pow(clamp01(1 - seconds / span), 1.5);
// Which set a click lands on, so the clatter alternates rather than repeating one knock.
side = no.noises(3, 2) > 0;

set(f) = _ <: par(k, 3, pm.modeFilter(audible(f * (1 + 1.7 * k)), ring / (1 + k), 1 / (1 + k))) :> _;

process = knocks : fi.lowpass(2, hardness) <: *(side), *(1 - side) : set(pitch), set(pitch * spread) :> _;
