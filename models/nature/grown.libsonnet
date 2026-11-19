// A catalogue row the build grows from a species and a seed (thing-authoring-tool/src/growth) instead of drawing it
// piece by piece, so a tree's form is its habit's and a new tree is a new species row.
local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local species = import 'grown.species.libsonnet';
{
  // The grain goes to the family as well as the row: the family sees only its params, and keeps clumps whole voxels
  // thick. A null `density` keeps the species' own. The finish and keywords are the species'.
  row(id, title, kind, seed, kg, grain, density=null):
    h.item(id, 'grown', kg, {
      species: std.manifestJsonMinified(species[kind]),
      seed: seed,
      grain: grain,
    } + (if density == null then {} else { density: density }), species[kind].finish) + {
      title: title,
      voxelGrain: grain,
      taxonomy: { category: 'nature', tags: { material: ['wood', 'plant'] }, keywords: species[kind].keywords },
    },
}
