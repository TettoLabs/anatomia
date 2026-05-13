"use client";

import { useState } from "react";
import type { ProofAssertion } from "@/lib/docs-data/types";

interface AssertionLedgerProps {
  assertions: ProofAssertion[];
  total: number;
  className?: string;
}

export function AssertionLedger({ assertions, total, className }: AssertionLedgerProps) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = assertions.length > 8;
  const visible = expanded ? assertions : assertions.slice(0, 8);

  return (
    <div className={className}>
      <p style={{
        fontSize: "13.5px",
        color: "var(--ink-60)",
        maxWidth: "none",
      }}>
        {total} claims, each independently verified.
        {hasMore && !expanded && (
          <>
            {" "}Showing 8 —{" "}
            <span
              onClick={() => setExpanded(true)}
              style={{ cursor: "pointer", color: "var(--brand-light)", borderBottom: "1px solid var(--ink-25)" }}
            >
              show all →
            </span>
          </>
        )}
        {hasMore && expanded && (
          <>
            {" "}
            <span
              onClick={() => setExpanded(false)}
              style={{ cursor: "pointer", color: "var(--brand-light)", borderBottom: "1px solid var(--ink-25)" }}
            >
              collapse ↑
            </span>
          </>
        )}
      </p>
      <table className="docs-assn-tbl" style={{
        width: "100%",
        borderCollapse: "collapse",
        marginTop: "12px",
        fontFamily: "var(--font-mono)",
        fontSize: "12px",
      }}>
        <thead>
          <tr>
            <th style={{
              fontFamily: "var(--font-sans)",
              fontSize: "10.5px",
              fontWeight: 600,
              color: "var(--ink-60)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              textAlign: "left",
              padding: "8px 10px",
              borderBottom: "1px solid var(--border)",
            }}>ID</th>
            <th style={{
              fontFamily: "var(--font-sans)",
              fontSize: "10.5px",
              fontWeight: 600,
              color: "var(--ink-60)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              textAlign: "left",
              padding: "8px 10px",
              borderBottom: "1px solid var(--border)",
            }}>Says</th>
            <th style={{
              fontFamily: "var(--font-sans)",
              fontSize: "10.5px",
              fontWeight: 600,
              color: "var(--ink-60)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              textAlign: "left",
              padding: "8px 10px",
              borderBottom: "1px solid var(--border)",
            }}>Matcher</th>
            <th style={{
              fontFamily: "var(--font-sans)",
              fontSize: "10.5px",
              fontWeight: 600,
              color: "var(--ink-60)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              textAlign: "left",
              padding: "8px 10px",
              borderBottom: "1px solid var(--border)",
            }}></th>
          </tr>
        </thead>
        <tbody>
          {visible.map((a) => (
            <tr key={a.id} className="docs-assn-row">
              <td style={{
                padding: "9px 10px",
                borderBottom: "1px solid var(--hairline)",
                verticalAlign: "top",
                color: "var(--ink-40)",
                width: "54px",
              }}>{a.id}</td>
              <td style={{
                padding: "9px 10px",
                borderBottom: "1px solid var(--hairline)",
                verticalAlign: "top",
                color: "var(--ink-80)",
                lineHeight: 1.5,
              }}>{a.says}</td>
              <td style={{
                padding: "9px 10px",
                borderBottom: "1px solid var(--hairline)",
                verticalAlign: "top",
                color: "var(--info)",
                width: "90px",
                fontSize: "11px",
                textTransform: "lowercase",
              }}>verified</td>
              <td style={{
                padding: "9px 10px",
                borderBottom: "1px solid var(--hairline)",
                verticalAlign: "top",
                textAlign: "right",
                width: "36px",
                color: a.status === "SATISFIED" ? "var(--pass)" : "var(--fail)",
                fontSize: "11px",
                textTransform: "uppercase",
              }}>
                {a.status === "SATISFIED" ? "ok" : "fail"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
