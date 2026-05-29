# SocialResearcher — Feature Specification

_Last updated: 2025-07 | Status: Draft_

---

## 1. Overview

### Problem Statement

Researching what people think about a topic across social media is time-consuming and fragmented. A developer trying to understand "what does the community think about Bun vs Node?" must manually check Reddit, HackerNews, Twitter, and LinkedIn — reading through noise to find signal. This takes 30–60 minutes and produces no structured output.

### Solution

SocialResearcher takes a topic query, fans out to multiple social APIs simultaneously, and feeds the results to GPT-4o which produces a structured intelligence report in under 60 seconds. The report surfaces:
- **Consensus**: what most people agree on
- **Dissent**: notable counter-arguments
- **Sentiment**: positive / neutral / negative breakdown with score
- **Key people**: influential voices in the discussion
- **Trending threads**: most-engaged discussions with links
- **Source breakdown**: per-platform result counts and quality scores

---

## 2. Functional Requirements

### Research Job Lifecycle
- [ ] User submits a topic string (3–500 chars) + optional source selection
- [ ] System creates a `ResearchJob` and returns a `jobId` immediately (async)
- [ ] Job fans out to all enabled sources in parallel
- [ ] Results are deduplicated by URL and normalized to a common schema
- [ ] Normalized results are fed to GPT-4o for synthesis
- [ ] Completed `SynthesisReport` is saved to DB and made available via polling
- [ ] Job transitions: `pending → running → complete` or `pending → running → failed`
- [ ] Failed jobs surface per-source errors (e.g., "Twitter rate limited")

### Social Source Requirements
- [ ] **Reddit**: search posts + top comments, sort by relevance + recency, configurable subreddit filter
- [ ] **HackerNews**: search stories + Ask HN threads via Algolia API
- [ ] **Twitter/X**: recent search (last 7 days), English language filter, min 5 likes filter
- [ ] **LinkedIn**: public post search via SERP (SerpAPI), best-effort (may have gaps)
- [ ] Each source is independently togglable per job
- [ ] Source failures are non-fatal — report includes available sources only

### Synthesis Report Requirements
- [ ] Report generated with GPT-4o, structured as JSON, validated with Zod
- [ ] Required fields: `consensus`, `dissent`, `sentiment`, `keyPeople`, `trendingThreads`, `sourceBreakdown`, `generatedAt`
- [ ] Sentiment: `{ score: -1.0 to 1.0, label: "positive"|"neutral"|"negative", breakdown: { positive: %, neutral: %, negative: % } }`
- [ ] Token budget: source content truncated to fit within 120k context window
- [ ] Report cached in Redis for 1 hour for identical topic + source combos
- [ ] Exportable as Markdown and PDF

### User & Quota
- [ ] Auth via Clerk (Google OAuth + email/password)
- [ ] Free tier: 5 research jobs/day, results retained 30 days
- [ ] Paid tier: 100 jobs/day, results retained indefinitely, PDF export
- [ ] Per-user rate limit: max 10 jobs/hour (enforced server-side)

---

## 3. Non-Functional Requirements

- [ ] Job completion (fresh): p95 < 30 seconds
- [ ] Job completion (cached): p95 < 500ms
- [ ] API availability: 99.5% uptime
- [ ] Source data freshness: prefer results < 90 days old
- [ ] Zero API keys in source code or git history
- [ ] All user data deletable on account deletion (GDPR)
- [ ] Mobile-responsive UI (320px minimum)

---

## 4. Data Models

### `ResearchJob`
```typescript
{
  id: string;               // UUID
  userId: string;           // FK → User.id
  topic: string;            // The search query
  sources: SourceType[];    // ["reddit", "hackernews", "twitter", "linkedin"]
  status: "pending" | "running" | "complete" | "failed";
  error?: string;           // Top-level error message if failed
  tokenUsage?: number;      // OpenAI tokens consumed
  createdAt: Date;
  updatedAt: Date;
}
```

### `SourceResult`
```typescript
{
  id: string;
  jobId: string;            // FK → ResearchJob.id
  source: SourceType;       // "reddit" | "hackernews" | "twitter" | "linkedin"
  url: string;              // Unique — used for dedup
  title: string;
  content: string;          // Truncated body text (max 2000 chars)
  score: number;            // Platform engagement score (upvotes/likes/points)
  author?: string;
  publishedAt?: Date;
  fetchedAt: Date;
}
```

### `SynthesisReport`
```typescript
{
  id: string;
  jobId: string;
  consensus: string;        // 1–3 paragraph summary of majority view
  dissent: string;          // 1–2 paragraph summary of counter-arguments
  sentiment: {
    score: number;          // -1.0 (very negative) to 1.0 (very positive)
    label: "positive" | "neutral" | "negative";
    breakdown: { positive: number; neutral: number; negative: number };
  };
  keyPeople: Array<{ name: string; handle?: string; platform: string; reason: string }>;
  trendingThreads: Array<{ title: string; url: string; platform: string; engagement: number }>;
  sourceBreakdown: Record<SourceType, { count: number; avgScore: number }>;
  rawJson: string;          // Full GPT-4o response stored as-is for debugging
  generatedAt: Date;
}
```

---

## 5. API Interface

```
POST   /api/research               Create + enqueue a research job
GET    /api/research/:jobId        Get job status + report (poll this)
GET    /api/research               List user's jobs (paginated, newest first)
DELETE /api/research/:jobId        Soft-delete a job + its results

GET    /api/sources                List available sources + config status
GET    /api/health                 Health check (DB, Redis, OpenAI ping)
```

### POST /api/research Request Body
```typescript
{
  topic: string;              // required, 3–500 chars
  sources?: SourceType[];     // optional, defaults to all enabled
}
```

### GET /api/research/:jobId Response
```typescript
{
  job: ResearchJob;
  results?: SourceResult[];   // present when status = "complete"
  report?: SynthesisReport;   // present when status = "complete"
}
```

---

## 6. GPT-4o Prompt Schema

### System Prompt
```
You are a neutral, evidence-based research analyst. You receive a collection of 
social media posts and discussions about a topic. Your job is to synthesize them 
into a structured intelligence report. Be objective. Cite specific evidence from 
the sources. Do not inject your own opinions.
```

### User Prompt Template
```
Topic: {{topic}}

Sources ({{count}} results from {{platforms}}):
{{truncatedSourceContent}}

Respond with a JSON object matching this exact schema:
{
  "consensus": "string (1-3 paragraphs, what most people agree on)",
  "dissent": "string (1-2 paragraphs, notable counter-views)",
  "sentiment": { "score": number, "label": string, "breakdown": {...} },
  "keyPeople": [...],
  "trendingThreads": [...],
  "sourceBreakdown": {...}
}
```

---

## 7. Test Plan

### Unit Tests
- [ ] Each fetcher: mock HTTP, assert normalized `SourceResult` shape
- [ ] Aggregator: parallel fan-out, dedup by URL, partial failure handling
- [ ] Synthesizer: mock OpenAI, assert Zod validation, empty input edge case
- [ ] Prompt builder: token budget enforcement, truncation at correct boundary
- [ ] Rate limiter middleware: assert 429 after 10 req/hour
- [ ] Zod schemas: all models validate correctly + reject invalid data

### Integration Tests
- [ ] `POST /api/research` → creates job in DB, returns jobId
- [ ] `GET /api/research/:jobId` while `pending` → returns status
- [ ] `GET /api/research/:jobId` while `complete` → returns full report
- [ ] Unauthenticated request → 401
- [ ] Invalid topic (empty, >500 chars) → 422 with field errors
- [ ] Quota exceeded → 429 with reset time

### E2E Tests (Playwright)
- [ ] Full flow: sign in → submit topic → poll → report renders with all sections
- [ ] Source toggle: disable Reddit → report shows no Reddit results
- [ ] Export: click "Download Markdown" → file downloaded with correct content
- [ ] History: past jobs appear in list, clickable to view old reports

### Edge Cases
- [ ] All sources return empty results → report states "insufficient data"
- [ ] OpenAI API returns malformed JSON → job fails gracefully with error message
- [ ] Topic with special characters (e.g., `C++`, `ASP.NET`) → fetchers encode correctly
- [ ] Concurrent identical jobs from same user → second job hits cache

---

## 8. Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| 1 | LinkedIn via SerpAPI or Apify? (official API is very limited) | @joshiujjwal | Open |
| 2 | Should reports be shareable via public URL? | @joshiujjwal | Open |
| 3 | Pricing tiers — what's the OpenAI cost per average job? | Engineering | Open |
| 4 | Do we need moderation on topic input (block NSFW queries)? | Product | Open |
| 5 | Redis caching: invalidate on source config change or always TTL? | Engineering | Open |
