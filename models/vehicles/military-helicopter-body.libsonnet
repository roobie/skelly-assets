// The military transport helicopter's hull from a measurement spec, so each variant differs by its measures: how far
// the cabin's full section runs, where the cabin door sits and whether the cockpit has doors of its own. Its fittings
// are drawn once, in `military_transport_helicopter.libsonnet`, because every hull here seats them in the same places.
local k = import 'kit.libsonnet';
local h = import 'helicopter-kit.libsonnet';
local site = import 'site.libsonnet';
local box = k.box;
local fitted = 'military_transport_helicopter';
local skinThick = 0.075;
local cockpitFrame = 0.07;
// Where the engine cowling reaches its full section over the cabin.
local cowlHold = -1.9;
// A spec without cockpit doors has no side window either: the cabin door moves up behind the cockpit, its own pane
// takes the window's place and the flank between it and the windscreen is whole.
local doored(s) =
  assert (s.cockpitDoor == null) == (s.gunWindow == null) : 'a side window stands only between the cabin and cockpit doors';
  s.cockpitDoor != null;
// Whether the full section runs on aft of the cabin, for the cabin door to park there.
local runsOn(s) = s.sectionEnd < s.bulkhead;
{
  rows(id, title, s)::
    local finishes = { paint: s.paint, dark: s.trim, glass: 'glass-clear' };
    local wall(name, slot, x, arc, step=0.125, sides=32) = h.shell(name, slot, s.body, thick=skinThick, x=x, arc=arc, step=step, sides=sides);
    local door = s.cabinDoor;
    local doorTravel = door[1] - door[0];
    // The door stands a swing gap off the walls fore and aft, the kit's seam below the roof and the waist gap above
    // the belly, and it plugs out clear of all of them.
    local doorX = [door[0] + k.swingGap, door[1] - k.swingGap];
    local doorArc = [s.cabinArc + h.seam, h.waist(s.body, door)];
    // The door runs on a sill rail at the waist, where the section is widest, so a rail grown sideways by the plug lies
    // under the plugged door's inner face and stays clear of the engines on the roof.
    local railed = [station + { half: station.half + s.cabinDoorPlug - skinThick } for station in s.body];
    local rail(name, arc) = h.shell(name, 'dark', railed, thick=s.cabinDoorPlug - skinThick, x=[door[0] - doorTravel, door[1]], arc=arc, step=0.9, sides=120);
    local pane = s.cabinPane;
    local paneX = s.cabinPaneX;
    local cockpit = s.cockpitDoor;
    // The roof narrows toward the nose so steeply that its slices step most of the kit's seam over the door's head.
    local cockpitHead = s.cockpitArc + 0.5;
    local cockpitDoor = h.frontHinged(s.body, cockpit[0], cockpit[1], [cockpitHead, h.waist(s.body, cockpit)], bow=0, thick=skinThick);
    local cockpitPins = cockpitDoor.pins('dark');
    local gun = s.gunWindow;
    local gunArc = s.gunWindowArc;
    local e = s.engine;
    local tail =
      assert -s.tailRotor.x - s.tailRotor.radius - s.rotorRadius >= s.tailRotorClearance - 1e-9 : 'the tail rotor disc stands clear of the main rotor disc';
      s.tailRotor.x;
    local cowled = { top: 3.22, bottom: 2.5, half: 0.72, waist: 2.6 };
    local cowlTaper =
      assert s.sectionEnd <= s.bulkhead : 'the tail cone starts at or aft of the cabin bulkhead';
      assert s.sectionEnd - 1.4 < cowlHold : 'the cowling tapers aft of where it holds its section';
      s.sectionEnd - 1.4;
    [
      k.compound(id + '_belly', s.shellMass,
                 h.loft('nose', 'paint', s.body, x=[3.3, s.nose], arc=[90, 270], sides=24)
                 + h.loft('middle', 'paint', s.body, x=[s.bulkhead, 2.6], arc=[90, 270], step=4.2, sides=24)
                 + h.loft('shoulder', 'paint', s.body, x=[2.6, 3.3], arc=[90, 270], step=0.125, sides=24)
                 + rail('rail_near', [90, 93])
                 + rail('rail_far', [267, 270]),
                 finishes) + { title: title + ' belly' },
      k.compound(id + '_tail_cone', 160,
                 // Split where the full section ends, so no slice of the wall spans both the full section and the taper.
                 wall('wall', 'paint', [s.tailEnd, s.sectionEnd], [-180, 180], sides=24)
                 + (if runsOn(s) then wall('stowage', 'paint', [s.sectionEnd, s.bulkhead], [-180, 180], sides=24) else [])
                 + h.loft('cap', 'paint', s.body, x=[s.tailEnd, s.tailEnd + 0.06], step=0.06, sides=24),
                 finishes) + { title: title + ' tail cone' },
      k.compound(id + '_roof', 260,
                 h.loft('nose_top', 'paint', s.body, x=[s.windscreen[1], s.nose], arc=h.dome, sides=24)
                 + wall('screen_post', 'paint', s.windscreen, [-3, 3], sides=120)
                 + wall('screen_sill_near', 'paint', s.windscreen, [s.windscreenArc, 90])
                 + wall('screen_sill_far', 'paint', s.windscreen, [-90, -s.windscreenArc])
                 + (if doored(s) then
                      wall('cockpit_roof', 'paint', cockpit, [-s.cockpitArc, s.cockpitArc])
                      + cockpitDoor.post('cockpit_lip', 'paint')
                      + wall('pillar_front', 'paint', [gun[1], cockpit[0]], h.dome, step=0.2)
                      + wall('pillar_rear', 'paint', [door[1], gun[0]], h.dome, step=0.2)
                      + wall('gun_roof', 'paint', gun, [-gunArc[0], gunArc[0]], step=0.7)
                      + wall('gun_sill_near', 'paint', gun, [gunArc[1], 90], step=0.7)
                      + wall('gun_sill_far', 'paint', gun, [-90, -gunArc[1]], step=0.7)
                    else wall('cockpit_side', 'paint', [door[1], s.windscreen[0]], h.dome))
                 + wall('cabin_roof', 'paint', door, [-s.cabinArc, s.cabinArc], step=0.7)
                 + wall('cabin_rear', 'paint', [s.bulkhead, door[0]], h.dome, step=0.25)
                 + h.loft('bulkhead', 'paint', s.body, x=[s.bulkhead, s.bulkhead + 0.05], arc=h.dome, step=0.05, sides=24),
                 finishes) + { title: title + ' roof' },
      k.compound(id + '_windscreen', 30,
                 wall('near', 'glass', s.windscreen, [3, s.windscreenArc])
                 + wall('far', 'glass', s.windscreen, [-s.windscreenArc, -3]),
                 finishes) + { title: title + ' windscreen' },
    ] + (if doored(s) then [
           k.compound(id + '_cockpit_door', 28,
                      wall('pane', 'glass', [cockpitDoor.end, cockpitDoor.rest[1] - cockpitFrame], [s.cockpitArc + 4, s.cockpitPane])
                      + wall('lower', 'paint', cockpitDoor.rest, [s.cockpitPane, h.waist(s.body, cockpit)])
                      + wall('top', 'paint', cockpitDoor.rest, [cockpitHead, s.cockpitArc + 4], sides=120)
                      + wall('front', 'paint', [cockpitDoor.rest[1] - cockpitFrame, cockpitDoor.rest[1]], [s.cockpitArc + 4, s.cockpitPane], step=cockpitFrame)
                      + cockpitDoor.door('trail', 'paint')
                      + cockpitPins,
                      finishes,
                      motion=k.motion.hinge(cockpitPins, 'near', s.cockpitDoorOpens)) + { title: title + ' cockpit door' },
         ] else []) + [
      k.compound(id + '_cabin_door', 65,
                 wall('pane', 'glass', paneX, pane, step=0.45)
                 + wall('lower', 'paint', doorX, [pane[1], doorArc[1]], step=0.7)
                 + wall('upper', 'paint', doorX, [doorArc[0], pane[0]], step=0.7)
                 + wall('fore', 'paint', [paneX[1], doorX[1]], pane, step=0.6)
                 + wall('aft', 'paint', [doorX[0], paneX[0]], pane, step=0.6)
                 + wall('edge_fore', 'dark', [doorX[1] - 0.04, doorX[1]], doorArc, step=0.04)
                 + wall('edge_aft', 'dark', [doorX[0], doorX[0] + 0.04], doorArc, step=0.04),
                 finishes,
                 // Aft, as on aircraft of its class, so it leaves the cockpit and any cockpit door free.
                 motion=k.motion.slide('near', s.cabinDoorPlug) + k.motion.slide('rear', doorTravel)) + { title: title + ' cabin door' },
    ] + (if doored(s) then [
           k.compound(id + '_side_window', 6,
                      wall('pane', 'glass', gun, gunArc, step=0.7),
                      finishes) + { title: title + ' side window' },
         ] else []) + [
      k.compound(id + '_engine_cowling', 150,
                 h.loft('hump', 'paint', [
                   { x: 1.75, top: 2.9, bottom: 2.5, half: 0.2, waist: 2.6 },
                   { x: 1.0, top: 3.25, bottom: 2.5, half: 0.75, waist: 2.6 },
                   { x: cowlHold } + cowled,
                 ]
                 // The cowling holds its section over the cabin's full section and tapers only where the tail does.
                 + (if runsOn(s) then [{ x: s.sectionEnd - 0.3 } + cowled] else [])
                 + [{ x: cowlTaper, top: 2.8, bottom: 2.45, half: 0.22, waist: 2.5 }], arc=h.dome, step=0.125)
                 + k.bothSides([
                   k.turned('nacelle', 'paint', 'x', k.annulus(e.radius + 0.01, e.radius + 0.08, e.x - e.length / 2, e.x + e.length / 2), [0, e.y, e.z]) + { sides: 16 },
                 ]),
                 finishes) + { title: title + ' engine cowling' },
      k.compound(id + '_tail_boom', 240,
                 h.boom('boom', 'paint', { x: s.tailEnd + 0.2, y: 2.27, r: 0.31 }, { x: tail + 0.2, y: 2.85, r: 0.15 })
                 + [box('tail_gearbox', 'dark', [tail - 0.12, s.tailRotor.y - 0.12, -0.1], [tail + 0.12, s.tailRotor.y + 0.12, 0.1])],
                 finishes) + { title: title + ' tail boom' },
      k.compound(id + '_tail_surfaces', 60, [
        h.fin('fin', 'paint', [[tail + 0.95, 2.72], [tail + 0.05, 2.72], [tail - 0.45, 4.35], [tail, 4.4]], half=0.06),
        h.fin('ventral', 'paint', [[tail + 0.95, 2.8], [tail + 0.4, 2.8], [tail + 0.28, 2.34], [tail + 0.58, 2.34]], half=0.05),
        box('stabiliser', 'paint', [tail + 1.35, 2.62, -1.7], [tail + 1.95, 2.69, 1.7]),
      ], finishes) + { title: title + ' tail surfaces' },
      h.tailGear(id + '_tail_gear', 45, s.tailGear.x, s.tailGear.radius, s.tailGear.width, s.tailGear.top, s.tailGear.rake, s.tailGear.brace) + { title: title + ' tail gear' },
      k.compound(id + '_troop_bench', 30, [
        box('frame', 'dark', [door[0], 0, 0.1], [door[1], 0.36, 0.5]),
        box('cushion', 'seat', [door[0], 0.36, 0.1], [door[1], 0.44, 0.52]),
        box('back', 'seat', [door[0], 0.36, 0.02], [door[1], 1.05, 0.1]),
      ], { dark: s.trim, seat: 'cloth-seat' }) + { title: title + ' troop bench' },
    ],
  sites(id, s)::
    local one = site.one;
    local pair = site.pair;
    [
      one('belly', id + '_belly'),
      one('tail_cone', id + '_tail_cone'),
      one('roof', id + '_roof'),
      one('windscreen', id + '_windscreen'),
      one('engine_cowling', id + '_engine_cowling'),
      one('tail_boom', id + '_tail_boom'),
      one('tail_surfaces', id + '_tail_surfaces'),
      one('tail_rotor', fitted + '_tail_rotor', [s.tailRotor.x, s.tailRotor.y, s.tailRotor.z]),
      one('main_gearbox', fitted + '_main_gearbox', [0, 3.1, 0]),
      one('mast', fitted + '_mast', [0, s.mastFoot, 0]),
      one('main_rotor', fitted + '_main_rotor', [0, s.hub, 0]),
      one('fuel_tank', fitted + '_fuel_tank', [-2.45, 1.45, 0]),
      one('main_gear', fitted + '_main_gear'),
      one('tail_gear', id + '_tail_gear'),
      one('tail_wheel', fitted + '_tail_wheel', [s.tailGear.x, s.tailGear.radius, 0]),
      one('console', fitted + '_console', [3.85, s.floor, 0]),
      one('beacon', 'helicopter_beacon_red', [s.tailRotor.x - 0.22, 4.38, 0]),
      one('landing_lamp', fitted + '_landing_lamp', [5.0, 0.86, 0]),
    ]
    + pair('turbine', fitted + '_turbine', [s.engine.x, s.engine.y, s.engine.z])
    + (if doored(s) then pair('cockpit_door', id + '_cockpit_door') else [])
    + pair('cabin_door', id + '_cabin_door')
    + (if doored(s) then pair('side_window', id + '_side_window') else [])
    + pair('main_wheel', fitted + '_main_wheel', [s.mainGear.x, s.mainGear.radius, s.mainGear.z])
    + pair('crew_seat', fitted + '_crew_seat', [2.95, s.floor, 0.56])
    + pair('control_stick', 'control_stick', [3.3, s.floor, 0.56])
    + pair('troop_bench', id + '_troop_bench', [0, s.floor, 0]),
}
