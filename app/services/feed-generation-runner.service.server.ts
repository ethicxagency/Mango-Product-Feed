import { db } from "~/lib/db.server";
import { feedHistoryRepository } from "~/repositories/feed-history.repository.server";
import type { FeedWithRule } from "~/repositories/feed.repository.server";
import type { FeedHistoryStatus } from "~/types/feed";
import { streamFeedXml } from "./feed-generation.service.server";
import type { FeedGenerationError } from "./feed-rules/error-summary";
import { summarizeStatsErrors } from "./feed-rules/error-summary";
import type { FeedGenerationStats } from "./feed-rules/types";
import { validateXml } from "./xml/validate-xml";

/** Synchronous generation is fine at today's catalog sizes, but a runaway
 * feed (or a bug that makes eligibility never terminate) shouldn't be able
 * to hang the request indefinitely — this is the "Large Feed Timeout"
 * error case from the spec. Bigger catalogs are a background-job job, not
 * a longer timeout. */
const GENERATION_TIMEOUT_MS = 25_000;

export interface FeedGenerationRunResult {
  status: FeedHistoryStatus;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  productCount: number;
  variantCount: number;
  errors: FeedGenerationError[];
  xml: string;
  fileSizeBytes: number;
}

function withTimeout(deadlineMs: number): () => void {
  const start = Date.now();
  return () => {
    if (Date.now() - start > deadlineMs) {
      throw new Error(
        `Feed generation exceeded the ${deadlineMs / 1000}s limit for a single run`,
      );
    }
  };
}

/**
 * Fully materializes a feed (unlike the streaming public route, which
 * paces itself against the HTTP response) so it can be logged as one
 * FeedHistory entry with real duration/counts/errors, validated as a
 * whole, and reused for "Download XML" / "Preview Feed".
 */
export async function runFeedGeneration(
  feed: FeedWithRule,
  appUrl: string,
): Promise<FeedGenerationRunResult> {
  const startedAt = new Date();
  const checkTimeout = withTimeout(GENERATION_TIMEOUT_MS);
  const { chunks, stats } = await streamFeedXml(feed, appUrl);

  let xml = "";
  try {
    for await (const chunk of chunks) {
      xml += chunk;
      checkTimeout();
    }
  } catch (error) {
    const finishedAt = new Date();
    return {
      status: "FAILED",
      startedAt,
      finishedAt,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      productCount: stats.productsIncluded,
      variantCount: stats.variantsIncluded,
      errors: [
        {
          code: "GENERATION_TIMEOUT",
          message: error instanceof Error ? error.message : "Generation failed",
        },
      ],
      xml: "",
      fileSizeBytes: 0,
    };
  }

  const finishedAt = new Date();
  const errors = summarizeStatsErrors(stats);

  const validation = validateXml(xml);
  let status: FeedHistoryStatus = "SUCCESS";
  if (!validation.valid) {
    errors.unshift({
      code: "INVALID_XML",
      message: validation.error ?? "Generated XML failed validation",
    });
    status = "FAILED";
  } else if (stats.productsIncluded === 0) {
    status = "FAILED";
    errors.unshift({
      code: "GENERATION_ERROR",
      message: "No eligible products matched this feed's rules",
    });
  } else if (errors.length > 0) {
    status = "PARTIAL";
  }

  return {
    status,
    startedAt,
    finishedAt,
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    productCount: stats.productsIncluded,
    variantCount: stats.variantsIncluded,
    errors,
    xml,
    fileSizeBytes: Buffer.byteLength(xml, "utf8"),
  };
}

/** Runs a generation and persists its result — the FeedHistory row plus the
 * denormalized Feed.lastGenerated* cache fields — in one place, so the feed
 * editor's "Generate feed" action and the feed list's "Regenerate" row
 * action share identical persistence instead of each reimplementing it. */
export async function recordFeedGeneration(
  feed: FeedWithRule,
  appUrl: string,
): Promise<FeedGenerationRunResult> {
  const run = await runFeedGeneration(feed, appUrl);

  await feedHistoryRepository.create(feed.id, {
    status: run.status,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    durationMs: run.durationMs,
    productCount: run.productCount,
    variantCount: run.variantCount,
    errors: run.errors,
    fileSizeBytes: run.fileSizeBytes,
  });

  await db.feed.update({
    where: { id: feed.id },
    data: {
      lastGeneratedAt: run.finishedAt,
      lastGenerationStatus: run.status,
      lastGenerationMs: run.durationMs,
      lastProductCount: run.productCount,
    },
  });

  return run;
}

export type { FeedGenerationStats };
