// A definition naming a voxel class there is none of.
local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
voxel.of({ grain: 0.008, detailGrain: 0.002 }, { id: 'unknown', voxelClass: 'boat' })
