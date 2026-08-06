import { groupFiles } from './classify.js';

const LEVELS = ['low', 'moderate', 'high', 'critical'];

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function levelFromScore(score) {
  if (score >= 9) return 'critical';
  if (score >= 6) return 'high';
  if (score >= 3) return 'moderate';
  return 'low';
}

function addSignal(signals, points, title, evidence) {
  signals.push({ points, title, evidence });
}

function recommendation(groups, stats) {
  if ((groups.migrations?.length ?? 0) > 0) {
    return 'Review as a potentially breaking change and document migration steps.';
  }

  if ((groups.source?.length ?? 0) > 0) {
    return stats.changedLines > 250
      ? 'Consider a minor release after compatibility review.'
      : 'Consider a patch or minor release based on user-visible behavior.';
  }

  if ((groups.dependencies?.length ?? 0) > 0 || (groups.config?.length ?? 0) > 0) {
    return 'A patch release is likely, subject to runtime impact.';
  }

  return 'No release is likely required unless the change affects published documentation.';
}

function buildChecklist(groups, stats) {
  const items = [];

  if ((groups.source?.length ?? 0) > 0 && (groups.tests?.length ?? 0) === 0) {
    items.push('Confirm the changed behavior is covered by tests.');
  }

  if ((groups.security?.length ?? 0) > 0) {
    items.push('Review authorization boundaries, secret handling, and failure paths.');
  }

  if ((groups.migrations?.length ?? 0) > 0) {
    items.push('Verify rollback behavior and migration compatibility.');
  }

  if ((groups.dependencies?.length ?? 0) > 0) {
    items.push('Review dependency provenance, lockfile changes, and license impact.');
  }

  if ((groups.workflows?.length ?? 0) > 0) {
    items.push('Confirm workflow permissions are least-privilege and actions are pinned.');
  }

  if (stats.changedLines > 500) {
    items.push('Consider splitting the pull request into independently reviewable changes.');
  }

  if ((groups.docs?.length ?? 0) === 0 && (groups.source?.length ?? 0) > 0) {
    items.push('Confirm whether user-facing documentation or release notes need an update.');
  }

  if (items.length === 0) {
    items.push('Run the project test suite and verify the stated acceptance criteria.');
  }

  return items;
}

export function analyzePullRequest({ pullRequest, files }) {
  const normalizedFiles = files.map((file) => ({
    filename: file.filename,
    status: file.status ?? 'modified',
    additions: Number(file.additions ?? 0),
    deletions: Number(file.deletions ?? 0),
    changes: Number(file.changes ?? Number(file.additions ?? 0) + Number(file.deletions ?? 0)),
    patch: file.patch ?? ''
  }));

  const groups = groupFiles(normalizedFiles);
  const stats = {
    files: normalizedFiles.length,
    additions: normalizedFiles.reduce((sum, file) => sum + file.additions, 0),
    deletions: normalizedFiles.reduce((sum, file) => sum + file.deletions, 0)
  };
  stats.changedLines = stats.additions + stats.deletions;

  const signals = [];

  if (stats.changedLines > 1000) {
    addSignal(signals, 4, 'Very large change', `${stats.changedLines} lines changed.`);
  } else if (stats.changedLines > 500) {
    addSignal(signals, 3, 'Large change', `${stats.changedLines} lines changed.`);
  } else if (stats.changedLines > 250) {
    addSignal(signals, 2, 'Medium-sized change', `${stats.changedLines} lines changed.`);
  }

  if (stats.files > 30) {
    addSignal(signals, 2, 'Broad file surface', `${stats.files} files changed.`);
  } else if (stats.files > 15) {
    addSignal(signals, 1, 'Multiple files touched', `${stats.files} files changed.`);
  }

  if ((groups.security?.length ?? 0) > 0) {
    addSignal(signals, 4, 'Security-sensitive paths', groups.security.slice(0, 3).join(', '));
  }

  if ((groups.migrations?.length ?? 0) > 0) {
    addSignal(signals, 3, 'Migration or schema change', groups.migrations.slice(0, 3).join(', '));
  }

  if ((groups.workflows?.length ?? 0) > 0) {
    addSignal(signals, 2, 'Automation or deployment change', groups.workflows.slice(0, 3).join(', '));
  }

  if ((groups.dependencies?.length ?? 0) > 0) {
    addSignal(signals, 2, 'Dependency graph changed', groups.dependencies.slice(0, 3).join(', '));
  }

  if ((groups.config?.length ?? 0) > 0) {
    addSignal(signals, 1, 'Configuration changed', groups.config.slice(0, 3).join(', '));
  }

  if ((groups.source?.length ?? 0) > 0 && (groups.tests?.length ?? 0) === 0) {
    addSignal(signals, 2, 'No test files changed', 'Source changed without an accompanying test-file change.');
  }

  if ((groups.generated?.length ?? 0) > 0) {
    addSignal(signals, 1, 'Generated output included', groups.generated.slice(0, 3).join(', '));
  }

  const score = clamp(signals.reduce((sum, signal) => sum + signal.points, 0), 0, 12);
  const level = levelFromScore(score);

  return {
    pullRequest: {
      number: pullRequest.number ?? null,
      title: pullRequest.title ?? 'Untitled pull request',
      author: pullRequest.user?.login ?? pullRequest.author ?? 'unknown',
      url: pullRequest.html_url ?? pullRequest.url ?? null,
      base: pullRequest.base?.ref ?? pullRequest.base ?? null,
      head: pullRequest.head?.ref ?? pullRequest.head ?? null
    },
    stats,
    groups,
    risk: {
      score,
      level,
      ordinal: LEVELS.indexOf(level)
    },
    signals,
    checklist: buildChecklist(groups, stats),
    releaseRecommendation: recommendation(groups, stats),
    files: normalizedFiles
  };
}
