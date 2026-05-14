/**
 * Dynamic MDX value components — server components that render current values
 * from data loaders at build time. Registered in the catch-all mdxComponents map.
 */

import {
  getProofStats,
  getProofEntries,
  getSkillCount,
  getGotchaCount,
  getMedianTimings,
} from "@/lib/docs-data";

/** Renders the total number of proof chain entries. */
export function ProofCount(): React.ReactElement {
  const stats = getProofStats();
  return <span>{stats.entries}</span>;
}

/** Renders the count of proofs that had rejection cycles. */
export function RejectionCount(): React.ReactElement {
  const stats = getProofStats();
  return <span>{stats.rejections}</span>;
}

/** Renders the total number of findings across all proofs. */
export function FindingCount(): React.ReactElement {
  const stats = getProofStats();
  return <span>{stats.findings}</span>;
}

/** Renders the number of skill templates. */
export function SkillCount(): React.ReactElement {
  return <span>{getSkillCount()}</span>;
}

/** Renders the number of gotcha entries. */
export function GotchaCount(): React.ReactElement {
  return <span>{getGotchaCount()}</span>;
}

/** Renders computed median timing values across all proof entries. */
export function MedianTimings(): React.ReactElement {
  const medians = getMedianTimings();
  return <span>{medians.think}m think, {medians.plan}m plan, {medians.build}m build, {medians.verify}m verify</span>;
}

/**
 * ProofSummaryText — renders "{count} verified pipeline runs."
 * For use inside JSX string props where server components can't render directly.
 */
export function ProofSummaryText(): React.ReactElement {
  const stats = getProofStats();
  return <span>{stats.entries} verified pipeline runs.</span>;
}

/**
 * ProofFindingsText — renders "{proofs} proofs, {findings} findings to triage."
 * For use inside JSX string props where server components can't render directly.
 */
export function ProofFindingsText(): React.ReactElement {
  const entries = getProofEntries();
  const stats = getProofStats();
  return <span>{entries.length} proofs, {stats.findings} findings to triage.</span>;
}
