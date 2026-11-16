// A metal clank: a struck plate's many dense, inharmonic modes ringing long, hit by a few bounces. Few modes read
// as a drum rim; a dense set is what reads as sheet or cast metal.
declare name "clank";
declare duration "3";
import("sfx.lib");

pitch = hslider("pitch [scale:log]", 300, 120, 1200, 1);
// The plate's side ratio; near 1 the modes pair up into a tuned, gong-like set.
aspect = hslider("aspect", 1.6, 1.15, 2.8, 0.01);
// Shorter than about half a second and the tail no longer reads as metal.
ring = hslider("ring [scale:log]", 1.2, 0.5, 3, 0.01);
// How much faster the upper modes die: low is a bell-bright sheet, high is a dull, thick plate.
damping = hslider("damping", 0.6, 0.2, 1, 0.01);
// Where the plate is hit, which modes it wakes: near an edge wakes the upper ones, the middle only the odd low ones.
strikeX = hslider("strike x", 0.3, 0.05, 0.5, 0.01);
strikeY = hslider("strike y", 0.4, 0.05, 0.5, 0.01);
// The strike's contact: low is a hard, bright tick, high a soft, dull hit.
contactSoftness = hslider("softness", 0.3, 0.05, 1, 0.01);
bounces = hslider("bounces", 2, 1, 4, 1);
gap = hslider("gap [scale:log]", 0.06, 0.015, 0.2, 0.001);
// How much of each bounce's height, and so of its gap and force, survives into the next.
restitution = hslider("restitution", 0.5, 0.25, 0.75, 0.01);

side = 5;
modes = side * side;

// A simply supported rectangular plate's mode ratios, scaled so the lowest mode sits at `pitch`.
ratio(k) = (m * m + aspect * aspect * n * n) / (1 + aspect * aspect)
with { m = int(k / side) + 1; n = k % side + 1; };
freq(k) = pitch * ratio(k);
t60(k) = ring * pow(1 / ratio(k), damping);
// Zero above the audible band, so modes past it are dropped rather than piled up at its edge.
gain(k) = abs(sin(m * ma.PI * strikeX) * sin(n * ma.PI * strikeY)) * (freq(k) < 0.45 * ma.SR)
with { m = int(k / side) + 1; n = k % side + 1; };

plate = pm.modalModel(modes, par(k, modes, audible(freq(k))), par(k, modes, t60(k)), par(k, modes, gain(k)));

// A bouncing object lands after shrinking gaps, each one weaker, the way a dropped lid or pipe settles.
landing(k) = gap * (1 - pow(restitution, k)) / (1 - restitution);
hit(k) = ba.time == int(landing(k) * ma.SR);
bounce(k) = pm.strike(1 - contactSoftness, contactSoftness, pow(restitution, k) * (k < bounces), hit(k));

// Divided by the mode count, so the summed modes stay near full scale before the batch levels them.
process = par(k, 4, bounce(k)) :> plate : /(modes);
