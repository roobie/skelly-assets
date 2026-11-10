// The voxel classes of models/voxel-grains.libsonnet, by name, so an unknown class fails the build, and the rule that
// lets a source definition name its own grain.
local grains = import 'models/voxel-grains.libsonnet';
local detail = grains.detailGrain;
local nests(grain) = std.isNumber(grain) && grain > 0 && std.abs(grain / detail - std.round(grain / detail)) < 1e-9;
grains.classes + {
  // The row's grains: its class, unless its source definition names its own `voxelGrain`. That grain must nest in the
  // detail lattice, so a tagged part still lands on whole voxels of it.
  of(class, definition)::
    if std.objectHas(definition, 'voxelGrain') then
      assert nests(definition.voxelGrain) :
             'voxelGrain %s must be a positive whole multiple of the %s m lattice' % [definition.voxelGrain, detail];
      { grain: definition.voxelGrain, detailGrain: detail }
    else class,
}
