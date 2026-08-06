#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { analyzePullRequest } from './analyze.js';
import { renderReport } from './render.js';

function usage() {
  console.log(`MaintainerSignal CLI\n\nUsage:\n  maintainer-signal --fixture path/to/pr.json [--json]\n  maintainer-signal [--base origin/main] [--json]`);
}

function parseArgs(argv) {
  const args = { base: process.env.MAINTAINER_SIGNAL_BASE ?? 'origin/main', json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--json') args.json = true;
    else if (arg === '--fixture') args.fixture = argv[++index];
    else if (arg === '--base') args.base = argv[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed.`);
  return result.stdout;
}

function localFiles(base) {
  const range = `${base}...HEAD`;
  const statuses = git(['diff', '--name-status', '--find-renames', range]).trim().split('\n').filter(Boolean);
  const counts = new Map(git(['diff', '--numstat', range]).trim().split('\n').filter(Boolean).map((line) => {
    const [a, d, ...parts] = line.split('\t');
    return [parts.join('\t'), { additions: a === '-' ? 0 : Number(a), deletions: d === '-' ? 0 : Number(d) }];
  }));
  return statuses.map((line) => {
    const [status, ...parts] = line.split('\t');
    const filename = parts.at(-1);
    return { filename, status, ...(counts.get(filename) ?? { additions: 0, deletions: 0 }), patch: git(['diff', '--unified=3', range, '--', filename]).slice(0, 20000) };
  });
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { usage(); process.exit(0); }
  const payload = args.fixture
    ? JSON.parse(readFileSync(args.fixture, 'utf8'))
    : { pullRequest: { title: `Local changes against ${args.base}`, author: process.env.USER ?? 'local' }, files: localFiles(args.base) };
  const analysis = analyzePullRequest({ pullRequest: payload.pull_request ?? payload.pullRequest ?? payload, files: payload.files ?? [] });
  console.log(args.json ? JSON.stringify(analysis, null, 2) : renderReport(analysis));
} catch (error) {
  console.error(`MaintainerSignal: ${error.message}`);
  process.exitCode = 1;
}
