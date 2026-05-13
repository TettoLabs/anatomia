import { Breadcrumb } from "@/components/docs/layout/Breadcrumb";
import { ProofExplorer } from "@/components/docs/proof/ProofExplorer";
import { getProofEntries, getProofStats } from "@/lib/docs-data";

export default function ProofExplorerPage() {
  const entries = getProofEntries();
  const stats = getProofStats();

  const totalAssertions = entries.reduce((sum, e) => sum + e.assertionCount, 0);
  const totalFindings = entries.reduce((sum, e) => sum + e.findingCount, 0);

  return (
    <div style={{ display: "flex" }}>
      <article className="docs-prose docs-content-area docs-content-full min-w-0 flex-1" style={{ padding: "32px 40px 96px 40px" }}>
        <Breadcrumb segments={[{ name: "Proof Chain" }]} />
        <h1 style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 500,
          fontSize: "36px",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          marginBottom: "8px",
          textWrap: "balance",
          color: "var(--fg)",
        }}>
          Proof Chain Explorer
        </h1>
        <div className="docs-proof-stats-row" style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
          color: "var(--ink-60)",
          marginBottom: "28px",
          paddingBottom: "20px",
          borderBottom: "1px solid var(--hairline)",
        }}>
          <span><b style={{ color: "var(--ink)", fontWeight: 500 }}>{stats.entries}</b> verified</span>
          <span><b style={{ color: "var(--ink)", fontWeight: 500 }}>{totalAssertions.toLocaleString()}</b> assertions</span>
          <span><b style={{ color: "var(--ink)", fontWeight: 500 }}>{totalFindings}</b> findings</span>
          <span>all{" "}
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              background: "var(--pass-bg)",
              border: "1px solid var(--pass-border)",
              color: "var(--pass)",
              padding: "3px 10px",
              borderRadius: "3px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--pass)" }} />
              pass
            </span>
          </span>
        </div>
        <ProofExplorer entries={entries} stats={stats} />
      </article>
    </div>
  );
}
