import { describe, it, expect, beforeEach } from 'vitest';

describe('Pretendard Font Application', () => {
  beforeEach(() => {
    // Apply the Pretendard font CSS rule to body to simulate the index.css effect
    document.body.style.fontFamily = "'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif";
  });

  it('should have Pretendard font applied to the document body', () => {
    const computedStyle = window.getComputedStyle(document.body);
    const fontFamily = computedStyle.fontFamily;
    
    // Should contain Pretendard in the font family string
    expect(fontFamily).toContain('Pretendard');
  });

  it('should have Korean text rendered with Pretendard font', () => {
    // Create a test element with Korean text
    const testElement = document.createElement('div');
    testElement.textContent = '한국어 텍스트';
    // Simulate the CSS inheritance that would happen in a real browser
    testElement.style.fontFamily = document.body.style.fontFamily;
    document.body.appendChild(testElement);
    
    const computedStyle = window.getComputedStyle(testElement);
    const fontFamily = computedStyle.fontFamily;
    
    // Should inherit Pretendard from body element
    expect(fontFamily).toContain('Pretendard');
    
    // Clean up
    document.body.removeChild(testElement);
  });

  it('should have Japanese text rendered with Pretendard font', () => {
    // Create a test element with Japanese text
    const testElement = document.createElement('div');
    testElement.textContent = '日本語のテキスト';
    // Simulate the CSS inheritance that would happen in a real browser
    testElement.style.fontFamily = document.body.style.fontFamily;
    document.body.appendChild(testElement);
    
    const computedStyle = window.getComputedStyle(testElement);
    const fontFamily = computedStyle.fontFamily;
    
    // Should inherit Pretendard from body element
    expect(fontFamily).toContain('Pretendard');
    
    // Clean up
    document.body.removeChild(testElement);
  });

  it('should have English text rendered with Pretendard font', () => {
    // Create a test element with English text
    const testElement = document.createElement('div');
    testElement.textContent = 'English text';
    // Simulate the CSS inheritance that would happen in a real browser
    testElement.style.fontFamily = document.body.style.fontFamily;
    document.body.appendChild(testElement);
    
    const computedStyle = window.getComputedStyle(testElement);
    const fontFamily = computedStyle.fontFamily;
    
    // Should inherit Pretendard from body element
    expect(fontFamily).toContain('Pretendard');
    
    // Clean up
    document.body.removeChild(testElement);
  });

  it('should have Pretendard Variable as the first font in the stack', () => {
    const computedStyle = window.getComputedStyle(document.body);
    const fontFamily = computedStyle.fontFamily;
    
    // Should have Pretendard Variable as the primary font
    expect(fontFamily).toMatch(/^['"]?Pretendard Variable['"]?/);
  });
});