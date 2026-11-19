// Serves the lab on the LAN over a built tree: node serve.ts [--built dir] [--port n]. The tree defaults to the
// repo's built/, and the port to vite.config.ts's.
import { resolve } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { createServer } from 'vite';

const { values } = parseArgs({ options: { built: { type: 'string' }, port: { type: 'string' } } });
// The config reads the tree from the environment, as it does when vite is run on its own.
if (values.built !== undefined) process.env.SHADER_LAB_BUILT = resolve(values.built);
const server = await createServer({
  root: import.meta.dirname,
  ...(values.port === undefined ? {} : { server: { port: Number(values.port) } }),
});
await server.listen();
server.printUrls();
server.bindCLIShortcuts({ print: true });
