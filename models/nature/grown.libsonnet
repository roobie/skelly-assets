// Grown counterparts of #304's woodland trees and shrubs: each row is a species and a seed, and the build grows it
// (thing-authoring-tool/src/growth). Two seeds per species show what a seed varies and what the species holds.
local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local species = import 'grown.species.libsonnet';
// Each grows to the size of the woodland row it answers, so it is drawn at that row's voxel grain.
local kinds = [
  { species: 'broadleaf', title: 'Grown broadleaf', kg: 3600, grain: 0.08, leaf: 'foliage-oak' },
  { species: 'conifer', title: 'Grown conifer', kg: 1400, grain: 0.08, leaf: 'foliage-pine' },
  { species: 'birch', title: 'Grown birch', kg: 900, grain: 0.06, leaf: 'foliage-birch', bark: 'bark-birch' },
  { species: 'hazel', title: 'Grown hazel shrub', kg: 8, grain: 0.04, leaf: 'foliage-understorey' },
  { species: 'low', title: 'Grown low shrub', kg: 3, grain: 0.02, leaf: 'foliage-understorey' },
];
local seeds = [1, 2];
{
  rows: [
    h.item('grown_%s_%d' % [k.species, seed], 'grown', k.kg, {
      species: std.manifestJsonMinified(species[k.species]),
      seed: seed,
    }, { bark: std.get(k, 'bark', 'bark'), leaf: k.leaf }) + {
      title: '%s, seed %d' % [k.title, seed],
      voxelGrain: k.grain,
      taxonomy: { category: 'nature', tags: { material: ['wood', 'plant'] } },
    }
    for k in kinds
    for seed in seeds
  ],
}
