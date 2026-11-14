local site = import 'site.libsonnet';
local t = import 'truck-cab.libsonnet';
local driveline = import 'driveline.libsonnet';
local engine = import 'engine-kit.libsonnet';
local s = t.spec(import 'airport_crash_tender.spec.libsonnet');
local id = 'airport_crash_tender';
local middle(span) = (span[0] + span[1]) / 2;
local engineName = engine.nameOf(s.engine);
// The air box hangs under the near rail, its duct passing beneath the rail into the intake, because beside the block it
// would stand in the rail. It takes a site of its own: the kit's `air_box` site promises the kit's layout.
local engineSites =
  local kitSites = engine.sites(engineName, [s.engineX, s.engineY, 0], 'assembly');
  local airBox = [x for x in kitSites if x.id == 'air_box'][0];
  site.adjust(kitSites, drop=['air_box'], add=[
    site.one('low_air_box', airBox.part, [airBox.at[0], s.railBottom - engine.airBoxHeight(engineName), airBox.at[2]]),
  ]);
{
  title: 'Airport crash tender',
  // The engine is fitted as an assembly so its air box can hang under the rail. The transfer case splits the drive: the
  // rear shaft takes the prop shaft's place and the front shaft runs forward to the front axle's offset differential.
  sites: site.adjust(
    t.fittings(site.kit, id, s),
    drop=['engine'],
    over={ prop_shaft_0: { part: id + '_rear_shaft', at: [middle(s.rearShaft), s.propShaftY, 0] } },
    add=engineSites + [
      site.one('transfer_case', id + '_transfer_case', [s.transferX, s.r, 0]),
      site.one('front_shaft', id + '_front_shaft', [middle(s.frontShaft), s.r, driveline.axles[s.frontAxlePart].diffZ]),
    ],
  ) + [
    site.one('body', 'airport_crash_tender_body'),
    site.one('cab_stripe', 'airport_crash_tender_cab_stripe'),
    site.one('water_tank', 'airport_crash_tender_water_tank'),
    site.one('foam_tank', 'airport_crash_tender_foam_tank'),
    site.one('pump', 'airport_crash_tender_pump'),
    site.one('roof_turret_mount', 'airport_crash_tender_roof_turret_mount'),
    site.one('roof_turret', 'airport_crash_tender_roof_turret'),
    site.one('bumper_turret', 'airport_crash_tender_bumper_turret'),
    site.one('roof_rail', 'airport_crash_tender_roof_rail'),
    site.one('rear_ladder', 'airport_crash_tender_rear_ladder'),
    site.one('crew_bench', 'bench_seat_3', [3.35, s.floor, 0]),
    site.one('light_bar', 'light_bar_blue', [s.face - s.lean - 0.3, s.crown, 0]),
  ]
  + site.pair('lockers', 'airport_crash_tender_lockers')
  + site.pair('rear_beacon', 'beacon_blue', [s.bodyRear + 0.2, s.bodyTop, 1.3]),
  tags: { 'vehicle-role': ['emergency'] },
}
