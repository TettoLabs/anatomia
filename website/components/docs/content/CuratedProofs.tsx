import Link from "next/link";
import type { ProofEntry } from "@/lib/docs-data/types";

interface CuratedEntry {
  slug: string;
  name: string;
  description: string;
  href: string;
}

interface CuratedProofsProps {
  entries: ProofEntry[];
  totalCount: number;
}

const CURATED: CuratedEntry[] = [
  {
    slug: "security-hardening",
    name: "Eliminate command injection across the CLI",
    description: "All slug args validated before reaching shell.",
    href: "/docs/proof/security-hardening",
  },
  {
    slug: "worktree-isolation",
    name: "Isolate every pipeline run in its own worktree",
    description: "Largest contract in the chain. 1 rejection cycle.",
    href: "/docs/proof/worktree-isolation",
  },
  {
    slug: "proof-promote",
    name: "Promote a finding into a skill rule",
    description: "The learning loop: finding → rule → better builds.",
    href: "/docs/proof/proof-promote",
  },
  {
    slug: "v1-documentation-overhaul",
    name: "Rewrite every public-facing document for v1",
    description: "README, CHANGELOG, CONTRIBUTING, ARCHITECTURE.",
    href: "/docs/proof",
  },
  {
    slug: "add-project-kind-detection",
    name: "Detect CLI, library, web app, API server, full-stack",
    description: "Scan-time classifier. Findings later mechanically closed.",
    href: "/docs/proof",
  },
  {
    slug: "cli-ux-polish",
    name: "Make the first 10 minutes feel professional",
    description: "Help text, command grouping, jargon-free descriptions.",
    href: "/docs/proof",
  },
];

export function CuratedProofs({ entries, totalCount }: CuratedProofsProps) {
  const rows = CURATED.map((c) => {
    const entry = entries.find((e) => e.slug === c.slug);
    if (!entry) return null;
    return { ...c, entry };
  }).filter(Boolean) as (CuratedEntry & { entry: ProofEntry })[];

  return (
    <div className="my-10">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]" style={{ color: "var(--fg)" }}>
          <thead>
            <tr
              className="border-b text-left font-mono text-[11px] uppercase tracking-wider"
              style={{ borderColor: "var(--hairline)", color: "var(--ink-30)" }}
            >
              <th className="pb-2 pr-4 font-semibold">Proof</th>
              <th className="pb-2 pr-4 font-semibold">Stage</th>
              <th className="pb-2 pr-4 font-semibold">Assertions</th>
              <th className="pb-2 pr-4 font-semibold">Findings</th>
              <th className="pb-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.slug}
                className="border-b"
                style={{ borderColor: "var(--hairline)" }}
              >
                <td className="py-2.5 pr-4">
                  <span
                    className="block font-mono text-[12px]"
                    style={{ color: "var(--fg-strong)" }}
                  >
                    {row.slug}
                  </span>
                  <span
                    className="block text-[12px]"
                    style={{ color: "var(--ink-60)" }}
                  >
                    {row.name}
                  </span>
                  <span
                    className="block text-[12px]"
                    style={{ color: "var(--ink-45)" }}
                  >
                    {row.description}{" "}
                    <span
                      className="inline-block font-mono text-[10px]"
                      style={{ color: "var(--ink-30)" }}
                    >
                      {row.entry.stage.toLowerCase()}
                    </span>
                  </span>
                </td>
                <td className="py-2.5 pr-4">
                  <span
                    className="inline-block rounded-sm px-1.5 py-0.5 font-mono text-[10px]"
                    style={{
                      background: "var(--border-soft)",
                      color: "var(--ink-60)",
                    }}
                  >
                    {row.entry.stage}
                  </span>
                </td>
                <td
                  className="py-2.5 pr-4 font-mono text-[12px]"
                  style={{ color: "var(--ink-60)" }}
                >
                  {row.entry.contract.satisfied}
                  <span style={{ color: "var(--ink-30)" }}>
                    /{row.entry.contract.total}
                  </span>
                </td>
                <td
                  className="py-2.5 pr-4 font-mono text-[12px]"
                  style={{ color: "var(--ink-60)" }}
                >
                  {row.entry.findingCount}
                </td>
                <td className="py-2.5">
                  <span
                    className="inline-block rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase"
                    style={{
                      background: "var(--brand-soft)",
                      color: "var(--color-brand)",
                    }}
                  >
                    {row.entry.result.toLowerCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        className="mt-3 flex items-center justify-between font-mono text-[12px]"
        style={{ color: "var(--ink-30)" }}
      >
        <span>
          {rows.length} of {totalCount} proofs · curated
        </span>
        <Link
          href="/docs/proof"
          className="font-medium transition-colors duration-100"
          style={{ color: "var(--color-brand)" }}
        >
          Browse all {totalCount} →
        </Link>
      </div>
    </div>
  );
}
