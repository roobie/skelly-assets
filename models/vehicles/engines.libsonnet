// The engines built as a fused core with their class's accessories; see `engine-kit.libsonnet`. `massKg` is the whole
// dressed engine's, so the fused model and the assembly weigh the same and the core takes what the accessories leave.
// Its crank lies along x; `length` is along the crank.
{
  // A 999 cc three-cylinder petrol of 52 kW, as in the 2014-2019 smart fortwo (Renault H4D). Engine databases give it
  // 81 kg; its measures are estimates for a compact three-cylinder.
  i3_petrol: { class: 'light', massKg: 81, length: 0.4, width: 0.44, height: 0.44 },
  i4_petrol: { class: 'light', massKg: 140, length: 0.46, width: 0.46, height: 0.55 },
  i4_diesel: { class: 'light', massKg: 185, length: 0.5, width: 0.5, height: 0.62 },
  // A 3-litre pushrod car six of about 85 kW. Its mass and measures are estimates for a six of its size.
  i6_petrol: { class: 'light', massKg: 210, length: 0.78, width: 0.44, height: 0.66 },
  // A 6.3-litre White 160AX side-valve six of 110 kW, as in the M3 half-track. Its mass and measures are estimates for a
  // long-stroke truck six of its size, since no source gives them.
  i6_petrol_large: { class: 'medium', massKg: 540, length: 1.0, width: 0.6, height: 0.75 },
  v8_petrol_medium: { class: 'medium', massKg: 262, length: 0.8, width: 0.62, height: 0.72 },
  // A 14-litre Scania DSI14 V8 diesel of about 550 hp, as in the CV9040. Dealer listings give it 1,450 to 1,600 kg; its
  // measures are estimates for a 90-degree V8 of its size, since Scania publishes none.
  v8_diesel_heavy: { class: 'heavy', massKg: 1450, length: 1.15, width: 0.9, height: 1.0 },
}
