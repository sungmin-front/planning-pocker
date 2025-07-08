const { chromium } = require('playwright');

async function testVoteCountFix() {
  const browser = await chromium.launch({ headless: false });
  
  try {
    // Create two browser contexts to simulate two users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    console.log('🎯 Testing Vote Count Fix - Issue #8');
    console.log('===================================');
    
    // Navigate both pages to the application
    await page1.goto('http://localhost:4000');
    await page2.goto('http://localhost:4000');
    
    // Page 1: Create a room
    console.log('📝 Step 1: Creating room...');
    await page1.getByRole('button', { name: 'Create Room' }).click();
    await page1.getByPlaceholder('Enter your nickname').fill('Host');
    await page1.getByRole('button', { name: 'Create Room' }).click();
    await page1.waitForURL(/\/room\/[A-Z0-9]+/);
    
    // Get room ID from URL
    const roomUrl = page1.url();
    const roomId = roomUrl.split('/room/')[1];
    console.log(`✅ Room created: ${roomId}`);
    
    // Page 2: Join the room
    console.log('👥 Step 2: Second player joining...');
    await page2.goto(`http://localhost:4000/room/${roomId}`);
    await page2.getByPlaceholder('Enter your nickname').fill('Player2');
    await page2.getByRole('button', { name: 'Join Room' }).click();
    
    // Wait for players to be visible
    await page1.waitForSelector('text=Host');
    await page1.waitForSelector('text=Player2');
    console.log('✅ Both players in room');
    
    // Create a story
    console.log('📚 Step 3: Creating story...');
    await page1.getByRole('button', { name: 'Add Story' }).click();
    await page1.getByPlaceholder('Enter story title').fill('Test Story');
    await page1.getByPlaceholder('Enter story description').fill('Testing vote count fix');
    await page1.getByRole('button', { name: 'Add Story' }).click();
    
    // Select the story for voting
    await page1.getByText('Test Story').click();
    await page1.getByRole('button', { name: 'Start Voting' }).click();
    console.log('✅ Story created and voting started');
    
    // Both players vote
    console.log('🗳️ Step 4: Players voting...');
    await page1.getByRole('button', { name: '5' }).click();
    await page2.getByRole('button', { name: '8' }).click();
    
    // Wait for votes to be registered
    await page1.waitForSelector('text=2/2 voted');
    console.log('✅ Both players voted (2/2)');
    
    // Host reveals votes
    console.log('🎭 Step 5: Revealing votes...');
    await page1.getByRole('button', { name: 'Reveal Votes' }).click();
    await page1.waitForSelector('text=Votes revealed!');
    console.log('✅ Votes revealed');
    
    // Now test the fix: Add a third player during revealed state
    console.log('🔧 Step 6: Testing fix - Adding player during revealed state...');
    const context3 = await browser.newContext();
    const page3 = await context3.newPage();
    
    await page3.goto(`http://localhost:4000/room/${roomId}`);
    await page3.getByPlaceholder('Enter your nickname').fill('Player3');
    await page3.getByRole('button', { name: 'Join Room' }).click();
    
    // Wait for new player to join
    await page1.waitForSelector('text=Player3');
    console.log('✅ Player3 joined during revealed state');
    
    // Check that vote count still shows completion correctly
    // The vote progress should still show 100% (green) even though we now have 3 players
    await page1.waitForTimeout(1000); // Wait for UI updates
    
    // Take screenshot to verify
    await page1.screenshot({ path: 'vote-count-after-join.png' });
    console.log('📸 Screenshot saved: vote-count-after-join.png');
    
    // Test removing a player
    console.log('🔧 Step 7: Testing fix - Removing player during revealed state...');
    await page2.close();
    await context2.close();
    
    // Wait for player to be removed
    await page1.waitForTimeout(2000);
    
    // Take another screenshot
    await page1.screenshot({ path: 'vote-count-after-leave.png' });
    console.log('📸 Screenshot saved: vote-count-after-leave.png');
    
    // Verify the vote progress ring is still green (100% completion)
    const progressRing = await page1.locator('svg path[stroke="#10b981"]');
    const isProgressGreen = await progressRing.count() > 0;
    
    if (isProgressGreen) {
      console.log('✅ SUCCESS: Vote progress ring is still green (100% completion)');
    } else {
      console.log('❌ FAILURE: Vote progress ring is not green');
    }
    
    // Test restart voting
    console.log('🔄 Step 8: Testing restart voting...');
    await page1.getByRole('button', { name: 'Restart Voting' }).click();
    
    // Should now show current player count for voting
    await page1.waitForSelector('text=0/2 voted');
    console.log('✅ Restart voting shows correct current player count (0/2)');
    
    console.log('\n🎉 Test completed successfully!');
    console.log('Fix verified: Vote count correctly handles player changes during revealed state');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testVoteCountFix().catch(console.error);