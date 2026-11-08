import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';

import { downloadWithRetry } from '../jsonnet/setup.mjs';

// Serves `statuses` in order (the last repeats); reports how many requests arrived.
async function stubServer(statuses) {
  let requests = 0;
  const server = createServer((request, response) => {
    const status = statuses[Math.min(requests, statuses.length - 1)];
    requests += 1;
    response.writeHead(status);
    response.end(status === 200 ? 'archive-bytes' : 'upstream trouble');
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return {
    url: `http://127.0.0.1:${server.address().port}/go-jsonnet.tar.gz`,
    requests: () => requests,
    close: () => new Promise((done) => server.close(done)),
  };
}

function recordingSleep() {
  const waits = [];
  return { waits, sleep: async (milliseconds) => { waits.push(milliseconds); } };
}

test('download succeeds after transient 5xx responses', async () => {
  const stub = await stubServer([504, 503, 200]);
  const { waits, sleep } = recordingSleep();
  try {
    const body = await downloadWithRetry(stub.url, { attempts: 4, delaysMs: [1, 2, 3], sleep });
    assert.equal(body.toString(), 'archive-bytes');
    assert.equal(stub.requests(), 3);
    assert.deepEqual(waits, [1, 2]);
  } finally {
    await stub.close();
  }
});

test('persistent 5xx fails with the URL and last status after the configured attempts', async () => {
  const stub = await stubServer([504]);
  const { waits, sleep } = recordingSleep();
  try {
    await assert.rejects(
      downloadWithRetry(stub.url, { attempts: 3, delaysMs: [1, 2], sleep }),
      (error) => error.message.includes(stub.url) && error.message.includes('504'),
    );
    assert.equal(stub.requests(), 3);
    assert.equal(waits.length, 2);
  } finally {
    await stub.close();
  }
});

test('a 4xx response fails at once without retrying', async () => {
  const stub = await stubServer([404]);
  const { waits, sleep } = recordingSleep();
  try {
    await assert.rejects(
      downloadWithRetry(stub.url, { attempts: 3, delaysMs: [1, 2], sleep }),
      /404/,
    );
    assert.equal(stub.requests(), 1);
    assert.equal(waits.length, 0);
  } finally {
    await stub.close();
  }
});

test('network errors are retried, then reported with the URL', async () => {
  const { sleep, waits } = recordingSleep();
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    throw new TypeError('fetch failed');
  };
  await assert.rejects(
    downloadWithRetry('http://example.invalid/x', { attempts: 3, delaysMs: [1], fetchImpl, sleep }),
    (error) => error.message.includes('http://example.invalid/x') && error.message.includes('fetch failed'),
  );
  assert.equal(calls, 3);
  assert.deepEqual(waits, [1, 1]);
});
