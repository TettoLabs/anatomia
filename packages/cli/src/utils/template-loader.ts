/**
 * Template Loader - Loads Handlebars templates from dist/templates/
 *
 * Handles both development (running from src/) and production (running from dist/) contexts.
 */

import Handlebars from 'handlebars';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register Handlebars helpers
Handlebars.registerHelper('eq', (a, b) => a === b);

/**
 * Template data interface
 */
export interface TemplateData {
  projectName: string;
  nodeId: string;
  timestamp?: string;
  description?: string;
  federation?: boolean;
  framework?: string | null | undefined;
  language?: string | undefined;
  notes?: string;
  federationNodes?: Array<{ name: string; description: string }>;
  [key: string]: unknown; // Allow additional properties
}

/**
 * Load and compile a Handlebars template
 *
 * @param templateName - Template filename (e.g., 'test.md.hbs', 'ENTRY.md.hbs')
 * @returns Compiled template function
 * @throws Error if template not found or compilation fails
 */
export function loadTemplate(templateName: string): HandlebarsTemplateDelegate<TemplateData> {
  // Determine templates directory
  // When compiled: dist/utils/ → dist/templates/
  // When in src: src/utils/ → templates/ (project root)
  const isCompiled = __dirname.includes('dist');
  const templatesDir = isCompiled
    ? path.join(__dirname, '..', 'templates')      // From dist/utils/ go to dist/templates/
    : path.join(__dirname, '..', '..', 'templates'); // From src/utils/ go to templates/

  const templatePath = path.join(templatesDir, templateName);

  try {
    // Load template file
    const templateContent = fs.readFileSync(templatePath, 'utf-8');

    // Compile with Handlebars
    const compiled = Handlebars.compile<TemplateData>(templateContent);

    return compiled;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load template '${templateName}': ${error.message}\nLooked in: ${templatesDir}`);
    }
    throw error;
  }
}

/**
 * Render a template with data
 *
 * @param templateName - Template filename
 * @param data - Template variables
 * @returns Rendered output
 */
export function renderTemplate(templateName: string, data: TemplateData): string {
  const template = loadTemplate(templateName);
  return template(data);
}

/**
 * Get available templates in templates/ directory
 *
 * @returns List of template filenames
 */
export function listTemplates(): string[] {
  const isCompiled = __dirname.includes('dist');
  const templatesDir = isCompiled
    ? path.join(__dirname, '..', 'templates')
    : path.join(__dirname, '..', '..', 'templates');

  try {
    const files = fs.readdirSync(templatesDir);
    return files.filter(f => f.endsWith('.hbs') || f.endsWith('.md'));
  } catch {
    return [];
  }
}
