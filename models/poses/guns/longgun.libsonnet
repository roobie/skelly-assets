// The long-gun hold, the stances of every gun held by a pistol grip or stock wrist and a fore-end, as a function of one
// gun family's sockets (sockets.libsonnet). Key frames read as the melee wields' do (models/poses/wields/wields.libsonnet),
// but place the gun by its stock rather than its grip: `pocket` is where the stock's rear face (`butt`, the gun's
// exported anchor unless the family's sockets name another point) meets the shoulder, from the right shoulder joint in
// the chest's frame, so a longer stock reaches no deeper into the body. `aim` turns the bore from the chest's ahead
// (degrees), `poles` point each elbow, and `sight` turns the eyes down the gun's sight. The right hand takes the grip
// and the left the fore-end wherever the gun is, as a melee second hand takes its seat, so no key places a hand.
// `walks` names the stances the doll walks in, as the melee classes' do (models/poses/wields/wields.libsonnet): a gun
// is `held`, both hands on it, since a gun swung in one hand points anywhere.
local body = import '../wields/body.libsonnet';
// Bladed, the left shoulder forward and leaning in, as the press check stands: it brings the left hand within reach of
// a fore-end as far ahead as the pump's. A key's yaw turns the bore back past the chest's twist, and its lean tips the
// chest forward (degrees).
local bladed(twist, lean=4) = body { spine: [lean, -twist, 0], 'thigh.R': [5, 0, -3], 'thigh.L': [5, 0, 3] };
function(model, sockets, swayLimitDeg=null) {
  look: [0, 1.4, 4],
  weapon: {
    model: model,
    lead: 'hand.R',
    butt: std.get(sockets, 'butt', { from: 'butt' }),
    hands: { 'hand.R': sockets.grip, 'hand.L': sockets.support },
  },
  stances: {
    // Low ready, the carry a figure walks with: the butt low in the shoulder, inside the arm, so the stock bears on the
    // chest by its edge and clears the arm, the muzzle tipped well down and a little toward the left, so the gun points at the ground
    // ahead rather than at anyone and comes up to guard by a lift of the arms.
    idle: {
      body: bladed(45),
      weapon: { pocket: [0.055, -0.07, 0.11], aim: { pitch: 22, yaw: 50, roll: 0 }, poles: { 'hand.R': [-1, -0.3, 0], 'hand.L': [-0.3, -1, 0] } },
    },
    // Shouldered, ready to fire, leaning into the gun: the chest tipped forward over the hips, the butt high in the
    // pocket ahead of the right shoulder joint, where the stock bears on the flat of the chest by its inner edge and the
    // raised elbow opens the arm away from it, the bore level and straight ahead (raised back past the chest's lean),
    // the left elbow under the fore-end, and the head jutted forward, bowed and tilted onto the stock, the eyes down the
    // sight.
    guard: {
      body: bladed(40, 10),
      weapon: { pocket: [0.0275, -0.03, 0.085], aim: { pitch: -7.7, yaw: 40, roll: 0 }, poles: { 'hand.R': [-1, -0.45, 0.3], 'hand.L': [-0.2, -1, 0.2] } },
      sight: { tilt: 30, jut: 15, lean: 10 },
    },
  },
  // Carried at low ready the gun swings a little with the stride, the share of the arm's swing ahg3's FigureGait sways a
  // held gun by (`holds.gun.sway`), so the walk keeps some life, but no further than the family lets the support hand
  // keep its reach (`swayLimitDeg`); shouldered it does not sway. In both the gun leans with the body: the stance's
  // stock and arms are set for the standing chest, and a stock held level while the chest leans 25° into a crouch walk
  // drives into the firing arm.
  walks: {
    idle: { arms: 'held', sway: 0.35, lean: 1 } + (if swayLimitDeg == null then {} else { swayLimitDeg: swayLimitDeg }),
    guard: { arms: 'held', sway: 0, lean: 1 },
  },
}
