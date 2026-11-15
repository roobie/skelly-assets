// A wet or acid hiss: a band of noise that glides, with bubble pops in it, for spit, steam, sizzling flesh.
declare name "hiss";
declare duration "2.8";
import("sfx.lib");

centre = hslider("centre [scale:log]", 3000, 400, 10000, 1);
focus = hslider("focus [scale:log]", 1.5, 0.5, 10, 0.01);
// Octaves the band travels over the sound: a rising hiss reads as building pressure, a falling one as spent.
sweep = hslider("sweep", 0, -2, 2, 0.01);
rise = hslider("rise [scale:log]", 0.02, 0.003, 0.4, 0.001);
fall = hslider("fall [scale:log]", 0.8, 0.15, 2.2, 0.01);
fizz = hslider("fizz [scale:log]", 40, 2, 400, 1);
popPitch = hslider("pop pitch [scale:log]", 1500, 300, 5000, 1);
wet = hslider("wet", 0.5, 0, 1, 0.01);

band = audible(centre * pow(2, sweep * clamp01(seconds / (rise + fall))));
hiss = no.noise : fi.resonbp(band, focus, 1);

// A separate noise stream, so the pops do not fall on the hiss's own loud samples.
pops = no.noises(2, 1) : (+(1) : *(0.5) : <(fizz / ma.SR)) : fi.resonbp(popPitch, 12, 1);

process = (hiss + wet * 4 * pops) * riseFall(rise, fall);
