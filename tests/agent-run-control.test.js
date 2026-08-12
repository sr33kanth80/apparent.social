import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import {
  agentRunControlConfig,
  beginAgentRun,
  clearLocalAgentRuns,
  finishAgentRun,
  getAgentRun,
} from '../server/agent/agent-run-control.js';

beforeEach(() => clearLocalAgentRuns());

test('a user can hold only one active Agent run', async () => {
  const first = await beginAgentRun({
    requestKey: 'request-key-0000000000000001',
    userKey: 'user-one',
    role: 'investor',
    endpoint: 'investor-agent',
  });
  const second = await beginAgentRun({
    requestKey: 'request-key-0000000000000002',
    userKey: 'user-one',
    role: 'investor',
    endpoint: 'investor-agent',
  });

  assert.equal(first.action, 'started');
  assert.equal(second.action, 'user_busy');
  assert.equal(second.errorCode, 'agent_user_concurrency');
});

test('an idempotency key reconnects to the same run and completed payload', async () => {
  const requestKey = 'request-key-0000000000000003';
  const started = await beginAgentRun({ requestKey, userKey: 'user-two', role: 'founder', endpoint: 'founder-agent' });
  const duplicate = await beginAgentRun({ requestKey, userKey: 'user-two', role: 'founder', endpoint: 'founder-agent' });

  assert.equal(duplicate.action, 'running');
  assert.equal(duplicate.runId, started.runId);

  await finishAgentRun({
    runId: started.runId,
    requestKey,
    userKey: 'user-two',
    status: 'completed',
    usage: { callCount: 3, spentCents: 1.5 },
    durationMs: 1200,
    responsePayload: { reply: 'durable answer' },
  });

  const replay = await beginAgentRun({ requestKey, userKey: 'user-two', role: 'founder', endpoint: 'founder-agent' });
  const status = await getAgentRun({ requestKey, userKey: 'user-two' });
  assert.equal(replay.action, 'completed');
  assert.deepEqual(replay.responsePayload, { reply: 'durable answer' });
  assert.equal(status.status, 'completed');
});

test('an idempotency key cannot be replayed by another user', async () => {
  const requestKey = 'request-key-0000000000000004';
  await beginAgentRun({ requestKey, userKey: 'owner', role: 'investor', endpoint: 'investor-agent' });
  const collision = await beginAgentRun({ requestKey, userKey: 'attacker', role: 'investor', endpoint: 'investor-agent' });
  assert.equal(collision.action, 'conflict');
  assert.equal(collision.errorCode, 'agent_run_key_conflict');
});

test('a concurrent burst is admitted only up to the global provider cap', async () => {
  const attemptCount = agentRunControlConfig.globalConcurrency + 5;
  const results = await Promise.all(Array.from({ length: attemptCount }, (_, index) => beginAgentRun({
    requestKey: `load-test-request-${String(index).padStart(16, '0')}`,
    userKey: `load-test-user-${index}`,
    role: 'investor',
    endpoint: 'investor-agent',
  })));

  assert.equal(results.filter((result) => result.action === 'started').length, agentRunControlConfig.globalConcurrency);
  assert.equal(results.filter((result) => result.action === 'global_busy').length, 5);
});
