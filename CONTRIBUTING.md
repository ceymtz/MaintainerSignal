# Contributing

Thank you for helping make pull request review more sustainable for open-source maintainers.

## Before opening a change

1. Search existing issues and pull requests.
2. For substantial behavior changes, open an issue first.
3. Keep the deterministic engine explainable. New risk points must cite observable evidence.
4. Do not add network calls to the deterministic path.
5. Never include real secrets, private diffs, or proprietary repository content in fixtures.

## Development

Requirements: Node.js 20 or newer.

```bash
npm install --ignore-scripts
npm run check
npm test
npm run demo
```

MaintainerSignal intentionally has zero runtime dependencies. Proposals that add one should explain the security, maintenance, and bundle-size tradeoff.

## Tests

Add a focused `node:test` case for every behavior change. Risk-scoring changes should include input files, expected signals, expected risk level, and rationale.

## Pull requests

Keep pull requests small enough to review. Complete the template, describe compatibility impact, and identify release impact.

## Review standard

A change is ready when it is correct, tested, explainable, safe for untrusted PR data, backward compatible or documented, and useful without an AI provider.
