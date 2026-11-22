// The long-gun hold, the stances of every gun held by a pistol grip or stock wrist and a fore-end, as a function of one
// gun family's sockets (sockets.libsonnet) and how it stands each stance (`stands`, guns.libsonnet). Key frames read as
// the melee wields' do (models/poses/wields/wields.libsonnet), but place the gun by its stock rather than its grip:
// `pocket` is where the stock's rear face (`butt`, the gun's exported anchor unless the family's sockets name another
// point) meets the shoulder (pocket.libsonnet), so a longer stock reaches no deeper into the body. `aim` turns the bore
// from the chest's ahead (degrees), `poles` point each elbow, and `sight` turns the eyes down the gun's sight. The right
// hand takes the grip and the left the fore-end wherever the gun is, as a melee second hand takes its seat, so no key
// places a hand.
// `walks` names the stances the doll walks in, as the melee classes' do (models/poses/wields/wields.libsonnet): a gun
// is `held`, both hands on it, since a gun swung in one hand points anywhere.
local body = import '../wields/body.libsonnet';
local clavicle = import 'models/dolls/player/clavicle.libsonnet';
local pocket = import 'pocket.libsonnet';
// Bladed, the left shoulder forward and leaning in, as the press check stands: the further a gun's fore-end lies ahead,
// the further the chest turns to bring the left hand within its reach. `twist` turns the chest and `lean` tips it
// forward (degrees); `shoulder` brings the right shoulder forward on its clavicle (metres), which the right side's
// mirrored joint takes as a negative flex.
local bladed(twist, lean, shoulder) = body {
  spine: [lean, -twist, 0],
  'clavicle.R': [-clavicle.protraction(shoulder), 0, 0],
  'thigh.R': [5, 0, -3],
  'thigh.L': [5, 0, 3],
};
// How a stance stands unless the family's `stands` says otherwise: the chest's `twist` and `lean`, the right
// `shoulder`'s travel forward, the butt's `pocket` (pocket.libsonnet's inside, below, behind, read off the chest
// whatever the shoulder's travel), the bore's `pitch` and the elbows' `poles`. A stance giving no pitch holds the bore
// level.
local defaults = {
  idle: { twist: 55, lean: 4, shoulder: 0, pocket: [0.024, 0.07, 0], pitch: 22, poles: { 'hand.R': [-1, -0.3, 0], 'hand.L': [-0.3, -1, 0] } },
  guard: { twist: 50, lean: 10, shoulder: 0, pocket: [-0.0035, 0.03, 0.025], poles: { 'hand.R': [-1, -0.45, 0.3], 'hand.L': [-0.2, -1, 0.2] } },
};
// The bore turned back past the twist lies across the lean by the twist's share of it, so it is raised back by that
// share alone to stand level.
local levelPitch(s) = -std.atan(std.tan(std.deg2rad(s.lean)) * std.cos(std.deg2rad(s.twist))) * 180 / std.pi;
function(model, sockets, stands={}, swayLimitDeg=null)
  local stand = { [s]: defaults[s] + std.get(stands, s, {}) for s in std.objectFields(defaults) };
  local weapon(s, yaw) = {
    pocket: pocket(s.pocket[0], s.pocket[1], s.pocket[2]),
    aim: { pitch: std.get(s, 'pitch', levelPitch(s)), yaw: yaw, roll: 0 },
    poles: s.poles,
  };
  {
    look: [0, 1.4, 4],
    weapon: {
      model: model,
      lead: 'hand.R',
      butt: std.get(sockets, 'butt', { from: 'butt' }),
      hands: { 'hand.R': sockets.grip, 'hand.L': sockets.support },
    },
    stances: {
      // Low ready, the carry a figure walks with: the butt low in the shoulder, inside the arm, so the stock bears on
      // the chest by its edge and clears the arm, the muzzle tipped well down and a little toward the left of the
      // chest's ahead, so the gun points at the ground ahead rather than at anyone and comes up to guard by a lift of
      // the arms.
      idle: {
        body: bladed(stand.idle.twist, stand.idle.lean, stand.idle.shoulder),
        weapon: weapon(stand.idle, stand.idle.twist + 5),
      },
      // Shouldered, ready to fire, leaning into the gun: the chest tipped forward over the hips, the butt in the pocket
      // ahead of the right shoulder joint, where the stock bears on the flat of the chest by its inner edge and the
      // raised elbow opens the arm away from it, the bore level and straight ahead, turned back past the chest's twist
      // (its pitch raised back past the chest's lean), the left elbow under the fore-end, and the head jutted forward,
      // bowed and tilted onto the stock, the eyes down the sight.
      guard: {
        body: bladed(stand.guard.twist, stand.guard.lean, stand.guard.shoulder),
        weapon: weapon(stand.guard, stand.guard.twist),
        sight: { tilt: 30, jut: 15, lean: 10 },
      },
    },
    // Carried at low ready the gun swings a little with the stride, the share of the arm's swing ahg3's FigureGait sways
    // a held gun by (`holds.gun.sway`), so the walk keeps some life, but no further than the family lets the support
    // hand keep its reach (`swayLimitDeg`); shouldered it does not sway. In both the gun leans with the body: the
    // stance's stock and arms are set for the standing chest, and a stock held level while the chest leans 25° into a
    // crouch walk drives into the firing arm.
    walks: {
      idle: { arms: 'held', sway: 0.35, lean: 1 } + (if swayLimitDeg == null then {} else { swayLimitDeg: swayLimitDeg }),
      guard: { arms: 'held', sway: 0, lean: 1 },
    },
  }
