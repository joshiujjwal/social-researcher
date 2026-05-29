# GitHub Copilot Instructions — SocialResearcher

## Project Overview
TypeScript monorepo: Node.js/Express API (`/src`) + React 18/Vite client (`/client`).
Aggregates social media data (Reddit, HackerNews, Twitter/X, LinkedIn) and synthesizes it with GPT-4o.

## Stack
- **Language**: TypeScript (strict mode, no `any`)
- **API**: Node.js + Express 5 + Prisma ORM + BullMQ + Redis
- **Client**: React 18 + Vite + TailwindCSS + TanStack Query
- **Database**: PostgreSQL 16 via Prisma
- **AI**: OpenAI GPT-4o via `openai` npm package
- **Auth**: Clerk
- **Validation**: Zod (everywhere external data enters the system)
- **Testing**: Vitest + React Testing Library + Supertest + Playwright

## Coding Conventions

### TypeScript
- Strict mode always — never add `// @ts-ignore` or cast to `any`
- Use Zod schemas as the single source of truth for data shapes — infer TypeScript types from them: `type Foo = z.infer<typeof FooSchema>`
- All service functions return `Promise<{ data: T } | { error: AppError }>` — never throw from service layer
- Named exports only — no `export default`

### API (Express)
- Route handlers live in `src/api/` — they only validate input (Zod), call services, and return responses
- Services live in `src/services/` — all business logic here, no Express types allowed
- Every external API call must be wrapped in the `retry()` utility with exponential backoff
- Logger: `import { logger } from '../utils/logger'` — use `logger.info/warn/error` with structured objects, never `console.log`

### React
- No class components — functional only
- All API calls via TanStack Query (`useQuery`/`useMutation`) — no raw `fetch()` in components
- All styling via Tailwind utility classes — no CSS files, no inline styles
- Custom hooks in `client/src/hooks/` — keep components thin

### Database
- Single Prisma client instance: `import { db } from '../db/client'`
- Multi-step writes use `db.$transaction([...])`
- Never expose Prisma-specific error types in API responses — catch and re-throw as `AppError`

## Testing Conventions
- **Write the test before the implementation** — this is non-negotiable
- Test file naming: `foo.test.ts` (unit), `foo.integration.test.ts` (integration), `foo.spec.ts` (e2e)
- Mock all external HTTP in tests: `vi.mock` or MSW (Mock Service Worker in React tests)
- Use `describe` + `it` structure — one describe per module/component

## Boundaries — Things Copilot Must NOT Do
- Do not refactor code that wasn't asked about
- Do not remove or skip existing tests — if a test is failing, fix the code not the test
- Do not add `eslint-disable` comments without explicit user request
- Do not suggest `any` as a type — always suggest the correct type or `unknown`
- Do not use `console.log` — always suggest `logger`
- Do not commit `.env` files or hardcode secrets
- Do not use `Promise.all` where `Promise.allSettled` is more appropriate (fan-out to external APIs always uses `allSettled`)
- Do not mutate function parameters
- Do not suggest class-based React components

## Common Patterns

### Zod + Type Inference Pattern
```typescript
import { z } from 'zod'

export const SourceResultSchema = z.object({
  id: z.string().uuid(),
  source: z.enum(['reddit', 'hackernews', 'twitter', 'linkedin']),
  url: z.string().url(),
  title: z.string(),
  content: z.string().max(2000),
  score: z.number().int().nonnegative(),
})
export type SourceResult = z.infer<typeof SourceResultSchema>
```

### Result Type Pattern (no throwing in services)
```typescript
type Result<T> = { ok: true; data: T } | { ok: false; error: string }

async function fetchReddit(topic: string): Promise<Result<SourceResult[]>> {
  try {
    // ...
    return { ok: true, data: results }
  } catch (err) {
    return { ok: false, error: `Reddit fetch failed: ${String(err)}` }
  }
}
```

### BullMQ Worker Pattern
```typescript
const worker = new Worker('research', async (job) => {
  const { jobId, topic } = job.data
  logger.info({ jobId, step: 'start' }, 'Research job started')
  // ... update status, aggregate, synthesize, save
  logger.info({ jobId, step: 'complete' }, 'Research job complete')
}, { connection: redis })
```
