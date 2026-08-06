# MaintainerSignal

**An evidence-based maintainer brief for every pull request.**

MaintainerSignal is a zero-dependency GitHub Action and CLI that helps open-source maintainers understand a pull request before reading every changed line. It calculates a transparent risk score, identifies review hotspots, creates a targeted checklist, and suggests release impact.

An optional OpenAI-powered layer adds semantic concerns, test scenarios, and a draft release note. The deterministic report always works without an API key.

> **Project status:** early alpha. The public API may change before v1.

## Why this exists

Small and mid-sized open-source projects often depend on one or two maintainers. Pull requests arrive with uneven descriptions, tests, and release context. MaintainerSignal follows four principles:

1. **Evidence before opinion.** Every risk point cites a concrete file or change-size signal.
2. **Useful without AI.** Core analysis is deterministic, local, and free.
3. **Maintainer-controlled.** It never approves, merges, or edits contributor code.
4. **Privacy-aware.** AI review is opt-in, diff size is capped, and likely secret lines are redacted.

## What it reports

- Changed-file and line counts
- Low, moderate, high, or critical risk
- Security, migration, workflow, dependency, configuration, and test signals
- A context-specific maintainer checklist
- A release-impact recommendation
- Optional semantic review using the OpenAI Responses API
- One idempotent pull request comment that updates instead of spamming

## Quick start

Create `.github/workflows/maintainer-signal.yml`:

```yaml
name: MaintainerSignal
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
permissions:
  contents: read
  pull-requests: write
  issues: write
jobs:
  maintainer-brief:
    runs-on: ubuntu-latest
    steps:
      - uses: ceymtz/j@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          ai-review: never
```

For AI-assisted review, add an `OPENAI_API_KEY` repository secret:

```yaml
      - uses: ceymtz/j@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          model: gpt-5.4-mini
          ai-review: auto
```

During alpha, pin a commit SHA for production use. A stable `v1` tag will be published after the configuration surface is validated.

## Inputs

| Input | Default | Description |
|---|---|---|
| `github-token` | `github.token` | Reads PR data and publishes the report |
| `openai-api-key` | empty | Enables optional semantic review |
| `model` | `gpt-5.4-mini` | Model used for semantic review |
| `ai-review` | `auto` | `auto`, `always`, or `never` |
| `max-diff-chars` | `40000` | Maximum redacted diff characters sent |
| `comment` | `true` | Publish/update the PR report |
| `fail-on-risk` | `none` | Fail on a selected risk threshold |

## CLI

```bash
npm run demo
npx maintainer-signal --base origin/main
npx maintainer-signal --base origin/main --json
```

## Security and privacy

The deterministic path makes no external model call. When AI review is enabled, only metadata, deterministic findings, and a capped redacted diff are sent. The API key is never printed. See [SECURITY.md](SECURITY.md).

## Roadmap

- Stable configuration and `v1` action tag
- Monorepo-aware policies
- Repository policy file
- SARIF and JSON artifacts
- Release-note aggregation
- Provider-neutral semantic adapters
- Evaluation fixtures from real OSS maintenance cases

## Contributing

Good first contributions include language/file classifiers, risk fixtures, clearer report copy, and privacy hardening. Read [CONTRIBUTING.md](CONTRIBUTING.md).

## Maintainer

Maintained by [@ceymtz](https://github.com/ceymtz).

## License

MIT
