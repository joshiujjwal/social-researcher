// Shared TypeScript types — inferred from Zod schemas where possible
// Source of truth: src/types/index.ts

import { z } from 'zod'

// ── Source Types ───────────────────────────────────────────────────────────────

export const SourceTypeSchema = z.enum(['reddit', 'hackernews', 'twitter', 'linkedin'])
export type SourceType = z.infer<typeof SourceTypeSchema>

// ── Normalized source result (common shape returned by all fetchers) ───────────

export const SourceResultSchema = z.object({
  source: SourceTypeSchema,
  url: z.string().url(),
  title: z.string().min(1),
  content: z.string().max(2000),
  score: z.number().int().nonnegative(),
  author: z.string().optional(),
  publishedAt: z.date().optional(),
})
export type SourceResult = z.infer<typeof SourceResultSchema>

// ── Synthesis report (GPT-4o output, validated with Zod) ──────────────────────

export const SentimentSchema = z.object({
  score: z.number().min(-1).max(1),
  label: z.enum(['positive', 'neutral', 'negative']),
  breakdown: z.object({
    positive: z.number().min(0).max(100),
    neutral: z.number().min(0).max(100),
    negative: z.number().min(0).max(100),
  }),
})

export const KeyPersonSchema = z.object({
  name: z.string(),
  handle: z.string().optional(),
  platform: SourceTypeSchema,
  reason: z.string(),
})

export const TrendingThreadSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  platform: SourceTypeSchema,
  engagement: z.number().int().nonneg(),
})

export const SynthesisReportSchema = z.object({
  consensus: z.string().min(1),
  dissent: z.string().min(1),
  sentiment: SentimentSchema,
  keyPeople: z.array(KeyPersonSchema),
  trendingThreads: z.array(TrendingThreadSchema),
  sourceBreakdown: z.record(
    SourceTypeSchema,
    z.object({ count: z.number().int(), avgScore: z.number() })
  ),
})
export type SynthesisReport = z.infer<typeof SynthesisReportSchema>

// ── Result type (no throwing in service layer) ────────────────────────────────

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string }

export const ok = <T>(data: T): Result<T> => ({ ok: true, data })
export const err = (error: string, code?: string): Result<never> => ({ ok: false, error, code })

// ── Job status ────────────────────────────────────────────────────────────────

export const JobStatusSchema = z.enum(['pending', 'running', 'complete', 'failed'])
export type JobStatus = z.infer<typeof JobStatusSchema>

// ── API request/response schemas ──────────────────────────────────────────────

export const CreateResearchJobRequestSchema = z.object({
  topic: z.string().min(3, 'Topic must be at least 3 characters').max(500, 'Topic must be under 500 characters'),
  sources: z.array(SourceTypeSchema).optional(),
})
export type CreateResearchJobRequest = z.infer<typeof CreateResearchJobRequestSchema>
