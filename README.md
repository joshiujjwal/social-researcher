# SocialResearcher

> 🚧 **Status: Early Development**

**Aggregate and synthesize social media discussions on any topic — get a structured summary of what the internet thinks.**

SocialResearcher queries Reddit, Twitter/X, LinkedIn, and HackerNews simultaneously, then uses GPT-4o to synthesize the raw results into a structured intelligence report: consensus views, dissenting opinions, key people, trending threads, and sentiment breakdown.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS |
| Backend API | Node.js + Express + TypeScript |
| Database | PostgreSQL 16 (via Prisma ORM) |
| AI Synthesis | OpenAI GPT-4o |
| Social Sources | Reddit API, Twitter/X API v2, HackerNews Algolia, LinkedIn scraping |
| Queue | BullMQ + Redis (async research jobs) |
| Auth | Clerk (JWT-based) |
| Testing | Vitest (unit), Supertest (integration), Playwright (e2e) |
| Deployment | Docker Compose (dev), Railway / Render (prod) |

---

## Getting Started

```bash
# 1. Clone
git clone https://github.com/joshiujjwal/social-researcher.git
cd social-researcher

# 2. Install dependencies
npm install
cd client && npm install && cd ..

# 3. Environment
cp .env.example .env
# Fill in: DATABASE_URL, OPENAI_API_KEY, REDDIT_CLIENT_ID/SECRET,
#          TWITTER_BEARER_TOKEN, CLERK_SECRET_KEY, REDIS_URL

# 4. Database setup
npx prisma migrate dev

# 5. Start dev (API + client in parallel)
npm run dev

# 6. Run tests
npm test
```

---

## Project Structure

```
social-researcher/
├── src/                          # Node.js API server (Express + TypeScript)
│   ├── api/                      # Route handlers (research, sources, auth)
│   ├── services/                 # Business logic (aggregator, synthesizer, fetchers)
│   ├── db/                       # Prisma client + seed scripts
│   ├── utils/                    # Shared helpers (rate limiter, logger, retry)
│   └── types/                    # Shared TypeScript interfaces
├── client/                       # React frontend (Vite)
│   └── src/
│       ├── components/           # UI components (SearchBar, ReportCard, SourceList)
│       ├── hooks/                # Custom React hooks (useResearch, usePolling)
│       ├── pages/                # Route-level components (Home, Report, History)
│       └── lib/                  # API client, auth helpers
├── tests/
│   ├── unit/                     # Service-level unit tests
│   ├── integration/              # API route integration tests
│   └── e2e/                      # Playwright end-to-end flows
├── docs/
│   ├── spec.md                   # Feature specification
│   └── adr/                      # Architecture Decision Records
├── .github/
│   ├── copilot-instructions.md
│   └── workflows/                # CI (lint, test, build)
├── prisma/
│   └── schema.prisma             # Database schema
├── CLAUDE.md                     # AI agent context (Anthropic)
├── AGENTS.md                     # AI agent context (OpenAI Codex)
├── TODO.md                       # Evidence-gated task breakdown
└── docker-compose.yml            # Local dev (postgres + redis)
```

---

## Contributing

1. **Read `TODO.md` first** — pick the next unchecked task
2. **Write failing tests before any implementation** (red phase)
3. **Implement only enough to make tests pass** (green phase)
4. **Review your own diff** before committing
5. **PRs must include evidence**: test output, screenshots, or curl results
6. **Small PRs** — one feature or fix per PR
7. Update `CLAUDE.md` / `AGENTS.md` if you discover a non-obvious convention

> ⚠️ Never commit API keys. Never skip tests. Never merge red CI.
