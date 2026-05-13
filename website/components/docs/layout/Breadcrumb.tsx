import Link from "next/link";

interface BreadcrumbSegment {
  name: string;
  url?: string;
}

interface BreadcrumbProps {
  segments: BreadcrumbSegment[];
}

/**
 * Breadcrumb — matches supermock .crumb exactly.
 * Mono 11px, ink-40, 14px margin-bottom, 6px gap.
 * Links are ink-60, hover to ink. Last item is ink-80.
 * Separator "/" at 0.5 opacity.
 */
export function Breadcrumb({ segments }: BreadcrumbProps) {
  if (segments.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        color: "var(--ink-45)",
        marginBottom: "14px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        flexWrap: "wrap",
      }}
    >
      <Link
        href="/docs"
        style={{
          color: "var(--ink-60)",
          textDecoration: "none",
        }}
      >
        Docs
      </Link>
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1;
        return (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ opacity: 0.5 }}>/</span>
            {isLast || !segment.url ? (
              <span style={{ color: "var(--ink-75)" }}>{segment.name}</span>
            ) : (
              <Link
                href={segment.url}
                style={{
                  color: "var(--ink-60)",
                  textDecoration: "none",
                }}
              >
                {segment.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
