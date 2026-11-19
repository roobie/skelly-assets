import type { Domain } from '@skelly/construct/assembly/schema.ts';
import { ANTI_MATERIEL_RULES } from './antiMateriel/index.ts';
import { AR_MODULAR_RULES } from './arModular/index.ts';
import { FAMILIES } from './parts.ts';
import { revolverRules } from './revolver.ts';
import {
  actionFrameMatch,
  actionHandleRest,
  actionRoleUnique,
  feedMatch,
  firingGrip,
  freeFloatClearance,
  handguardFit,
  magazineWellAxis,
  minFeature,
  opticEyeRelief,
  opticLoadingClearance,
  opticMountFit,
  pistolBarrelCrown,
  thumbholeGripMatch,
  triggerGuard,
} from './rules.ts';
import { GUN_UNITS } from './units.ts';

/** The gun domain. The core's main axis is the bore line. */
export const gunDomain: Domain = {
  name: 'gun',
  units: GUN_UNITS,
  families: FAMILIES,
  mountAllowances: { grip: 0.01, clamp: 0 },
  axisRules: [
    { kind: 'bore', mode: 'collinear' },
    { kind: 'sight', mode: 'parallel' },
    { kind: 'gas-cylinder', mode: 'parallel' },
    { kind: 'revolver-cylinder', mode: 'parallel' },
  ],
  rules: [
    firingGrip,
    actionHandleRest,
    actionRoleUnique,
    thumbholeGripMatch,
    feedMatch,
    actionFrameMatch,
    pistolBarrelCrown,
    triggerGuard,
    handguardFit,
    freeFloatClearance,
    magazineWellAxis,
    minFeature,
    opticMountFit,
    opticLoadingClearance,
    opticEyeRelief,
    ...revolverRules,
    ...ANTI_MATERIEL_RULES,
    ...AR_MODULAR_RULES,
  ],
};
