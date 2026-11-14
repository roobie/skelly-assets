local site = import 'site.libsonnet';
local bus = import 'bus-body.libsonnet';
local s = import 'prison_bus.spec.libsonnet';
local deck = s.decks[0];
local g = bus.layout(s);
local panes = g.panes(deck);
local doorway = g.doorways[0];
local leaf = g.leaves[0];
local bars(j) =
  local twin = site.pair('window_bars_' + j, 'prison_bus_window_bars', [(panes[j][0] + panes[j][1]) / 2, deck.waist, s.side]);
  // The door takes the near side of its bay.
  if std.member([door.bay for door in s.doors], j) then [twin[1]] else twin;
{
  title: 'Prison bus',
  sites: bus.fittings(site.kit, 'prison_bus', s)
         + std.flattenArrays([bars(j) for j in std.range(0, deck.bays - 1)])
         + [
           site.one('door_bars_' + panel, 'prison_bus_door_bars', [g.panelX(doorway, leaf, panel), s.doorSill + s.doorKick, s.side - 0.035], rides=g.panelSite(leaf, panel, 0))
           for panel in ['jamb', 'free']
         ]
         + [
           site.one('bulkhead', 'prison_bus_bulkhead'),
           site.one('rear_bars', 'prison_bus_rear_bars'),
           site.one('roof_vent_fwd', 'roof_vent', [2.0, s.roof, 0]),
           site.one('roof_vent_aft', 'roof_vent', [-2.5, s.roof, 0]),
         ],
  tags: { 'vehicle-role': ['utility'] },
}
