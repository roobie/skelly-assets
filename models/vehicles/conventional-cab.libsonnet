// A long-bonnet medium truck cab, as on the Chevrolet Kodiak and GMC TopKick C-series, measured from the back of the cab
// so it fits a medium truck's spec in place of its cab-over: added to the spec, it keeps the cab's back, the body behind
// it and the rear axles, and carries the front axle forward to leave room for the bonnet.
// Its front end follows GM's C6500 body builder outline: about 1.72 m from the front axle back to the cab, 0.9 m from the
// axle to the grille and 1.0 m to the bumper. The bonnet is sized to house the medium diesel at a Caterpillar 3126B's
// envelope of about 1.08 x 0.80 x 0.86 m, wider and longer than its drawing, between the firewall and the radiator.
{
  local truck = self,
  frontAxle: self.cabBack + 1.72,
  face: self.frontAxle - 0.57,
  front: self.frontAxle + 1.03,
  bonnet: { nose: truck.frontAxle + 0.93, back: 1.66, front: 1.58, z: 0.6 },
  floor: 1.0, waist: 1.66, roof: 2.15, lean: 0.2,
  // The front wheel's arch stops short of the firewall, which the kit's wing needs.
  archHalf: 0.5,
  engineX: self.face + 0.58, radiatorY: 0.4,
  // The bonnet leaves a short cab, so the dash is shallow, the seat sits on the floor and back toward the cab's rear wall.
  dashDepth: 0.3, raisedSeat: false, seatX: self.doorRear + 0.32,
}
