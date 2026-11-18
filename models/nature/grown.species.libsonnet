// Species the growth family (thing-authoring-tool/src/growth) grows trees and shrubs from: every number is a habit,
// none is a shape. Each species is one temperate habit #304's woodland already draws by hand, so the two read side by
// side. Fields are documented in growth/species.ts; values the article leaves open come from Palubicki et al. 2009.
// A species' hidden `finish` is what its wood and leaves are drawn in: the family never sees it, the row takes it.
// The wood is tagged bark, not drawn as bark: at a coarse grain its furrows and plates are a shader's to draw.
local base = {
  alpha: 2,
  shootCap: 4,
  leaders: { count: 1, spread: 0 },
  // The paper's shadow constants: the pyramid reaches 4–8 cells down and halves with each.
  light: { model: 'shadow', depth: 6, a: 0.2, b: 2, perception: 90 },
  shedding: { threshold: 0.04, grace: 2 },
  // A grown skeleton has thousands of tips where a tree has millions of twigs, so a tip stands for a spray of them:
  // its radius is a spray's and the exponent sits at the pipe model's low end.
  pipe: { exponent: 2.2, tip: 0.02, flare: 1.4, sink: 0.08 },
  bark: { cull: 0.02, merge: 10 },
  density: 1,
  // A crown of clumps alone is a shell whose inside the voxel copy pays for as much as its outside, so a core fills
  // each column; two-layer terraces read as a voxel crown's steps and keep its slopes from costing a face per layer.
  foliage: { least: 1, core: 1.3, terrace: 2 },
  finish:: { bark: 'bark', leaf: 'foliage-oak' },
};
// An oak's crown: weak apical control lets laterals overtake the leader into a broad, rounded dome on a short bole. Its
// twigs vanish into a crown this dense, so only limbs are barked, and its wide slopes step three layers at a time.
local broadleaf = base {
  seasons: 15,
  internode: 0.32,
  lambda: 0.47,
  pipe: base.pipe { tip: 0.014 },
  bark+: { cull: 0.04 },
  branching: { angle: 45, phyllotaxis: 'spiral', divergence: 137.5, whorl: 1, budLife: 4, bole: 2.4 },
  direction: { previous: 1, light: 0.35, tropism: { leader: 0.15, lateral: 0.05 }, noise: 0.18, flatten: 0.25 },
  foliage+: { age: 3, clump: 0.6, squash: 0.6, crown: 0.6, terrace: 3 },
};
// A pine: strong apical control keeps one leader; whorled laterals held near level stack into tiers. Its tiers are
// what it reads by, and a core down each column would fill the gaps between them, so it pays for its crown's inside.
local conifer = base {
  seasons: 13,
  internode: 0.24,
  shootCap: 3,
  lambda: 0.56,
  pipe: base.pipe { tip: 0.012 },
  // Lower tiers stay in the shade a long while before they go.
  shedding: { threshold: 0.01, grace: 4 },
  branching: { angle: 70, phyllotaxis: 'whorl', divergence: 0, whorl: 5, budLife: 2, bole: 1.6 },
  direction: { previous: 1, light: 0.1, tropism: { leader: 0.4, lateral: 0 }, noise: 0.06, flatten: 0.6 },
  foliage+: { age: 4, clump: 0.45, squash: 0.45, crown: 0.3, core: 0 },
  finish:: base.finish { leaf: 'foliage-pine' },
};
// A shrub fills a dome of space instead of competing for light: colonization markers in a flattened hemisphere.
local dome(radius, height, markers) = {
  model: 'colonize',
  envelope: { centre: [0, 0, 0], radii: [radius, height, radius], floor: height * 0.08 },
  markers: markers,
  occupancy: 2,
  reach: 5,
  perception: 90,
};
{
  broadleaf: broadleaf,
  // An upright oak: a stronger leader holds its laterals in, so the crown rises taller than it spreads.
  upright: broadleaf {
    lambda: 0.53,
    branching+: { angle: 32, bole: 2.8 },
    direction+: { tropism: { leader: 0.35, lateral: 0.15 }, flatten: 0.05 },
  },
  conifer: conifer,
  // A spruce: a leader climbing harder still and tiers kept low and never shed, so it stands a dense cone. Its laterals
  // are held back a little (λ under the pine's): a spruce's tiers never shed, so any more and they outgrow the leader.
  // A dense cone has no gaps between its tiers to keep, so unlike the pine it takes a core to fill them.
  spruce: conifer {
    seasons: 15,
    lambda: 0.53,
    shedding: null,
    branching+: { bole: 0.9 },
    direction+: { tropism: { leader: 0.55, lateral: 0 } },
    foliage+: { core: 1.3 },
  },
  // A birch: a slender leader, fine long laterals that hang under negative tropism, and a light, open crown.
  birch: base {
    seasons: 12,
    internode: 0.3,
    lambda: 0.56,
    bark+: { cull: 0.03 },
    branching: { angle: 35, phyllotaxis: 'spiral', divergence: 137.5, whorl: 1, budLife: 2, bole: 2.5 },
    direction: { previous: 1, light: 0.2, tropism: { leader: 0.4, lateral: -0.55 }, noise: 0.12, flatten: 0 },
    shedding: { threshold: 0.12, grace: 1 },
    pipe: base.pipe { tip: 0.01, flare: 1.25 },
    foliage+: { age: 2, clump: 0.4, squash: 0.5, crown: 0.4 },
    finish:: { bark: 'bark-birch', leaf: 'foliage-birch' },
  },
  // A hazel: many stems from the ground with laterals favoured, filling a dome a little taller than wide.
  hazel: base {
    seasons: 7,
    internode: 0.12,
    lambda: 0.45,
    leaders: { count: 6, spread: 22 },
    branching: { angle: 40, phyllotaxis: 'spiral', divergence: 137.5, whorl: 1, budLife: 3, bole: 0.15 },
    direction: { previous: 1, light: 0.6, tropism: { leader: 0.05, lateral: 0.05 }, noise: 0.15, flatten: 0 },
    light: dome(1.15, 1.95, 1600),
    shedding: null,
    pipe: base.pipe { tip: 0.006, flare: 1, sink: 0.04 },
    bark: { cull: 0.008, merge: 12 },
    foliage+: { age: 4, clump: 0.2, squash: 0.6, crown: 0.7 },
    finish:: base.finish { leaf: 'foliage-understorey' },
  },
  // A low shrub: a mat of short stems under a flat dome.
  low: base {
    seasons: 6,
    internode: 0.06,
    lambda: 0.42,
    leaders: { count: 5, spread: 40 },
    branching: { angle: 45, phyllotaxis: 'opposite', divergence: 0, whorl: 1, budLife: 2, bole: 0.04 },
    direction: { previous: 1, light: 0.6, tropism: { leader: 0, lateral: 0 }, noise: 0.15, flatten: 0 },
    light: dome(0.75, 0.8, 1200),
    shedding: null,
    pipe: base.pipe { tip: 0.004, flare: 1, sink: 0.03 },
    bark: { cull: 0.006, merge: 12 },
    foliage+: { age: 4, clump: 0.12, squash: 0.6, crown: 0.7 },
    finish:: base.finish { leaf: 'foliage-understorey' },
  },
}
