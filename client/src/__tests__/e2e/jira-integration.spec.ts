import { test, expect } from '@playwright/test';

test.describe('Jira Integration E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Mock the Jira API responses for testing
    await page.route('**/api/jira/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          configured: true,
          connected: true,
          message: 'Jira connection successful'
        })
      });
    });

    await page.route('**/api/jira/boards', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          boards: [
            { id: 1, name: 'Test Board 1', type: 'scrum' },
            { id: 2, name: 'Test Board 2', type: 'kanban' }
          ]
        })
      });
    });

    await page.route('**/api/jira/boards/1/sprints', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sprints: [
            { id: 1, name: 'Sprint 1', state: 'active' },
            { id: 2, name: 'Sprint 2', state: 'future' }
          ]
        })
      });
    });

    await page.route('**/api/jira/sprints/1/issues', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          issues: [
            {
              id: '1',
              key: 'TEST-1',
              summary: 'Implement user authentication',
              description: 'Add login and registration functionality',
              issueType: { name: 'Story', iconUrl: '' },
              status: { name: 'To Do', statusCategory: { name: 'To Do' } },
              assignee: { displayName: 'John Doe', emailAddress: 'john@test.com' },
              priority: { name: 'High' },
              storyPoints: 8
            },
            {
              id: '2', 
              key: 'TEST-2',
              summary: 'Design user interface',
              description: 'Create mockups and wireframes',
              issueType: { name: 'Task', iconUrl: '' },
              status: { name: 'In Progress', statusCategory: { name: 'In Progress' } },
              assignee: { displayName: 'Jane Smith', emailAddress: 'jane@test.com' },
              priority: { name: 'Medium' },
              storyPoints: 5
            }
          ]
        })
      });
    });

    await page.route('**/api/jira/issues/import', async route => {
      const requestBody = await route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          stories: requestBody.issues.map((issue: any) => ({
            title: `[${issue.key}] ${issue.summary}`,
            description: `Issue: ${issue.summary}\n\n**Type:** ${issue.issueType.name}\n**Priority:** ${issue.priority?.name || 'None'}`
          })),
          message: `${requestBody.issues.length}개의 스토리가 생성되었습니다.`
        })
      });
    });
  });

  test('should create a room and access Jira integration as host', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:3001');
    
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Planning Poker');
    
    // Create a new room
    await page.fill('input[placeholder="Enter your nickname"]', 'TestHost');
    await page.click('button:has-text("Create Room")');
    
    // Wait for room to be created and verify we're in the room
    await expect(page.locator('h1')).toContainText('TestHost\'s Room', { timeout: 10000 });
    
    // Verify we are the host (should see Host badge)
    await expect(page.locator('text=Host')).toBeVisible();
    
    // Look for the Jira integration button
    await expect(page.locator('button:has-text("Import from Jira")')).toBeVisible();
  });

  test('should open Jira integration modal and show connection status', async ({ page }) => {
    // Create room first
    await page.goto('http://localhost:3001');
    await page.fill('input[placeholder="Enter your nickname"]', 'TestHost');
    await page.click('button:has-text("Create Room")');
    await expect(page.locator('h1')).toContainText('TestHost\'s Room', { timeout: 10000 });
    
    // Click Jira integration button
    await page.click('button:has-text("Import from Jira")');
    
    // Wait for modal to open
    await expect(page.locator('text=Jira 연동')).toBeVisible();
    await expect(page.locator('text=연결됨')).toBeVisible();
    
    // Should show board selection
    await expect(page.locator('text=보드 선택')).toBeVisible();
    await expect(page.locator('text=보드를 선택하세요')).toBeVisible();
  });

  test('should complete full Jira integration workflow', async ({ page }) => {
    // Create room
    await page.goto('http://localhost:3001');
    await page.fill('input[placeholder="Enter your nickname"]', 'TestHost');
    await page.click('button:has-text("Create Room")');
    await expect(page.locator('h1')).toContainText('TestHost\'s Room', { timeout: 10000 });
    
    // Open Jira integration modal
    await page.click('button:has-text("Import from Jira")');
    await expect(page.locator('text=Jira 연동')).toBeVisible();
    
    // Step 1: Select board
    await page.click('[role="combobox"]:near(:text("보드 선택"))');
    await page.click('text=Test Board 1 (scrum)');
    
    // Step 2: Select sprint 
    await expect(page.locator('text=스프린트 선택')).toBeVisible();
    await page.click('[role="combobox"]:near(:text("스프린트 선택"))');
    await page.click('text=Sprint 1');
    
    // Step 3: Wait for issues to load and verify they're displayed
    await expect(page.locator('text=TEST-1')).toBeVisible();
    await expect(page.locator('text=Implement user authentication')).toBeVisible();
    await expect(page.locator('text=TEST-2')).toBeVisible();
    await expect(page.locator('text=Design user interface')).toBeVisible();
    
    // Step 4: Select issues for import
    const issue1Checkbox = page.locator('input[type="checkbox"]').first();
    const issue2Checkbox = page.locator('input[type="checkbox"]').nth(1);
    
    await issue1Checkbox.check();
    await issue2Checkbox.check();
    
    // Verify selection count is updated
    await expect(page.locator('text=선택한 이슈를 스토리로 가져오기 (2개)')).toBeVisible();
    
    // Step 5: Import issues
    await page.click('button:has-text("선택한 이슈를 스토리로 가져오기")');
    
    // Step 6: Verify success message (toast)
    await expect(page.locator('text=2개의 스토리가 생성되었습니다')).toBeVisible();
    
    // Modal should close automatically
    await expect(page.locator('text=Jira 연동')).not.toBeVisible();
  });

  test('should handle Jira not configured scenario', async ({ page }) => {
    // Override the status route to return not configured
    await page.route('**/api/jira/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          configured: false,
          connected: false,
          message: 'Jira is not configured. Please set environment variables.'
        })
      });
    });
    
    // Create room
    await page.goto('http://localhost:3001');
    await page.fill('input[placeholder="Enter your nickname"]', 'TestHost');
    await page.click('button:has-text("Create Room")');
    await expect(page.locator('h1')).toContainText('TestHost\'s Room', { timeout: 10000 });
    
    // Open Jira integration modal
    await page.click('button:has-text("Import from Jira")');
    
    // Should show not configured message
    await expect(page.locator('text=Jira가 설정되지 않았습니다')).toBeVisible();
    await expect(page.locator('button:has-text("다시 확인")')).toBeVisible();
  });

  test('should handle connection failure gracefully', async ({ page }) => {
    // Override the status route to return connection failure
    await page.route('**/api/jira/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          configured: true,
          connected: false,
          message: 'Jira connection failed'
        })
      });
    });
    
    // Create room
    await page.goto('http://localhost:3001');
    await page.fill('input[placeholder="Enter your nickname"]', 'TestHost');
    await page.click('button:has-text("Create Room")');
    await expect(page.locator('h1')).toContainText('TestHost\'s Room', { timeout: 10000 });
    
    // Open Jira integration modal
    await page.click('button:has-text("Import from Jira")');
    
    // Should show connection failed message
    await expect(page.locator('text=Jira에 연결할 수 없습니다')).toBeVisible();
    await expect(page.locator('button:has-text("연결 재시도")')).toBeVisible();
  });

  test('should show error when no issues are selected for import', async ({ page }) => {
    // Create room and navigate through Jira integration
    await page.goto('http://localhost:3001');
    await page.fill('input[placeholder="Enter your nickname"]', 'TestHost');
    await page.click('button:has-text("Create Room")');
    await expect(page.locator('h1')).toContainText('TestHost\'s Room', { timeout: 10000 });
    
    await page.click('button:has-text("Import from Jira")');
    await page.click('[role="combobox"]:near(:text("보드 선택"))');
    await page.click('text=Test Board 1 (scrum)');
    await page.click('[role="combobox"]:near(:text("스프린트 선택"))');
    await page.click('text=Sprint 1');
    
    // Wait for issues to load
    await expect(page.locator('text=TEST-1')).toBeVisible();
    
    // Try to import without selecting any issues
    await page.click('button:has-text("선택한 이슈를 스토리로 가져오기 (0개)")');
    
    // Should show error toast
    await expect(page.locator('text=가져올 이슈를 선택해주세요')).toBeVisible();
  });

  test('should toggle issue selection correctly', async ({ page }) => {
    // Create room and navigate to issue selection
    await page.goto('http://localhost:3001');
    await page.fill('input[placeholder="Enter your nickname"]', 'TestHost');
    await page.click('button:has-text("Create Room")');
    await expect(page.locator('h1')).toContainText('TestHost\'s Room', { timeout: 10000 });
    
    await page.click('button:has-text("Import from Jira")');
    await page.click('[role="combobox"]:near(:text("보드 선택"))');
    await page.click('text=Test Board 1 (scrum)');
    await page.click('[role="combobox"]:near(:text("스프린트 선택"))');
    await page.click('text=Sprint 1');
    
    await expect(page.locator('text=TEST-1')).toBeVisible();
    
    // Test individual selection
    const issue1Checkbox = page.locator('input[type="checkbox"]').first();
    await issue1Checkbox.check();
    await expect(page.locator('text=선택한 이슈를 스토리로 가져오기 (1개)')).toBeVisible();
    
    await issue1Checkbox.uncheck();
    await expect(page.locator('text=선택한 이슈를 스토리로 가져오기 (0개)')).toBeVisible();
    
    // Test "select all" functionality
    await page.click('button:has-text("전체 선택")');
    await expect(page.locator('text=선택한 이슈를 스토리로 가져오기 (2개)')).toBeVisible();
    
    await page.click('button:has-text("전체 해제")');
    await expect(page.locator('text=선택한 이슈를 스토리로 가져오기 (0개)')).toBeVisible();
  });

  test('should display issue details correctly', async ({ page }) => {
    // Create room and navigate to issue selection  
    await page.goto('http://localhost:3001');
    await page.fill('input[placeholder="Enter your nickname"]', 'TestHost');
    await page.click('button:has-text("Create Room")');
    await expect(page.locator('h1')).toContainText('TestHost\'s Room', { timeout: 10000 });
    
    await page.click('button:has-text("Import from Jira")');
    await page.click('[role="combobox"]:near(:text("보드 선택"))');
    await page.click('text=Test Board 1 (scrum)');
    await page.click('[role="combobox"]:near(:text("스프린트 선택"))');
    await page.click('text=Sprint 1');
    
    // Verify issue details are displayed
    await expect(page.locator('text=TEST-1')).toBeVisible();
    await expect(page.locator('text=Implement user authentication')).toBeVisible();
    await expect(page.locator('text=Story')).toBeVisible();
    await expect(page.locator('text=To Do')).toBeVisible();
    await expect(page.locator('text=8SP')).toBeVisible();
    await expect(page.locator('text=담당자: John Doe')).toBeVisible();
    
    await expect(page.locator('text=TEST-2')).toBeVisible();
    await expect(page.locator('text=Design user interface')).toBeVisible();
    await expect(page.locator('text=Task')).toBeVisible();
    await expect(page.locator('text=In Progress')).toBeVisible();
    await expect(page.locator('text=5SP')).toBeVisible();
    await expect(page.locator('text=담당자: Jane Smith')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Override boards API to return error
    await page.route('**/api/jira/boards', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Failed to fetch boards from Jira'
        })
      });
    });
    
    // Create room
    await page.goto('http://localhost:3001');
    await page.fill('input[placeholder="Enter your nickname"]', 'TestHost');
    await page.click('button:has-text("Create Room")');
    await expect(page.locator('h1')).toContainText('TestHost\'s Room', { timeout: 10000 });
    
    // Open Jira integration modal
    await page.click('button:has-text("Import from Jira")');
    
    // Should show error toast
    await expect(page.locator('text=Jira 보드 목록을 불러올 수 없습니다')).toBeVisible();
  });
});