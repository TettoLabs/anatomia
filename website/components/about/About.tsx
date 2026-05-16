import { Formatted } from "@/components/ui/Formatted";
import { Container } from "@/components/ui/Container";
import styles from "./about.module.css";

/**
 * Genesis date — March 19, 2026. First consistent commit.
 * Used to compute "days since genesis" dynamically.
 */
const GENESIS = new Date("2026-03-19T00:00:00Z");

/**
 * AI credit cost tracking.
 * Base: actual invoices through May 9, 2026.
 * Auto-increments $200 on the 9th of each subsequent month (Max subscription).
 * Manual overages can be added to OVERAGE_ADDITIONS.
 */
const CREDIT_BASE = 1085.13;
const CREDIT_BASE_DATE = new Date("2026-05-09T00:00:00Z");
const MONTHLY_RATE = 200;
const OVERAGE_ADDITIONS: { date: string; amount: number }[] = [
  // Add manual overage charges here as they occur:
  // { date: "2026-06-15", amount: 45.00 },
];

function computeCredits(): number {
  const now = new Date();
  let total = CREDIT_BASE;

  // Count full months since base date
  let cursor = new Date(CREDIT_BASE_DATE);
  while (true) {
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + 1);
    if (next > now) break;
    total += MONTHLY_RATE;
    cursor = next;
  }

  // Add manual overages
  for (const o of OVERAGE_ADDITIONS) {
    if (new Date(o.date) <= now) {
      total += o.amount;
    }
  }

  return Math.round(total);
}

function daysSinceGenesis(): number {
  const now = new Date();
  return Math.floor((now.getTime() - GENESIS.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * About page — thesis, founder, proof.
 * Server component. Stats computed at build/ISR time.
 */
export function About() {
  const days = daysSinceGenesis();
  const credits = computeCredits();

  return (
    <article className={styles.page}>
      {/* ── Section 1: The Thesis ── */}
      <Container>
        <section className={styles.thesis}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowLine} />
            About
          </div>

          <h1 className={styles.headline}>
            AI writes the code.<br />
            Nobody <em>verifies</em> it.
          </h1>

          <div className={styles.thesisBody}>
            <p className={styles.lede}>
              Your AI coding tool is fast, fluent, and confident. It writes
              entire features in minutes. It explains its reasoning. It sounds
              right. But it never shows its work — no assertions before
              building, no independent check after, no record of what was
              verified and what was assumed.
            </p>
            <p className={styles.bodyText}>
              Anatomia is a CLI that changes that. It scans your codebase,
              generates validated context, and runs every change through a
              four-agent pipeline: <em>Think, Plan, Build, Verify.</em> Each
              stage produces a typed artifact. Verify never reads Build's
              report — the developer gets two independent accounts. Every run
              produces a proof chain entry: what was asserted, what was found,
              what shipped.
            </p>
            <p className={styles.bodyText}>
              It works with{" "}
              <a href="https://claude.ai/code" target="_blank" rel="noopener noreferrer" className={styles.link}>
                Claude Code
              </a>
              . It's open source, MIT-licensed, and runs entirely on your
              machine. The scan works standalone with any AI tool. The pipeline
              is where the proof happens.
            </p>
          </div>
        </section>
      </Container>

      {/* ── Divider ── */}
      <div className={styles.divider}>
        <Container>
          <div className={styles.dividerLine} />
        </Container>
      </div>

      {/* ── Section 2: The Founder ── */}
      <Container>
        <section className={styles.founder}>
          <div className={styles.founderLabel}>The founder</div>

          <div className={styles.founderContent}>
            <div className={styles.founderInitial}>R</div>
            <div className={styles.founderText}>
              <h2 className={styles.founderName}>Ryan Smith</h2>
              <p className={styles.founderRole}>
                Denver, CO · Solo founder
              </p>
              <p className={styles.bodyText}>
                Eight years at Charles Schwab, architecting ML systems that
                served 30 million clients. Before that, computer science and
                economics at CU Boulder. The kind of background where you learn
                that production systems need proof, not promises — and that the
                gap between "works on my machine" and "verified in production"
                is where things break.
              </p>
              <p className={styles.bodyText}>
                Anatomia started because every AI coding tool I used was
                fast and wrong in ways I couldn't catch until later. The
                pipeline exists because I wanted to ship AI-written code I
                could stand behind — not code I hoped was correct. So I built
                the verification layer, and then I built it <em>with</em> the
                verification layer. The proof chain in this repo is the
                receipt.
              </p>
            </div>
          </div>
        </section>
      </Container>

      {/* ── Divider ── */}
      <div className={styles.divider}>
        <Container>
          <div className={styles.dividerLine} />
        </Container>
      </div>

      {/* ── Section 3: The Proof ── */}
      <Container>
        <section className={styles.proof}>
          <div className={styles.proofLabel}>Project genesis</div>
          <p className={styles.proofIntro}>
            Anatomia was built with Anatomia. Every feature was scoped,
            planned, built, and verified through the same pipeline this tool
            installs for you. One developer. One subscription.
            Here are the numbers.
          </p>

          <div className={styles.statsGrid}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{days}</span>
              <span className={styles.statLabel}>days since genesis</span>
              <span className={styles.statMeta}>March 19, 2026</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>113</span>
              <span className={styles.statLabel}>verified pipeline runs</span>
              <span className={styles.statMeta}>every one produces a proof</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>2,400+</span>
              <span className={styles.statLabel}>tests</span>
              <span className={styles.statMeta}>3 OS × 2 Node versions</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>114</span>
              <span className={styles.statLabel}>completed scopes</span>
              <span className={styles.statMeta}>think → plan → build → verify</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>${credits.toLocaleString()}</span>
              <span className={styles.statLabel}>total AI credits</span>
              <span className={styles.statMeta}>Claude Code Max · $200/mo</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>1</span>
              <span className={styles.statLabel}>developer</span>
              <span className={styles.statMeta}>the system is the second engineer</span>
            </div>
          </div>

          <p className={styles.proofCoda}>
            The{" "}
            <code className={styles.inlineCode}>.ana/</code>{" "}
            directory in the{" "}
            <a
              href="https://github.com/anatomia-dev/anatomia"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              repository
            </a>{" "}
            is the proof. Every pipeline run, every contract, every finding —
            committed alongside the code it verified.
          </p>
        </section>
      </Container>
    </article>
  );
}
