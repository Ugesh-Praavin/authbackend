<div align="center">
  <h1>Contributing to Auth Backend</h1>
  <p>Thank you for helping build a secure, developer-friendly identity layer.</p>
</div>

## Local Setup

1. Install prerequisites: Node.js 20+, npm 10+, Docker (optional), PostgreSQL 15+, Redis 5+.
2. Fork the repository, then clone your fork.
3. Run `npm install`.
4. Copy `.env.example` to `.env` and update secrets (see README).
5. Start dependencies locally (`docker compose up -d` or your own services).
6. Run `npx prisma migrate dev` to apply migrations.
7. Run `npm run start:dev` and `npm run test` to ensure everything passes before you begin coding.

## Branching Strategy

- `main` always reflects the latest stable release.
- Create feature branches off `main` using the pattern `feature/<summary>` or `fix/<summary>`.
- Rebase frequently to keep your branch up to date and avoid large merge conflicts.

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) so automation can infer versions and changelog entries.

```
<type>(optional scope): <short description>

[optional body]
[optional footer(s)]
```

Common types: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `perf`, `build`.

## Pull Request Guidelines

- Fill in the PR template with context, screenshots (if UI), and testing notes.
- Ensure `npm run lint`, `npm run test`, and `npm run test:e2e` pass locally.
- Include migration rationale when Prisma schema changes.
- Keep PRs focused; multiple unrelated changes should be submitted separately.
- Request at least one review; do not self-merge.

## Coding Standards

- TypeScript strict mode; no implicit `any`.
- Use NestJS providers, guards, and modules to keep logic testable.
- Prefer functional DTOs with `class-validator` + `class-transformer`.
- Store secrets in environment variables, never in source control.
- Follow ESLint + Prettier defaults (`npm run lint` will autofix many issues).

## Issue Reporting Template

When opening an issue, please include:

```
### Summary
A clear description of the problem or feature request.

### Steps to Reproduce
1. ...
2. ...

### Expected vs Actual
What you expected to happen vs what actually happened.

### Environment
- OS:
- Node.js version:
- Database & cache versions:

### Additional Context
Logs, stack traces, screenshots, or related discussions.
```

## Security Policy

- Never disclose vulnerabilities publicly before coordinating a fix.
- Email `security@ugesh.dev` with steps to reproduce and any proof-of-concept.
- You will receive acknowledgment within 72 hours and coordinated disclosure details.

