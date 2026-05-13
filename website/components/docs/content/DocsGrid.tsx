import Link from "next/link";

interface DocLink {
  title: string;
  href: string;
  code?: boolean;
}

interface DocsCard {
  eyebrow: string;
  heading: string;
  description: string;
  links: DocLink[];
}

interface DocsGridProps {
  proofCount: number;
}

export function DocsGrid({ proofCount }: DocsGridProps) {
  const cards: DocsCard[] = [
    {
      eyebrow: "Get started",
      heading: "Your first run",
      description:
        "From zero to a working ana scan on your repo. No login. Two minutes to scaffold.",
      links: [
        { title: "Install the CLI", href: "/docs/start#install" },
        { title: "Scan your repo (3s)", href: "/docs/start#init" },
        { title: "ana init — ship the system", href: "/docs/start#init", code: true },
        { title: "Your first cycle", href: "/docs/start#pipeline-run" },
        { title: "Your first proof", href: "/docs/start#complete" },
      ],
    },
    {
      eyebrow: "Guides",
      heading: "Doing the work",
      description:
        "Recipes for the moves you'll make, in the order you'll need them.",
      links: [
        { title: "Using ana-setup", href: "/docs/guides/using-ana-setup" },
        { title: "Verifying changes", href: "/docs/guides/verifying-changes" },
        { title: "Reading a proof", href: "/docs/guides/reading-a-proof" },
        { title: "Using ana-learn", href: "/docs/guides/using-ana-learn" },
        { title: "Configurability", href: "/docs/guides/configurability" },
        { title: "Troubleshooting", href: "/docs/guides/troubleshooting" },
      ],
    },
    {
      eyebrow: "Reference",
      heading: "Files & commands",
      description:
        "Every CLI command, every template, every artifact format. The source of truth.",
      links: [
        { title: "CLI commands", href: "/docs/reference/cli-commands" },
        { title: "Agent templates", href: "/docs/reference/agent-templates" },
        { title: "Skill files", href: "/docs/reference/skill-files" },
        { title: "Context files", href: "/docs/reference/context-files" },
        { title: `Proof chain (${proofCount})`, href: "/docs/proof" },
      ],
    },
  ];

  return (
    <div className="my-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.eyebrow}
          className="rounded-[var(--radius-md)] p-5"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-soft)",
          }}
        >
          <span
            className="mb-1 block font-mono text-[11px] font-medium uppercase tracking-wider"
            style={{ color: "var(--ink-30)" }}
          >
            {card.eyebrow}
          </span>
          <span
            className="mb-1.5 block text-[15px] font-semibold"
            style={{ color: "var(--fg-strong)" }}
          >
            {card.heading}
          </span>
          <span
            className="mb-3 block text-[13px] leading-relaxed"
            style={{ color: "var(--ink-60)" }}
          >
            {card.description}
          </span>
          <ul className="m-0 list-none space-y-1 p-0">
            {card.links.map((link) => (
              <li key={link.href + link.title}>
                <Link
                  href={link.href}
                  className="text-[13px] transition-colors duration-100"
                  style={{ color: "var(--ink-60)" }}
                >
                  {link.code ? <code>{link.title}</code> : link.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
