local site = import 'site.libsonnet';
local bus = import 'bus-body.libsonnet';
local wheelKit = import 'wheel-kit.libsonnet';
local s = import 'articulated_bus.spec.libsonnet';
local startsWith(id, prefixes) = std.length([1 for prefix in prefixes if std.startsWith(id, prefix)]) > 0;
// The fore section keeps the cab and the rear section the engine and tail, so each drops the other's end.
local foreDropped = ['engine', 'gearbox', 'radiator', 'fuel_tank', 'exhaust', 'prop_shaft_', 'rear_bumper', 'tail_lamp_'];
local aftDropped = [
  'windscreen', 'front_bumper', 'dashboard', 'driver_seat', 'driver_plinth', 'steering_', 'instruments', 'gear_lever', 'front_axle', 'bonnet',
  'grille', 'front_wing_', 'destination_sign', 'front_wheel_', 'door_mirror_', 'headlamp_', 'battery',
];
// The rear section takes its windows, doors and fittings from the fore section's rows, and only its own shell and
// rear end from its own.
local rename(id) =
  local tail = std.substr(id, std.length('articulated_bus_aft'), std.length(id));
  if std.startsWith(id, 'articulated_bus_aft') && !std.member(['_shell', '_rear_bumper', '_rear_panel', '_rear_window'], tail)
  then 'articulated_bus' + tail
  else id;
local inAft(placed) = placed { id: 'aft_' + placed.id, part: rename(placed.part) };
local midAxle(placed) = if placed.id == 'rear_axle' then placed { part: wheelKit.axle('trailer_axle_truck', std.get(s.fore, 'wheelBrakes')) } else placed;
local pole(id, x, z) = site.one(id, 'grab_pole', [x, s.fore.floor, z]);
{
  sites: [
    midAxle(placed)
    for placed in bus.fittings(site.kit, 'articulated_bus', s.fore)
    if !startsWith(placed.id, foreDropped)
  ] + [
    site.one('joint', 'articulated_bus_joint'),
    site.one('bellows', 'articulated_bus_bellows'),
  ] + [
    inAft(placed)
    for placed in bus.fittings(site.kit, 'articulated_bus_aft', s.aft)
    if !startsWith(placed.id, aftDropped)
  ] + [
    pole('pole_front', 6.9, 0.3),
    pole('pole_door_fwd', 4.6, 0.3),
    pole('pole_door_aft', 2.9, 0.3),
    site.one('aft_end_panel', 'articulated_bus_aft_end_panel'),
    site.one('aft_pole_door', 'grab_pole', [-3.2, s.aft.floor, 0.3]),
    site.one('roof_unit', 'city_bus_roof_unit', [3.2, s.fore.roof, 0]),
    site.one('aft_roof_unit', 'city_bus_roof_unit', [-5.6, s.aft.roof, 0]),
  ],
}
