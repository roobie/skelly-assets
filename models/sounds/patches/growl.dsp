// A growl or groan: low FM whose index follows the loudness, so it brightens as it swells like a voice does.
declare name "growl";
declare duration "2.8";
import("sfx.lib");

pitch = hslider("pitch [scale:log]", 80, 35, 300, 0.1);
ratio = hslider("ratio", 1, 0.25, 3.5, 0.01);
depth = hslider("depth", 3, 0, 12, 0.01);
// Noise in the modulator: the roughness that turns a hum into a throat.
rasp = hslider("rasp", 0.3, 0, 1, 0.01);
wobble = hslider("wobble [scale:log]", 6, 0.5, 25, 0.01);
bend = hslider("bend", -0.3, -1, 1, 0.01);
rise = hslider("rise [scale:log]", 0.1, 0.01, 0.6, 0.001);
fall = hslider("fall [scale:log]", 0.8, 0.2, 2, 0.01);
dark = hslider("dark [scale:log]", 1500, 300, 6000, 1);

level = riseFall(rise, fall);
f0 = pitch * pow(2, bend * clamp01(seconds / (rise + fall))) * (1 + 0.03 * os.osc(wobble));
modulator = os.osc(f0 * ratio) * (1 + rasp * 4 * (no.noise : fi.lowpass(1, 200)));

process = os.oscp(f0, depth * level * modulator) * level : fi.lowpass(2, dark);
