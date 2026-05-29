# CLAUDE.md — SocialResearcher

This file gives AI agents the context needed to pick up work without asking questions.
Keep it under 200 lines. Update it when you discover something non-obvious.

---

## Project in One Sentence

TypeScript monorepo — Node.js/Express API (`/src`) + React/Vite client (`/client`) — that fans out to social APIs, synthesizes results with GPT-4o, and returns a structured research report.

---

## Commands

```bash
# Start everything (API on :3001, client on :5173)
npm run dev

# API only
npm run dev:api

# Client only
npm run dev:client

# All tests
npm test

# API unit + integration tests only
npm run test:api

# Client tests only (Vitest + React Testing Library)
npm run test:client

# E2E tests (Playwright — requires app running)
npm run test:e2e

# Lint (ESLint + Prettier check)
npm run lint

# Type check (no emit)
npm run typecheck

# Build for production
npm run build

# Database: apply migrations
npx prisma migrate dev

# Database: open Prisma Studio (GUI)
npx prisma studio

# Database: regenerate client after schema change
npx prisma generate

# Start local infra (Postgres + Redis)
docker compose up -d
```

---

## Directory Map

```
src/
  api/            Route handlers only — no business logic here
  services/
    fetchers/     One file per source: reddit.ts, hackernews.ts, twitter.ts, linkedin.ts
    aggregator.ts Fan-out + dedup across all fetchers
    synthesizer.ts OpenAI call + Zod validation of report
    queue.ts      BullMQ worker — orchestrates aggregator → synthesizer → DB save
  db/             Prisma client singleton (db/client.ts), seed script
  utils/
    prompts.ts    GPT-4o prompt builder + token budget calculator
    rateLimiter.ts Express middleware
    retry.ts      Exponential backoff helper
    logger.ts     Pino logger with requestId
  types/
    index.ts      Shared TypeScript interfaces (SourceResult, SynthesisReport, etc.)

client/src/
  components/     Dumb UI components — no data fetching
  hooks/          useResearch.ts (polling), useHistory.ts
  pages/          Home.tsx, Report.tsx, History.tsx
  lib/
    api.ts        Typed fetch wrapper for all API calls
    auth.ts       Clerk helpers
```

---

## Key Conventions

### TypeScript
- Strict mode on everywhere — no `any`, ever
- Prefer `unknown` over `any` in catch blocks
- All async functions return `Promise<Result<T, E>>` (custom Result type) — no throwing in service layer
- Zod for all external data validation (API inputs, OpenAI responses, fetcher responses)

### API Layer
- Route handlers call services, handle errors, return HTTP responses — nothing else
- All responses: `{ data: T }` on success, `{ error: string, code: string, details?: unknown }` on failure
- Request IDs injected by middleware, logged on every request

### Database
- All DB access goes through `src/db/client.ts` — never instantiate PrismaClient elsewhere
- Use transactions for multi-table writes (job + results + report = one transaction)
- Never expose raw Prisma errors to API responses — map to structured error codes

### Testing
- **Always write tests before implementation** — run `npm test` first, confirm the test fails, then implement
- Mock external HTTP calls — never hit live APIs in unit or integration tests
- Test files co-located is fine for client; `tests/` tree mirrors `src/` for API
- Use `vitest` `describe`/`it` blocks — no plain `test()` at top level

### Environment
- All secrets via `.env` (gitignored) — `.env.example` is the source of truth for required vars
- Never `console.log` in production code — use `logger.info/warn/error`
- `NODE_ENV=test` sets DB to test database (`DATABASE_URL_TEST`)

### BullMQ / Redis
- Jobs are fire-and-forget from the API layer — API returns `jobId`, worker does the rest
- Job data stored in Redis is minimal (just `{ jobId, topic, userId }`) — full results go to Postgres
- Worker logs every step with `jobId` in context

---

## Workflow for AI Agents

1. **Read `TODO.md`** — find the next unchecked task in the lowest-numbered phase
2. **Run `npm test`** — confirm existing tests are green before touching anything
3. **Write failing tests** for the task (red phase)
4. **Run `npm test`** again — confirm the new tests fail for the right reason
5. **Implement** until tests pass (green phase)
6. **Run `npm run lint && npm run typecheck`** — must be clean
7. **Commit** with a descriptive message
8. **Update this file** if you learned something non-obvious
9. **Check the box** in TODO.md

---

## Common Gotchas

- Reddit OAuth uses `client_credentials` flow — the access token expires in 1 hour; the fetcher must refresh it
- Twitter v2 Recent Search only returns last 7 days; the `start_time` param must be ISO 8601
- HackerNews Algolia API is unauthenticated but rate-limited at ~10k req/hour — no auth needed
- OpenAI `json_object` response format requires the word "JSON" to appear in the prompt — already handled in `utils/prompts.ts`
- Prisma: running `prisma generate` is required after every schema change — CI does this automatically
- BullMQ requires Redis 6.2+ — the `docker-compose.yml` pins to `redis:7`
- Clerk: `getAuth()` returns null if token is expired — treat as 401, don't crash
