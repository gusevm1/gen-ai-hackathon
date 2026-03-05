import type { CheerioAPI } from 'cheerio';

/**
 * Extract and parse the window.__INITIAL_STATE__ JSON from a Homegate page.
 *
 * Homegate uses Vue.js SSR and embeds structured JSON data in a <script> tag
 * as `window.__INITIAL_STATE__ = {...}`. This function finds that script tag
 * and parses the JSON, avoiding fragile CSS class selector extraction.
 *
 * @param $ - Cheerio instance loaded with the page HTML
 * @returns Parsed JSON object, or null if not found or parse fails
 */
export function parseInitialState($: CheerioAPI): Record<string, unknown> | null {
  let scriptContent: string | null = null;

  $('script').each((_, el) => {
    const text = $(el).html() || '';
    if (text.includes('window.__INITIAL_STATE__')) {
      scriptContent = text;
      return false; // break out of .each()
    }
  });

  if (!scriptContent) {
    return null;
  }

  try {
    // Format: window.__INITIAL_STATE__={...json...}
    // Use slice(1).join('=') to handle '=' characters inside the JSON payload
    const jsonStr = (scriptContent as string)
      .split('window.__INITIAL_STATE__')[1]!
      .replace(/^\s*=\s*/, '')
      .trim();

    // Remove trailing semicolon if present
    const cleaned = jsonStr.endsWith(';')
      ? jsonStr.slice(0, -1)
      : jsonStr;

    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch (error) {
    console.warn(
      'Failed to parse window.__INITIAL_STATE__ JSON:',
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
