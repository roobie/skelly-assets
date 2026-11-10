// The drawn densities, in kg per cubic metre of drawn voxels, a vehicle part's authored mass may plausibly have; a
// part outside them carries weight its geometry cannot, as a bare frame carrying a whole chassis-cab once did.
// The floor is rigid foam: a hollow body drawn solid still weighs at least its skin. The ceiling sits below solid
// steel, because a drawn part encloses bores, gaps and hollows that a forging never fills completely.
// A material lighter than steel bounds the voxels it draws by its own solid density; glass panes are drawn thicker
// than they are, so they have no floor.
{
  min: 20,
  max: 6000,
  materials: {
    'glass-clear': { min: 0, max: 2600 },
    'glass-grey': { min: 0, max: 2600 },
    'alu-bare': { max: 2700 },
    'rubber-black': { max: 1500 },
    'cloth-seat': { max: 1000 },
    'wood-oak': { max: 1000 },
    'wood-pine': { max: 1000 },
    'wood-birch': { max: 1000 },
  },
}
