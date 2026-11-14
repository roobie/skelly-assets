import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

interface VehicleApi {
  invalidate(): void;
  verdicts(): Promise<unknown>;
  solve(vehicle: string, site: string): Promise<unknown>;
}

// The Vehicles view's endpoints, served by the dev server only: a vehicle's swing verdicts come from the build's own
// checker, which evaluates Jsonnet in Node, so a published tool has no such endpoint and the view says so. Both answer
// a GET and write nothing.
const vehicleEndpoints = (): Plugin => ({
  name: 'vehicle-endpoints',
  apply: 'serve',
  configureServer({ middlewares, watcher }) {
    const api: Promise<VehicleApi> = import(pathToFileURL(resolve(import.meta.dirname, 'server/vehicleApi.mjs')).href).then(
      ({ vehicleApi }) => vehicleApi({ root: resolve(import.meta.dirname, '../../..') }),
    );
    const models = resolve(import.meta.dirname, '../../../models') + sep;
    watcher.add(models);
    watcher.on('all', (_event, file) => {
      if (file.startsWith(models)) void api.then((loaded) => loaded.invalidate());
    });
    const serve = (path: string, answer: (query: URLSearchParams, api: VehicleApi) => Promise<unknown>) =>
      middlewares.use(path, (request, response) => {
        const query = new URL(request.url ?? '', 'http://localhost').searchParams;
        api.then((loaded) => answer(query, loaded)).then(
          (body) => {
            response.setHeader('content-type', 'application/json');
            response.end(JSON.stringify(body));
          },
          (error: unknown) => {
            response.statusCode = 400;
            response.end(error instanceof Error ? error.message : String(error));
          },
        );
      });
    serve('/api/vehicles', (_query, loaded) => loaded.verdicts());
    serve('/api/solve', (query, loaded) => loaded.solve(query.get('vehicle') ?? '', query.get('site') ?? ''));
  },
});

export default defineConfig({
  base: './',
  plugins: [vehicleEndpoints()],
});
