// The SKS's gas action, as visual estimates. It fires once per trigger pull and its carrier holds open on the last
// round. Its short-stroke piston drives the carrier much as the AK's long stroke does, so it borrows the AK's cadence,
// speed and dwell; it throws its cases up and to the right.
{
  rpm: 600,
  holdOpenOnEmpty: true,
  ejectAt: 0.72,
  ejectDirection: [0.2, 0.35, 0.92],
  rearwardSpeedMetresPerSecond: 3.75,
  dwellSeconds: 0.006,
  triggerMode: 'semi',
}
