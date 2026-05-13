import type { ReactNode } from "react";

type CalloutVariant = "rule" | "note";

interface CalloutProps {
  variant?: CalloutVariant;
  children: ReactNode;
}

const LABELS: Record<CalloutVariant, string> = {
  rule: "Rule",
  note: "Note",
};

const variantStyles: Record<
  CalloutVariant,
  { borderColor: string; labelColor: string }
> = {
  rule: {
    borderColor: "var(--color-brand)",
    labelColor: "var(--brand-light)",
  },
  note: {
    borderColor: "var(--info)",
    labelColor: "var(--info)",
  },
};

/**
 * Callout — matches supermock .callout exactly.
 * Flex row: label (mono 10px uppercase) + content.
 * margin: 8px 0 22px. border + border-left colored. bg-card.
 * Children p: 13.5px, line-height 1.55, ink-80, margin 0.
 */
export function Callout({ variant = "note", children }: CalloutProps) {
  const styles = variantStyles[variant];

  return (
    <div
      role="note"
      className="docs-callout"
      style={{
        display: "flex",
        gap: "12px",
        padding: "14px 16px",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${styles.borderColor}`,
        background: "var(--bg-card)",
        borderRadius: "var(--radius-md)",
        margin: "8px 0 22px",
        fontSize: "13.5px",
        lineHeight: 1.55,
        color: "var(--ink-75)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: styles.labelColor,
          paddingTop: "3px",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {LABELS[variant]}
      </span>
      <div>{children}</div>
    </div>
  );
}
