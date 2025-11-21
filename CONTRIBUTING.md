## Contribution Guidelines

- Use Conventional Commit style in Pull Request titles (e.g. `feat(settings): add theme selector`).
- When merging, prefer a merge commit or conventional PR title that communicates the change type. The repository uses `standard-version` to generate changelogs and version bumps.
- For breaking changes include `BREAKING CHANGE:` in the PR description or use `BREAKING CHANGE` in the title to trigger a major release.
# Contributing to Growth Journal

Thanks for your interest in improving the Growth Journal project! This document outlines a minimal contribution workflow so changes can be reviewed and merged cleanly.

How to contribute

1. Fork the repository on GitHub and clone your fork.

2. Create a feature branch from `main`:

```bash
git checkout -b feat/your-feature-name
```

3. Run the app and add your changes locally. Use the existing lint/format scripts:

```bash
npm install
npm run dev
npm run lint
npm run format
```

4. Add tests for new functionality where applicable.

5. Commit with a clear message and push your branch.

6. Open a Pull Request against `main` and describe the changes. Include screenshots or example usage when relevant.

Code style

- The project uses Prettier and ESLint. Run `npm run format` and `npm run lint --fix` before committing.
- Keep changes focused and atomic. If a change touches many files, split it into smaller PRs when possible.

Review & merge

- PRs should include a short description, testing notes, and any migration steps (if relevant).
- If your change is large or risky, mark it as a Draft PR and request review from the repository owner.

Thanks — and happy hacking!
