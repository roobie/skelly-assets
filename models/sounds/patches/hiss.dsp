// A hiss: a band of noise venting from a valve, for pneumatics, vents and steam, with bubble pops in it for spit,
// acid or sizzling flesh. The valve's clunks and the falling pressure are what make it read as a machine.
declare name "hiss";
declare duration "2.8";
import("sfx.lib");

centre = hslider("centre [scale:log]", 3000, 400, 10000, 1);
focus = hslider("focus [scale:log]", 1.5, 0.5, 10, 0.01);
// Octaves the band travels as the pressure falls: a rising hiss reads as filling, a falling one as spent.
sweep = hslider("sweep", 0, -2, 2, 0.01);
open = hslider("open [scale:log]", 0.01, 0.002, 0.15, 0.001);
// The time the tank takes to vent to silence through the open valve.
vent = hslider("vent [scale:log]", 0.8, 0.15, 2.5, 0.01);
// How far through the vent the valve shuts again: a short burst then a clunk is a door or a gun. Past 1 the tank
// vents out first, a brake or a steam release, and the range reaches past it so a fair share of draws do.
shut = hslider("shut", 1, 0.08, 1.4, 0.01);
clunk = hslider("clunk", 0.5, 0, 1, 0.01);
body = hslider("body [scale:log]", 300, 120, 1200, 1);
fizz = hslider("fizz [scale:log]", 40, 2, 400, 1);
popPitch = hslider("pop pitch [scale:log]", 1500, 300, 5000, 1);
// Squared, so most draws are dry or nearly, the way vents and pneumatics are.
wet = hslider("wet", 0.3, 0, 1, 0.01) ^ 2;

progress = clamp01(seconds / vent);
pressure = exp(-6.9078 * progress);
shutAt = shut * vent;
// The last few milliseconds of travel, so the valve cuts the flow without a click.
valve = clamp01(seconds / open) * clamp01((shutAt - seconds) / 0.003);

band = audible(centre * pow(2, sweep * progress));
hiss = no.noise : fi.resonbp(band, focus, 1);

// A separate noise stream, so the pops do not fall on the hiss's own loud samples.
pops = no.noises(2, 1) : (+(1) : *(0.5) : <(fizz / ma.SR)) : fi.resonbp(popPitch, 12, 1);

// The valve's own body knocked as it opens and again as it seats, if it shuts before the tank is empty.
seats = (shut < 1) * (ba.time == int(shutAt * ma.SR));
clunks = pm.strike(0.6, 0.4, clunk, strike + seats)
  : pm.modalModel(3, (body, body * 2.32, body * 4.25), (0.08, 0.05, 0.03), (1, 0.5, 0.25));

// The body's narrow modes ring far louder than the noise band, so a full clunk is brought to about the hiss's peak.
process = (hiss + wet * 4 * pops) * pressure * valve + 0.08 * clunks;
