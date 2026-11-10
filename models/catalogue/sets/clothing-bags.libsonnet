local b = import 'packages/thing-authoring-tool/clothing-bags.libsonnet';
local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local atom = b.atom, garment = b.garment;
local bags = import 'models/measures/bags.libsonnet';
local worn(slot, material) = { category: 'clothing', tags: { slot: slot, material: material, setting: ['modern'] } };
// The garment models lie folded flat.
local folded(slot, material) = worn(slot, material) + { tags+: { state: ['folded'] } };
local bag(slot) = { category: 'containers', tags: { slot: slot, material: ['fabric'], setting: ['modern'] } };
[
  garment('jeans', 0.700, 'pants', 'plastic-blue', 'paint-charcoal', {
    width: 0.38, height: 0.045, depth: 0.44, sleeveLength: 0, hoodDepth: 0, pocketDepth: 0, cargoDepth: 0, legGap: 0.025,
  }, folded(['legs'], ['fabric'])),
  atom('rubber_boots', 'boots', 1.800, { width: 0.28, height: 0.22, depth: 0.34, gap: 0.025 }, { body: 'paint-charcoal', trim: 'steel-grey' }, 'shaft--1', worn(['feet'], ['rubber'])),
  atom('sneakers', 'boots', 0.800, { width: 0.26, height: 0.13, depth: 0.32, gap: 0.02 }, { body: 'cloth-pants-player', trim: 'rubber-black' }, 'shaft--1', worn(['feet'], ['fabric', 'rubber'])),
  garment('cargo_pants', 0.800, 'pants', 'cord-olive', 'paint-charcoal', {
    width: 0.40, height: 0.05, depth: 0.46, sleeveLength: 0, hoodDepth: 0, pocketDepth: 0, cargoDepth: 0.035, legGap: 0.025,
  }, folded(['legs'], ['fabric'])),
  garment('hoodie', 0.600, 'top', 'plastic-red', 'paint-charcoal', {
    width: 0.42, height: 0.06, depth: 0.34, sleeveLength: 0.16, hoodDepth: 0.13, pocketDepth: 0.025, cargoDepth: 0, legGap: 0,
  }, folded(['torso', 'arms'], ['fabric'])) + h.headEndOnPlusZ,
  garment('jacket', 1.200, 'top', 'paperboard-brown', 'paint-charcoal', {
    width: 0.44, height: 0.07, depth: 0.36, sleeveLength: 0.17, hoodDepth: 0, pocketDepth: 0.03, cargoDepth: 0, legGap: 0,
  }, folded(['torso', 'arms'], ['fabric'])) + h.headEndOnPlusZ,
  garment('utility_vest', 0.900, 'vest', 'polymer-od-green', 'paint-charcoal', {
    width: 0.38, height: 0.06, depth: 0.30, sleeveLength: 0, hoodDepth: 0, pocketDepth: 0.035, cargoDepth: 0, legGap: 0,
  }, folded(['torso'], ['fabric'])),
  atom('fanny_pack', 'bag', 0.200, bags.fanny_pack, bags.finish.fanny_pack, taxonomy=bag(['waist'])),
  atom('school_backpack', 'bag', 0.600, bags.school_backpack, bags.finish.school_backpack, 'handle', bag(['back'])),
  atom('hiking_backpack', 'bag', 1.400, bags.hiking_backpack, bags.finish.hiking_backpack, 'handle', bag(['back'])),
  // A fitted chamfered crown clears the bust's square hair corners without an oversized circular cap.
  atom('baseball_cap', 'cap', 0.080, {
    width: 0.204, depth: 0.244, height: 0.08, chamfer: 0.04,
    brimDepth: 0.09, brimWidth: 0.19, brimThickness: 0.01, brimHeight: 0.014,
  }, { body: 'plastic-blue', trim: 'paint-charcoal' }) + {
    voxelGrain: 0.004,
    taxonomy: { category: 'clothing', tags: { slot: ['head'], fit: ['worn'], setting: ['modern'] } },
  },
]
