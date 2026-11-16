// The long-gun hold, the stances of every gun held by a pistol grip or stock wrist and a fore-end, as a function of one
// gun family's sockets (sockets.libsonnet). Key frames read as the melee wields' do (models/poses/wields/wields.libsonnet),
// but place the gun by its stock rather than its grip: `pocket` is where the stock's rear face (`butt`, the gun's
// exported anchor unless the family's sockets name another point) meets the shoulder, from the right shoulder joint in
// the chest's frame, so a longer stock reaches no deeper into the body. `aim` turns the bore from the chest's ahead
// (degrees), `poles` point each elbow, and `sight` turns the eyes down the gun's sight. The right hand takes the grip
// and the left the fore-end wherever the gun is, as a melee second hand takes its seat, so no key places a hand.
local body = import '../wields/body.libsonnet';
// Bladed, the left shoulder forward and leaning in, as the press check stands: it brings the left hand within reach of
// a fore-end as far ahead as the pump's. A key's yaw turns the bore back past the chest's twist.
local bladed(twist) = body { spine: [4, -twist, 0], 'thigh.R': [5, 0, -3], 'thigh.L': [5, 0, 3] };
function(model, sockets) {
  look: [0, 1.4, 4],
  weapon: {
    model: model,
    lead: 'hand.R',
    butt: std.get(sockets, 'butt', { from: 'butt' }),
    hands: { 'hand.R': sockets.grip, 'hand.L': sockets.support },
  },
  stances: {
    // Low ready, the carry a figure walks with: the butt low in the shoulder, standing a little off it so the stock's
    // heel clears the chest, the muzzle tipped well down and a little toward the left, so the gun points at the ground
    // ahead rather than at anyone and comes up to guard by a lift of the arms.
    idle: {
      body: bladed(45),
      weapon: { pocket: [0.04, -0.07, 0.11], aim: { pitch: 22, yaw: 50, roll: 0 }, poles: { 'hand.R': [-1, -0.5, -0.3], 'hand.L': [-0.3, -1, 0] } },
    },
    // Shouldered, ready to fire: the butt high in the pocket inside the right shoulder, the bore level and straight
    // ahead, the right elbow out and the left under the fore-end, the head tilted onto the stock and the eyes down the
    // sight.
    guard: {
      body: bladed(35),
      weapon: { pocket: [0.06, -0.03, 0.04], aim: { pitch: -4, yaw: 35, roll: 0 }, poles: { 'hand.R': [-1, -1, 0], 'hand.L': [-0.3, -1, 0] } },
      sight: { tilt: 30 },
    },
  },
}
