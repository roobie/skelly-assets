// A multi-select combobox: a text input that suggests values while it is typed in, and the values picked so far as
// chips that each remove themselves. It follows the ARIA 1.2 editable combobox with a listbox popup, and keeps focus on
// the input while the suggestions are walked with the arrow keys.

let nextId = 0;

const element = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

// `suggest(text)` returns the values on offer for what is typed so far, as [{ value, text, detail?, title? }];
// `textOf(value)` names a picked value; `onChange(values)` runs when the picked values change.
export function makeCombobox({ label, title = '', suggest, textOf, onChange }) {
  const id = `combo-${nextId++}`;
  let values = [];
  let options = [];
  let active = -1;

  const input = element('input', { type: 'text', id: `${id}-input`, className: 'combo-input', placeholder: 'Any', autocomplete: 'off', spellcheck: false });
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', `${id}-list`);
  const list = element('ul', { id: `${id}-list`, className: 'combo-list', hidden: true });
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', label);
  const status = element('span', { className: 'combo-status' });
  status.setAttribute('role', 'status');
  const chips = element('span', { className: 'combo-chips' });
  const caption = element('label', { className: 'combo-label', htmlFor: input.id, textContent: label, title });
  const root = element('div', { className: 'combo' }, caption, element('div', { className: 'combo-field' }, chips, input), list, status);

  const open = () => !list.hidden;
  const setActive = (i) => {
    active = i;
    for (const [n, li] of [...list.children].entries()) li.setAttribute('aria-selected', String(n === i));
    if (i < 0) input.removeAttribute('aria-activedescendant');
    else {
      input.setAttribute('aria-activedescendant', list.children[i].id);
      list.children[i].scrollIntoView({ block: 'nearest' });
    }
  };
  const close = () => {
    list.hidden = true;
    status.textContent = '';
    input.setAttribute('aria-expanded', 'false');
    setActive(-1);
  };

  function renderChips() {
    chips.replaceChildren(...values.map((value) => {
      const b = element('button', { type: 'button', className: 'combo-chip', title: `Remove ${textOf(value)}` }, textOf(value), element('span', { textContent: '×' }));
      b.setAttribute('aria-label', `Remove ${label}: ${textOf(value)}`);
      b.onclick = () => { remove(value); input.focus(); };
      return b;
    }));
  }

  function change(next) {
    values = next;
    renderChips();
    onChange(values);
  }
  const remove = (value) => change(values.filter((v) => v !== value));

  function pick(i) {
    if (!options[i]) return;
    input.value = '';
    change([...values, options[i].value]);
    show(true);
  }

  // The first option is highlighted once the reader types or presses an arrow, not on focus alone.
  function show(highlight) {
    options = suggest(input.value.trim().toLowerCase());
    status.textContent = options.length ? '' : 'No matches';
    list.replaceChildren(...options.map((o, i) => {
      const li = element('li', { id: `${id}-opt-${i}`, className: 'combo-option', title: o.title ?? '' }, o.text, ...(o.detail === undefined ? [] : [element('span', { textContent: o.detail })]));
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.dataset.index = i;
      return li;
    }));
    list.hidden = options.length === 0;
    input.setAttribute('aria-expanded', String(options.length > 0));
    setActive(highlight && options.length ? 0 : -1);
  }

  // The mousedown that picks an option is cancelled so the input keeps focus and its list stays open.
  list.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const option = e.target.closest('[role="option"]');
    if (option) pick(Number(option.dataset.index));
  });
  input.addEventListener('input', () => show(true));
  input.addEventListener('focus', () => show(false));
  input.addEventListener('blur', close);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open()) { show(true); return; }
      if (options.length) setActive(e.key === 'ArrowDown' ? (active + 1) % options.length : (active < 0 ? options.length : active) - 1);
    } else if (e.key === 'Enter') {
      if (open() && active >= 0) { e.preventDefault(); pick(active); }
    } else if (e.key === 'Escape') {
      if (open()) { e.preventDefault(); e.stopPropagation(); close(); }
    } else if (e.key === 'Backspace' && !input.value && values.length) {
      remove(values.at(-1));
    }
  });

  return {
    element: root,
    // Replaces the picked values without announcing a change, as when the page restores them from its URL.
    set(next) {
      values = [...next];
      renderChips();
    },
  };
}
