// Local-only navigation and room preservation checks.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
const BASE = process.argv[2] || 'http://localhost:8896/';
const OUT = process.argv[3] || '/tmp/claude-501/codex_tasks/shots';
assert(['localhost', '127.0.0.1'].includes(new URL(BASE).hostname), 'Run against local service only');
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.route('https://boardgame.leisurecat.cloud/**', route => route.fulfill({ json: {} }));
  const page = await context.newPage();
  const check = async label => {
    await page.evaluate(() => window.scrollTo(0, 0));
    const problems = await page.locator('.back-nav:not(.rate-nav)').evaluate(nav => {
      const a = nav.getBoundingClientRect(), errors = [];
      if (a.height < 36 || a.width <= 0 || a.top < 0 || a.bottom > innerHeight || a.left < 0 || a.right > innerWidth) errors.push('navigation visibility/size');
      if (document.documentElement.scrollWidth > innerWidth) errors.push('horizontal overflow');
      for (const el of document.querySelectorAll('a,button,input,textarea,select,[role="button"],.ttl,.conn,.hero h1,.hero .en,.hero-art .ht')) {
        if (el === nav || el.contains(nav)) continue;
        const b = el.getBoundingClientRect();
        if (b.width && b.height && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) errors.push('overlap: ' + el.outerHTML.slice(0, 100));
      }
      return errors;
    });
    assert.deepEqual(problems, [], label);
    console.log('PASS', label);
  };
  await page.goto(BASE);
  assert.equal(await page.locator('.back-nav:not(.rate-nav)').textContent(), '‹ 全部游戏');
  assert.equal(await page.locator('.back-nav:not(.rate-nav)').getAttribute('href'), 'https://boardgame.leisurecat.cloud');
  await check('landing navigation');
  await page.screenshot({ path: `${OUT}/nav_arnak_landing.png` });
  await page.click('[data-act="create"]');
  await page.waitForSelector('[data-act="begin"]');
  const code = new URL(page.url()).searchParams.get('r');
  assert.equal(await page.locator('.back-nav:not(.rate-nav)').textContent(), '‹ 首页');
  await page.click('[data-act="side"][data-side="snake"]');
  await page.waitForSelector('[data-side="snake"].on');
  await check('setup navigation');
  await page.click('.back-nav:not(.rate-nav)');
  await page.waitForSelector('[data-act="create"]');
  await page.click(`[data-act="rejoin"][data-code="${code}"]`);
  await page.waitForSelector('[data-side="snake"].on');
  console.log('PASS setup retained after leaving and rejoining from lobby');
  await page.click('[data-act="begin"]');
  await page.waitForSelector('.status');
  await check('game navigation');
  await page.screenshot({ path: `${OUT}/nav_arnak_room.png` });
  for (let round = 1; round <= 5; round++) {
    const passes = page.locator('[data-act="pass"]:not(:disabled)');
    while (await passes.count()) { await passes.first().click(); await page.waitForTimeout(120); }
    await page.click('[data-act="next"]');
    await page.waitForTimeout(150);
  }
  for (const tab of ['score', 'mvp']) {
    await page.click(`[data-act="tab"][data-tab="${tab}"]`);
    await check(`${tab} navigation`);
  }
  assert.equal(await page.locator('#shot .back-nav').count(), 0);
  await page.click('.back-nav:not(.rate-nav)');
  await page.waitForSelector('[data-act="create"]');
  await page.fill('#joinCode', code);
  await page.click('[data-act="join"]');
  await page.waitForSelector('.status');
  assert.match(await page.locator('.status').textContent(), /游戏结束/);
  console.log('PASS completed game retained after rejoining by code');
  for (const name of ['guide', 'history']) {
    await page.goto(new URL(`${name}.html`, BASE).href);
    assert.equal(await page.locator('.back-nav:not(.rate-nav)').textContent(), '‹ 返回');
    assert.equal(await page.locator('.back-nav:not(.rate-nav)').getAttribute('href'), '/');
    await check(`${name} navigation`);
    await page.screenshot({ path: `${OUT}/nav_arnak_${name}.png` });
    await page.click('.back-nav:not(.rate-nav)');
    await page.waitForSelector('[data-act="create"]');
  }
  console.log('ALL PASS');
} finally { await browser.close(); }
