// The impact sounds pack: every ground a spent case lands on.
local impacts = import 'impacts.libsonnet';

impacts.rows([[impacts.objects.brass_case_9mm, impacts.surfaces[ground]] for ground in ['concrete', 'metal', 'wood', 'dirt']])
