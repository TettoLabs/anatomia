import type { Metadata } from "next";
import {
  getProofEntries,
  getProofStats,
  getAgentCount,
  getCommandCount,
  getSkillCount,
} from "@/lib/docs-data";
import { StatsStrip } from "@/components/docs/content/StatsStrip";
import { PipelineDiagram } from "@/components/docs/content/PipelineDiagram";
import { DocsGrid } from "@/components/docs/content/DocsGrid";
import { AudienceCards } from "@/components/docs/content/AudienceCards";
import { CuratedProofs } from "@/components/docs/content/CuratedProofs";
import { ResourceStrip } from "@/components/docs/content/ResourceStrip";
import { RightRail } from "@/components/docs/layout/RightRail";
import { getBuildMeta } from "@/lib/docs-data/meta";

export const metadata: Metadata = {
  title: "Anatomia Documentation",
  description:
    "Verified AI development. Five agents scope, plan, build, verify, and learn from every change.",
};

export default function DocsOverview() {
  const proofStats = getProofStats();
  const proofEntries = getProofEntries();
  const agentCount = getAgentCount();
  const commandCount = getCommandCount();
  const skillCount = getSkillCount();

  const stats = [
    { value: String(proofStats.entries), label: "verified proofs" },
    { value: String(agentCount), label: "sealed agents" },
    { value: String(commandCount), label: "CLI commands" },
    { value: String(skillCount), label: "stack-matched skills" },
    { value: "MIT", label: "free forever" },
  ];

  const buildMeta = getBuildMeta();

  // Manual TOC for overview — matches supermock overview right rail
  const overviewToc = [
    { title: "Welcome", url: "welcome", depth: 2 },
    { title: "The pipeline", url: "pipeline", depth: 2 },
    { title: "What's in these docs", url: "in-these-docs", depth: 2 },
    { title: "Where to start", url: "where-to-start", depth: 2 },
    { title: "From the proof chain", url: "proof-chain", depth: 2 },
  ];

  return (
    <div style={{ display: "flex", gap: "32px" }}>
    <article className="docs-prose min-w-0 flex-1">
      <h1 id="welcome">Documentation</h1>
      <p
        className="text-[15px] leading-relaxed"
        style={{ color: "var(--ink-60)" }}
      >
        Anatomia is an open-source pipeline that turns AI-generated code into{" "}
        <em>verified</em> code. It runs locally, installs as agents inside your
        repo, and produces a proof chain you can audit, replay, and
        trust — including the {proofStats.entries} proofs that built Anatomia
        itself.
      </p>

      <StatsStrip items={stats} />

      <h2 id="pipeline">The pipeline at a glance</h2>
      <p
        className="text-[14px] leading-relaxed"
        style={{ color: "var(--ink-60)" }}
      >
        Every shipped change passes through the same five stages. Each stage is a
        sealed agent with one job, specific inputs, and validated outputs.
        What&apos;s left behind is permanent — the artifacts between stages are
        your team&apos;s engineering memory, auditable and replayable.
      </p>
      <PipelineDiagram />

      <h2 id="in-these-docs">What&apos;s in these docs</h2>
      <p
        className="text-[14px] leading-relaxed"
        style={{ color: "var(--ink-60)" }}
      >
        The Reference section is auto-generated from the CLI source on every
        commit. Everything else is hand-written and reviewed.
      </p>
      <DocsGrid proofCount={proofStats.entries} />

      <h2 id="where-to-start">Where to start</h2>
      <p
        className="text-[14px] leading-relaxed"
        style={{ color: "var(--ink-60)" }}
      >
        Pick the door that matches what you&apos;re trying to do today.
      </p>
      <AudienceCards />

      <h3
        className="font-mono text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--ink-30)", marginBottom: "14px" }}
      >
        Resources
      </h3>
      <ResourceStrip />

      <h2 id="proof-chain">From the proof chain</h2>
      <p
        className="text-[14px] leading-relaxed"
        style={{ color: "var(--ink-60)" }}
      >
        Anatomia is built with anatomia. {proofStats.entries} pipeline runs,{" "}
        {proofStats.assertions.toLocaleString()} assertions,{" "}
        {proofStats.findings} findings. These six show what the system produces.
      </p>
      <CuratedProofs entries={proofEntries} totalCount={proofStats.entries} />
    </article>
    <RightRail
      toc={overviewToc}
      commitSha={buildMeta.commitSha}
      buildTimestamp={buildMeta.buildTimestamp}
    />
    </div>
  );
}
