# AGENTS.md — SocialResearcher

Standard agent context for OpenAI Codex and other AI coding assistants.

---

## Setup

```bash
# Prerequisites: Node 20+, Docker, PostgreSQL client
git clone https://github.com/joshiujjwal/social-researcher.git
cd social-researcher
npm install
cd client && npm install && cd ..
cp .env.example .env
# Edit .env with your keys (see .env.example for all required vars)
docker compose up -d          # starts Postgres + Redis
npx prisma migrate dev        # apply schema migrations
npm run dev                   # starts API (:3001) + client (:5173)
```

---

## Running Tests

```bash
npm test                      # all tests
npm run test:api              # unit + integration (API only)
npm run test:client           # unit tests (React components + hooks)
npm run test:e2e              # Playwright e2e (app must be running)
npm run test:watch            # watch mode during development
```

**Red/Green TDD is mandatory:**
1. Write the test first — confirm it FAILS
2. Implement the feature — confirm it PASSES
3. Refactor if needed — confirm it stays GREEN
4. Never commit red tests

---

## Code Style

### TypeScript (strict)
- `"strict": true` in all tsconfig files — no exceptions
- No `any` — use `unknown` for untyped external data, then narrow with Zod or type guards
- Prefer `type` over `interface` for data shapes; use `interface` only for OOP contracts
- Named exports only — no default exports (makes renaming and imports predictable)
- Import order: Node built-ins → third-party → internal (enforced by ESLint)

### Naming
- Files: `camelCase.ts` for utilities, `PascalCase.tsx` for React components
- Services/utils: functions exported individually, not as class instances
- DB models: PascalCase (Prisma convention), API responses: camelCase
- Test files: `*.test.ts` for unit, `*.integration.test.ts` for integration, `*.spec.ts` for e2e

### React
- Functional components only — no class components
- All state management via React hooks (no Redux/Zustand for MVP)
- TailwindCSS for all styling — no inline styles, no CSS modules
- `react-query` (TanStack Query) for all data fetching + caching in client

### API
- Express router per resource: `src/api/research.ts`, `src/api/sources.ts`
- All route handlers: `async (req, res, next) => {}` — always call `next(err)` on error
- Zod schemas defined alongside routes in `src/api/schemas/`
- HTTP status codes: 200 (ok), 201 (created), 400 (bad request), 401 (unauth), 422 (validation), 429 (rate limit), 500 (server error)

---

## Testing Instructions

### Unit Tests (Vitest)
- Location: `tests/unit/` for API, `client/src/**/*.test.tsx` for React
- Mock HTTP: use `vi.mock` + `msw` for fetch mocking in React, `vi.spyOn` + manual mocks for node-fetch/axios
- Assertion style: `expect(result).toEqual(...)` — avoid `.toBe` for objects
- Each test file: one `describe` block matching the module name, multiple `it` blocks

### Integration Tests (Supertest)
- Location: `tests/integration/`
- Spin up Express app without listening, use `supertest(app)`
- Use a real test database (`DATABASE_URL_TEST` env var) — reset between test suites with `prisma.$executeRaw`
- Mock only external APIs (OpenAI, Reddit, Twitter) — use real DB

### E2E Tests (Playwright)
- Location: `tests/e2e/`
- Use `page.waitForSelector` not arbitrary `waitForTimeout`
- Store fixtures in `tests/e2e/fixtures/`
- Run against `http://localhost:5173` (dev) or `BASE_URL` env var (CI/staging)

---

## PR Instructions

Every PR must include:
1. **What changed**: one-line description of the change
2. **Evidence**: one of:
   - Test output (`npm test` passing screenshot or copy-paste)
   - `curl` command + response for API changes
   - Screenshot for UI changes
3. **How to test**: steps for reviewer to manually verify

PR rules:
- One feature or fix per PR — no bundled changes
- All CI checks must pass before merge (lint, typecheck, tests)
- Link the TODO.md task being completed in the PR description
- Reviewer must be a human — do not merge AI-only PRs without review

---

## Architecture Decisions

See `docs/adr/` for full records. Key decisions:

| Decision | Choice | Reason |
|---|---|---|
| ORM | Prisma | Type-safe, migration tooling, excellent TS codegen |
| Job queue | BullMQ | Redis-backed, reliable, good observability |
| Auth | Clerk | Handles OAuth + JWT complexity, good React SDK |
| AI | GPT-4o | Best instruction-following for structured JSON output |
| Validation | Zod | Runtime + compile-time type safety from one schema |
| LinkedIn data | SerpAPI | Official LinkedIn API too restrictive for this use case |

---

## Environment Variables Reference

See `.env.example` for the full list. Critical ones:

```
DATABASE_URL              PostgreSQL connection string
DATABASE_URL_TEST         Separate DB for tests
REDIS_URL                 Redis connection string
OPENAI_API_KEY            GPT-4o access
REDDIT_CLIENT_ID          Reddit OAuth app
REDDIT_CLIENT_SECRET      Reddit OAuth app
TWITTER_BEARER_TOKEN      Twitter API v2 Bearer Token
SERPAPI_KEY               SerpAPI key (LinkedIn + fallback search)
CLERK_SECRET_KEY          Clerk backend secret
CLERK_PUBLISHABLE_KEY     Clerk frontend key (exposed to client)
```
