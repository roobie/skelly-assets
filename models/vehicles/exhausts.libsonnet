// The exhausts built from their class's parts; see `exhaust-kit.libsonnet`. Each runs along `route`, straight legs that
// each change one axis, from the engine's manifold to the tail's end. `cat` and `muffler` are each part's centre's
// distance back along the run from the tail's end. `massKg` is the whole exhaust's, so the pipes take what the class's
// parts leave. `brackets` are boxes, in the exhaust's frame, welded to the pipe they name.
// A flat run's origin is under its muffler, at the run's base.
// A car's run from the rear face of its engine's manifold at `start`: back to `dropX` behind the engine, down to the
// run's height `y`, across to the exhaust's own centre line and back to its tail at `tail`.
local underfloor(start, dropX, y, tail) = [start, [dropX, start[1], start[2]], [dropX, y, start[2]], [dropX, y, 0], [tail, y, 0]];
{
  // Under a car whose engine is too far forward of the run or not drawn, the run starts under the floor.
  exhaust_car: { class: 'light', massKg: 12, route: [[2.2, 0.07, 0], [-0.46, 0.07, 0]], cat: 1.76, muffler: 0.46 },
  exhaust_small: { class: 'light', massKg: 8, route: [[1.8, 0.07, 0], [-0.46, 0.07, 0]], cat: 1.5, muffler: 0.46 },
  // Each from its car's i4 petrol engine, round the far-side gearbox, to the near side of the tank.
  exhaust_saloon: { class: 'light', massKg: 12, route: underfloor([3.095, 0.42, -0.68], 2.97, 0.05, -0.46), cat: 2.88, muffler: 0.46 },
  exhaust_estate: { class: 'light', massKg: 12, route: underfloor([3.125, 0.46, -0.68], 3.0, 0.05, -0.46), cat: 2.88, muffler: 0.46 },
  exhaust_coupe: { class: 'light', massKg: 8, route: underfloor([2.865, 0.34, -0.68], 2.74, 0, -0.46), cat: 2.7, muffler: 0.46 },
  // From the far-side manifold of the microcar's engine, which sits over its rear axle: down behind the axle tube,
  // forward under the gearbox, where the converter hangs, then across and back under the engine to the tail.
  exhaust_microcar: {
    class: 'light',
    massKg: 8,
    route: [[0.0855, 0.465, -0.246], [-0.0025, 0.465, -0.246], [-0.0025, 0, -0.246], [0.4975, 0, -0.246], [0.4975, 0, 0], [-0.3, 0, 0]],
    cat: 1.29,
    muffler: 0.3,
  },
  // One of the semi tractor's twin stacks, the origin at its foot: from the engine's side, under the frame rail, out
  // behind the fuel tank and up the sleeper's back, clamped to it below and above the muffler.
  exhaust_semi_tractor: {
    class: 'heavy',
    massKg: 40,
    route: [[3.05, 0.7, -0.575], [3.05, 0.4, -0.575], [0, 0.4, -0.575], [0, 0.4, 0], [0, 3.94, 0]],
    muffler: 1.615,
    brackets: [
      { pipe: 'front_pipe', min: [0.065, 1.47, -0.03], max: [0.12, 1.53, 0.03] },
      { pipe: 'tailpipe', min: [0.065, 2.77, -0.03], max: [0.12, 2.83, 0.03] },
    ],
  },
}
