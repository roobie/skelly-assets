import { writeFileSync } from 'node:fs';
import { compileJsonnetFile } from '../../../jsonnet/index.mjs';
const source = new URL('./fixtures/bend-strip.jsonnet', import.meta.url);
writeFileSync(new URL('./fixtures/bend-strip.json', import.meta.url), compileJsonnetFile(source.pathname));
