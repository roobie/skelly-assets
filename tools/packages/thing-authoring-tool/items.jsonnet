// The catalogue the tool builds: this repo's model sources (models/index.libsonnet) and nothing else.
{
  units: { metresPerUnit: 1, grid: 0.001, bevel: 0 },
  facets: 48,
  defaultMaterial: 'paint-charcoal',
  items: import 'models/index.libsonnet',
}
