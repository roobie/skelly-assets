// The impact sounds pack: every ground a spent case lands on, and a glass vial landing on concrete.
local impacts = import 'impacts.libsonnet';

impacts.rows(
  [[impacts.objects.brass_case_9mm, impacts.surfaces[ground]] for ground in ['concrete', 'metal', 'wood', 'dirt']]
  + [[impacts.objects.glass_vial, impacts.surfaces.concrete]]
)
