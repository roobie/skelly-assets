local site = import 'site.libsonnet';
local van = import 'van-body.libsonnet';
local s = import 'minibus.spec.libsonnet';
local farColumn = -0.46;
local rearRow = s.seatRows[std.length(s.seatRows) - 1];
{
  // Pairs line the far side so the aisle runs back from the sliding door; the last row spans the body.
  sites: van.fittings(site.kit, 'minibus', s) + [
    site.one('seats_' + i, 'bus_seat_pair', [s.seatRows[i], s.floor, farColumn])
    for i in std.range(0, std.length(s.seatRows) - 1)
  ] + [
    site.one('seats_rear', 'bus_seat_pair', [rearRow, s.floor, -farColumn]),
  ],
}
