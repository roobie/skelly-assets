// The engines built as a fused core with their class's accessories; see `engine-kit.libsonnet`. `massKg` is the whole
// dressed engine's, so the fused model and the assembly weigh the same and the core takes what the accessories leave.
// Its crank lies along x; `length` is along the crank. An engine is an inline unless its `layout` says 'vee'; see
// `engine-kit.libsonnet`, `layouts`. A work machine's hood sides open on what a road engine's bonnet hides, so an
// engine may show a `turbo` on its exhaust side with the charge pipe over its head, a crank `damper` and
// the `bellHousing` it bolts to its drive with; `engine-kit.libsonnet` draws each one named.
{
  // A 999 cc three-cylinder petrol of 52 kW, as in the 2014-2019 smart fortwo (Renault H4D). Engine databases give it
  // 81 kg; its measures are estimates for a compact three-cylinder.
  i3_petrol: { title: 'Inline-3 petrol engine', class: 'light', massKg: 81, length: 0.4, width: 0.44, height: 0.44 },
  i4_petrol: { title: 'Inline-4 petrol engine', class: 'light', massKg: 140, length: 0.46, width: 0.46, height: 0.55 },
  i4_diesel: { title: 'Inline-4 diesel engine', class: 'light', massKg: 185, length: 0.5, width: 0.5, height: 0.62 },
  // A car's V6 and V8. Their masses and measures are estimates for car vees of their size.
  v6_petrol: { title: 'V6 petrol engine', class: 'light', layout: 'vee', massKg: 175, length: 0.5, width: 0.62, height: 0.6 },
  v8_petrol: { title: 'V8 petrol engine', class: 'light', layout: 'vee', massKg: 260, length: 0.62, width: 0.72, height: 0.68 },
  // A 3-litre pushrod car six of about 85 kW. Its mass and measures are estimates for a six of its size.
  i6_petrol: { title: 'Inline-6 petrol engine', class: 'light', massKg: 210, length: 0.78, width: 0.44, height: 0.66 },
  // A light truck's four. Its frame rails reach up past the block's side where a car's low alternator and starter
  // hang, so it takes a light truck's accessories. Its mass and measures are estimates for a 2.2-litre truck four.
  i4_petrol_medium: { title: 'Medium inline-4 petrol engine', class: 'medium', massKg: 160, length: 0.5, width: 0.48, height: 0.55 },
  // A 6.3-litre White 160AX side-valve six of 110 kW, as in the M3 half-track. Its mass and measures are estimates for a
  // long-stroke truck six of its size, since no source gives them.
  i6_petrol_large: { title: 'Large inline-6 petrol engine', class: 'medium', massKg: 540, length: 1.0, width: 0.6, height: 0.75 },
  // An original, unbranded 9-litre turbocharged industrial six of about 190 kW, as in a 20-tonne crawler dozer. Its mass
  // and measures are estimates for an industrial six of its size.
  i6_off_highway_diesel: {
    title: 'Off-highway inline-6 diesel engine',
    class: 'plant',
    massKg: 900,
    length: 1.06,
    width: 0.62,
    height: 0.92,
    turbo: { radius: 0.09, pipe: 0.045 },
    damper: { radius: 0.13, depth: 0.05 },
    bellHousing: { radius: 0.26, depth: 0.06 },
  },
  // The medium and heavy V8s and the V12 are drawn inline: a vee's narrower block and valley air box change the bays of
  // the trucks and armour that carry them, which have not been refitted for one.
  v8_petrol_medium: { title: 'Medium V8 petrol engine', class: 'medium', massKg: 262, length: 0.8, width: 0.62, height: 0.72 },
  // A 14-litre Scania DSI14 V8 diesel of about 550 hp, as in the CV9040. Dealer listings give it 1,450 to 1,600 kg; its
  // measures are estimates for a 90-degree V8 of its size, since Scania publishes none.
  v8_diesel_heavy: { title: 'Heavy V8 diesel engine', class: 'heavy', massKg: 1450, length: 1.15, width: 0.9, height: 1.0 },
  // A 27-litre twin-turbocharged V12 diesel of about 1,100 kW, as in a Western main battle tank's powerpack. Its mass
  // and measures are estimates for a 90-degree V12 of that size, cut to the height a tank's engine bay allows.
  v12_diesel_tank: { title: 'V12 tank diesel engine', class: 'heavy', massKg: 2500, length: 1.7, width: 1.0, height: 0.95 },
}
