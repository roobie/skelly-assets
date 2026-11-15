// The fit-out of a vehicle's lockers and load space, drawn as pieces of a part in the vehicle frame. Each piece is laid
// out on the near side, its front toward +z, so a pair's far twin mirrors it.
local k = import 'kit.libsonnet';
local box = k.box;
{
  // The materials a fit-out, or kit still drawn into a part, uses unless a vehicle's finish names its own.
  finish: {
    shelf: 'alu-bare',
    board: 'alu-bare',
    lid: 'plastic-black',
    strap: 'webbing-black',
    steel: 'steel-grey',
  },
  // A shelf whose top is at `y`, from `x[0]` to `x[1]` and `z[0]` to `z[1]`.
  shelf(id, x, y, z): box(id, 'shelf', [x[0], y - 0.03, z[0]], [x[1], y, z[1]]),
  // A board on a locker's back wall, from `z` out one grain, that tools hang on.
  board(id, x, y, z): box(id, 'board', [x[0], y[0], z], [x[1], y[1], z + 0.03125]),
  // A strap across kit at `y`, on its front face at `z`.
  strap(id, x, y, z): box(id, 'strap', [x[0], y, z], [x[1], y + 0.05, z + 0.03125]),
}
