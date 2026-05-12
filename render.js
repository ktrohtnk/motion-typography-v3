const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({width: 1200, height: 2000});
  await page.goto('file:///Users/fds_2023_1/.gemini/antigravity/scratch/ver3/font_test.html', {waitUntil: 'networkidle0'});
  await page.screenshot({path: 'fonts_preview.png', fullPage: true});
  await browser.close();
})();
