import type { Slider } from './tune.ts';

/** An element of index.html by its id, which the page must have. */
export const byId = <T extends HTMLElement>(id: string) => {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`index.html has no #${id}`);
  return element as T;
};

/** Fills `select` with `options`, by value and label, keeping `chosen` chosen. */
export const fillSelect = (
  select: HTMLSelectElement,
  options: readonly (readonly [string, string])[],
  chosen: string,
) => {
  select.replaceChildren(
    ...options.map(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      option.selected = value === chosen;
      return option;
    }),
  );
};

/**
 * One range input per slider in `box`, each showing the value `current` reads for its path and calling `change` as it
 * moves, so the sliders are made from a schema's fields and nothing lists them by hand.
 */
export const fillSliders = (
  box: HTMLElement,
  sliders: readonly Slider[],
  current: (path: readonly string[]) => number,
  change: (path: readonly string[], value: number) => void,
) => {
  box.replaceChildren(
    ...sliders.map(({ path, range: [lo, hi], step }) => {
      const name = path.join('.');
      const label = document.createElement('label');
      const caption = document.createElement('span');
      const shown = document.createElement('output');
      const input = document.createElement('input');
      Object.assign(input, { type: 'range', min: String(lo), max: String(hi), step: String(step), name });
      input.value = String(current(path));
      shown.value = input.value;
      caption.textContent = name;
      input.addEventListener('input', () => {
        shown.value = input.value;
        change(path, Number(input.value));
      });
      label.append(caption, input, shown);
      return label;
    }),
  );
};
