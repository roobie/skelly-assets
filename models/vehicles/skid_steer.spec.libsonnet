// A 2.7-tonne skid-steer loader: 3.3 m with the bucket down, 1.72 m wide, 2.05 m to the cage roof, 1.1 m wheelbase.
// The engine room stacks the oil cooler on the radiator just inside the tail door, under the cover's slope, with the
// battery and the hydraulic tank on the frame's floor below them, all in reach of a mechanic at the open door.
{
  frontAxle: 0.55, rearAxle: -0.55, hub: 0.402, wheelZ: 0.72,
  floor: 0.6, cageRear: -0.36, cageFront: 0.62, cageSide: 0.48, roof: 2.0,
  doorSill: 0.92, doorOpens: 90, tailDoor: -1.3, tailDoorOpens: 90,
  engine: { name: 'i4_diesel', at: [-0.7, 0.5, 0] },
  radiator: { name: 'radiator_small', at: [-1.14, 0.76, 0] },
  batteryAt: [-1.09, 0.5, -0.17],
  shellMass: 1100, paint: 'paint-terracotta',
}
