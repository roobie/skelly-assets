// The leaper's corpse groups. They describe its body, so they live with the model and change with its anatomy;
// the game's ragdoll solver reads them (`PROJECT.md`, "Design boundaries"). Each group falls as one rigid body;
// `limits` are radians from the pose it dies in, one range per joint axis, and the root group has none.
local hinge(bones, limits) = { bones: bones, limits: [limits, [0, 0], [0, 0]] };
local ball(bones, flex, swing, twist) = { bones: bones, limits: [flex, twist, swing] };

// The trunk falls as one body: its waist and chest barely bend in life, and a free joint there would open the
// trunk as it lands. The head has no neck, the knees and feet hinge in the line of the leg, and the jaw only
// drops.
{
  groups: [
    { bones: ['pelvis', 'spine', 'chest'], limits: null },
    ball(['head'], [-0.25, 0.25], [-0.2, 0.2], [-0.2, 0.2]),
    hinge(['jaw'], [-0.6, 0]),
  ] + std.flattenArrays([
    [
      ball(['upperArm.' + side], [-1.1, 1.1], [-0.6, 0.6], [-0.5, 0.5]),
      hinge(['forearm.' + side, 'hand.' + side], [-1, 1]),
      ball(['thigh.' + side], [-1.2, 1.2], [-0.4, 0.4], [-0.3, 0.3]),
      hinge(['shin.' + side], [-1.3, 1.3]),
      hinge(['foot.' + side], [-0.8, 0.8]),
    ]
    for side in ['L', 'R']
  ]),
}
