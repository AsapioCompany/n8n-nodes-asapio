# Contributing

## Setup

```bash
npm install
npm run dev
```

`npm run dev` links the package into a local n8n instance so you can test node changes live.

## Before opening a PR

```bash
npm run lint
npm test
npm run build
```

CI runs lint and build on every pull request; please make sure both pass locally first.

## Code style

Formatting is enforced via Prettier and the n8n community-node ESLint ruleset (`eslint-plugin-n8n-nodes-base` / `@n8n/eslint-plugin-community-nodes`). Run `npm run lint:fix` to auto-fix what's fixable.

## Releasing

Releases are cut by maintainers via `npm run release` (lints, builds, bumps the version, updates the changelog, tags, and pushes). Pushing a version tag triggers `.github/workflows/publish.yml`, which publishes to npm with provenance.
