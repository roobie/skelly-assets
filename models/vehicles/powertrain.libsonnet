// An electric or hybrid variant's sites from its parent's, derived as Deadvox derives the variant's blueprint, so the
// variant states only its drive and the two lay out the same sites.
// `motor`, `inverter`, `pack` and `port` are each `{ part, at }`. `drop` names the sites to remove, `over` merges fields
// into a kept site by id, and `add` appends sites that are not part of the drive, such as a badge.
local site = import 'site.libsonnet';
local engine = import 'engine-kit.libsonnet';
local cooling = import 'cooling-kit.libsonnet';
local fuelTank = import 'fuel-tank-kit.libsonnet';
local exhaust = import 'exhaust-kit.libsonnet';
// Every site of a combustion drive, from each kit's own list, so a kit's new part cannot outlive the engine it serves.
// A tank or an exhaust may be fitted on both sides.
local sides(id) = [id, id + '_near', id + '_far'];
local combustion = engine.siteIds + ['gearbox'] + cooling.siteIds
                   + std.flattenArrays([fuelTank.siteIds(id) for id in sides('fuel_tank')])
                   + std.flattenArrays([sides(id) for id in exhaust.siteIds]);
local role(key, id=key) = { key: key, id: id };
local derive(base, o, drop, roles) =
  local ids = [placed.id for placed in base];
  assert std.all([std.member(ids, id) for id in std.get(o, 'drop', [])]) : 'a variant drops a site its parent lacks';
  assert std.all([std.member(ids, id) for id in std.objectFields(std.get(o, 'over', {}))]) : 'a variant changes a site its parent lacks';
  site.adjust(base, std.get(o, 'over', {}), drop, [site.one(r.id, o[r.key].part, o[r.key].at) for r in roles] + std.get(o, 'add', []));
{
  electric(base, o):: derive(base, o, std.get(o, 'drop', combustion), [role('motor'), role('inverter'), role('pack'), role('port', 'charge_port')]),
  // A hybrid keeps its engine, so it drops nothing unless `drop` names it.
  hybrid(base, o):: derive(base, o, std.get(o, 'drop', []), [role('motor'), role('pack')]
    + (if std.objectHas(o, 'inverter') then [role('inverter')] else [])
    + (if std.objectHas(o, 'port') then [role('port', 'charge_port')] else [])),
}
