# SocialResearcher — Task Breakdown

## How to Use This File

Work one task at a time. For every task:
1. **Write tests FIRST** (red phase — tests must fail before you write code)
2. **Implement until tests pass** (green phase)
3. **Review your diff** manually — read every line
4. **Commit** with a descriptive message referencing this task
5. **Update CLAUDE.md / AGENTS.md** if you discovered something non-obvious (compound learning loop)
6. **Check the box** and move to the next task

Evidence gates marked 🔒 require passing tests + human review before the next phase begins.

---

## Phase 0: Foundation ⬜

- [ ] `npm init` with workspaces (`/` for API, `/client` for React)
- [ ] TypeScript config (`tsconfig.json`) for both API and client — strict mode on
- [ ] ESLint + Prettier — enforce no-any, consistent imports
- [ ] Vitest for API unit tests + React Testing Library for client
- [ ] Supertest for integration tests
- [ ] Playwright for e2e (basic smoke test: app loads)
- [ ] `docker-compose.yml` — PostgreSQL 16 + Redis 7
- [ ] Prisma init — connect to local Postgres
- [ ] `.env.example` with all required keys documented
- [ ] GitHub Actions CI: `lint → test → build` on every PR
- [ ] `npm run dev` starts both API (port 3001) and client (port 5173) in parallel
- [ ] 🔒 **Gate**: CI green, smoke test passes, `docker compose up` works

---

## Phase 1: Data Models & Database ⬜

- [ ] Prisma schema: `ResearchJob` (id, topic, status, createdAt, userId)
- [ ] Prisma schema: `SourceResult` (id, jobId, source, url, title, content, score, fetchedAt)
- [ ] Prisma schema: `SynthesisReport` (id, jobId, consensus, dissent, sentiment, keyPeople, trendingThreads, rawJson, generatedAt)
- [ ] Prisma schema: `User` (id, clerkId, email, createdAt, quota fields)
- [ ] Migration: `prisma migrate dev --name init`
- [ ] Unit tests: Prisma client CRUD for each model (use test DB)
- [ ] Seed script: create 1 test user + 1 sample report for local dev
- [ ] 🔒 **Gate**: All DB unit tests green, `prisma studio` shows correct schema

---

## Phase 2: Social Data Fetchers ⬜

Each fetcher must: handle rate limits gracefully, return normalized `SourceResult` shape, have unit tests with mocked HTTP, never throw uncaught errors.

- [ ] **Reddit fetcher** (`src/services/fetchers/reddit.ts`)
  - [ ] OAuth2 client credentials flow
  - [ ] Search endpoint: `/search.json?q=<topic>&sort=relevance&limit=25`
  - [ ] Normalize: title, selftext, score, url, subreddit, created_utc
  - [ ] Unit tests: mock axios, assert normalized shape, test rate-limit retry
- [ ] **HackerNews fetcher** (`src/services/fetchers/hackernews.ts`)
  - [ ] Use Algolia HN API: `http://hn.algolia.com/api/v1/search?query=<topic>`
  - [ ] Normalize: title, story_text/comment_text, points, url, created_at
  - [ ] Unit tests: mock fetch, assert normalization
- [ ] **Twitter/X fetcher** (`src/services/fetchers/twitter.ts`)
  - [ ] Bearer token auth, Recent Search API v2
  - [ ] Normalize: text, public_metrics (likes, retweets), author_id, created_at
  - [ ] Handle 429 with exponential backoff
  - [ ] Unit tests: mock API, test backoff logic
- [ ] **LinkedIn fetcher** (`src/services/fetchers/linkedin.ts`)
  - [ ] Note: official API limited — use SERP-based approach (SerpAPI or Apify)
  - [ ] Normalize posts: title, snippet, url, date
  - [ ] Unit tests: mock SERP response
- [ ] **Aggregator service** (`src/services/aggregator.ts`)
  - [ ] Fan-out: runs all fetchers in parallel with `Promise.allSettled`
  - [ ] Collects results + errors per source (partial failure is OK)
  - [ ] Deduplicates by URL
  - [ ] Unit tests: mock all fetchers, assert dedup, assert partial failure handling
- [ ] 🔒 **Gate**: All fetcher + aggregator tests green; manual test each fetcher against live API with a known topic

---

## Phase 3: AI Synthesis ⬜

- [ ] **Synthesizer service** (`src/services/synthesizer.ts`)
  - [ ] Accepts array of normalized `SourceResult[]` + topic string
  - [ ] Builds structured prompt (see `docs/spec.md` for prompt schema)
  - [ ] Calls GPT-4o with `response_format: { type: "json_object" }`
  - [ ] Parses + validates output against `SynthesisReport` Zod schema
  - [ ] Unit tests: mock OpenAI client, assert Zod validation, test empty input edge case
- [ ] **Prompt engineering** (`src/utils/prompts.ts`)
  - [ ] System prompt: instructs GPT-4o to act as a neutral analyst
  - [ ] User prompt template: injects topic + source snippets (truncated to token budget)
  - [ ] Token budget calculator: keeps total under 120k tokens
  - [ ] Unit tests: assert truncation logic, assert prompt structure
- [ ] **Job queue** (`src/services/queue.ts`)
  - [ ] BullMQ worker: receives `{ jobId, topic }`, runs aggregator → synthesizer → saves to DB
  - [ ] Job status transitions: `pending → running → complete | failed`
  - [ ] Retry: 3 attempts with exponential backoff on failure
  - [ ] Unit tests: mock queue, assert status transitions
- [ ] 🔒 **Gate**: End-to-end synthesis test with real APIs for topic "TypeScript vs Go 2024" — saved report reviewed manually

---

## Phase 4: REST API ⬜

- [ ] `POST /api/research` — create a job, enqueue it, return `{ jobId }`
- [ ] `GET /api/research/:jobId` — poll job status + return report when complete
- [ ] `GET /api/research` — list user's past research jobs (paginated)
- [ ] `DELETE /api/research/:jobId` — soft delete
- [ ] `GET /api/sources` — list available/configured social sources
- [ ] Auth middleware: Clerk JWT validation on all routes
- [ ] Rate limiting middleware: 10 research jobs/hour per user
- [ ] Input validation: Zod schemas for all request bodies
- [ ] Error handling: structured `{ error, code, details }` responses
- [ ] Integration tests (Supertest): all routes, auth edge cases, validation failures
- [ ] 🔒 **Gate**: All integration tests green; manual curl tests documented in `docs/api-test-evidence.md`

---

## Phase 5: React Frontend ⬜

- [ ] Vite + React 18 + TypeScript + TailwindCSS setup in `/client`
- [ ] Clerk auth: `<SignIn>`, `<SignUp>`, protected routes
- [ ] **SearchBar component**: topic input, source toggles (Reddit/HN/Twitter/LinkedIn), submit button
  - [ ] Unit test: renders, fires submit with correct payload
- [ ] **ResearchJob polling hook** (`useResearch.ts`): polls `GET /api/research/:jobId` every 2s until complete
  - [ ] Unit test: mock fetch, assert polling stops on complete/failed
- [ ] **ReportCard component**: renders structured synthesis report (consensus, dissent, sentiment badge, source list)
  - [ ] Unit test: snapshot test, renders all sections
- [ ] **SourceList component**: shows per-source results with links, scores, expandable snippets
- [ ] **History page**: paginated list of past research jobs
- [ ] **Home page**: SearchBar + recent jobs
- [ ] **Report page**: full ReportCard + SourceList for a specific job
- [ ] Loading states: skeleton loaders while polling
- [ ] Error states: retry button on fetch failure
- [ ] 🔒 **Gate**: Playwright e2e: submit topic → wait for report → assert report sections render

---

## Phase 6: Polish & Harden ⬜

- [ ] Export report as Markdown (download button)
- [ ] Export report as PDF (client-side, `react-pdf` or browser print)
- [ ] Source freshness: show how old each result is
- [ ] Topic history: auto-suggest from user's past queries
- [ ] OpenAI cost tracking: store token usage per job in DB
- [ ] Quota enforcement: free tier = 5 jobs/day, display usage meter in UI
- [ ] Structured logging: `pino` logger with `requestId` on all API logs
- [ ] Health check endpoint: `GET /health` — checks DB + Redis + OpenAI connectivity
- [ ] Add Sentry error tracking (API + client)
- [ ] Performance: cache synthesis reports for identical topics within 1 hour (Redis)
- [ ] 🔒 **Gate**: Load test with k6 (10 concurrent users, 50 requests) — p95 < 5s for cached, p95 < 30s for fresh

---

## Phase 7: Ship ⬜

- [ ] `Dockerfile` for API — multi-stage build, non-root user
- [ ] `Dockerfile` for client — Nginx serving static build
- [ ] `docker-compose.prod.yml` — production compose with env injection
- [ ] Railway / Render deployment config
- [ ] `prisma migrate deploy` in CI on merge to `main`
- [ ] Secrets: all keys in Railway/Render env vars, never in repo
- [ ] README: update Getting Started with live demo URL
- [ ] 🔒 **Gate**: Deployed app accessible at public URL, e2e Playwright runs against production URL

---

## Parking Lot 🅿️

> Ideas to revisit later — not in scope for MVP

- Discord / Slack channel search
- YouTube comment aggregation
- Browser extension to trigger research from any page
- Webhook: notify via Slack/email when research job completes
- Collaborative reports (share + annotate with team)
- Scheduled research (run topic every day, track sentiment over time)
- Self-hosted LLM option (Ollama / Llama 3)

---

## Lessons Learned 📝

> Update this section whenever you discover a non-obvious convention, a gotcha, or a decision that future agents need to know. This is the compound engineering loop.

- _[add entries here as you work]_
