import { marked } from 'marked';
import DOMPurify from 'dompurify';

// For now, let's implement basic emoji support without the library
// We can add more sophisticated emoji support later if needed

// Configure marked for basic formatting
marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * Formats a chat message with basic markdown and emoji support
 * Supports: **bold**, *italic*, `code`, and emojis
 * Sanitizes output to prevent XSS attacks
 */
export function formatChatMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return '';
  }

  // Trim and limit message length (already handled by server, but extra safety)
  const trimmedMessage = message.trim().substring(0, 1000);
  
  if (!trimmedMessage) {
    return '';
  }

  try {
    // Apply basic markdown formatting
    // We'll use a simple approach for safety, only allowing specific formatting
    let formattedMessage = applyBasicFormatting(trimmedMessage);
    
    // Convert basic emoji codes to Unicode emojis
    formattedMessage = convertBasicEmojis(formattedMessage);
    
    // Sanitize HTML to prevent XSS
    const sanitized = DOMPurify.sanitize(formattedMessage, {
      ALLOWED_TAGS: ['strong', 'em', 'code', 'br', 'img'],
      ALLOWED_ATTR: ['src', 'alt', 'class', 'style'],
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|https?):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      ADD_ATTR: ['target'],
      ADD_VALUES: { target: '_blank' }
    });

    return sanitized;
  } catch (error) {
    console.error('Error formatting message:', error);
    // Return original message if formatting fails
    return DOMPurify.sanitize(trimmedMessage);
  }
}

/**
 * Apply basic markdown-like formatting
 * **bold** -> <strong>bold</strong>
 * *italic* -> <em>italic</em>
 * `code` -> <code>code</code>
 */
function applyBasicFormatting(text: string): string {
  let formatted = text;

  // Handle bold text **text**
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Handle italic text *text*
  formatted = formatted.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
  
  // Handle inline code `code`
  formatted = formatted.replace(/`([^`]+?)`/g, '<code>$1</code>');
  
  // Handle line breaks
  formatted = formatted.replace(/\n/g, '<br>');

  return formatted;
}

/**
 * Convert basic emoji codes to Unicode emojis
 */
function convertBasicEmojis(text: string): string {
  const emojiMap: Record<string, string> = {
    ':smile:': '😊',
    ':heart:': '❤️',
    ':thumbsup:': '👍',
    ':thumbsdown:': '👎',
    ':laugh:': '😂',
    ':cry:': '😢',
    ':fire:': '🔥',
    ':star:': '⭐',
    ':check:': '✅',
    ':x:': '❌',
    ':warning:': '⚠️',
    ':info:': 'ℹ️',
    ':rocket:': '🚀',
    ':party:': '🎉',
    ':clap:': '👏',
    ':wave:': '👋',
    ':ok:': '👌',
    ':thinking:': '🤔',
    ':wink:': '😉',
    ':cool:': '😎'
  };

  let converted = text;
  for (const [code, emoji] of Object.entries(emojiMap)) {
    converted = converted.replace(new RegExp(code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), emoji);
  }
  
  return converted;
}

/**
 * Strip formatting from message (for plain text display)
 */
export function stripFormatting(message: string): string {
  if (!message || typeof message !== 'string') {
    return '';
  }

  // Remove markdown formatting
  let stripped = message
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+?)\*/g, '$1')  // Remove italic
    .replace(/`([^`]+?)`/g, '$1');   // Remove code

  // Convert emoji codes to simple text (basic support)
  stripped = stripped.replace(/:([a-z_]+):/g, '$1');

  return stripped.trim();
}

/**
 * Check if message contains any formatting
 */
export function hasFormatting(message: string): boolean {
  if (!message || typeof message !== 'string') {
    return false;
  }

  // Check for markdown patterns
  const patterns = [
    /\*\*.*?\*\*/,  // Bold
    /\*[^*]+?\*/,   // Italic
    /`[^`]+?`/,     // Code
    /:[\w_]+:/      // Emoji codes
  ];

  return patterns.some(pattern => pattern.test(message));
}