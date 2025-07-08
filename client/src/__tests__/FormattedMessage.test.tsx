import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FormattedMessage } from '../components/FormattedMessage';

describe('FormattedMessage', () => {
  it('renders plain text correctly', () => {
    render(<FormattedMessage content="Hello world!" />);
    expect(screen.getByText('Hello world!')).toBeInTheDocument();
  });

  it('renders formatted content with HTML', () => {
    render(<FormattedMessage content="**bold text**" />);
    const container = screen.getByText('bold text');
    expect(container.tagName.toLowerCase()).toBe('strong');
  });

  it('applies custom className', () => {
    const { container } = render(
      <FormattedMessage content="test" className="custom-class" />
    );
    const messageDiv = container.firstChild as HTMLElement;
    expect(messageDiv.className).toContain('custom-class');
  });

  it('has proper CSS classes for styling', () => {
    const { container } = render(<FormattedMessage content="test" />);
    const messageDiv = container.firstChild as HTMLElement;
    expect(messageDiv.className).toContain('formatted-message');
    expect(messageDiv.className).toContain('prose');
  });

  it('handles empty content', () => {
    const { container } = render(<FormattedMessage content="" />);
    const messageDiv = container.firstChild as HTMLElement;
    expect(messageDiv).toBeInTheDocument();
    expect(messageDiv.innerHTML).toBe('');
  });

  it('sets proper styles for word breaking', () => {
    const { container } = render(<FormattedMessage content="verylongwordthatmightbreak" />);
    const messageDiv = container.firstChild as HTMLElement;
    expect(messageDiv.style.wordBreak).toBe('break-word');
    expect(messageDiv.style.overflowWrap).toBe('break-word');
  });
});