// A definition naming both a voxel class and a grain of its own, which would leave which one it is drawn on unclear.
local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
voxel.of({ grain: 0.008, detailGrain: 0.002 }, { id: 'both', voxelClass: 'gun', voxelGrain: 0.004 })
