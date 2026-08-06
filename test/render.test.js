import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePullRequest } from '../src/analyze.js';
import { REPORT_MARKER, renderReport } from '../src/render.js';

test('renders an idempotent report marker', () => {
  const report = renderReport(analyzePullRequest({ pullRequest: { title: 'Config', user: { login: 'dev' } }, files: [{ filename: 'config/app.yml', additions: 5 }] }));
  assert.ok(report.startsWith(REPORT_MARKER));
  assert.match(report, /Maintainer checklist/);
});
