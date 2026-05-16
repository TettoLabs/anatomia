import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import styles from "./changelog.module.css";

interface ChangelogEntry {
  version: string;
  date: string;
  sections: { heading: string; items: string[] }[];
}

/**
 * Parse CHANGELOG.md (Keep a Changelog format) into structured entries.
 * Reads from the repo root at build time.
 */
function parseChangelog(): ChangelogEntry[] {
  // Vercel builds from repo root; local dev may run from website/
  const candidates = [
    join(process.cwd(), "CHANGELOG.md"),
    join(process.cwd(), "..", "CHANGELOG.md"),
  ];
  const changelogPath = candidates.find((p) => existsSync(p));
  if (!changelogPath) return [];
  const raw = readFileSync(changelogPath, "utf-8");
  const entries: ChangelogEntry[] = [];
  let current: ChangelogEntry | null = null;
  let currentSection: { heading: string; items: string[] } | null = null;

  for (const line of raw.split("\n")) {
    // Version heading: ## [1.1.0] - 2026-05-15
    const versionMatch = line.match(/^## \[([^\]]+)\] - (\S+)/);
    if (versionMatch) {
      if (current) entries.push(current);
      current = { version: versionMatch[1], date: versionMatch[2], sections: [] };
      currentSection = null;
      continue;
    }

    // Skip [Unreleased] and preamble
    if (line.startsWith("## [Unreleased]")) {
      continue;
    }

    if (!current) continue;

    // Section heading: ### Added, ### Fixed, ### Changed
    const sectionMatch = line.match(/^### (\w+)/);
    if (sectionMatch) {
      currentSection = { heading: sectionMatch[1], items: [] };
      current.sections.push(currentSection);
      continue;
    }

    // Sub-section heading: #### Build isolation — treat as a bold item
    const subMatch = line.match(/^#### (.+)/);
    if (subMatch && currentSection) {
      currentSection.items.push(`**${subMatch[1]}**`);
      continue;
    }

    // List item: - **Worktree-based builds** — description
    if (line.startsWith("- ") && currentSection) {
      currentSection.items.push(line.slice(2));
      continue;
    }
  }

  if (current) entries.push(current);
  return entries;
}

/**
 * Render a changelog item with basic markdown: **bold** and `code`.
 */
function renderItem(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Code
    const codeMatch = remaining.match(/`(.+?)`/);

    // Find which comes first
    const boldIdx = boldMatch ? remaining.indexOf(boldMatch[0]) : Infinity;
    const codeIdx = codeMatch ? remaining.indexOf(codeMatch[0]) : Infinity;

    if (boldIdx === Infinity && codeIdx === Infinity) {
      parts.push(remaining);
      break;
    }

    if (boldIdx <= codeIdx && boldMatch) {
      if (boldIdx > 0) parts.push(remaining.slice(0, boldIdx));
      parts.push(<strong key={key++} className={styles.bold}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldIdx + boldMatch[0].length);
    } else if (codeMatch) {
      if (codeIdx > 0) parts.push(remaining.slice(0, codeIdx));
      parts.push(<code key={key++} className={styles.code}>{codeMatch[1]}</code>);
      remaining = remaining.slice(codeIdx + codeMatch[0].length);
    }
  }

  return parts;
}

/**
 * Changelog — reads CHANGELOG.md from repo root at build time.
 * Server component.
 */
export function Changelog() {
  const entries = parseChangelog();

  return (
    <article className={styles.article}>
      <div className={styles.eyebrow}>Changelog</div>

      <h1 className={styles.title}>
        What's <em>new</em>.
      </h1>

      <div className={styles.entries}>
        {entries.map((entry) => (
          <div key={entry.version} className={styles.entry}>
            <div className={styles.entryHeader}>
              <span className={styles.entryVersion}>{entry.version}</span>
              <span className={styles.entryDate}>{entry.date}</span>
            </div>
            {entry.sections.map((section) => (
              <div key={section.heading} className={styles.section}>
                <h3 className={styles.sectionHeading}>{section.heading}</h3>
                <ul className={styles.entryList}>
                  {section.items.map((item, i) => (
                    <li key={i}>{renderItem(item)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </article>
  );
}
