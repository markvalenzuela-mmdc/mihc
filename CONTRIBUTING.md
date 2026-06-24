# Contributing

## Git Commit Standard

This repository uses Conventional Commits for commit messages.

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Commit Types

Use the type that best describes the change:

| Type | Use for |
| --- | --- |
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation-only changes |
| `style` | Formatting or style changes with no behavior change |
| `refactor` | Code restructuring with no feature or bug fix |
| `perf` | Performance improvements |
| `test` | Adding or updating tests |
| `build` | Build system or dependency changes |
| `ci` | CI configuration changes |
| `chore` | Maintenance tasks |
| `revert` | Reverting a previous commit |

## Message Rules

- Keep each commit focused on one logical change.
- Write the description in imperative, present tense: `add`, not `added` or `adds`.
- Keep the subject line under 72 characters when possible.
- Add a scope when it clarifies the affected area, such as `docs`, `nextjs`, `playwright`, or `docker`.
- Use a body when the why or tradeoff is not obvious from the subject.
- Reference issues in the footer when relevant, such as `Closes #123` or `Refs #456`.

## Examples

```text
docs: add contributing guide
```

```text
feat(nextjs): add account settings page
```

```text
fix(playwright): wait for dashboard data before asserting
```

```text
build(docker): update compose service names
```

## Breaking Changes

Mark breaking changes with `!` after the type or scope:

```text
feat!: remove legacy authentication flow
```

Or include a `BREAKING CHANGE` footer:

```text
feat(nextjs): require signed session cookies

BREAKING CHANGE: unsigned session cookies are no longer accepted.
```

## Before Committing

- Review `git diff` so only intentional changes are included.
- Do not commit secrets, credentials, private keys, or local environment files.
- Stage only the files that belong to the logical change.
- Let hooks run normally; do not bypass them unless explicitly required.
