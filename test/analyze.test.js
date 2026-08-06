import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePullRequest } from '../src/analyze.js';

test('flags security changes without tests as high risk', () => {
  const analysis = analyzePullRequest({
    pullRequest: { title: 'Add sessions', user: { login: 'dev' } },
    files: [{ filename: 'src/auth/session.js', additions: 120, deletions: 20 }]
  });
  assert.equal(analysis.risk.level, 'high');
  assert.ok(analysis.signals.some((signal) => signal.title === 'Security-sensitive paths'));
  assert.ok(analysis.signals.some((signal) => signal.title === 'No test files changed'));
});

test('keeps docs-only changes low risk', () => {
  const analysis = analyzePullRequest({ pullRequest: { title: 'Docs' }, files: [{ filename: 'docs/install.md', additions: 10, deletions: 2 }] });
  assert.equal(analysis.risk.level, 'low');
});
