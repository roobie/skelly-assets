// A rattle or clatter, after Cook's PhISEM: loose objects collide at random moments while the shaken system loses
// its energy, so collisions come thinner and softer until they settle, like bones, casings or pebbles in a box.
declare name "rattle";
declare duration "2";
import("sfx.lib");

// The collisions expected over the whole rattle, not a rate, so a short settle still clatters instead of one knock.
collisions = hslider("collisions [scale:log]", 20, 6, 120, 0.1);
// Time for the system's energy to fall 20 dB, about where the clatter thins to stray knocks. Not 60 dB: nearly
// all collisions land in the first third of that, so a 60 dB settle would sound far shorter than it reads.
settle = hslider("settle [scale:log]", 0.4, 0.1, 0.8, 0.01);
// Each collision's own short decay: short is hard little objects, long is a looser, rattlier box.
grain = hslider("grain [scale:log]", 0.004, 0.001, 0.02, 0.0001);
pitch = hslider("pitch [scale:log]", 1500, 300, 5000, 1);
// The pitch gap between the two kinds of object: near 1 they sound like one kind, wide like two different ones.
spread = hslider("spread", 1.6, 1.1, 2.5, 0.01);
// Internal friction: high is bone or wood, low is metal casings or glass beads.
loss = hslider("loss [scale:log]", 0.03, 0.004, 0.12, 0.0001);
// How often the second kind is hit; the clatter is seldom an even mix.
mix = hslider("mix", 0.5, 0.1, 0.9, 0.01);

energy = exp(-2.3026 * seconds / settle);
// The rate at the first shake whose decaying integral is `collisions`.
rate = collisions * 2.3026 / settle;

// Poisson-timed, at most one collision per sample; the shake itself is the first, so no draw renders silence.
chance = no.noises(4, 0) : +(1) : *(0.5);
collision = (chance < rate * energy / ma.SR) | strike;
// A collision's force is random and bounded by the energy left, so the late knocks are quieter as well as rarer.
force = collision * energy * (no.noises(4, 1) : abs);
// The sound of each collision: a level that every collision adds to and that decays on its own between them.
level = force : + ~ *(exp(-6.9078 / (grain * ma.SR)));
// Which kind each collision lands on, held until the next one, so one knock rings one object.
second = ba.sAndH(collision, no.noises(4, 2) : +(1) : *(0.5) : <(mix));

// A few lossy bar modes per object, so each kind has a pitch and a material rather than being a filtered click.
ratios = (1, 2.756, 5.404);
object(f) = pm.modalModel(3, par(k, 3, audible(f * r(k))), par(k, 3, frictionT60(loss, f * r(k))), par(k, 3, 1 / (1 + k)))
with { r(k) = ba.take(k + 1, ratios); };

// Scaled down because a busy clatter's overlapping rings sum well above full scale before the batch levels them.
process = no.noises(4, 3) * level * 0.1 <: *(1 - second), *(second) : object(pitch), object(pitch * spread) :> _;
