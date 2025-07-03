import { test, expect } from '@playwright/test';

test.describe('Internationalization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4000');
  });

  test('should display default Korean language', async ({ page }) => {
    // Check if the main title is in Korean
    await expect(page.locator('h1')).toContainText('Planning Poker');
    
    // Check if description is in Korean
    await expect(page.getByText('팀과 함께 스토리 포인트를 추정하세요')).toBeVisible();
    
    // Check if connect button is in Korean
    await expect(page.getByText('서버에 연결')).toBeVisible();
  });

  test('should toggle to English language', async ({ page }) => {
    // Find and click the language toggle button
    const languageToggle = page.getByTitle('Change Language');
    await languageToggle.click();
    
    // Click on English option
    await page.getByText('English').click();
    
    // Check if the description is now in English
    await expect(page.getByText('Estimate story points with your team')).toBeVisible();
    
    // Check if connect button is in English
    await expect(page.getByText('Connect to Server')).toBeVisible();
  });

  test('should persist language selection', async ({ page }) => {
    // Change to English
    const languageToggle = page.getByTitle('Change Language');
    await languageToggle.click();
    await page.getByText('English').click();
    
    // Reload the page
    await page.reload();
    
    // Check if English is still selected
    await expect(page.getByText('Estimate story points with your team')).toBeVisible();
  });

  test('should toggle back to Korean from English', async ({ page }) => {
    // First change to English
    const languageToggle = page.getByTitle('Change Language');
    await languageToggle.click();
    await page.getByText('English').click();
    
    // Verify English is displayed
    await expect(page.getByText('Estimate story points with your team')).toBeVisible();
    
    // Change back to Korean
    await languageToggle.click();
    await page.getByText('한국어').click();
    
    // Check if Korean is displayed again
    await expect(page.getByText('팀과 함께 스토리 포인트를 추정하세요')).toBeVisible();
  });

  test('should translate form labels and placeholders', async ({ page }) => {
    // Connect to server first to see the form
    await page.getByText('서버에 연결').click();
    
    // Check Korean labels and placeholders
    await expect(page.getByText('당신의 닉네임')).toBeVisible();
    await expect(page.getByPlaceholder('닉네임을 입력하세요')).toBeVisible();
    await expect(page.getByText('새 룸 만들기')).toBeVisible();
    
    // Switch to English
    const languageToggle = page.getByTitle('Change Language');
    await languageToggle.click();
    await page.getByText('English').click();
    
    // Check English labels and placeholders
    await expect(page.getByText('Your Nickname')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your nickname')).toBeVisible();
    await expect(page.getByText('Create New Room')).toBeVisible();
  });
});