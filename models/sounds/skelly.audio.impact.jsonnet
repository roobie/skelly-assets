// The impact sounds pack: every ground a spent case lands on, and the glass vial on concrete.
local impacts = import 'impacts.libsonnet';
local objects = impacts.objects;
local surfaces = impacts.surfaces;

impacts.rows(
  [[objects.brass_case_9mm, surfaces[ground]] for ground in ['concrete', 'metal', 'wood', 'dirt']]
  + [[objects.glass_vial, surfaces.concrete_without_thud]]
)
