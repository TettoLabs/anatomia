import Link from "next/link";

interface AudienceCard {
  tag: string;
  heading: string;
  description: string;
  cta: string;
  href: string;
}

const CARDS: AudienceCard[] = [
  {
    tag: "Evaluating",
    heading: "I want to see if this is real",
    description:
      "Read one complete proof end to end — scope, contract, build report, verify findings, integrity seal. Five minutes; no install.",
    cta: "→ Open a real proof",
    href: "/docs/proof/security-hardening",
  },
  {
    tag: "Installing",
    heading: "I want to run this on my repo",
    description:
      "Scan in three seconds, no login. Init ships the pipeline into your repo. Requires Claude Code.",
    cta: "→ Quickstart",
    href: "/docs/start",
  },
  {
    tag: "Operating",
    heading: "I have it running and want depth",
    description:
      "How sealed agents work, how to read a verify report, when to promote a finding, how to recover from a rejection cycle.",
    cta: "→ How it works",
    href: "/docs/concepts/pipeline",
  },
];

export function AudienceCards() {
  return (
    <div className="my-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {CARDS.map((card) => (
        <Link
          key={card.tag}
          href={card.href}
          className="group rounded-[var(--radius-md)] p-5 transition-colors duration-150"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-soft)",
          }}
        >
          <span
            className="mb-1 block font-mono text-[11px] font-medium uppercase tracking-wider"
            style={{ color: "var(--ink-30)" }}
          >
            {card.tag}
          </span>
          <span
            className="mb-1.5 block text-[15px] font-semibold"
            style={{ color: "var(--fg-strong)" }}
          >
            {card.heading}
          </span>
          <span
            className="mb-3 block text-[13.5px] leading-relaxed"
            style={{ color: "var(--ink-60)" }}
          >
            {card.description}
          </span>
          <span
            className="font-mono text-[12px] font-medium"
            style={{ color: "var(--color-brand)" }}
          >
            {card.cta}
          </span>
        </Link>
      ))}
    </div>
  );
}
