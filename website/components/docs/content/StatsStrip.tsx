/**
 * StatsStrip — matches supermock .home-stats exactly.
 * 5-column bordered card grid with cell dividers.
 * Values: serif 24px 500. Labels: mono 11px uppercase.
 * MIT value gets a special bordered pill treatment.
 */

interface Stat {
  value: string;
  label: string;
}

interface StatsStripProps {
  items: Stat[];
}

export function StatsStrip({ items }: StatsStripProps) {
  return (
    <div
      className="docs-stats-grid"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        gap: 0,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-card)",
        margin: "18px 0 44px",
        overflow: "hidden",
      }}
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          style={{
            padding: "14px 18px",
            borderRight: i < items.length - 1 ? "1px solid var(--hairline)" : "none",
            display: "flex",
            flexDirection: "column",
            gap: "3px",
          }}
        >
          <span
            style={{
              fontFamily: item.value === "MIT" ? "var(--font-mono)" : "var(--font-serif)",
              fontWeight: 500,
              fontSize: item.value === "MIT" ? "14px" : "24px",
              lineHeight: 1,
              letterSpacing: item.value === "MIT" ? "0.04em" : "-0.02em",
              color: item.value === "MIT" ? "var(--ink-75)" : "var(--fg)",
              ...(item.value === "MIT"
                ? {
                    display: "inline-block",
                    padding: "2px 6px",
                    border: "1px solid var(--border)",
                    borderRadius: "3px",
                    verticalAlign: "middle",
                    width: "fit-content",
                  }
                : {}),
            }}
          >
            {item.value}
          </span>
          <span
            style={{
              fontSize: "11px",
              color: "var(--ink-60)",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
