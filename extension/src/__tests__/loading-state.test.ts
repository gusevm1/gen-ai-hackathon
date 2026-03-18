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

  it('renders with expected dimensions (110x40)', () => {
    const { container } = render(createElement(LoadingSkeleton));
    const skeleton = container.firstElementChild as HTMLElement;
    expect(skeleton.style.width).toBe('110px');
    expect(skeleton.style.height).toBe('40px');
  });

  it('contains label and progress bar placeholders', () => {
    const { container } = render(createElement(LoadingSkeleton));
    const skeleton = container.firstElementChild;
    // Should have two child elements: text label and progress bar track
    expect(skeleton!.children.length).toBe(2);
  });
});
