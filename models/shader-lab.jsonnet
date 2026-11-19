// The shader lab's content (tools/packages/shader-lab): its lighting stages, the test pieces it shows beside a built
// model, the see-through tuning it feeds the leaf kind as a game would, and its cameras. An author tunes these to judge
// a surface, and a mod may add a stage or a piece, so none of it is code. Colours are sRGB, as the finishes' are.
local surfaces = import 'surfaces.libsonnet';

{
  // The looks, so a piece can wear one by name and the lab can name the look a tuned finish started from.
  looks: surfaces.looks,

  // `showcase` is the showcase's own stage (site/render.mjs, makeStage), so a look reads as it will there. Every other
  // stage is lit from scratch: a sun from `from` toward the origin, a sky and ground hemisphere, the environment's
  // share and, at night, a torch the player carries.
  stages: {
    showcase: { title: 'Showcase', showcase: true, background: [0.62, 0.66, 0.7] },
    'high-sun': {
      title: 'High sun',
      background: [0.45, 0.62, 0.85],
      environment: 0.3,
      sun: { colour: [1, 0.97, 0.9], intensity: 3, from: [1.5, 8, 2] },
      hemisphere: { sky: [0.55, 0.7, 1], ground: [0.35, 0.3, 0.22], intensity: 0.6 },
    },
    'low-sun': {
      title: 'Low sun',
      background: [0.85, 0.55, 0.35],
      environment: 0.15,
      sun: { colour: [1, 0.62, 0.35], intensity: 2.6, from: [8, 1.2, 3] },
      hemisphere: { sky: [0.5, 0.45, 0.6], ground: [0.25, 0.18, 0.12], intensity: 0.35 },
    },
    overcast: {
      title: 'Overcast',
      background: [0.6, 0.62, 0.64],
      environment: 0.6,
      sun: { colour: [0.9, 0.92, 0.95], intensity: 0.4, from: [2, 8, 4] },
      hemisphere: { sky: [0.85, 0.87, 0.9], ground: [0.35, 0.33, 0.3], intensity: 1.6 },
    },
    night: {
      title: 'Night, torch',
      background: [0.01, 0.012, 0.025],
      environment: 0,
      sun: { colour: [0.55, 0.65, 1], intensity: 0.12, from: [-3, 8, 2] },
      hemisphere: { sky: [0.08, 0.1, 0.2], ground: [0.02, 0.02, 0.02], intensity: 0.15 },
      // Carried at `offset` from the player's feet, as a hand-held torch is.
      torch: { colour: [1, 0.65, 0.3], intensity: 6, distance: 12, decay: 2, offset: [0.3, 1.3, 0.2] },
    },
  },

  // The sun's shadow map: its size in texels, the half-width of the square it covers about the origin, and its biases.
  shadow: { mapSize: 2048, extent: 8, bias: -0.0004, normalBias: 0.02 },

  // The built model the lab opens on when the link names none: a lying log, whose bark runs along it.
  model: 'log',

  ground: { size: 60, colour: [0.42, 0.39, 0.33], roughness: 1 },

  // The space between a model's voxel copy, on the left, and its smooth copy, on the right, in metres.
  gap: 0.5,

  // Pieces stand behind the model, facing it. A piece wears a finish from the finish table, or a colour, a roughness and
  // a look. A quad is seen from both sides, as foliage is walked through.
  pieces: [
    {
      id: 'leaf-quad',
      title: 'Leaf quad',
      shape: { quad: [2, 2] },
      at: [0, 1, -3],
      colour: [0.27, 0.4, 0.15],
      roughness: 0.85,
      look: 'leaf-broad',
    },
    {
      id: 'needle-quad',
      title: 'Needle quad',
      shape: { quad: [2, 2] },
      at: [2.6, 1, -3],
      colour: [0.17, 0.3, 0.15],
      roughness: 0.85,
      look: 'leaf-needle',
    },
    {
      id: 'standing-log',
      title: 'Standing log',
      shape: { cylinder: { radius: 0.3, height: 2.4 } },
      at: [-2.6, 1.2, -3],
      finish: 'bark',
    },
  ],

  // What the lab feeds the leaf kind as the game's inputs: leaves within `seeRadius` of the segment from the eye to the
  // player open to `nearCoverage`, back to the look's own over `seeEdge`. `ranges` spans the sliders of the two
  // distances, which the inputs' schema leaves open.
  seeThrough: {
    nearCoverage: 0.15,
    seeRadius: 1.2,
    seeEdge: 0.6,
    ranges: { seeRadius: [0, 6], seeEdge: [0, 4] },
  },

  camera: {
    fov: 50,
    // The walking cameras' near and far planes, in metres: near enough to stand among leaves.
    near: 0.03,
    far: 300,
    // The eye's height over the player's feet, the walk (and climb, to stand in a crown) in metres a second, how far a
    // drag of one pixel turns the view in radians, and the third-person camera's place behind and above the eye.
    eyeHeight: 1.6,
    walkSpeed: 2.5,
    turn: 0.005,
    follow: { distance: 3, height: 1.2 },
    player: { radius: 0.25, height: 1.8, colour: [0.8, 0.25, 0.15] },
  },
}
