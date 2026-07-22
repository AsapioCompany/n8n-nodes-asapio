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

**Never use `npm run release -- --publish`** for a version you intend to submit to the n8n Creator Portal — that flag publishes directly from your machine without a provenance attestation, and n8n's verification review rejects non-provenance versions outright. Only use it, if ever, to reserve a brand-new package name before Trusted Publishing is configured.

## Re-checking a Creator Portal submission

The Creator Portal only re-runs its automated checks against a version number it hasn't seen before — re-clicking "run checks" against the same version that already failed does nothing. If you fix an issue, cut a new patch release (`npm run release`) and submit that new version number, not the old one.

## Running `npx @n8n/scan-community-package` on Windows

On native Windows PowerShell it works out of the box. In Git Bash it fails with `tar extraction failed`, because Git Bash's own MSYS2 `tar` (`Git\usr\bin\tar.exe`) can't parse the Windows-style path the scanner passes to it via `cmd.exe`. Workaround: put a `tar` on `PATH` ahead of it that resolves to the native `C:\Windows\System32\tar.exe`, e.g. a directory containing only a symlink to it — don't just prepend all of `System32`, since that also shadows Git Bash's `bash` with the WSL launcher stub and breaks `npx` itself.
