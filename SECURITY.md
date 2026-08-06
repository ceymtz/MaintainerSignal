# Security Policy

## Supported versions

MaintainerSignal is pre-1.0. Security fixes are applied to the latest release and default branch.

## Reporting a vulnerability

Use GitHub private vulnerability reporting:

`https://github.com/ceymtz/j/security/advisories/new`

Include the affected version, impact, reproduction steps, and suggested mitigation. Never include real third-party secrets or private repository data.

## Security model

MaintainerSignal:

- Does not execute pull request code
- Uses repository-scoped GitHub permissions
- Redacts likely secret-bearing lines before optional model calls
- Caps diff content sent to an external API
- Has zero runtime dependencies
- Never approves or merges pull requests
