// The voxel classes of models/voxel-grains.libsonnet, by name, so an unknown class fails the build, and the rules that
// let a source definition name its own class or grain.
local grains = import 'models/voxel-grains.libsonnet';
local detail = grains.detailGrain;
local nests(grain) = std.isNumber(grain) && grain > 0 && std.abs(grain / detail - std.round(grain / detail)) < 1e-9;
grains.classes + {
  // The row's grains: its recipe's class, unless its source definition names the `voxelClass` of what it is, such as
  // a gun fitted to a vehicle, or its own `voxelGrain`. That grain must nest in the detail lattice, so a tagged part
  // still lands on whole voxels of it.
  of(class, definition)::
    local named = std.objectHas(definition, 'voxelClass');
    local id = std.get(definition, 'id', 'a definition');
    if std.objectHas(definition, 'voxelGrain') then
      assert !named : '%s names both a voxel class and a voxel grain' % id;
      assert nests(definition.voxelGrain) :
             'voxelGrain %s must be a positive whole multiple of the %s m lattice' % [definition.voxelGrain, detail];
      { grain: definition.voxelGrain, detailGrain: detail }
    else if named then
      assert std.objectHas(grains.classes, definition.voxelClass) : '%s names no voxel class %s' % [id, definition.voxelClass];
      grains.classes[definition.voxelClass]
    else class,
}
