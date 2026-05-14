/**
 * stripJsx — removes JSX components from raw MDX source, leaving clean markdown.
 *
 * Handles block-level components with children, self-closing components,
 * JSX expression comments, HTML-like wrappers with style objects,
 * and import/export statements.
 */
export function stripJsx(mdxSource: string): string {
  let result = mdxSource;

  // Remove import/export lines
  result = result.replace(/^(?:import|export)\s+.*$/gm, '');

  // Remove JSX expression comments: {/* ... */}
  result = result.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

  // Remove self-closing JSX components: <ComponentName ... />
  result = result.replace(/<[A-Z]\w*\s*(?:[^>]*?)?\s*\/>/g, '');

  // Remove block-level JSX components with children, preserving inner content
  // Handles: <Callout variant="note">content</Callout> → content
  const blockComponents = [
    'Callout', 'ForPlatform', 'TroubleCard',
  ];
  for (const comp of blockComponents) {
    const regex = new RegExp(`<${comp}[^>]*>([\\s\\S]*?)<\\/${comp}>`, 'g');
    result = result.replace(regex, '$1');
  }

  // Remove components that should be fully stripped (no useful inner content)
  const stripFull = [
    'PipelineDiagram', 'NextCards', 'StatsStrip', 'CodeBlock',
  ];
  for (const comp of stripFull) {
    // Self-closing
    const selfClose = new RegExp(`<${comp}\\s*(?:[^>]*?)?\\s*/>`, 'g');
    result = result.replace(selfClose, '');
    // With children
    const withChildren = new RegExp(`<${comp}[^>]*>[\\s\\S]*?<\\/${comp}>`, 'g');
    result = result.replace(withChildren, '');
  }

  // Remove div/span/p/pre wrappers with style props, preserving inner text
  // Iteratively strip outermost first (handles nested divs)
  for (let i = 0; i < 5; i++) {
    const before = result;
    result = result.replace(/<(?:div|span|p|pre)\s+style=\{\{[^}]*\}\}[^>]*>([\s\S]*?)<\/(?:div|span|p|pre)>/g, '$1');
    if (result === before) break;
  }

  // Remove remaining HTML-like tags (a, code already in markdown, etc.)
  // Keep content, just strip the tags
  result = result.replace(/<\/?(?:div|span|p|pre|a|code|b|strong|em|br)\b[^>]*>/g, '');

  // Clean up excessive blank lines
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}
