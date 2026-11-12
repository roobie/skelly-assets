// Separate body kit and detachable ammo/light fittings; original legs, hydraulics, pods and guns are unchanged.
local k = import 'kit.libsonnet';
local s = import 'security_walker_sleek.spec.libsonnet';
local original = import 'security_walker.libsonnet';
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local box = k.box;
local centre = [0.5, 0.5, 0.5];
local finish = { paint: s.paint, frame: s.frame, trim: s.trim, black: 'plastic-black', glass: 'lens-smoke', lamp: 'plastic-frosted' };
local part(name, kg, pieces, anchors={}) = k.compound('security_walker_sleek_' + name, kg, pieces, finish, anchors) + { voxelGrain: s.grain };
local oldHull = [r for r in original if r.id == 'security_walker_hull'][0];
// Keep the original ram lug geometry, not an estimated replacement for its hydraulic interface.
local hipLugs = [p for p in std.parseJson(oldHull.parts[0].params.pieces) if std.startsWith(p.id, 'hip_ram_lug_')];
local h = s.hull;
local at(t) = [[h.bottom[i][j] * (1-t) + h.roof[i][j] * t for j in [0,1]] for i in std.range(0, std.length(h.bottom)-1)];
local inset(poly, d) =
  local n = std.length(poly);
  local normal(a,b) = local dx=b[0]-a[0]; local dy=b[1]-a[1]; local l=std.sqrt(dx*dx+dy*dy); [-dy/l,dx/l];
  [local a=normal(poly[(i+n-1)%n],poly[i]); local b=normal(poly[i],poly[(i+1)%n]);
   local f=d/(1+a[0]*b[0]+a[1]*b[1]); [poly[i][j]+(a[j]+b[j])*f for j in [0,1]]
   for i in std.range(0,n-1)];
local shell = std.flattenArrays([
  local outside = at((band+0.5)/h.bands);
  local inside = inset(outside,h.wall);
  [local j=(i+1)%std.length(outside);
   k.yPrism('armour_%d_%d'%[band,i], 'paint', [outside[i],outside[j],inside[j],inside[i]],
     [h.low+(h.high-h.low)*band/h.bands,h.low+(h.high-h.low)*(band+1)/h.bands])
   for i in std.range(0,std.length(outside)-1)]
  for band in std.range(0,h.bands-1)
]);
local ring(id, slot, inner, outer, low, high) = k.turned(id,slot,'y',k.annulus(inner,outer,low,high)) + {sides:32};
// A planar feed-conduit strip, using (x,z) endpoints and a y interval.
local strip(id, slot, a, b, width, y) =
  local p = k.bar(id,slot,a,b,width,[0,1]);
  k.yPrism(id,slot,std.reverse([[v[1],v[0]] for v in p.profile]),y);
local feed = s.ammo;
local feedPieces = std.flattenArrays([
  local a=feed.path[i]; local b=feed.path[i+1];
  local length=std.sqrt(std.pow(b[0]-a[0],2)+std.pow(b[1]-a[1],2));
  local count=std.max(1,std.floor(length/0.075));
  [strip('core_%d'%i,'black',a,b,0.08,[feed.centreY-0.05,feed.centreY+0.05])]
  + [local t=(j+0.5)/count; local half=0.0175/length;
     local p(u)=[a[v]+(b[v]-a[v])*u for v in [0,1]];
     strip('cover_%d_%d'%[i,j],'trim',p(t-half),p(t+half),0.10,[feed.centreY-0.06,feed.centreY+0.06])
     for j in std.range(0,count-1)]
  for i in std.range(0,std.length(feed.path)-2)
]);
taxonomy.inherit({tags:{'vehicle-body':['armoured'],setting:['modern','sci-fi']}},[
  part('carrier', 1000, [
    // Hollow load-bearing carrier; retain space for the borrowed engine and power pack.
    box('belly', 'frame', [-1.30,2.78,-0.76],[1.35,2.85,0.76]),
    box('rear_bulkhead', 'frame', [-1.34,2.85,-0.98],[-1.27,3.80,0.98]),
    box('deck', 'frame', [-1.27,3.77,-0.92],[0.95,3.82,0.92]),
    ring('stator', 'frame', 0.60, s.rotary.outer,3.82,3.90),
    // The rotary union stays within the bearing's protected centre.
    k.turned('union','trim','y',k.disc(0.17,3.68,3.90)) + {sides:16},
    k.prism('lower_nose','paint',[[1.27,2.85],[1.43,3.17],[1.43,3.38],[1.27,3.50]],[-0.92,0.92]),
    k.prism('upper_nose','paint',[[1.27,3.38],[1.43,3.38],[0.98,3.77],[0.90,3.77]],[-0.92,0.92]),
    k.prism('floodlight_plinth','frame',[[1.18,3.42],[1.49,3.42],[1.49,3.48],[1.16,3.48]],[-0.20,0.20]),
  ] + k.bothSides([
    // These retain the original drive face at z=1 and both fixed hip hose outlets.
    box('hip_bulkhead','frame',[-0.64,3.08,0.94],[0.58,3.80,1.00]),
    k.prism('side_cheek','paint',[[-1.27,2.85],[1.27,2.85],[1.27,3.50],[0.54,3.77],[-0.64,3.77],[-1.27,3.55]],[0.87,0.94]),
    k.prism('nose_cheek','paint',[[0.54,3.77],[1.27,3.50],[0.95,3.77]],[0.87,0.94]),
    box('ram_outrigger','frame',[1.12,3.05,0.92],[1.37,3.36,1.00]),
    box('service_panel','paint',[-1.17,3.03,0.94],[-0.75,3.44,0.98]),
    box('panel_latch','trim',[-0.97,3.31,0.98],[-0.87,3.35,1.015]),
    box('headlamp_backplate','frame',[1.34,3.08,0.51],[1.43,3.33,0.79]),
  ]) + hipLugs, {axis:['stator',centre]}),

  part('rotor', 240, [
    ring('bearing','trim',s.rotary.inner,0.86,3.90,3.97),
    ring('seal','black',0.86,0.90,3.90,3.94),
    k.turned('union_rotor','trim','y',k.disc(0.17,3.90,3.97)) + {sides:16},
  ], {axis:['bearing',[0.5,0,0.5]]}),

  part('hull', 950, shell + [
    k.yPrism('floor','frame',h.bottom,[h.low,h.low+h.wall]),
    k.yPrism('roof','paint',h.roof,[h.high-h.wall,h.high]),
    // Dark recessed front strip follows the low nose; the CV9040 fittings are the actual optics.
    box('nose_recess','black',[1.40,4.00,-0.38],[1.51,4.06,0.38]),
  ] + k.bothSides([
    // Fairings join the sloped shell to the ORIGINAL pod-mount interface after the common lift.
    k.prism('shoulder','paint',[[-0.27,4.04],[0.61,4.04],[0.50,4.40],[-0.17,4.42]],[0.63,1.00]),
    box('shoulder_inset','frame',[-0.10,4.20,0.96],[0.50,4.43,1.00]),
    box('lifting_eye','trim',[-0.82,4.45,0.37],[-0.69,4.49,0.42]),
    box('lamp_plinth','frame',[0.62,4.22,0.44],[0.82,4.30,0.56]),
    // Forward/outboard of the sloping skin, with a cantilever tied into the shoulder.
    k.prism('headlamp_brace','frame',[[0.45,4.16],[0.84,4.16],[0.84,4.22],[0.50,4.34]],[0.92,1.08]),
    box('headlamp_backplate','frame',[0.80,4.16,0.86],[0.84,4.41,1.14]),
  ])),

  part('cooling_pack', 150, [
    k.prism('shroud','paint',[[-1.66,4.04],[-1.08,4.04],[-1.03,4.31],[-1.44,4.39],[-1.66,4.30]],[-0.55,0.55]),
    box('vent_recess','black',[-1.69,4.07,-0.47],[-1.66,4.32,0.47]),
  ] + [
    box('louvre_%d'%i,'trim',[-1.73,4.08+i*0.075,-0.47],[-1.69,4.105+i*0.075,0.47])
    for i in std.range(0,3)
  ] + k.bothSides([
    box('exhaust_recess','black',[-1.58,4.12,0.55],[-1.15,4.25,0.58]),
    box('exhaust_lip','frame',[-1.61,4.25,0.55],[-1.12,4.30,0.60]),
  ])),

  part('roof_hatch', 25, [
    box('lid','paint',[-0.62,4.45,-0.19],[-0.08,4.49,0.17]),
    box('hinge','trim',[-0.64,4.49,-0.16],[-0.60,4.53,0.14]),
    box('handle','frame',[-0.26,4.49,-0.07],[-0.22,4.54,0.05]),
  ]),

  // Outboard pod cassette and its enclosed feed are separate salvageable fittings in the assembly frame.
  part('ammo_cassette', 40, [
    // Stand clear of the original raised hazard stripe; shoes bolt directly to the pod above it.
    box('case','paint',[-0.63,4.05,1.74],[-0.07,4.45,2.02]),
    box('lid','frame',[-0.64,4.45,1.74],[-0.06,4.48,2.04]),
    box('mount_rear','frame',[-0.48,4.44,1.68],[-0.42,4.49,1.80]),
    box('mount_front','frame',[-0.24,4.44,1.68],[-0.18,4.49,1.80]),
    box('access_panel','paint',[-0.57,4.13,2.02],[-0.13,4.39,2.05]),
    box('latch','trim',[-0.35,4.29,2.05],[-0.25,4.34,2.08]),
    box('handle_rear','frame',[-0.49,4.48,1.80],[-0.45,4.54,1.86]),
    box('handle_front','frame',[-0.25,4.48,1.80],[-0.21,4.54,1.86]),
    box('handle_grip','black',[-0.49,4.54,1.80],[-0.21,4.58,1.86]),
  ]),

  part('ammo_feed', 8, feedPieces + [
    box('cassette_coupler','frame',[-0.10,4.035,1.81],[-0.03,4.175,1.95]),
    // Rear-side receiver adapter clears the original cradle, which starts at x=0.45.
    box('receiver_adapter','frame',[0.31,4.04,1.51],[0.41,4.17,1.57]),
  ] + [
    k.turned('elbow_%d'%i,'trim','y',k.disc(0.055,feed.centreY-0.06,feed.centreY+0.06),[feed.path[i][0],0,feed.path[i][1]]) + {sides:12}
    for i in std.range(1,std.length(feed.path)-2)
  ]),

  // Wide guarded work-area flood, its foot at y=0 and lens facing +x; no simulated light source.
  part('floodlight', 7, [
    box('foot','frame',[-0.07,0,-0.20],[0.05,0.04,0.20]),
    box('housing','black',[-0.06,0.10,-0.30],[0.08,0.28,0.30]),
    box('lens','lamp',[0.08,0.12,-0.28],[0.12,0.26,0.28]),
    box('guard_top','frame',[0.08,0.26,-0.32],[0.15,0.30,0.32]),
    box('guard_bottom','frame',[0.08,0.08,-0.32],[0.15,0.12,0.32]),
  ] + k.bothSides([
    box('yoke','frame',[-0.02,0.04,0.17],[0.03,0.19,0.28]),
  ]) + [
    box('lens_divider_%d'%i,'black',[0.12,0.12,-0.155+i*0.14],[0.14,0.26,-0.125+i*0.14])
    for i in std.range(0,2)
  ]),

  part('terrain_camera', 3, [
    box('housing','frame',[-0.10,-0.08,-0.08],[0.10,0.06,0.08]),
    // Downward-looking glass, protected behind a projecting rim, not a second face.
    box('lens','glass',[-0.06,-0.09,-0.05],[0.06,-0.08,0.05]),
  ]),
])
