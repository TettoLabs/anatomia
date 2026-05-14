import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ProofEntry, ProofStats } from './types';

const DATA_PATH = join(process.cwd(), 'data', 'docs', 'proof-entries.json');

let cached: ProofEntry[] | null = null;

function load(): ProofEntry[] {
  if (!cached) {
    cached = JSON.parse(readFileSync(DATA_PATH, 'utf-8')) as ProofEntry[];
  }
  return cached;
}

export function getProofEntries(): ProofEntry[] {
  return load();
}

export function getProofBySlug(slug: string): ProofEntry | null {
  return load().find(e => e.slug === slug) ?? null;
}

/** Compute median timing values across all proof entries, filtering zero-valued stages. */
export function getMedianTimings(): { think: number; plan: number; build: number; verify: number } {
  const entries = load();
  const stages: Record<string, number[]> = { think: [], plan: [], build: [], verify: [] };

  for (const entry of entries) {
    if (entry.timing.think > 0) stages.think.push(entry.timing.think);
    if (entry.timing.plan > 0) stages.plan.push(entry.timing.plan);
    if (entry.timing.build > 0) stages.build.push(entry.timing.build);
    if (entry.timing.verify > 0) stages.verify.push(entry.timing.verify);
  }

  function median(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid];
  }

  return {
    think: median(stages.think),
    plan: median(stages.plan),
    build: median(stages.build),
    verify: median(stages.verify),
  };
}

export function getProofStats(): ProofStats {
  const entries = load();
  let assertions = 0;
  let findings = 0;
  let rejections = 0;

  for (const entry of entries) {
    assertions += entry.assertionCount;
    findings += entry.findingCount;
    if (entry.rejectionCycles > 0) {
      rejections++;
    }
  }

  return { entries: entries.length, assertions, findings, rejections };
}
