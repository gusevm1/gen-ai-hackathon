import { describe, it, expect } from 'vitest';

/**
 * Verify content script configuration targets flatfox.ch with Shadow DOM style isolation.
 * We import the module and check the defineContentScript call options.
 *
 * Since WXT content scripts use auto-imports (defineContentScript, createShadowRootUi),
 * we read the source file directly and verify patterns rather than importing the module.
 */

// Read the content script source at module level
import { readFileSync } from 'fs';
import { resolve } from 'path';

const contentSource = readFileSync(
  resolve(__dirname, '../entrypoints/content/index.tsx'),
  'utf-8',
);

describe('content script configuration', () => {
  it('matches *://*.flatfox.ch/* URL pattern', () => {
    expect(contentSource).toContain("matches: ['*://*.flatfox.ch/*']");
  });

  it('does NOT match homegate.ch URLs', () => {
    expect(contentSource).not.toContain('homegate.ch');
  });

  it('uses cssInjectionMode ui for Shadow DOM style isolation', () => {
    expect(contentSource).toContain("cssInjectionMode: 'ui'");
  });
});
