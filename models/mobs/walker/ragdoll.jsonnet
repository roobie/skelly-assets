// The security walker's wreck groups. They describe its body, so they live with the model and change with
// its build; the game's ragdoll solver reads them (`tools/packages/mobgen/PROJECT.md`, "Design boundaries").
// Each group falls as one rigid body; `limits` are radians from the pose it dies in, one range per joint
// axis, and the root group has none.
local hinge(bones, limits) = { bones: bones, limits: [limits, [0, 0], [0, 0]] };

// A dead machine falls as hinged plate: every joint is a hinge in the line of the leg, so a wreck folds
// rather than flops. The sensor head and pods sag on their mounts. The tarsus and foot lock together, as
// the toes' rams hold them once the power is gone.
{
  groups: [
    { bones: ['hull'], limits: null },
    hinge(['head'], [-0.3, 0.2]),
  ] + std.flattenArrays([
    [
      hinge(['pod.' + side], [-0.5, 0.3]),
      hinge(['thigh.' + side], [-0.8, 1]),
      hinge(['shin.' + side], [-0.6, 1.1]),
      hinge(['tarsus.' + side, 'foot.' + side], [-0.9, 1]),
    ]
    for side in ['L', 'R']
  ]),
}
