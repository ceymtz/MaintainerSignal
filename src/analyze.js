import { groupFiles } from './classify.js';

function levelFromScore(score) {
  if (score >= 9) return 'critical';
  if (score >= 6) return 'high';
  if (score >= 3) return 'moderate';
  return 'low';
}

function addSignal(signals, points, title, evidence) {
  signals.push({ points, title, evidence });
}

function releaseRecommendation(groups, stats) {
  if (groups.migrations?.length) return 'Review as a potentially breaking change and document migration steps.';
  if (groups.source?.length) return stats.changedLines > 250 ? 'Consider a minor release after compatibility review.' : 'Consider a patch or minor release based on user-visible behavior.';
  if (groups.dependencies?.length || groups.config?.length) return 'A patch release is likely, subject to runtime impact.';
  return 'No release is likely required unless published documentation changes.';
}

function checklist(groups, stats) {
  const items = [];
  if (groups.source?.length && !groups.tests?.length) items.push('Confirm the changed behavior is covered by tests.');
  if (groups.security?.length) items.push('Review authorization boundaries, secret handling, and failure paths.');
  if (groups.migrations?.length) items.push('Verify rollback behavior and migration compatibility.');
  if (groups.dependencies?.length) items.push('Review dependency provenance, lockfile changes, and license impact.');
  if (groups.workflows?.length) items.push('Confirm workflow permissions are least-privilege and actions are pinned.');
  if (stats.changedLines > 500) items.push('Consider splitting the pull request into independently reviewable changes.');
  if (!groups.docs?.length && groups.source?.length) items.push('Confirm whether documentation or release notes need an update.');
  return items.length ? items : ['Run the project test suite and verify the stated acceptance criteria.'];
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

  if (stats.changedLines > 1000) addSignal(signals, 4, 'Very large change', `${stats.changedLines} lines changed.`);
  else if (stats.changedLines > 500) addSignal(signals, 3, 'Large change', `${stats.changedLines} lines changed.`);
  else if (stats.changedLines > 250) addSignal(signals, 2, 'Medium-sized change', `${stats.changedLines} lines changed.`);

  if (stats.files > 30) addSignal(signals, 2, 'Broad file surface', `${stats.files} files changed.`);
  else if (stats.files > 15) addSignal(signals, 1, 'Multiple files touched', `${stats.files} files changed.`);
  if (groups.security?.length) addSignal(signals, 4, 'Security-sensitive paths', groups.security.slice(0, 3).join(', '));
  if (groups.migrations?.length) addSignal(signals, 3, 'Migration or schema change', groups.migrations.slice(0, 3).join(', '));
  if (groups.workflows?.length) addSignal(signals, 2, 'Automation or deployment change', groups.workflows.slice(0, 3).join(', '));
  if (groups.dependencies?.length) addSignal(signals, 2, 'Dependency graph changed', groups.dependencies.slice(0, 3).join(', '));
  if (groups.config?.length) addSignal(signals, 1, 'Configuration changed', groups.config.slice(0, 3).join(', '));
  if (groups.source?.length && !groups.tests?.length) addSignal(signals, 2, 'No test files changed', 'Source changed without an accompanying test-file change.');
  if (groups.generated?.length) addSignal(signals, 1, 'Generated output included', groups.generated.slice(0, 3).join(', '));

  const score = Math.min(12, signals.reduce((sum, signal) => sum + signal.points, 0));
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
    risk: { score, level: levelFromScore(score) },
    signals,
    checklist: checklist(groups, stats),
    releaseRecommendation: releaseRecommendation(groups, stats),
    files: normalizedFiles
  };
}
