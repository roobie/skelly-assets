// How the showcase and the review sheets dress a wearable on a doll (tools/dress.mjs, `wornSites`); why is in
// docs/decisions/0008-dressing.md. What belongs to one doll is in its record under `dolls`; the rest is shared.
{
  // The dolls by id: the targets a wearable is dressed on, each in models/dolls/<id>/doll.libsonnet.
  dolls: {
    player: import 'models/dolls/player/doll.libsonnet',
    ual: import 'models/dolls/ual/doll.libsonnet',
  },
  // The segment a worn piece with none in its id, `<item>_worn`, is drawn as. A segment's part is in the doll's `slots`.
  piece: 'body',
  // The fits of pieces fitted over other clothing, `<item>_worn_<layer>`, which the doll leaves out. Each is drawn in
  // the frame of its `<item>_worn` twin, since it is that piece shaped one layer out.
  layers: ['over-jacket'],
  // The states whose models lie on their back with their head end at -z (docs/decisions/0002-model-frame.md), so a
  // wearable in one stands up, head end up and front forward, before it is placed.
  lying: ['folded'],
}
