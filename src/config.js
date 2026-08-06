function inputName(name) { return `INPUT_${name.toUpperCase().replaceAll('-', '_').replaceAll(' ', '_')}`; }
function getInput(name, fallback = '') { return String(process.env[inputName(name)] ?? fallback).trim(); }
function asBoolean(value, fallback = false) { return value === '' ? fallback : ['true','1','yes','on'].includes(String(value).toLowerCase()); }
function asInteger(value, fallback) { const number = Number.parseInt(value, 10); return Number.isFinite(number) ? number : fallback; }

export function loadConfig() {
  const aiReview = getInput('ai-review', 'auto').toLowerCase();
  const failOnRisk = getInput('fail-on-risk', 'none').toLowerCase();
  if (!['auto','always','never'].includes(aiReview)) throw new Error('ai-review must be auto, always, or never.');
  if (!['none','moderate','high','critical'].includes(failOnRisk)) throw new Error('Invalid fail-on-risk value.');
  return {
    githubToken: getInput('github-token') || process.env.GITHUB_TOKEN || '',
    openaiApiKey: getInput('openai-api-key') || process.env.OPENAI_API_KEY || '',
    model: getInput('model', 'gpt-5.4-mini'),
    aiReview,
    maxDiffChars: Math.max(1000, asInteger(getInput('max-diff-chars', '40000'), 40000)),
    comment: asBoolean(getInput('comment', 'true'), true),
    failOnRisk
  };
}
