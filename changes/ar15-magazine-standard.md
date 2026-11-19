---
type: changed
---
STANAG magazines and the AR-15 magazine wells they seat in now declare the `ar15-magazine` port standard in their port `extras`, and the large AR frame's well and its SR-25 magazine declare `ar10-magazine`, so a magazine cut for one well no longer matches the other. This changes `magazine_stanag_20`, `magazine_stanag_30`, `ar15_lower`, `lower_ar_large`, `rifle_assault` and the `archetype_ar`, `archetype_ar_free_float` and `archetype_ar_large` designs; their geometry is unchanged. Other exported magazines and wells declare no standard.
