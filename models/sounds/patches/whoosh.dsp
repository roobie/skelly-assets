// A whoosh or swing: a noise band that swells and lifts in pitch as it passes, the way air past a blade does.
declare name "whoosh";
declare duration "1.4";
import("sfx.lib");

length = hslider("length [scale:log]", 0.4, 0.15, 1.2, 0.001);
centre = hslider("centre [scale:log]", 900, 250, 4000, 1);
focus = hslider("focus [scale:log]", 1.5, 0.6, 6, 0.01);
lift = hslider("lift", 1, 0, 2, 0.01);
// Where in the pass it is loudest: early is a snap, late is a wind-up.
peak = hslider("peak", 0.5, 0.2, 0.8, 0.01);
whistle = hslider("whistle", 0.1, 0, 1, 0.01);

phase = clamp01(seconds / length);
// Smooth at both ends and zero after `length`, so the pass neither clicks in nor out.
swell = pow(sin(ma.PI / 2 * ba.if(phase < peak, phase / peak, (1 - phase) / (1 - peak))), 2);
band = audible(centre * pow(2, lift * (swell - 0.5)));

process = ((no.noise : fi.resonbp(band, focus, 1)) + whistle * 0.3 * os.osc(band)) * swell;
