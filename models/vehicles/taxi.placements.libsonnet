// The saloon's sites with the taxi's repainted panels, and the taxi's own sign and band.
local site = import 'site.libsonnet';
local s = import 'taxi.spec.libsonnet';
local k = import 'kit.libsonnet';
local retag(part) = if std.startsWith(part, 'saloon_') then k.partId('taxi', s, part[6:]) else part;
local retagged = [placed + { part: retag(placed.part) } for placed in (import 'saloon.placements.libsonnet').sites];
{
  title: 'Taxi',
  sites: k.painted('taxi', s, (import 'car-body.libsonnet').pressings('taxi', s), retagged) + [
    site.one('roof_sign', 'taxi_roof_sign'),
    site.one('side_band', 'taxi_side_band'),
  ],
  swingUnjudged: [
    site.swingUnjudged('bonnet', 'shell', 0.0118, 'skin meets bulkhead'),
    site.swingUnjudged('boot_lid', 'shell', 0.0196, 'skin meets boot_side_far'),
    site.swingUnjudged('front_door_far', 'side_band', 0.025, 'skin_far meets front_6_far'),
    site.swingUnjudged('front_door_near', 'side_band', 0.025, 'skin meets front_3_near'),
    site.swingUnjudged('rear_door_far', 'side_band', 0.025, 'skin_far meets rear_3_far'),
    site.swingUnjudged('rear_door_near', 'side_band', 0.025, 'skin meets rear_0_near'),
  ],
}
