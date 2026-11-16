// The sounds page: every baked sound row of the built tree, one table per object with a row per surface it lands on,
// and a player for each take, so the takes of one landing and the surfaces of one object are heard side by side.
const content = document.getElementById('content');
const words = (id) => id.replaceAll('_', ' ');
const element = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

const { sounds } = await fetch('sounds.json').then((r) => r.json());
const objects = Map.groupBy(sounds, (sound) => sound.object);
content.append(element('h1', { textContent: 'Sounds' }));
if (sounds.length === 0) content.append(element('p', { textContent: 'The built tree has no sounds.' }));
for (const [object, rows] of objects) {
  const table = element('table', {}, ...rows.map((sound) => element('tr', {},
    element('th', { textContent: words(sound.surface) }),
    element('td', {}, element('div', { className: 'takes' }, ...sound.takes.map((take) => element('audio', { controls: true, preload: 'none', src: take.url, title: `take ${take.seed}` })))),
  )));
  content.append(element('h2', { textContent: words(object) }), table);
}
