interface MetaRowProps {
  readingTime?: number;
  lastReviewed?: string;
}

/**
 * MetaRow — matches supermock .meta-row exactly.
 * Mono 11px, ink-60, flex with 16px gap, border-bottom with 18px padding.
 * Labels ("Reading time", "Last reviewed") are bold at ink color.
 */
export function MetaRow({ readingTime, lastReviewed }: MetaRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        flexWrap: "wrap",
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        color: "var(--ink-60)",
        paddingBottom: "18px",
        borderBottom: "1px solid var(--hairline)",
        marginBottom: "32px",
      }}
    >
      {readingTime && (
        <span>
          <b style={{ color: "var(--fg)", fontWeight: 500 }}>Reading time</b>
          {" "}· {readingTime} min
        </span>
      )}
      {lastReviewed && (
        <span>
          <b style={{ color: "var(--fg)", fontWeight: 500 }}>Last reviewed</b>
          {" "}· {lastReviewed}
        </span>
      )}
    </div>
  );
}
