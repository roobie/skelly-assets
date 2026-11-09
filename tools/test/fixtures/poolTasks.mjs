// Tasks for tools/test/workerPool.test.mjs, one per way a pool task can end.
import process from 'node:process';

export function poolTask({ ending, value }) {
  if (ending === 'exit') process.exit(3);
  if (ending === 'throw') {
    const invalid = Object.assign(new Error('invalid row'), { issues: [{ message: 'too small', path: [{ key: 'grain' }] }] });
    throw new Error(`export failed: ${invalid.message}`, { cause: invalid });
  }
  return value;
}
