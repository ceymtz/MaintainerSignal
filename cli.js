#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { analyzePullRequest } from './analyze.js';
import { renderReport } from './render.js';

function usage() {
  console.log(`MaintainerSignal CLI

Usage:
  maintainer-signal --fixture path/to/pr.json [--json]
  maintainer-signal [--base origin/main] [--json]

Options:
  --fixture <path>  Analyze a GitHub-style pull request fixture.
  --base <ref>      Compare the current HEAD with this Git ref.
  --json            Print machine-readable analysis.
  --help            Show this message.`);
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

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed.`);
  }

  return result.stdout;
}

function collectLocalFiles(base) {
  const range = `${base}...HEAD`;
  const statusLines = git(['diff', '--name-status', '--find-renames', range])
    .trim()
    .split('\n')
    .filter(Boolean);
  const numstat = new Map(
    git(['diff', '--numstat', range])
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [additions, deletions, ...pathParts] = line.split('\t');
        return [pathParts.join('\t'), {
          additions: additions === '-' ? 0 : Number(additions),
          deletions: deletions === '-' ? 0 : Number(deletions)
        }];
      })
  );

  return statusLines.map((line) => {
    const [rawStatus, ...pathParts] = line.split('\t');
    const filename = pathParts.at(-1);
    const counts = numstat.get(filename) ?? { additions: 0, deletions: 0 };
    const patch = git(['diff', '--unified=3', range, '--', filename]);

    return {
      filename,
      status: rawStatus.startsWith('A') ? 'added'
        : rawStatus.startsWith('D') ? 'removed'
          : rawStatus.startsWith('R') ? 'renamed'
            : 'modified',
      additions: counts.additions,
      deletions: counts.deletions,
      patch: patch.slice(0, 20000)
    };
  });
}

function fixturePayload(path) {
  const payload = JSON.parse(readFileSync(path, 'utf8'));
  return {
    pullRequest: payload.pull_request ?? payload.pullRequest ?? payload,
    files: payload.files ?? []
  };
}

function localPayload(base) {
  return {
    pullRequest: {
      title: `Local changes against ${base}`,
      author: process.env.USER ?? 'local',
      base,
      head: 'HEAD'
    },
    files: collectLocalFiles(base)
  };
}

try {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    usage();
    process.exit(0);
  }

  const payload = args.fixture ? fixturePayload(args.fixture) : localPayload(args.base);
  const analysis = analyzePullRequest(payload);

  console.log(args.json ? JSON.stringify(analysis, null, 2) : renderReport(analysis));
} catch (error) {
  console.error(`MaintainerSignal: ${error.message}`);
  process.exitCode = 1;
}
