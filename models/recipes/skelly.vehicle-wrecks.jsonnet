// Wrecked, burnt and abandoned vehicles, so a product can carry working traffic without the ruin of it.
local packs = import 'models/vehicles/packs.libsonnet';
local catalogue = import 'models/catalogue/packs.libsonnet';
[packs.partRecipe(row) for row in catalogue.rows(packs.parts('skelly.vehicle-wrecks'))]
