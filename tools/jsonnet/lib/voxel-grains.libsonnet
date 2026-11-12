// The voxel classes of models/voxel-grains.libsonnet, by name, so an unknown class fails the build, and the rules that
// let a source definition name its own class or grain.
local grains = import 'models/voxel-grains.libsonnet';
local detail = grains.detailGrain;
local whole(ratio) = std.abs(ratio - std.round(ratio)) < 1e-9;
// A grain nests with the detail lattice when either is a whole multiple of the other, so every voxel face of the
// coarser lattice lies on a face of the finer one.
local nests(grain) = std.isNumber(grain) && grain > 0 && (whole(grain / detail) || whole(detail / grain));
grains.classes + {
  // The row's grains: its recipe's class, unless its source definition names the `voxelClass` of what it is, such as
  // a gun fitted to a vehicle, or its own `voxelGrain`. That grain must nest with the detail lattice, so a tagged part
  // still lands on whole voxels of it. A grain finer than the detail grain already draws every part finer than a
  // tagged part asks for, so it is its own detail grain.
  of(class, definition)::
    local named = std.objectHas(definition, 'voxelClass');
    local id = std.get(definition, 'id', 'a definition');
    if std.objectHas(definition, 'voxelGrain') then
      assert !named : '%s names both a voxel class and a voxel grain' % id;
      assert nests(definition.voxelGrain) :
             'voxelGrain %s must be a positive whole multiple or whole fraction of the %s m lattice'
             % [definition.voxelGrain, detail];
      { grain: definition.voxelGrain, detailGrain: std.min(definition.voxelGrain, detail) }
    else if named then
      assert std.objectHas(grains.classes, definition.voxelClass) : '%s names no voxel class %s' % [id, definition.voxelClass];
      grains.classes[definition.voxelClass]
    else class,
}
