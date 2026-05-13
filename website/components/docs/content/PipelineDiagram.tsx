import Link from "next/link";

interface Stage {
  number: string;
  name: string;
  description: string;
  artifact: string;
  agent: string;
  href: string;
}

const STAGES: Stage[] = [
  {
    number: "01",
    name: "Think",
    description: "Investigate. Push back. Scope.",
    artifact: "scope.md",
    agent: "ana",
    href: "/docs/reference/agent-templates",
  },
  {
    number: "02",
    name: "Plan",
    description: "Spec the solution. Seal the contract.",
    artifact: "spec.md contract.yaml",
    agent: "ana-plan",
    href: "/docs/reference/agent-templates",
  },
  {
    number: "03",
    name: "Build",
    description: "Implement. Tag tests to contract.",
    artifact: "build_report.md",
    agent: "ana-build",
    href: "/docs/reference/agent-templates",
  },
  {
    number: "04",
    name: "Verify",
    description: "Independent fault-finding.",
    artifact: "verify_report.md",
    agent: "ana-verify",
    href: "/docs/reference/agent-templates",
  },
  {
    number: "05",
    name: "Learn",
    description: "Promote findings to rules.",
    artifact: "skill files",
    agent: "ana-learn",
    href: "/docs/reference/agent-templates",
  },
];

export function PipelineDiagram() {
  return (
    <div>
      <div className="my-10 grid grid-cols-1 gap-3 sm:grid-cols-5">
        {STAGES.map((stage) => (
          <Link
            key={stage.number}
            href={stage.href}
            className="group rounded-[var(--radius-md)] p-4 transition-colors duration-150"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-soft)",
            }}
          >
            <span
              className="mb-1 block font-mono text-[11px] font-semibold"
              style={{ color: "var(--ink-30)" }}
            >
              {stage.number}
            </span>
            <span
              className="mb-1 block text-[15px] font-semibold"
              style={{ color: "var(--fg-strong)" }}
            >
              {stage.name}
            </span>
            <span
              className="mb-2 block text-[12.5px] leading-snug"
              style={{ color: "var(--ink-60)" }}
            >
              {stage.description}
            </span>
            <span
              className="block font-mono text-[11px]"
              style={{ color: "var(--ink-30)" }}
            >
              <code>{stage.artifact}</code>
            </span>
            <span
              className="block font-mono text-[11px]"
              style={{ color: "var(--ink-30)" }}
            >
              {stage.agent}
            </span>
          </Link>
        ))}
      </div>
      <div
        className="flex items-center justify-between text-[13px]"
        style={{ color: "var(--ink-60)" }}
      >
        <span>
          <strong>Sealed</strong> — each agent sees only the artifacts it needs.
          Independent verification by design.
        </span>
        <Link
          href="/docs/concepts/pipeline"
          className="shrink-0 font-medium"
          style={{ color: "var(--color-brand)" }}
        >
          How it works in depth →
        </Link>
      </div>
    </div>
  );
}
