local site = import 'site.libsonnet';
local engine = import 'engine-kit.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'cab_over_field_car.spec.libsonnet';
local id = 'cab_over_field_car';
local mid(span) = (span[0] + span[1]) / 2;
{
  title: 'Cab-over field car',
  // The air box stands ahead of the block under the cab floor, because beside the block the seats and rails fill its
  // place. It takes a site of its own: the kit's `air_box` site promises the kit's layout.
  sites: site.adjust(engine.sites('i6_petrol', [s.engineX, s.engineY, 0], 'assembly'), drop=['air_box'], add=[one('forward_air_box', 'air_box_light', s.airBoxAt)]) + [
    one('frame', id + '_frame'),
    one('hull', id + '_hull'),
    one('front_bumper', id + '_front_bumper'),
    one('rear_bumper', id + '_rear_bumper'),
    one('grille', id + '_grille'),
    one('windscreen', id + '_windscreen'),
    one('dashboard', id + '_dashboard'),
    one('engine_cover', id + '_engine_cover'),
    one('rear_door', id + '_rear_door'),
    one('spare_wheel', id + '_spare_wheel', [s.rear, s.spareY, 0]),
    one('jerry_can', id + '_jerry_can', [s.rear, 1.15, 0.72]),
    one('blackout_lamp', id + '_blackout_lamp', [s.cowl + (s.head - s.cowl) * (s.blackoutAt[0] - s.belt) / (s.drip - s.belt), s.blackoutAt[0], s.blackoutAt[1]]),
    one('front_axle', id + '_axle', [s.frontAxle, 0, 0]),
    one('rear_axle', id + '_axle', [s.rearAxle, 0, 0]),
    one('gearbox', 'gearbox_inline', [s.gearboxX, s.crankY - s.gearboxHeight / 2, 0]),
    one('transfer_case', id + '_transfer_case', [s.transferX, s.transferLow, 0]),
    one('front_prop_shaft', id + '_front_prop_shaft', [mid(s.frontShaft), s.driveY, 0]),
    one('rear_prop_shaft', id + '_rear_prop_shaft', [mid(s.rearShaft), s.driveY, 0]),
    one('radiator', 'radiator_small', [1.97, 0.985, 0]),
    one('fuel_tank', 'fuel_tank_van', [-1.6, 0.53, 0.02]),
    one('exhaust', 'exhaust_military', s.exhaustAt),
    one('downpipe', id + '_downpipe'),
    one('steering_wheel', 'steering_wheel', [s.wheelX, s.wheelY, -s.seatZ]),
    one('gear_lever', 'gear_lever', [0.95, s.coverTop, 0]),
    one('transfer_lever', 'gear_lever', [0.8, s.coverTop, 0.12]),
  ]
  + pair('front_wheel', id + '_wheel', [s.frontAxle, s.hub, s.wheelZ])
  + pair('rear_wheel', id + '_wheel', [s.rearAxle, s.hub, s.wheelZ])
  + pair('cab_door', id + '_cab_door')
  + pair('side_door', id + '_side_door')
  + pair('front_seat', 'front_seat', [s.seatX, s.cabFloor, s.seatZ])
  + pair('crew_seat', id + '_crew_seat', [s.crewSeatX, s.rearArch.aftHead[1] + 0.04, s.crewSeatZ])
  + pair('headlamp', id + '_headlamp', [s.nose, s.headlampY, s.lampZ])
  + pair('indicator', 'marker_lamp', [s.nose + 0.02, s.indicatorY, s.lampZ])
  + pair('wiper', id + '_wiper')
  + pair('door_mirror', id + '_door_mirror', [1.93, 1.46, s.side])
  + pair('tail_lamp', id + '_tail_lamp', [s.rear - 0.06, s.tailLampY, 0.72])
  + site.batteryBay('battery_tray', [1.42, s.cabFloor, 0]),
  tags: { 'vehicle-body': ['car'], 'vehicle-role': ['military'] },
}
