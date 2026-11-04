// Solo game against the rival, the 《失踪的探险队》 campaign (2 players, two chapters), small screens, wrong room code,
// rename + long image, reconnect mid-round.
// Usage: node tests/test_room2.mjs <baseUrl> <outDir>
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const [,, BASE, OUT] = process.argv;
const b = await chromium.launch({ channel: 'chrome' });
const mk = async (w, h) => {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(String(e))); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
  p.on('dialog', d => d.accept());
  return p;
};
const A = await mk(375, 667), B = await mk(390, 760);   // iPhone SE, iPhone
let fails = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = (p, n, full = false) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: full });
const status = p => p.textContent('.status .t');
const until = async (fn, ms = 3000) => { for (let i = 0; i < ms / 100; i++) { if (await fn()) return true; await wait(100); } return false; };
const bottom = async (p, sel) => { const bx = await p.locator(sel).first().boundingBox(); return bx ? Math.round(bx.y + bx.height) : -1; };
const keyIn = async (p, id, key, seq) => {
  await p.click(`[data-act="cell"][data-id="${id}"][data-key="${key}"]`);
  for (const k of seq) await p.click(k[0] === 'q' ? `[data-act="q"][data-v="${k.slice(1)}"]` : `[data-act="k"][data-k="${k}"]`);
  await wait(250);
};
const playRounds = async (p, ids) => {
  for (let r = 1; r <= 5; r++) {
    for (const id of ids) { await p.click(`[data-act="pass"][data-id="${id}"]`); await wait(120); }
    await until(async () => !(await p.isDisabled('[data-act="next"]')));
    await p.click('[data-act="next"]');
    await until(async () => (await status(p)).includes(r < 5 ? `第${r + 1}/ 5 轮` : '游戏结束'));
  }
};

// wrong room code
await A.goto(BASE); await A.fill('#joinCode', 'zzzz'); await A.click('[data-act="join"]'); await wait(1500);
eq('unknown room shown', (await A.textContent('h2.h')).includes('不存在'), true);
await A.click('[data-act="leave"]'); await wait(300);

/* ---------- solo game ---------- */
await A.click('[data-act="create"]'); await A.waitForURL(/\?r=/); await A.waitForSelector('.chip');
const soloUrl = A.url();
await A.click('[data-act="n"][data-n="1"]'); await wait(250);
eq('solo: rival difficulty chips', await A.$$eval('[data-act="rival"]', c => c.length), 6);
eq('solo: no start-player buttons', await A.$('[data-act="draw"]'), null);
await A.click('[data-act="rival"][data-red="4"]'); await wait(250);
await A.fill('[data-name="0"]', '独行侠'); await A.press('[data-name="0"]', 'Enter'); await wait(400);
await A.click('[data-act="setup"]'); await A.waitForSelector('.sl');
const soloList = await A.textContent('.sl');
eq('solo setup: 2-player board + rival tiles', [soloList.includes('5 个封锁标记全部用上'), soloList.includes('红色 4 块'), soloList.includes('1 金币 + 1 指南针')], [true, true, true]);
await A.click('.sheet [data-act="close"]');
await A.click('[data-act="begin"]'); await A.waitForSelector('.status');
eq('solo: rival first in the track', await A.$$eval('.slot', s => s.map(x => x.dataset.k)), ['slot-rival', 'slot-red']);
eq('solo: only my pass button', await A.$$eval('[data-act="pass"]', c => c.map(x => x.dataset.id)), ['red']);
eq('SE: pass button on first screen', (await bottom(A, '[data-act="pass"]')) <= 667, true);
await shot(A, '20_solo_round');
await A.click('[data-act="pass"][data-id="red"]'); await wait(300);
eq('SE: cleanup header on screen once passed', (await bottom(A, '[data-k^="ph-end"] .phh')) <= 667, true);
const soloClean = await A.textContent('[data-k^="ph-end"]');
eq('solo cleanup: rival reshuffles, no start marker', [soloClean.includes('对手：收回考古学家'), soloClean.includes('起始玩家标记')], [true, false]);
await shot(A, '21_solo_cleanup');
await A.click('[data-act="next"]'); await until(async () => (await status(A)).includes('第2/'));
// reconnect mid-round keeps state
await A.reload(); await A.waitForSelector('.status');
eq('reload keeps round', await status(A), '第2/ 5 轮');
for (let r = 2; r <= 5; r++) {
  await A.click('[data-act="pass"][data-id="red"]'); await until(async () => !(await A.isDisabled('[data-act="next"]')));
  await A.click('[data-act="next"]'); await until(async () => (await status(A)) !== `第${r}/ 5 轮`);
}
eq('solo over', await status(A), '游戏结束');
await A.click('[data-act="tab"][data-tab="score"]'); await A.click('[data-act="me"][data-id="red"]');
await keyIn(A, 'red', 'res', ['1', '5', '+', '7', 'ok']); await keyIn(A, 'red', 'card', ['1', '0', 'ok']);   // 32
await A.click('[data-act="view"][data-v="rival"]'); await wait(200);
eq('rival rows', await A.$$eval('[data-k^="rs-"]', r => r.map(x => x.dataset.k.slice(3))), ['res', 'temple', 'guard', 'card', 'idolU', 'idolD']);
await keyIn(A, 'rival', 'res', ['1', '2', 'ok']); await keyIn(A, 'rival', 'idolU', ['3', 'ok']); await keyIn(A, 'rival', 'idolD', ['2', 'ok']);   // 12+9+4 = 25
eq('rival total', (await A.textContent('.ms-tot b')).trim(), '25');
await shot(A, '22_rival', true);
await A.click('[data-act="tab"][data-tab="mvp"]'); await wait(300);
eq('solo result', [(await A.textContent('.mvp .crown')).replace(/\s/g, ''), (await A.textContent('.mvp .pts')).includes('对手 25')], ['探险成功', true]);
eq('solo ranking: me then rival', await A.$$eval('.rk .row', r => r.map(x => x.dataset.k)), ['rk-red', 'rk-rival']);
// rename on the results tab, then save the long image
await A.click('[data-act="rn"]'); await wait(200);
await A.fill('[data-k="rn"] input', '改名王'); await A.press('[data-k="rn"] input', 'Enter'); await wait(800);
eq('rename shows in MVP', (await A.textContent('.mvp .nm')).trim(), '改名王');
eq('rename reaches the archive', (await (await fetch(new URL('/api/games?q=' + encodeURIComponent('改名王'), BASE))).json()).some(g => g.rival?.total === 25 && g.rival?.red === 4), true);
await A.click('[data-act="save"]'); await A.waitForSelector('.shotv img', { timeout: 20000 });
const dim = await A.$eval('.shotv img', i => [i.naturalWidth, i.naturalHeight]);
eq('long image is tall', dim[1] > dim[0], true);
writeFileSync(`${OUT}/23_long.jpg`, Buffer.from((await A.$eval('.shotv img', i => i.src)).split(',')[1], 'base64'));
await A.click('.shotv button');
await shot(A, '24_solo_mvp', true);

/* ---------- campaign: 2 players, chapter 1 won, chapter 2 lost ---------- */
await B.goto(BASE); await B.click('[data-act="create"]'); await B.waitForURL(/\?r=/); await B.waitForSelector('.chip');
const campUrl = B.url();
await A.goto(campUrl); await A.waitForSelector('.chip');
await B.click('[data-act="opt"][data-key="me"]'); await wait(250);
await A.click('[data-act="mode"][data-mode="camp"]'); await wait(300);
eq('campaign: only 1–2 players', await B.$$eval('[data-act="n"]', c => c.map(x => x.textContent)), ['1 人', '2 人']);
eq('campaign: 2 seats', await B.$$eval('[data-k^="seat-"]', s => s.length), 2);
eq('campaign: leaders required', await B.isDisabled('[data-act="begin"]'), true);
await B.click('[data-act="lead"][data-i="0"]');
eq('only 失踪的探险队 leaders without 探险队长', await B.$$eval('[data-act="pickl"]', c => c.map(x => x.dataset.l)), ['journalist', 'mechanic', 'prospector', 'traveler']);
await B.click('[data-act="pickl"][data-l="journalist"]'); await wait(250);
await A.click('[data-act="lead"][data-i="1"]'); await A.click('[data-act="pickl"][data-l="mechanic"]'); await wait(250);
await A.click('[data-act="diff"][data-i="1"][data-d="student"]'); await wait(250);
eq('difficulty synced', await B.textContent('[data-k="seat-1"] .dif .on'), '学生模式');
await B.fill('[data-name="0"]', '队长甲'); await A.fill('[data-name="1"]', '队长乙'); await A.press('[data-name="1"]', 'Enter'); await wait(600);
await B.click('[data-act="setup"]'); await B.waitForSelector('.sl');
const cl = await B.textContent('.sl');
eq('campaign setup: n+1, red rival, pigeons, journalist articles', [cl.includes('每堆 3 块'), cl.includes('红色玩家版图'), cl.includes('鸽子'), cl.includes('文章标记'), cl.includes('不使用封锁标记')], [true, true, true, true, true]);
await B.click('.sheet [data-act="close"]');
await shot(B, '25_camp_setup', true);
await B.click('[data-act="begin"]'); await B.waitForSelector('.status'); await A.waitForSelector('.status');
eq('campaign: rival last in round I', await B.$$eval('.slot', s => s.map(x => x.dataset.k.slice(5))), ['red', 'blue', 'rival']);
eq('campaign tab name', await B.$$eval('[data-act="tab"]', t => t.map(x => x.textContent)), ['流程', '计分', '本章']);
eq('round 1: mechanic gets a gold part', (await B.textContent('[data-k^="ph-start"]')).includes('机械师：抽牌后翻开牌列第 I 格'), true);
await playRounds(B, ['red', 'blue']);
eq('chapter 1 over', await status(A), '第 1 章 · 游戏结束');
await B.click('[data-act="tab"][data-tab="score"]'); await B.click('[data-act="view"][data-v="all"]');
await keyIn(B, 'red', 'card', ['4', '1', 'ok']); await keyIn(B, 'blue', 'card', ['4', '0', 'ok']);
await B.click('[data-act="view"][data-v="rival"]'); await keyIn(B, 'rival', 'card', ['3', '0', 'ok']);
eq('no achievement row before chapter 6', await B.$('[data-key="ach"]'), null);
await B.click('[data-act="tab"][data-tab="mvp"]'); await wait(300);
eq('chapter score with a half point', (await B.textContent('.calc b')).trim(), '胜利时章节分 10½');
await B.click('[data-act="ach"][data-n="2"]'); await B.fill('[data-plot]', '7');
await shot(B, '26_chapter', true);
await B.click('[data-act="chapter"]'); await until(async () => !!(await A.$('[data-k="cl-1"]')));
eq('back to setup for chapter 2 on A', (await A.textContent('[data-act="begin"]')).trim(), '开始第 2 章');
eq('chapter 1 logged', (await A.textContent('[data-k="cl-1"]')).replace(/\s+/g, ' ').includes('胜利 · 成就 2 · 剧情点 7'), true);
eq('running total', (await A.textContent('.ms-tot b')).trim(), '10½');
await A.click('[data-act="setup"]'); await A.waitForSelector('.sl');
eq('chapter 2 list reminds the plot-point card', (await A.textContent('.sl')).includes('剧情点（7）给的卡牌'), true);
await A.click('.sheet [data-act="close"]');
await A.click('[data-act="begin"]'); await A.waitForSelector('.status');
await A.click('[data-act="tab"][data-tab="mvp"]'); await A.click('[data-act="res"][data-r="lose"]'); await wait(150);
await A.click('[data-act="chapter"]'); await until(async () => !!(await B.$('[data-k="cl-2"]')));
eq('loss scores −10, total 0.5', [(await B.textContent('[data-k="cl-2"] .tot')).trim(), (await B.textContent('.ms-tot b')).trim()], ['−10', '½']);
await B.click('[data-act="setup"]'); await B.waitForSelector('.sl');
eq('penalty page after an accepted loss', (await B.textContent('.sl')).includes('第 16 页的惩罚'), true);
await B.click('.sheet [data-act="close"]');
await B.click('[data-act="unchapter"]'); await until(async () => !(await A.$('[data-k="cl-2"]')));
eq('undo the chapter-2 record', (await A.textContent('[data-act="begin"]')).trim(), '开始第 2 章');
await shot(A, '27_camp_log', true);
eq('campaign rooms are not archived', (await (await fetch(new URL('/api/games?q=' + encodeURIComponent('队长甲'), BASE))).json()).length, 0);

console.log(fails ? `${fails} FAILED` : 'ALL PASS', [...A.errs, ...B.errs].length ? '\nERRORS:\n' + [...A.errs, ...B.errs].join('\n') : '');
await b.close();
process.exit(fails ? 1 : 0);
