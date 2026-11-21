import type { Template } from '@skelly/construct/assembly/template.ts';
import { jointConnections, SKS_JOINTS } from './joints.ts';

/** The SKS: every part hangs from the receiver or the barrel where it was drawn. */
export const SKS_TEMPLATE: Template = {
  name: 'sks-carbine',
  description:
    'Simonov SKS-45 carbine: one-piece wooden stock, fixed ten-round magazine, gas tube under a wooden handguard, tangent rear sight, hooded front sight.',
  variant: '7.62x39',
  root: 'receiver',
  slots: [
    { id: 'receiver', family: 'sks-receiver' },
    ...Object.keys(SKS_JOINTS).map((slot) => ({ id: slot, family: `sks-${slot}` })),
  ],
  connections: jointConnections(),
};
