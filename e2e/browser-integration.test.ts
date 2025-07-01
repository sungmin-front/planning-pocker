import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { startServer, stopServer, startClient, stopClient, waitForServer, testEnv } from './setup';

describe('Browser Integration E2E Tests', () => {
  let browser: Browser;
  let context: BrowserContext;
  let hostPage: Page;
  let playerPage: Page;

  beforeAll(async () => {
    console.log('Starting server and client for browser E2E tests...');
    await startServer();
    await waitForServer();
    await startClient();
    
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    console.log('Browser and services ready for testing');
  }, 90000);

  afterAll(async () => {
    await browser?.close();
    stopClient();
    stopServer();
  });

  beforeEach(async () => {
    context = await browser.newContext();
    hostPage = await context.newPage();
    playerPage = await context.newPage();

    // Enable console logging for debugging
    hostPage.on('console', msg => console.log(`[HOST PAGE] ${msg.text()}`));
    playerPage.on('console', msg => console.log(`[PLAYER PAGE] ${msg.text()}`));
  });

  afterEach(async () => {
    await context?.close();
  });

  describe('Full User Journey', () => {
    it('should complete full planning poker session', async () => {
      // Host creates room
      await hostPage.goto(testEnv.clientUrl);
      await hostPage.waitForSelector('text=Planning Poker');
      
      // Wait for auto-connection
      await hostPage.waitForSelector('input[placeholder="Enter your nickname"]', { timeout: 10000 });
      
      await hostPage.fill('input[placeholder="Enter your nickname"]', 'SessionHost');
      await hostPage.click('button:has-text("Create Room")');
      
      // Wait for room creation and navigation
      await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/, { timeout: 10000 });
      
      // Get room ID from URL
      const roomUrl = hostPage.url();
      const roomId = roomUrl.match(/\/room\/([A-Z0-9]{6})/)?.[1];
      expect(roomId).toBeDefined();

      // Player joins room
      await playerPage.goto(testEnv.clientUrl);
      await playerPage.waitForSelector('input[placeholder="Enter your nickname"]');
      
      await playerPage.fill('input[placeholder="Enter your nickname"]', 'SessionPlayer');
      await playerPage.fill('input[placeholder="Enter room code"]', roomId!);
      await playerPage.click('button:has-text("Join Room")');
      
      // Wait for room join and navigation
      await playerPage.waitForURL(/\/room\/[A-Z0-9]{6}/, { timeout: 10000 });

      // Verify both pages show the room
      await expect(hostPage.locator('text=SessionHost')).toBeVisible();
      await expect(hostPage.locator('text=SessionPlayer')).toBeVisible();
      await expect(playerPage.locator('text=SessionHost')).toBeVisible();
      await expect(playerPage.locator('text=SessionPlayer')).toBeVisible();

      // Host creates a story
      await hostPage.click('button:has-text("Add Story")');
      await hostPage.fill('input[placeholder="Story title"]', 'User Authentication');
      await hostPage.fill('textarea[placeholder="Story description"]', 'Implement login and logout functionality');
      await hostPage.click('button:has-text("Create Story")');

      // Verify story appears for both users
      await expect(hostPage.locator('text=User Authentication')).toBeVisible();
      await expect(playerPage.locator('text=User Authentication')).toBeVisible();

      // Both users vote
      await hostPage.click('button:has-text("5")');
      await playerPage.click('button:has-text("8")');

      // Verify voting feedback
      await expect(hostPage.locator('text=You voted: 5')).toBeVisible();
      await expect(playerPage.locator('text=You voted: 8')).toBeVisible();

      // Host reveals votes
      await hostPage.click('button:has-text("Reveal Votes")');

      // Verify votes are revealed
      await expect(hostPage.locator('text=SessionHost: 5')).toBeVisible();
      await expect(hostPage.locator('text=SessionPlayer: 8')).toBeVisible();
      await expect(playerPage.locator('text=SessionHost: 5')).toBeVisible();
      await expect(playerPage.locator('text=SessionPlayer: 8')).toBeVisible();

      // Host finalizes points
      await hostPage.click('button:has-text("Finalize")');
      await hostPage.selectOption('select', '8');
      await hostPage.click('button:has-text("Set Final Points")');

      // Verify story is finalized
      await expect(hostPage.locator('text=Final: 8 points')).toBeVisible();
      await expect(playerPage.locator('text=Final: 8 points')).toBeVisible();
    }, 60000);

    it('should handle host transfer via UI', async () => {
      // Create room and add player (similar setup)
      await hostPage.goto(testEnv.clientUrl);
      await hostPage.waitForSelector('input[placeholder="Enter your nickname"]');
      await hostPage.fill('input[placeholder="Enter your nickname"]', 'TransferHost');
      await hostPage.click('button:has-text("Create Room")');
      await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/);
      
      const roomUrl = hostPage.url();
      const roomId = roomUrl.match(/\/room\/([A-Z0-9]{6})/)?.[1];

      await playerPage.goto(testEnv.clientUrl);
      await playerPage.waitForSelector('input[placeholder="Enter your nickname"]');
      await playerPage.fill('input[placeholder="Enter your nickname"]', 'NewHost');
      await playerPage.fill('input[placeholder="Enter room code"]', roomId!);
      await playerPage.click('button:has-text("Join Room")');
      await playerPage.waitForURL(/\/room\/[A-Z0-9]{6}/);

      // Host transfers role
      await hostPage.click('button:has-text("Host Options")');
      await hostPage.click('text=Transfer Host');
      await hostPage.selectOption('select', 'NewHost');
      await hostPage.click('button:has-text("Transfer")');

      // Verify host change
      await expect(hostPage.locator('text=NewHost is now the host')).toBeVisible();
      await expect(playerPage.locator('text=You are now the host')).toBeVisible();
      
      // Verify UI changes
      await expect(hostPage.locator('button:has-text("Add Story")')).not.toBeVisible();
      await expect(playerPage.locator('button:has-text("Add Story")')).toBeVisible();
    }, 45000);

    it('should maintain session across page refresh', async () => {
      // Create room
      await hostPage.goto(testEnv.clientUrl);
      await hostPage.waitForSelector('input[placeholder="Enter your nickname"]');
      await hostPage.fill('input[placeholder="Enter your nickname"]', 'PersistentHost');
      await hostPage.click('button:has-text("Create Room")');
      await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/);

      const roomUrl = hostPage.url();
      
      // Create a story
      await hostPage.click('button:has-text("Add Story")');
      await hostPage.fill('input[placeholder="Story title"]', 'Persistent Story');
      await hostPage.click('button:has-text("Create Story")');
      await expect(hostPage.locator('text=Persistent Story')).toBeVisible();

      // Refresh page
      await hostPage.reload();
      await hostPage.waitForSelector('text=Planning Poker');

      // Should reconnect and restore state
      await expect(hostPage.locator('text=PersistentHost')).toBeVisible();
      await expect(hostPage.locator('text=Persistent Story')).toBeVisible();
    }, 30000);
  });

  describe('Real-time Synchronization', () => {
    let roomId: string;

    beforeEach(async () => {
      // Setup room with host and player
      await hostPage.goto(testEnv.clientUrl);
      await hostPage.waitForSelector('input[placeholder="Enter your nickname"]');
      await hostPage.fill('input[placeholder="Enter your nickname"]', 'SyncHost');
      await hostPage.click('button:has-text("Create Room")');
      await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/);
      
      const roomUrl = hostPage.url();
      roomId = roomUrl.match(/\/room\/([A-Z0-9]{6})/)?.[1]!;

      await playerPage.goto(testEnv.clientUrl);
      await playerPage.waitForSelector('input[placeholder="Enter your nickname"]');
      await playerPage.fill('input[placeholder="Enter your nickname"]', 'SyncPlayer');
      await playerPage.fill('input[placeholder="Enter room code"]', roomId);
      await playerPage.click('button:has-text("Join Room")');
      await playerPage.waitForURL(/\/room\/[A-Z0-9]{6}/);
    });

    it('should sync voting status in real-time', async () => {
      // Create story
      await hostPage.click('button:has-text("Add Story")');
      await hostPage.fill('input[placeholder="Story title"]', 'Real-time Sync');
      await hostPage.click('button:has-text("Create Story")');

      // Host votes
      await hostPage.click('button:has-text("3")');
      
      // Player should see host has voted
      await expect(playerPage.locator('text=SyncHost')).toBeVisible();
      await expect(playerPage.locator('[data-testid="player-voted-indicator"]')).toBeVisible();

      // Player votes
      await playerPage.click('button:has-text("5")');
      
      // Host should see player has voted
      await expect(hostPage.locator('[data-testid="all-voted-indicator"]')).toBeVisible();
    });

    it('should sync room updates when new players join', async () => {
      // Create a third page for another player
      const thirdPlayerPage = await context.newPage();
      
      await thirdPlayerPage.goto(testEnv.clientUrl);
      await thirdPlayerPage.waitForSelector('input[placeholder="Enter your nickname"]');
      await thirdPlayerPage.fill('input[placeholder="Enter your nickname"]', 'ThirdPlayer');
      await thirdPlayerPage.fill('input[placeholder="Enter room code"]', roomId);
      await thirdPlayerPage.click('button:has-text("Join Room")');

      // All pages should show the new player
      await expect(hostPage.locator('text=ThirdPlayer')).toBeVisible();
      await expect(playerPage.locator('text=ThirdPlayer')).toBeVisible();
      await expect(thirdPlayerPage.locator('text=SyncHost')).toBeVisible();
      await expect(thirdPlayerPage.locator('text=SyncPlayer')).toBeVisible();
      
      await thirdPlayerPage.close();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid room codes gracefully', async () => {
      await playerPage.goto(testEnv.clientUrl);
      await playerPage.waitForSelector('input[placeholder="Enter your nickname"]');
      await playerPage.fill('input[placeholder="Enter your nickname"]', 'TestPlayer');
      await playerPage.fill('input[placeholder="Enter room code"]', 'INVALID');
      await playerPage.click('button:has-text("Join Room")');

      // Should show error message
      await expect(playerPage.locator('text=Room not found')).toBeVisible();
      
      // Should stay on home page
      expect(playerPage.url()).toBe(testEnv.clientUrl + '/');
    });

    it('should handle connection issues', async () => {
      await hostPage.goto(testEnv.clientUrl);
      
      // Temporarily stop server
      stopServer();
      
      await hostPage.waitForSelector('input[placeholder="Enter your nickname"]');
      await hostPage.fill('input[placeholder="Enter your nickname"]', 'DisconnectedHost');
      await hostPage.click('button:has-text("Create Room")');

      // Should show connection error
      await expect(hostPage.locator('text=Connection Error')).toBeVisible();
      
      // Restart server for cleanup
      await startServer();
      await waitForServer();
    });

    it('should handle duplicate nicknames', async () => {
      // Create room
      await hostPage.goto(testEnv.clientUrl);
      await hostPage.waitForSelector('input[placeholder="Enter your nickname"]');
      await hostPage.fill('input[placeholder="Enter your nickname"]', 'DuplicateName');
      await hostPage.click('button:has-text("Create Room")');
      await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/);
      
      const roomUrl = hostPage.url();
      const roomId = roomUrl.match(/\/room\/([A-Z0-9]{6})/)?.[1]!;

      // Try to join with same nickname
      await playerPage.goto(testEnv.clientUrl);
      await playerPage.waitForSelector('input[placeholder="Enter your nickname"]');
      await playerPage.fill('input[placeholder="Enter your nickname"]', 'DuplicateName');
      await playerPage.fill('input[placeholder="Enter room code"]', roomId);
      await playerPage.click('button:has-text("Join Room")');

      // Should show error
      await expect(playerPage.locator('text=Nickname already taken')).toBeVisible();
    });
  });

  describe('Mobile Responsive Testing', () => {
    beforeEach(async () => {
      // Set mobile viewport
      await context.setViewportSize({ width: 375, height: 667 });
    });

    it('should work on mobile devices', async () => {
      await hostPage.goto(testEnv.clientUrl);
      await hostPage.waitForSelector('input[placeholder="Enter your nickname"]');
      
      // Should show mobile-optimized layout
      await expect(hostPage.locator('.mobile-layout')).toBeVisible();
      
      await hostPage.fill('input[placeholder="Enter your nickname"]', 'MobileHost');
      await hostPage.click('button:has-text("Create Room")');
      await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/);

      // Create story and vote
      await hostPage.click('button:has-text("Add Story")');
      await hostPage.fill('input[placeholder="Story title"]', 'Mobile Story');
      await hostPage.click('button:has-text("Create Story")');

      // Voting should work on mobile
      await hostPage.click('button:has-text("5")');
      await expect(hostPage.locator('text=You voted: 5')).toBeVisible();
    });

    it('should handle touch interactions', async () => {
      await hostPage.goto(testEnv.clientUrl);
      await hostPage.waitForSelector('input[placeholder="Enter your nickname"]');
      await hostPage.fill('input[placeholder="Enter your nickname"]', 'TouchUser');
      await hostPage.click('button:has-text("Create Room")');
      await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/);

      // Test touch-friendly voting buttons
      const voteButton = hostPage.locator('button:has-text("8")');
      await expect(voteButton).toHaveCSS('min-height', /44px|3rem/); // Touch-friendly size
      
      await voteButton.tap();
      await expect(hostPage.locator('text=You voted: 8')).toBeVisible();
    });
  });

  describe('Performance Testing', () => {
    it('should handle rapid user interactions', async () => {
      // Create room
      await hostPage.goto(testEnv.clientUrl);
      await hostPage.waitForSelector('input[placeholder="Enter your nickname"]');
      await hostPage.fill('input[placeholder="Enter your nickname"]', 'PerfHost');
      await hostPage.click('button:has-text("Create Room")');
      await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/);

      // Rapidly create multiple stories
      for (let i = 0; i < 5; i++) {
        await hostPage.click('button:has-text("Add Story")');
        await hostPage.fill('input[placeholder="Story title"]', `Performance Story ${i}`);
        await hostPage.click('button:has-text("Create Story")');
        await expect(hostPage.locator(`text=Performance Story ${i}`)).toBeVisible();
      }

      // All stories should be visible
      for (let i = 0; i < 5; i++) {
        await expect(hostPage.locator(`text=Performance Story ${i}`)).toBeVisible();
      }
    });

    it('should maintain performance with many voting rounds', async () => {
      // Setup room
      await hostPage.goto(testEnv.clientUrl);
      await hostPage.waitForSelector('input[placeholder="Enter your nickname"]');
      await hostPage.fill('input[placeholder="Enter your nickname"]', 'StressHost');
      await hostPage.click('button:has-text("Create Room")');
      await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/);

      const roomUrl = hostPage.url();
      const roomId = roomUrl.match(/\/room\/([A-Z0-9]{6})/)?.[1]!;

      await playerPage.goto(testEnv.clientUrl);
      await playerPage.waitForSelector('input[placeholder="Enter your nickname"]');
      await playerPage.fill('input[placeholder="Enter your nickname"]', 'StressPlayer');
      await playerPage.fill('input[placeholder="Enter room code"]', roomId);
      await playerPage.click('button:has-text("Join Room")');
      await playerPage.waitForURL(/\/room\/[A-Z0-9]{6}/);

      // Create story
      await hostPage.click('button:has-text("Add Story")');
      await hostPage.fill('input[placeholder="Story title"]', 'Stress Test Story');
      await hostPage.click('button:has-text("Create Story")');

      // Perform multiple voting rounds
      const votes = ['1', '2', '3', '5', '8'];
      
      for (const vote of votes) {
        // Vote
        await hostPage.click(`button:has-text("${vote}")`);
        await playerPage.click(`button:has-text("${vote}")`);
        
        // Reveal
        await hostPage.click('button:has-text("Reveal Votes")');
        await expect(hostPage.locator(`text=StressHost: ${vote}`)).toBeVisible();
        
        // Restart (except last round)
        if (vote !== '8') {
          await hostPage.click('button:has-text("Restart Voting")');
          await expect(hostPage.locator('button:has-text("Reveal Votes")')).not.toBeVisible();
        }
      }

      // Final verification
      await expect(hostPage.locator('text=StressHost: 8')).toBeVisible();
      await expect(playerPage.locator('text=StressPlayer: 8')).toBeVisible();
    });
  });
});