// A fixture class resolved for a definition that names no grain, for one that names its own, for one that names a
// grain finer than the detail lattice and for one that names the class of what it is.
local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
local class = { grain: 0.008, detailGrain: 0.002 };
{
  class: class,
  plain: voxel.of(class, { id: 'plain' }),
  own: voxel.of(class, { id: 'own', voxelGrain: 0.004 }),
  fine: voxel.of(class, { id: 'fine', voxelGrain: 0.001 }),
  gun: voxel.gun,
  named: voxel.of(class, { id: 'named', voxelClass: 'gun' }),
}
