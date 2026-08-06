import { appendFileSync, readFileSync } from 'node:fs';
import { analyzePullRequest } from './analyze.js';
import { loadConfig } from './config.js';
import { getPullRequest, getPullRequestFiles, upsertReportComment } from './github.js';
import { enhanceWithOpenAI } from './openai.js';
import { renderReport } from './render.js';

const LEVEL_ORDER = { low: 0, moderate: 1, high: 2, critical: 3 };

function setOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  const delimiter = `MAINTAINER_SIGNAL_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  appendFileSync(outputPath, `${name}<<${delimiter}\n${String(value)}\n${delimiter}\n`);
}

function readEvent() {
  if (!process.env.GITHUB_EVENT_PATH) throw new Error('GITHUB_EVENT_PATH is missing.');
  return JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
}

function repositoryContext(event) {
  const fullName = process.env.GITHUB_REPOSITORY ?? event.repository?.full_name;
  const pullNumber = event.pull_request?.number ?? event.number;
  if (!fullName || !pullNumber) throw new Error('MaintainerSignal only runs for pull_request events.');
  const [owner, repo] = fullName.split('/');
  return { owner, repo, pullNumber };
}

function shouldUseAi(config) {
  if (config.aiReview === 'never') return false;
  if (config.aiReview === 'always' && !config.openaiApiKey) {
    throw new Error('ai-review is "always" but no OpenAI API key was provided.');
  }
  return Boolean(config.openaiApiKey);
}

function shouldFail(level, threshold) {
  return threshold !== 'none' && LEVEL_ORDER[level] >= LEVEL_ORDER[threshold];
}

async function main() {
  const config = loadConfig();
  const event = readEvent();
  const context = repositoryContext(event);
  if (!config.githubToken) throw new Error('A GitHub token is required.');

  const [pullRequest, files] = await Promise.all([
    getPullRequest({ ...context, token: config.githubToken }),
    getPullRequestFiles({ ...context, token: config.githubToken })
  ]);

  const analysis = analyzePullRequest({ pullRequest, files });
  let ai = null;

  if (shouldUseAi(config)) {
    try {
      ai = await enhanceWithOpenAI({
        analysis,
        apiKey: config.openaiApiKey,
        model: config.model,
        maxDiffChars: config.maxDiffChars
      });
    } catch (error) {
      console.warn(`AI enhancement skipped: ${error.message}`);
    }
  }

  const report = renderReport(analysis, ai);
  if (config.comment) {
    try {
      await upsertReportComment({ ...context, token: config.githubToken, body: report });
    } catch (error) {
      console.warn(`Could not publish PR comment: ${error.message}`);
    }
  }

  setOutput('risk-level', analysis.risk.level);
  setOutput('risk-score', analysis.risk.score);
  setOutput('report', report);
  console.log(report);

  if (shouldFail(analysis.risk.level, config.failOnRisk)) {
    process.exitCode = 1;
    console.error(`Risk ${analysis.risk.level} meets fail-on-risk ${config.failOnRisk}.`);
  }
}

main().catch((error) => {
  console.error(`MaintainerSignal failed: ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
