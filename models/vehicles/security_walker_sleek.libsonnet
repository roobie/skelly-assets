local k = import 'kit.libsonnet';
local s = import 'security_walker_sleek.spec.libsonnet';
local original = import 'security_walker.libsonnet';
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local box = k.box;
local h = s.hull;
local axisY = s.rotary.centre[1];
local statorLow = axisY - 0.08;
local face = s.base.torso.half;
local belly = s.belly;
local lift = s.weaponLift;
local lamp = s.lights;
local centre = [0.5, 0.5, 0.5];
local finish = { paint: s.paint, frame: s.frame, trim: s.trim, black: 'plastic-black', glass: 'lens-smoke', lamp: 'plastic-frosted' };
local part(name, kg, pieces, anchors={}) = k.compound('security_walker_sleek_' + name, kg, pieces, finish, anchors) + { voxelGrain: s.grain };
local oldHull = [r for r in original if r.id == 'security_walker_hull'][0];
// The original lugs, not a re-estimate, so the hydraulic interface is unchanged.
local hipLugs = [p for p in std.parseJson(oldHull.parts[0].params.pieces) if std.startsWith(p.id, 'hip_ram_lug_')];
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
local strip(id, slot, a, b, width, y) =
  local p = k.bar(id,slot,a,b,width,[0,1]);
  k.yPrism(id,slot,std.reverse([[v[1],v[0]] for v in p.profile]),y);
local feed = s.ammo;
local feedY = feed.centreY + lift;
local feedPieces = std.flattenArrays([
  local a=feed.path[i]; local b=feed.path[i+1];
  local length=std.sqrt(std.pow(b[0]-a[0],2)+std.pow(b[1]-a[1],2));
  local count=std.max(1,std.floor(length/0.075));
  [strip('core_%d'%i,'black',a,b,0.08,[feedY-0.05,feedY+0.05])]
  + [local t=(j+0.5)/count; local half=0.0175/length;
     local p(u)=[a[v]+(b[v]-a[v])*u for v in [0,1]];
     strip('cover_%d_%d'%[i,j],'trim',p(t-half),p(t+half),0.10,[feedY-0.06,feedY+0.06])
     for j in std.range(0,count-1)]
  for i in std.range(0,std.length(feed.path)-2)
]);
taxonomy.inherit({tags:{'vehicle-body':['armoured'],setting:['modern','sci-fi']}},[
  part('carrier', 1000, [
    box('belly', 'frame', [-1.30,belly-0.07,-0.76],[1.35,belly,0.76]),
    box('rear_bulkhead', 'frame', [-1.34,belly,-0.98],[-1.27,3.80,0.98]),
    box('deck', 'frame', [-1.27,statorLow-0.05,-0.92],[0.95,statorLow,0.92]),
    ring('stator', 'frame', s.rotary.inner, s.rotary.outer, statorLow, axisY),
    k.turned('union','trim','y',k.disc(0.17,axisY-0.22,axisY)) + {sides:16},
    k.prism('lower_nose','paint',[[1.27,belly],[1.43,3.17],[1.43,3.38],[1.27,3.50]],[-0.92,0.92]),
    k.prism('upper_nose','paint',[[1.27,3.38],[1.43,3.38],[0.98,3.77],[0.90,3.77]],[-0.92,0.92]),
    k.prism('floodlight_plinth','frame',[[1.18,lamp.floodlight[1]-0.06],[lamp.floodlight[0]+0.05,lamp.floodlight[1]-0.06],[lamp.floodlight[0]+0.05,lamp.floodlight[1]],[1.16,lamp.floodlight[1]]],[-0.20,0.20]),
  ] + k.bothSides([
    box('hip_bulkhead','frame',[-0.64,3.08,face-0.06],[0.58,3.80,face]),
    k.prism('side_cheek','paint',[[-1.27,belly],[1.27,belly],[1.27,3.50],[0.54,3.77],[-0.64,3.77],[-1.27,3.55]],[face-0.13,face-0.06]),
    k.prism('nose_cheek','paint',[[0.54,3.77],[1.27,3.50],[0.95,3.77]],[face-0.13,face-0.06]),
    box('ram_outrigger','frame',[1.12,3.05,face-0.08],[1.37,3.36,face]),
    box('service_panel','paint',[-1.17,3.03,face-0.06],[-0.75,3.44,face-0.02]),
    box('panel_latch','trim',[-0.97,3.31,face-0.02],[-0.87,3.35,face+0.015]),
    box('headlamp_backplate','frame',[lamp.baseHeadlamps[0]-0.15,lamp.baseHeadlamps[1],lamp.baseHeadlamps[2]-0.14],[lamp.baseHeadlamps[0]-0.06,lamp.baseHeadlamps[1]+0.25,lamp.baseHeadlamps[2]+0.14]),
  ]) + hipLugs, {axis:['stator',centre]}),

  part('rotor', 240, [
    ring('bearing','trim',s.rotary.inner,0.86,axisY,h.low),
    ring('seal','black',0.86,s.rotary.outer,axisY,axisY+0.04),
    k.turned('union_rotor','trim','y',k.disc(0.17,axisY,h.low)) + {sides:16},
  ], {axis:['bearing',[0.5,0,0.5]]}),

  part('hull', 950, shell + [
    k.yPrism('floor','frame',h.bottom,[h.low,h.low+h.wall]),
    k.yPrism('roof','paint',h.roof,[h.high-h.wall,h.high]),
    box('nose_recess','black',[1.40,4.00,-0.38],[1.51,4.06,0.38]),
  ] + k.bothSides([
    k.prism('shoulder','paint',[[-0.27,4.04],[0.61,4.04],[0.50,4.40],[-0.17,4.42]],[0.63,face]),
    box('shoulder_inset','frame',[-0.10,4.20,face-0.04],[0.50,4.43,face]),
    box('lifting_eye','trim',[-0.82,h.high,0.37],[-0.69,h.high+0.04,0.42]),
    box('lamp_plinth','frame',[0.62,4.22,0.44],[0.82,4.30,0.56]),
    k.prism('headlamp_brace','frame',[[0.45,lamp.turretHeadlamps[1]],[lamp.turretHeadlamps[0]-0.06,lamp.turretHeadlamps[1]],[lamp.turretHeadlamps[0]-0.06,lamp.turretHeadlamps[1]+0.06],[0.50,lamp.turretHeadlamps[1]+0.18]],[lamp.turretHeadlamps[2]-0.08,lamp.turretHeadlamps[2]+0.08]),
    box('headlamp_backplate','frame',[lamp.turretHeadlamps[0]-0.10,lamp.turretHeadlamps[1],lamp.turretHeadlamps[2]-0.14],[lamp.turretHeadlamps[0]-0.06,lamp.turretHeadlamps[1]+0.25,lamp.turretHeadlamps[2]+0.14]),
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
    box('lid','paint',[-0.62,h.high,-0.19],[-0.08,h.high+0.04,0.17]),
    box('hinge','trim',[-0.64,h.high+0.04,-0.16],[-0.60,h.high+0.08,0.14]),
    box('handle','frame',[-0.26,h.high+0.04,-0.07],[-0.22,h.high+0.09,0.05]),
  ]),

  part('ammo_cassette', 40, [
    // Heights are on the unlifted pod; the case stands clear of its raised hazard stripe.
    box('case','paint',[-0.63,3.70+lift,1.74],[-0.07,4.10+lift,2.02]),
    box('lid','frame',[-0.64,4.10+lift,1.74],[-0.06,4.13+lift,2.04]),
    box('mount_rear','frame',[-0.48,4.09+lift,1.68],[-0.42,4.14+lift,1.80]),
    box('mount_front','frame',[-0.24,4.09+lift,1.68],[-0.18,4.14+lift,1.80]),
    box('access_panel','paint',[-0.57,3.78+lift,2.02],[-0.13,4.04+lift,2.05]),
    box('latch','trim',[-0.35,3.94+lift,2.05],[-0.25,3.99+lift,2.08]),
    box('handle_rear','frame',[-0.49,4.13+lift,1.80],[-0.45,4.19+lift,1.86]),
    box('handle_front','frame',[-0.25,4.13+lift,1.80],[-0.21,4.19+lift,1.86]),
    box('handle_grip','black',[-0.49,4.19+lift,1.80],[-0.21,4.23+lift,1.86]),
  ]),

  part('ammo_feed', 8, feedPieces + [
    box('cassette_coupler','frame',[-0.10,feedY-0.07,1.81],[-0.03,feedY+0.07,1.95]),
    // Clears the original gun cradle, which it must not cross.
    box('receiver_adapter','frame',[0.31,feedY-0.065,1.51],[0.41,feedY+0.065,1.57]),
  ] + [
    k.turned('elbow_%d'%i,'trim','y',k.disc(0.055,feedY-0.06,feedY+0.06),[feed.path[i][0],0,feed.path[i][1]]) + {sides:12}
    for i in std.range(1,std.length(feed.path)-2)
  ]),

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
    box('lens','glass',[-0.06,-0.09,-0.05],[0.06,-0.08,0.05]),
  ]),
])
