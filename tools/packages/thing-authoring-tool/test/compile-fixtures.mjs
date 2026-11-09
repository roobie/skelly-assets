import { writeFileSync } from 'node:fs';
import { compileJsonnetFile } from '../../../jsonnet/index.mjs';
for (const name of ['bend-strip', 'lying-on-back']) {
  const source = new URL(`./fixtures/${name}.jsonnet`, import.meta.url);
  writeFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), compileJsonnetFile(source.pathname));
}
