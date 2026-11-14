/** What the dev server's `/api/vehicles` and `/api/solve` answer: the build checker's verdicts and the proposer's fix. */
export interface SwingContact {
  readonly other: string;
  readonly depth: number;
  readonly allowed: boolean;
  readonly message?: string;
}

export type SwingStatus = 'clear' | 'judged' | 'fails';

export interface SiteVerdict {
  readonly part: string;
  readonly clear: number;
  readonly stop?: string;
  readonly status: SwingStatus;
  readonly contacts: readonly SwingContact[];
}

export interface VehicleVerdicts {
  readonly vehicles: Readonly<Record<string, { readonly sites: Readonly<Record<string, SiteVerdict>> }>>;
}

export interface Proposal {
  readonly vehicle: string;
  readonly site: string;
  readonly part: string;
  readonly status: 'ok' | 'moved' | 'shortened' | 'none';
  readonly clear: number;
  readonly reachable?: number;
  readonly offset?: readonly number[];
  readonly partOffset?: readonly number[];
  readonly stop?: { readonly value: number; readonly total: number; readonly unit: string };
}

const metres = (value: number): string => `${Math.round(value * 1000)} mm`;

/** The failing vehicles first, then the rest by name, so what needs fixing is on top. */
export const orderedVehicles = ({ vehicles }: VehicleVerdicts): [string, Readonly<Record<string, SiteVerdict>>][] => {
  const fails = (sites: Readonly<Record<string, SiteVerdict>>) => Object.values(sites).some(({ status }) => status === 'fails');
  return Object.entries(vehicles)
    .map(([name, { sites }]): [string, Readonly<Record<string, SiteVerdict>>] => [name, sites])
    .sort(([a, siteA], [b, siteB]) => Number(fails(siteB)) - Number(fails(siteA)) || a.localeCompare(b));
};

/** One line saying how far a site opens and what stops it, for a verdict. */
export const describeSwing = ({ clear, stop, status, contacts }: SiteVerdict): string => {
  if (status === 'clear') return 'opens all the way';
  const held = contacts.filter(({ allowed }) => !allowed);
  const shown = status === 'fails' ? held : contacts;
  const touches = shown.map(({ other, depth }) => `${other} by ${metres(depth)}`).join(', ');
  return `opens ${Math.round(clear * 100)}% before ${stop ?? 'a contact'}; touches ${touches}`;
};

/** A proposal as the plain words the author reads before hand-merging it. */
export const describeProposal = (proposal: Proposal): string => {
  const { status, offset, partOffset, stop, part, reachable } = proposal;
  if (status === 'ok') return 'Nothing in the vehicle\'s report is against this part.';
  if (status === 'moved' && offset && partOffset) {
    return `Move every pin of ${part} by (${partOffset.map(metres).join(', ')}) in the part's frame; the same in the vehicle frame is (${offset.map(metres).join(', ')}). Every site of it in this vehicle then clears; other vehicles that place the part were not checked.`;
  }
  if (status === 'shortened' && stop) {
    return `No pin line within reach clears it (the best opens ${Math.round((reachable ?? 0) * 100)}%). Lower ${part}'s stop to ${stop.value}${stop.unit} of ${stop.total}${stop.unit}; other vehicles that place the part were not checked.`;
  }
  return `Nothing tried clears it (the best opens ${Math.round((reachable ?? proposal.clear) * 100)}%). Reshape the part or the body it meets, or judge the contact with a swingContact.`;
};
