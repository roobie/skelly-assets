// Default proportions and finishes for packages/thing-authoring-tool/cans.libsonnet's open tins. `size` is in metres;
// `share` is a fraction of the tin's height.
{
  tin: {
    size: {
      wall: 0.0008, rimWidth: 0.0014, labelThickness: 0.0003, stripeHeight: 0.003,
      hingeWidth: 0.012, hingeHeight: 0.004, beanRadius: 0.006, beanCount: 6,
    },
    share: { labelHeight: 0.68, foodDepth: 0.23 },
    finish: { body: 'steel-grey', stripe: 'paperboard-tan', food: 'paint-terracotta' },
  },
}
