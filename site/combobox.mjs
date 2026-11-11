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
  const chips = element('span', { className: 'combo-chips' });
  const caption = element('label', { className: 'combo-label', htmlFor: input.id, textContent: label, title });
  const root = element('div', { className: 'combo' }, caption, element('div', { className: 'combo-field' }, chips, input), list);

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
    show();
  }

  function show() {
    options = suggest(input.value.trim().toLowerCase());
    list.replaceChildren(...(options.length ? options.map((o, i) => {
      const li = element('li', { id: `${id}-opt-${i}`, className: 'combo-option', title: o.title ?? '' }, o.text, ...(o.detail === undefined ? [] : [element('span', { textContent: o.detail })]));
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.onmousedown = (e) => { e.preventDefault(); pick(i); };
      return li;
    }) : [element('li', { className: 'combo-empty', textContent: 'No matches' })]));
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    setActive(options.length ? 0 : -1);
  }

  input.addEventListener('input', show);
  input.addEventListener('focus', show);
  input.addEventListener('blur', close);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open()) { show(); return; }
      if (options.length) setActive((active + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
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
    // Rebuilds the open list, as when another filter has changed what remains to suggest.
    refresh() { if (open()) show(); },
  };
}
