import {
  describeProposal,
  describeSwing,
  orderedVehicles,
  type Proposal,
  type SiteVerdict,
  type VehicleVerdicts,
} from './vehicles.ts';

const cell = (row: HTMLTableRowElement, text: string, className?: string): HTMLTableCellElement => {
  const td = row.insertCell();
  td.textContent = text;
  if (className) td.className = className;
  return td;
};

const downloadJson = (value: unknown, name: string) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
};

/** Fills `section` with every placement vehicle's swing verdicts and a Solve button on each failing site. */
export async function mountVehicles(section: HTMLElement): Promise<void> {
  const status = section.querySelector<HTMLParagraphElement>('.vehicles-status')!;
  const table = section.querySelector<HTMLTableSectionElement>('.vehicles-sites')!;
  const proposalBox = section.querySelector<HTMLPreElement>('.vehicles-proposal')!;
  status.textContent = 'Reading the vehicles; the first request evaluates them all and can take a minute.';
  let verdicts: VehicleVerdicts;
  try {
    const response = await fetch('./api/vehicles');
    if (!response.ok) throw new Error(await response.text());
    verdicts = (await response.json()) as VehicleVerdicts;
  } catch {
    status.textContent = 'Vehicle verdicts come from the local dev server (npm run dev in this package); a published tool has none.';
    return;
  }
  status.textContent = '';

  const propose = async (vehicle: string, site: string) => {
    proposalBox.textContent = `Solving ${vehicle} ${site}…`;
    const response = await fetch(`./api/solve?${new URLSearchParams({ vehicle, site })}`);
    if (!response.ok) {
      proposalBox.textContent = await response.text();
      return;
    }
    const proposal = (await response.json()) as Proposal;
    proposalBox.textContent = `${vehicle} ${site}: ${describeProposal(proposal)}`;
    const save = document.createElement('button');
    save.type = 'button';
    save.textContent = 'Download proposal';
    save.addEventListener('click', () => downloadJson(proposal, `${vehicle}.${site}.proposal.json`));
    proposalBox.append(document.createElement('br'), save);
  };

  const solve = async (vehicle: string, site: string, button: HTMLButtonElement) => {
    button.disabled = true;
    try {
      await propose(vehicle, site);
    } finally {
      button.disabled = false;
    }
  };

  const rows: HTMLTableRowElement[] = [];
  for (const [vehicle, sites] of orderedVehicles(verdicts)) {
    for (const [site, verdict] of Object.entries(sites) as [string, SiteVerdict][]) {
      const row = document.createElement('tr');
      cell(row, vehicle);
      cell(row, site);
      cell(row, verdict.part);
      cell(row, verdict.status, `verdict-${verdict.status}`);
      cell(row, describeSwing(verdict));
      const action = row.insertCell();
      if (verdict.status === 'fails') {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Solve';
        button.addEventListener('click', () => void solve(vehicle, site, button));
        action.append(button);
      }
      rows.push(row);
    }
  }
  table.replaceChildren(...rows);
  const count = Object.keys(verdicts.vehicles).length;
  status.textContent = `${rows.length} moving sites in ${count} vehicles.`;
}
