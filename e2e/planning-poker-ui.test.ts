import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, Browser, Page } from 'playwright';

describe('Planning Poker UI E2E Tests', () => {
  let browser: Browser;
  let hostPage: Page;
  let playerPage: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: false });
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Room Creation and Joining Flow', () => {
    it('should create room and join as player through UI', async () => {
      // Create host page
      hostPage = await browser.newPage();
      await hostPage.goto('http://localhost:4000');
      
      // Verify homepage loaded
      await expect(hostPage.locator('text=Planning Poker')).toBeVisible();
      
      // Connect to server
      await hostPage.click('button:has-text("Connect to Server")');
      
      // Wait for connection and fill nickname
      await hostPage.waitForSelector('input[placeholder*="nickname"]', { timeout: 5000 });
      await hostPage.fill('input[placeholder*="nickname"]', 'ScrumMaster');
      
      // Create room
      await hostPage.click('button:has-text("Create Room")');
      
      // Wait for room creation and get room ID from URL
      await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/, { timeout: 10000 });
      const roomUrl = hostPage.url();
      const roomId = roomUrl.split('/room/')[1];
      
      expect(roomId).toMatch(/^[A-Z0-9]{6}$/);
      
      // Verify host is in the room
      await expect(hostPage.locator('text=ScrumMaster')).toBeVisible();
      await expect(hostPage.locator('[data-testid="host-badge"]')).toBeVisible();

      // Create player page and join the room
      playerPage = await browser.newPage();
      await playerPage.goto(`http://localhost:4000/room/${roomId}`);
      
      // Fill player nickname
      await playerPage.waitForSelector('input[placeholder*="nickname"]', { timeout: 5000 });
      await playerPage.fill('input[placeholder*="nickname"]', 'Developer1');
      
      // Join room
      await playerPage.click('button:has-text("Join Room")');
      
      // Wait for successful join
      await playerPage.waitForSelector('text=Developer1', { timeout: 5000 });
      
      // Verify both players are visible on both pages
      await expect(hostPage.locator('text=Developer1')).toBeVisible();
      await expect(playerPage.locator('text=ScrumMaster')).toBeVisible();
      await expect(playerPage.locator('text=Developer1')).toBeVisible();
      
      // Verify player count
      const playerCards = await hostPage.locator('[data-testid="player-card"]').count();
      expect(playerCards).toBe(2);

      await hostPage.close();
      await playerPage.close();
    }, 30000);

    it('should handle story creation and voting flow', async () => {
      // Create new pages for this test
      hostPage = await browser.newPage();
      playerPage = await browser.newPage();
      
      // Host creates room
      await hostPage.goto('http://localhost:4000');
      await hostPage.click('button:has-text("Connect to Server")');
      await hostPage.waitForSelector('input[placeholder*="nickname"]');
      await hostPage.fill('input[placeholder*="nickname"]', 'ProductOwner');
      await hostPage.click('button:has-text("Create Room")');
      
      // Wait for room creation
      await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/);
      const roomUrl = hostPage.url();
      const roomId = roomUrl.split('/room/')[1];
      
      // Player joins
      await playerPage.goto(`http://localhost:4000/room/${roomId}`);
      await playerPage.waitForSelector('input[placeholder*="nickname"]');
      await playerPage.fill('input[placeholder*="nickname"]', 'Developer');
      await playerPage.click('button:has-text("Join Room")');
      await playerPage.waitForSelector('text=Developer');

      // Host adds a story
      await hostPage.click('button:has-text("Add Story")');
      await hostPage.waitForSelector('input[placeholder*="title"]', { timeout: 5000 });
      
      await hostPage.fill('input[placeholder*="title"]', 'User Authentication');
      await hostPage.fill('textarea[placeholder*="description"]', 'Implement login and registration functionality');
      await hostPage.click('button:has-text("Add Story")');
      
      // Verify story appears on both pages
      await expect(hostPage.locator('text=User Authentication')).toBeVisible();
      await expect(playerPage.locator('text=User Authentication')).toBeVisible();

      // Host starts voting
      await hostPage.click('[data-testid="story-card"] button:has-text("Start Voting")');
      
      // Verify voting interface appears
      await expect(hostPage.locator('[data-testid="voting-cards"]')).toBeVisible();
      await expect(playerPage.locator('[data-testid="voting-cards"]')).toBeVisible();

      // Both players vote
      await hostPage.click('[data-testid="vote-card-5"]'); // Host votes 5
      await playerPage.click('[data-testid="vote-card-8"]'); // Player votes 8
      
      // Verify votes are cast (cards should show as selected)
      await expect(hostPage.locator('[data-testid="vote-card-5"][data-selected="true"]')).toBeVisible();
      await expect(playerPage.locator('[data-testid="vote-card-8"][data-selected="true"]')).toBeVisible();

      // Host reveals votes
      await hostPage.click('button:has-text("Reveal Votes")');
      
      // Verify voting results are shown
      await expect(hostPage.locator('text=Voting Results')).toBeVisible();
      await expect(playerPage.locator('text=Voting Results')).toBeVisible();
      
      // Verify votes are displayed
      await expect(hostPage.locator('text=ProductOwner: 5')).toBeVisible();
      await expect(hostPage.locator('text=Developer: 8')).toBeVisible();

      // Host finalizes story points
      await hostPage.click('button:has-text("Finalize Points")');
      await hostPage.waitForSelector('input[placeholder*="final points"]');
      await hostPage.fill('input[placeholder*="final points"]', '5');
      await hostPage.click('button:has-text("Confirm")');
      
      // Verify story is finalized
      await expect(hostPage.locator('text=Story Points: 5')).toBeVisible();
      await expect(playerPage.locator('text=Story Points: 5')).toBeVisible();

      await hostPage.close();
      await playerPage.close();
    }, 45000);

    it('should test Jira integration modal', async () => {
      hostPage = await browser.newPage();
      
      // Create room
      await hostPage.goto('http://localhost:4000');
      await hostPage.click('button:has-text("Connect to Server")');
      await hostPage.waitForSelector('input[placeholder*="nickname"]');
      await hostPage.fill('input[placeholder*="nickname"]', 'JiraUser');
      await hostPage.click('button:has-text("Create Room")');
      await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/);

      // Open Jira integration
      await hostPage.click('button:has-text("Jira Integration")');
      
      // Verify Jira modal opens
      await expect(hostPage.locator('text=Import from Jira')).toBeVisible();
      
      // Fill Jira configuration (with test data)
      await hostPage.fill('input[placeholder*="Base URL"]', 'https://test.atlassian.net');
      await hostPage.fill('input[placeholder*="Email"]', 'test@example.com');
      await hostPage.fill('input[placeholder*="API Token"]', 'test-token');
      await hostPage.fill('input[placeholder*="Project Key"]', 'TEST');
      
      // Note: We won't actually fetch from Jira since we don't have valid credentials
      // Just verify the UI elements are present
      await expect(hostPage.locator('button:has-text("Fetch Stories")')).toBeVisible();
      await expect(hostPage.locator('button:has-text("Cancel")')).toBeVisible();
      
      // Close modal
      await hostPage.click('button:has-text("Cancel")');
      
      // Verify modal is closed
      await expect(hostPage.locator('text=Import from Jira')).not.toBeVisible();

      await hostPage.close();
    }, 20000);

    it('should test responsive layout toggle', async () => {
      hostPage = await browser.newPage();
      
      // Create room with multiple players
      await hostPage.goto('http://localhost:4000');
      await hostPage.click('button:has-text("Connect to Server")');
      await hostPage.waitForSelector('input[placeholder*="nickname"]');
      await hostPage.fill('input[placeholder*="nickname"]', 'LayoutTester');
      await hostPage.click('button:has-text("Create Room")');
      await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/);

      // Test layout toggle if available
      const layoutToggle = hostPage.locator('[data-testid="layout-toggle"]');
      if (await layoutToggle.isVisible()) {
        await layoutToggle.click();
        
        // Verify layout changed (specific implementation depends on your layout system)
        await expect(hostPage.locator('[data-testid="player-layout"]')).toBeVisible();
      }

      await hostPage.close();
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle invalid room ID gracefully', async () => {
      hostPage = await browser.newPage();
      
      // Try to join non-existent room
      await hostPage.goto('http://localhost:4000/room/INVALID');
      
      // Should show error or redirect to home
      const isErrorVisible = await hostPage.locator('text=Room not found').isVisible({ timeout: 5000 }).catch(() => false);
      const isHomeRedirect = hostPage.url().includes('http://localhost:4000') && !hostPage.url().includes('/room/');
      
      expect(isErrorVisible || isHomeRedirect).toBe(true);

      await hostPage.close();
    }, 10000);

    it('should prevent duplicate nicknames', async () => {
      hostPage = await browser.newPage();
      playerPage = await browser.newPage();
      
      // Host creates room
      await hostPage.goto('http://localhost:4000');
      await hostPage.click('button:has-text("Connect to Server")');
      await hostPage.waitForSelector('input[placeholder*="nickname"]');
      await hostPage.fill('input[placeholder*="nickname"]', 'UniqueUser');
      await hostPage.click('button:has-text("Create Room")');
      await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/);
      
      const roomUrl = hostPage.url();
      const roomId = roomUrl.split('/room/')[1];
      
      // Player tries to join with same nickname
      await playerPage.goto(`http://localhost:4000/room/${roomId}`);
      await playerPage.waitForSelector('input[placeholder*="nickname"]');
      await playerPage.fill('input[placeholder*="nickname"]', 'UniqueUser');
      await playerPage.click('button:has-text("Join Room")');
      
      // Should show error about duplicate nickname
      await expect(playerPage.locator('text=Nickname already taken')).toBeVisible({ timeout: 5000 });

      await hostPage.close();
      await playerPage.close();
    }, 15000);
  });
});