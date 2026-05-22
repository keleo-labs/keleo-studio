import playwright from 'playwright';

(async () => {
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 1200 } });
  const page = await context.newPage();
  
  console.log('Navigating to page...');
  await page.goto('http://localhost:3000/library/browse?libraryId=5a792849-31f3-4b53-b6ba-cc5547b5aea6');
  await page.waitForTimeout(3000);
  
  console.log('Taking screenshot...');
  await page.screenshot({ path: '/tmp/browse-view.png', fullPage: true });
  
  const title = await page.title();
  const bodyText = await page.evaluate(() => document.body.innerText);
  
  console.log('Title:', title);
  console.log('\n--- Page Content ---\n');
  console.log(bodyText);
  
  await browser.close();
})();
