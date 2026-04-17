/**
 * README extraction detector
 *
 * Reads README.md, extracts sections by heading, maps recognized headings
 * to three categories: description, architecture, setup. Falls back to
 * first paragraph when no headings match. Strips badges, images, and HTML.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ReadmeResult } from '../types/engineResult.js';

/** Per-section character cap. */
const SECTION_CAP = 1500;
/** Total extraction character cap. */
const TOTAL_CAP = 4000;

/**
 * Heading → category lookup. Case-insensitive — keys are lowercase.
 * 18 entries covering common README heading conventions.
 */
const HEADING_MAP: Record<string, keyof Pick<ReadmeResult, 'description' | 'architecture' | 'setup'>> = {
  // description
  'about': 'description',
  'about this project': 'description',
  'overview': 'description',
  'introduction': 'description',
  'what is this': 'description',
  'description': 'description',
  // architecture
  'architecture': 'architecture',
  'design': 'architecture',
  'how it works': 'architecture',
  'project structure': 'architecture',
  'structure': 'architecture',
  'technical overview': 'architecture',
  // setup
  'installation': 'setup',
  'install': 'setup',
  'getting started': 'setup',
  'setup': 'setup',
  'quick start': 'setup',
  'usage': 'setup',
};

/**
 * Strip badges (`![...](...)` where alt text or URL contains badge-like patterns),
 * standalone images, and HTML tags from content. Preserves markdown lists,
 * inline code, and links.
 */
export function cleanContent(raw: string): string {
  let s = raw;
  // Strip badge/image markdown: ![alt](url)
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  // Strip HTML tags
  s = s.replace(/<[^>]+>/g, '');
  // Collapse runs of blank lines into one
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

/**
 * Truncate text to `cap` characters at a word boundary when possible.
 */
function truncate(text: string, cap: number): string {
  if (text.length <= cap) return text;
  const cut = text.lastIndexOf(' ', cap);
  return (cut > 0 ? text.slice(0, cut) : text.slice(0, cap)).trimEnd();
}

/**
 * Parse markdown into sections by `#` and `##` headings.
 * Returns array of { heading, content } pairs.
 */
function parseSections(md: string): Array<{ heading: string; content: string }> {
  const lines = md.split('\n');
  const sections: Array<{ heading: string; content: string }> = [];
  let current: { heading: string; lines: string[] } | null = null;

  for (const line of lines) {
    const match = line.match(/^#{1,2}\s+(.+)/);
    if (match) {
      if (current) {
        sections.push({ heading: current.heading, content: current.lines.join('\n').trim() });
      }
      current = { heading: match[1]!.trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) {
    sections.push({ heading: current.heading, content: current.lines.join('\n').trim() });
  }
  return sections;
}

/**
 * Extract first paragraph from markdown content (fallback path).
 * "First paragraph" = content before the first blank line or heading,
 * excluding a leading `#` title line.
 */
function extractFirstParagraph(md: string): string | null {
  const lines = md.split('\n');
  const contentLines: string[] = [];
  let skippedTitle = false;
  let collecting = false;

  for (const line of lines) {
    // Skip leading blank lines
    if (!skippedTitle && !collecting && line.trim() === '') continue;
    // Skip leading title heading and blank lines after it
    if (!skippedTitle && /^#\s+/.test(line)) {
      skippedTitle = true;
      continue;
    }
    // Skip blank lines between title and first content
    if (skippedTitle && !collecting && line.trim() === '') continue;
    collecting = true;
    // Stop at blank line or next heading
    if (line.trim() === '' || /^#{1,2}\s+/.test(line)) break;
    contentLines.push(line);
  }

  const text = contentLines.join('\n').trim();
  return text.length > 0 ? text : null;
}

/**
 * Apply total cap across all populated fields. Truncates the longest
 * fields first until total is within TOTAL_CAP.
 */
function applyTotalCap(result: ReadmeResult): ReadmeResult {
  const fields: Array<'description' | 'architecture' | 'setup'> = ['description', 'architecture', 'setup'];
  const total = fields.reduce((sum, f) => sum + (result[f]?.length ?? 0), 0);
  if (total <= TOTAL_CAP) return result;

  // Clone to avoid mutation
  const capped: ReadmeResult = { ...result };
  let remaining = TOTAL_CAP;

  // Sort fields by content length ascending — give shorter fields their full content,
  // then divide remaining budget among longer ones.
  const populated = fields
    .filter(f => capped[f] !== null)
    .map(f => ({ field: f, len: capped[f]!.length }))
    .sort((a, b) => a.len - b.len);

  for (let i = 0; i < populated.length; i++) {
    const budget = Math.floor(remaining / (populated.length - i));
    const entry = populated[i]!;
    if (entry.len > budget) {
      capped[entry.field] = truncate(capped[entry.field]!, budget);
    }
    remaining -= capped[entry.field]!.length;
  }

  return capped;
}

/** README filename variants to try, in priority order. */
const README_VARIANTS = ['README.md', 'readme.md', 'Readme.md', 'README'];

/**
 * Detect and extract README content from a project root.
 *
 * @param rootPath - Absolute path to the project root
 * @returns ReadmeResult with extracted content, or null if no README or empty after cleaning
 */
export async function detectReadme(rootPath: string): Promise<ReadmeResult | null> {
  // Find README file (case-insensitive via explicit variant list)
  let readmeContent: string | null = null;
  for (const variant of README_VARIANTS) {
    try {
      readmeContent = await fs.readFile(path.join(rootPath, variant), 'utf-8');
      break;
    } catch {
      // Try next variant
    }
  }

  if (readmeContent === null) return null;

  // Clean content
  const cleaned = cleanContent(readmeContent);
  if (cleaned.length === 0) return null;

  // Parse sections and map to categories
  const sections = parseSections(cleaned);
  const result: ReadmeResult = {
    description: null,
    architecture: null,
    setup: null,
    source: 'heading',
  };

  let matched = false;
  for (const section of sections) {
    const key = section.heading.toLowerCase();
    const category = HEADING_MAP[key];
    if (category && result[category] === null && section.content.length > 0) {
      result[category] = truncate(section.content, SECTION_CAP);
      matched = true;
    }
  }

  // Fallback: no headings matched → use first paragraph as description
  if (!matched) {
    const firstPara = extractFirstParagraph(cleaned);
    if (firstPara === null) return null;
    result.description = truncate(firstPara, SECTION_CAP);
    result.source = 'fallback';
  }

  // Check if all content fields are empty (e.g., all matched sections had empty content)
  if (result.description === null && result.architecture === null && result.setup === null) {
    return null;
  }

  return applyTotalCap(result);
}
