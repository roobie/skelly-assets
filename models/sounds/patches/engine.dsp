// An engine: the cylinders' firing pulses through an exhaust pipe and muffler. Modelling the firing rate, not a
// static tone, is what keeps it an engine at any rpm and lets one cylinder's weakness be heard as a lope.
declare name "engine";
declare duration "2.6";
import("sfx.lib");

// The declared duration, so the fade out lands at the end of the render.
length = 2.6;

rpm = hslider("rpm [scale:log]", 1200, 500, 6000, 1);
cylinders = hslider("cylinders", 4, 1, 8, 1);
// The rpm the engine spools to over `spool`, as a ratio: below 1 it winds down, above it revs.
rev = hslider("rev [scale:log]", 1, 0.5, 2.5, 0.01);
spool = hslider("spool [scale:log]", 0.8, 0.2, 2.5, 0.01);
// Throttle: how much combustion roar rides on each pulse.
load = hslider("load", 0.4, 0, 1, 0.01);
// How much weaker one cylinder fires than the rest.
lope = hslider("lope", 0.2, 0, 0.8, 0.01);
rough = hslider("rough", 0.15, 0, 0.5, 0.01);
// Pipe length in metres, whose quarter-wave resonances colour every pulse.
pipe = hslider("pipe [scale:log]", 1.2, 0.3, 3, 0.01);
ring = hslider("ring", 0.6, 0.2, 0.85, 0.01);
muffle = hslider("muffle [scale:log]", 1200, 300, 5000, 1);

speed = rpm * pow(rev, 1 - exp(-seconds / spool));
// Four-stroke: each cylinder fires once every two turns.
phase = os.lf_sawpos(speed / 60 * cylinders / 2);
fire = phase < phase';
cylinder = (fire : + ~ _) % int(cylinders);
force = (no.noise : ba.sAndH(fire) : *(rough) : +(1)) * (1 - lope * (cylinder == 0));

// A few milliseconds of burn per firing, so the pulse has a body rather than being a click.
burn = fire * force : fi.pole(exp(-1 / (0.004 * ma.SR)));
puff = burn * (1 + 3 * load * no.noise) : fi.dcblocker;

// The round trip of a pipe closed at the engine end, so its resonances are the odd harmonics.
exhaust = fi.fb_fcomb(2048, 2 * pipe / 343 * ma.SR, 1, ring) : fi.lowpass(2, muffle);

fades = clamp01(seconds / 0.05) * clamp01((length - seconds) / 0.15);

process = puff : exhaust : *(fades);
