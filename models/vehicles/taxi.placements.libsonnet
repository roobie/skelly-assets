// The saloon's sites with the taxi's repainted panels, and the taxi's own sign and band.
local site = import 'site.libsonnet';
local retag(part) = if std.startsWith(part, 'saloon_') then 'taxi_' + part[7:] else part;
{
  sites: [placed + { part: retag(placed.part) } for placed in (import 'saloon.placements.libsonnet').sites] + [
    site.one('roof_sign', 'taxi_roof_sign'),
    site.one('side_band', 'taxi_side_band'),
  ],
}
