---
type: breaking
---
The helicopters' hinged doors now export a hinge motion on drawn round pins in place of their hinge anchors, so the
showcase's Open view swings them and a game plays the same swing the build proved clear. A side door's free edge rakes
toward its hinge as the wall curves in, so that edge is cut to swing off the post it shuts against, and the post draws a lip that closes on it.
The heavy cargo helicopter's crew door hangs just ahead of the cockpit bulkhead; its rear ramp is
narrower, so it swings inside the tail, and is drawn raised shut, lowering onto the ground as it opens; and its load
floor stops short of the ramp's knuckle. The air ambulance's clamshell doors stand just aft of the cabin's rear end.
Seats give the doors room: the backs of `helicopter_seat` and the police helicopter's rear bench are narrower, and the
news helicopter's front seats sit further inboard.

Upgrade:
- Open each of these by playing its `motion`, not by swinging it on `hinge_a` and `hinge_b`: `light_helicopter_door`,
  `air_ambulance_front_door`, `air_ambulance_clamshell_door`, `heavy_cargo_helicopter_crew_door`,
  `heavy_cargo_helicopter_ramp`, `military_transport_helicopter_cockpit_door`, and the front and rear doors of the
  news and police helicopters.
- Expect `heavy_cargo_helicopter_ramp` shut at rest; play its motion to lower it.
