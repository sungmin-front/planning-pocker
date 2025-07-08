import { describe, it, expect } from 'vitest';
import { formatChatMessage, stripFormatting, hasFormatting } from '../utils/messageFormatter';

describe('messageFormatter', () => {
  describe('formatChatMessage', () => {
    it('handles plain text messages', () => {
      const result = formatChatMessage('Hello world!');
      expect(result).toBe('Hello world!');
    });

    it('formats bold text', () => {
      const result = formatChatMessage('**bold text**');
      expect(result).toContain('<strong>bold text</strong>');
    });

    it('formats italic text', () => {
      const result = formatChatMessage('*italic text*');
      expect(result).toContain('<em>italic text</em>');
    });

    it('formats code text', () => {
      const result = formatChatMessage('`code text`');
      expect(result).toContain('<code>code text</code>');
    });

    it('handles mixed formatting', () => {
      const result = formatChatMessage('**bold** and *italic* and `code`');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
      expect(result).toContain('<code>code</code>');
    });

    it('handles line breaks', () => {
      const result = formatChatMessage('Line 1\nLine 2');
      expect(result).toContain('<br>');
    });

    it('handles nested formatting correctly', () => {
      const result = formatChatMessage('**bold *italic* bold**');
      // Should handle nested formatting gracefully
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });

    it('sanitizes potentially dangerous HTML', () => {
      const result = formatChatMessage('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('handles empty or invalid input', () => {
      expect(formatChatMessage('')).toBe('');
      expect(formatChatMessage('   ')).toBe('');
      expect(formatChatMessage(null as any)).toBe('');
      expect(formatChatMessage(undefined as any)).toBe('');
    });

    it('limits message length', () => {
      const longMessage = 'a'.repeat(2000);
      const result = formatChatMessage(longMessage);
      // Should be limited to 1000 characters
      expect(result.length).toBeLessThanOrEqual(1000);
    });

    it('handles malformed markdown gracefully', () => {
      const result = formatChatMessage('**incomplete bold');
      // Should not break, might not format but should return safe content
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('stripFormatting', () => {
    it('removes bold formatting', () => {
      const result = stripFormatting('**bold text**');
      expect(result).toBe('bold text');
    });

    it('removes italic formatting', () => {
      const result = stripFormatting('*italic text*');
      expect(result).toBe('italic text');
    });

    it('removes code formatting', () => {
      const result = stripFormatting('`code text`');
      expect(result).toBe('code text');
    });

    it('removes mixed formatting', () => {
      const result = stripFormatting('**bold** and *italic* and `code`');
      expect(result).toBe('bold and italic and code');
    });

    it('handles emoji codes', () => {
      const result = stripFormatting('Hello :smile: world');
      expect(result).toBe('Hello smile world');
    });

    it('handles empty input', () => {
      expect(stripFormatting('')).toBe('');
      expect(stripFormatting(null as any)).toBe('');
      expect(stripFormatting(undefined as any)).toBe('');
    });
  });

  describe('hasFormatting', () => {
    it('detects bold formatting', () => {
      expect(hasFormatting('**bold**')).toBe(true);
    });

    it('detects italic formatting', () => {
      expect(hasFormatting('*italic*')).toBe(true);
    });

    it('detects code formatting', () => {
      expect(hasFormatting('`code`')).toBe(true);
    });

    it('detects emoji codes', () => {
      expect(hasFormatting(':smile:')).toBe(true);
    });

    it('returns false for plain text', () => {
      expect(hasFormatting('plain text')).toBe(false);
    });

    it('handles empty input', () => {
      expect(hasFormatting('')).toBe(false);
      expect(hasFormatting(null as any)).toBe(false);
      expect(hasFormatting(undefined as any)).toBe(false);
    });
  });
});