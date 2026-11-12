// The voxel classes, as the `voxel` field of an export recipe row; grains in metres. `vehicle` is for vehicles,
// furniture and parts made to attach to them and matches deadvox's vehicle voxels; `gun` is for firearms, mounted on a
// vehicle or not, their magazines and hand-held items, whose small controls and thin shapes are finer detail than
// `item` holds; `item` is for every other item or component. `detailGrain` is for the parts a design tags as fine
// detail, such as sights, whose notches and posts the `gun` grain fills; a class's `grain` must be a whole multiple of
// it so the lattices nest, which the `vehicle` grain is not, and no vehicle part carries the tag.
// `featureVoxels` is how many voxels a feature must span at a grain to read as itself; a thinner one lands unevenly on
// the lattice, a whole voxel on one side and none on the other, so its caller draws it some other way.
// `detailThinParts` gives the detail grain to every part thinner than `featureVoxels` of the class grain as well; why
// only the `gun` class sets it is in `tools/packages/thing-export/README.md`, "Voxelized export".
local detail = 0.002;
{
  detailGrain: detail,
  featureVoxels: 2,
  classes: {
    vehicle: { grain: 0.03125 },
    gun: { grain: 0.004, detailGrain: detail, detailThinParts: true },
    item: { grain: 0.01, detailGrain: detail },
  },
}
