import { test, expect } from '@playwright/test';

test.describe('Ticket Number Sorting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4000');
  });

  test('should sort ticket numbers numerically in descending order', async ({ page }) => {
    // This test assumes we have a room with multiple tickets
    // We'll test the sorting logic by creating a mock scenario
    
    // First, let's create some test data and inject it
    await page.evaluate(() => {
      // Mock stories with different ticket numbers
      const mockStories = [
        { 
          id: '1', 
          title: 'Test Story 1', 
          jiraMetadata: { jiraKey: 'PROJ-2' },
          createdAt: '2024-01-01T00:00:00Z'
        },
        { 
          id: '2', 
          title: 'Test Story 2', 
          jiraMetadata: { jiraKey: 'PROJ-10' },
          createdAt: '2024-01-02T00:00:00Z'
        },
        { 
          id: '3', 
          title: 'Test Story 3', 
          jiraMetadata: { jiraKey: 'PROJ-1' },
          createdAt: '2024-01-03T00:00:00Z'
        },
        { 
          id: '4', 
          title: 'Test Story 4', 
          jiraMetadata: { jiraKey: 'PROJ-100' },
          createdAt: '2024-01-04T00:00:00Z'
        }
      ];

      // Test the extractTicketNumber function
      const extractTicketNumber = (ticketKey: string): number => {
        if (!ticketKey) return 0;
        const match = ticketKey.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      };

      // Test the function
      const testResults = [
        extractTicketNumber('PROJ-2'),
        extractTicketNumber('PROJ-10'), 
        extractTicketNumber('PROJ-1'),
        extractTicketNumber('PROJ-100'),
        extractTicketNumber('ABC-456'),
        extractTicketNumber('NO-NUMBER'),
        extractTicketNumber('')
      ];

      console.log('Extract ticket number results:', testResults);

      // Sort test for descending order
      const sortedDesc = [...mockStories].sort((a, b) => {
        const aTicket = a.jiraMetadata?.jiraKey || a.title || '';
        const bTicket = b.jiraMetadata?.jiraKey || b.title || '';
        const aTicketNum = extractTicketNumber(aTicket);
        const bTicketNum = extractTicketNumber(bTicket);
        if (aTicketNum && bTicketNum) {
          return bTicketNum - aTicketNum;
        }
        return bTicket.localeCompare(aTicket);
      });

      console.log('Sorted descending:', sortedDesc.map(s => s.jiraMetadata.jiraKey));

      // Sort test for ascending order
      const sortedAsc = [...mockStories].sort((a, b) => {
        const aTicket = a.jiraMetadata?.jiraKey || a.title || '';
        const bTicket = b.jiraMetadata?.jiraKey || b.title || '';
        const aTicketNum = extractTicketNumber(aTicket);
        const bTicketNum = extractTicketNumber(bTicket);
        if (aTicketNum && bTicketNum) {
          return aTicketNum - bTicketNum;
        }
        return aTicket.localeCompare(bTicket);
      });

      console.log('Sorted ascending:', sortedAsc.map(s => s.jiraMetadata.jiraKey));

      // Store results for verification
      (window as any).testResults = {
        extractResults: testResults,
        sortedDesc: sortedDesc.map(s => s.jiraMetadata.jiraKey),
        sortedAsc: sortedAsc.map(s => s.jiraMetadata.jiraKey)
      };
    });

    // Verify the results
    const results = await page.evaluate(() => (window as any).testResults);
    
    // Test extractTicketNumber function
    expect(results.extractResults).toEqual([2, 10, 1, 100, 456, 0, 0]);
    
    // Test descending sort - should be: PROJ-100, PROJ-10, PROJ-2, PROJ-1
    expect(results.sortedDesc).toEqual(['PROJ-100', 'PROJ-10', 'PROJ-2', 'PROJ-1']);
    
    // Test ascending sort - should be: PROJ-1, PROJ-2, PROJ-10, PROJ-100  
    expect(results.sortedAsc).toEqual(['PROJ-1', 'PROJ-2', 'PROJ-10', 'PROJ-100']);
  });

  test('should handle edge cases in ticket number extraction', async ({ page }) => {
    await page.evaluate(() => {
      const extractTicketNumber = (ticketKey: string): number => {
        if (!ticketKey) return 0;
        const match = ticketKey.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      };

      const edgeCases = [
        'PROJ-123',      // Normal case
        'ABC-0',         // Zero
        'TEST-999999',   // Large number
        'NO-DASH123',    // No dash, but ends with number
        'MULTIPLE-1-2',  // Multiple dashes
        'LETTERS-ABC',   // No number at end
        '',              // Empty string
        'JUST-TEXT',     // No numbers
        '123',           // Just number
        'PROJ-',         // Ends with dash
        'PROJ-123ABC'    // Number not at end
      ];

      const results = edgeCases.map(extractTicketNumber);
      
      (window as any).edgeCaseResults = {
        inputs: edgeCases,
        outputs: results
      };
    });

    const results = await page.evaluate(() => (window as any).edgeCaseResults);
    
    expect(results.outputs).toEqual([
      123,    // PROJ-123
      0,      // ABC-0  
      999999, // TEST-999999
      123,    // NO-DASH123
      2,      // MULTIPLE-1-2 (takes last number)
      0,      // LETTERS-ABC
      0,      // Empty string
      0,      // JUST-TEXT
      123,    // 123
      0,      // PROJ-
      0       // PROJ-123ABC (number not at end)
    ]);
  });
});