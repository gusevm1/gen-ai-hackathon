import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { render } from '@testing-library/react';
import { LoadingSkeleton } from '../entrypoints/content/components/LoadingSkeleton';

describe('loading state behavior', () => {
  it('shows loading skeleton with animate-pulse class', () => {
    const { container } = render(createElement(LoadingSkeleton));
    const skeleton = container.firstElementChild;
    expect(skeleton).not.toBeNull();
    expect(skeleton!.className).toContain('animate-pulse');
  });

  it('renders with expected dimensions (100x40)', () => {
    const { container } = render(createElement(LoadingSkeleton));
    const skeleton = container.firstElementChild as HTMLElement;
    expect(skeleton.style.width).toBe('100px');
    expect(skeleton.style.height).toBe('40px');
  });

  it('contains score circle and text placeholders', () => {
    const { container } = render(createElement(LoadingSkeleton));
    const skeleton = container.firstElementChild;
    // Should have two child elements: circle placeholder and text placeholder
    expect(skeleton!.children.length).toBe(2);
  });
});
