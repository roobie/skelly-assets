// Wrecked, burnt and abandoned vehicles, so a product can carry working traffic without the ruin of it. The crashed
// helicopters keep some of their living counterparts' parts, which stay in skelly.aircraft, which this pack depends on.
local packs = import 'models/vehicles/packs.libsonnet';
local catalogue = import 'models/catalogue/packs.libsonnet';
[packs.partRecipe(row) for row in catalogue.rows(packs.parts('skelly.vehicle-wrecks'))]
