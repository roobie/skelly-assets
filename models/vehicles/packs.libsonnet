// The vehicles each pack builds, as names in `index.libsonnet`. A vehicle drives on the ground unless another pack
// claims it, so a new road vehicle needs no recipe edit and parallel authors never edit one shared list.
local fleet = import 'index.libsonnet';
local claimed = {};
local others = std.flattenArrays(std.objectValues(claimed));
{
  vehicles(pack): if pack == 'skelly.ground-vehicles'
  then [vehicle for vehicle in std.objectFields(fleet) if !std.member(others, vehicle)]
  else claimed[pack],
}
