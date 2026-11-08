// Two phones in one room play a full 3-player game with both expansions and leaders (5 rounds), then score it.
// Usage: node tests/test_room.mjs <baseUrl> <outDir>
import { chromium } from 'playwright-core';
const [,, BASE, OUT] = process.argv;
const b = await chromium.launch({ channel: 'chrome' });
const mk = async () => {
  const ctx = await b.newContext({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(String(e))); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
  p.on('dialog', d => d.accept());
  return p;
};
const A = await mk(), B = await mk();
let fails = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = (p, n, full = false) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: full });
const trackOrder = p => p.$$eval('.slot', s => s.map(x => x.dataset.k.replace('slot-', '')));
const statusText = p => p.textContent('.status .t');
const until = async (fn, ms = 3000) => { for (let i = 0; i < ms / 100; i++) { if (await fn()) return true; await wait(100); } return false; };

await A.goto(BASE); await wait(800); await shot(A, '00_landing');
eq('cover credit in footer', (await A.textContent('footer')).includes('封面版权归出版社所有'), true);
await A.click('[data-act="create"]');
await A.waitForURL(/\?r=[A-Z0-9]{4}/);
const url = A.url(); console.log('room', url);
await B.goto(url); await B.waitForSelector('.chip');

// setup: expansions, board, leaders
await A.click('[data-act="n"][data-n="3"]'); await wait(300);
eq('B sees 3 seats', await B.$$eval('[data-k^="seat-"]', r => r.length), 3);
eq('no mode choice before the expansion', await B.$('[data-act="mode"]'), null);
await A.click('[data-act="opt"][data-key="el"]'); await wait(250);
await B.click('[data-act="opt"][data-key="me"]'); await wait(250);
eq('A sees both expansions on', await A.$$eval('[data-act="opt"].on', c => c.map(x => x.dataset.key)), ['el', 'me']);
eq('mode choice appears', await A.$$eval('[data-act="mode"]', c => c.map(x => x.textContent)), ['标准游戏', '冒险模式']);
await A.click('[data-act="side"][data-side="snake"]'); await wait(200);
await B.click('[data-act="track"][data-track="lizard"]'); await wait(250);
eq('A sees lizard temple', await A.textContent('[data-act="track"].on'), '蜥蜴神庙');
await A.click('[data-act="opt"][data-key="lead"]'); await wait(300);
eq('begin waits for leaders', await B.isDisabled('[data-act="begin"]'), true);
await A.fill('[data-name="0"]', '阿杰'); await wait(600);
await B.fill('[data-name="1"]', '小鹰'); await B.fill('[data-name="2"]', '男爵'); await B.press('[data-name="2"]', 'Enter'); await wait(500);
eq('B sees name', await B.inputValue('[data-name="0"]'), '阿杰');
await B.click('[data-act="color"][data-i="1"][data-c="green"]'); await wait(300);
eq('A sees seat 2 turned green', await A.getAttribute('[data-k="seat-1"] .por img', 'src'), 'img/green.jpg');
await A.click('[data-act="lead"][data-i="0"]'); await A.waitForSelector('.ldrs');
eq('leader list has 10 leaders', await A.$$eval('.ldrs button', b => b.length), 10);
await shot(A, '01_leaders');
await A.click('[data-act="pickl"][data-l="captain"]'); await wait(300);
await B.click('[data-act="lead"][data-i="1"]'); await B.waitForSelector('.ldrs');
eq('captain taken for seat 2', await B.isDisabled('[data-act="pickl"][data-l="captain"]'), true);
await B.click('[data-act="pickl"][data-l="falconer"]'); await wait(300);
await A.click('[data-act="lead"][data-i="2"]'); await A.click('[data-act="pickl"][data-l="baroness"]'); await wait(300);
eq('A sees leader names', await A.$$eval('.ldr', l => l.map(x => x.childNodes[0].textContent)), ['海军上校', '驯鹰师', '男爵夫人']);
await A.click('[data-act="first"][data-id="green"]'); await wait(300);
eq('start player: link to the hub finger chooser', (await B.textContent('[data-act="order"]')).includes('手指轮盘'), true);
// the setup checklist follows the choices
await A.click('[data-act="setup"]'); await A.waitForSelector('.sl');
const sl = await A.textContent('.sl');
for (const w of ['蛇之神庙', '救援格', '蜥蜴神庙', '石钥匙', '海军上校', '猎鹰', '特别投递卡', '每堆 3 块', '随机翻开 3 个']) eq(`setup list mentions ${w}`, sl.includes(w), true);
await A.click('.sl li.ck'); await wait(100);
eq('ticking a step', await A.$$eval('.sl li.on', l => l.length), 1);
await shot(A, '02_setup_list');
await A.click('.sheet [data-act="close"]');
await shot(A, '03_setup', true);
await B.click('[data-act="begin"]'); await A.waitForSelector('.status'); await B.waitForSelector('.slot');
eq('A status', await statusText(A), '第1/ 5 轮');
const seats = ['red', 'green', 'yellow'];
const start0 = (await trackOrder(A))[0];
const rot = (id, k = 0) => { const i = (seats.indexOf(id) + k) % 3; return [...seats.slice(i), ...seats.slice(0, i)]; };
eq('track runs clockwise from the start player', await trackOrder(B), rot(start0));
eq('round 1 start mentions falconer', (await A.textContent('[data-k^="ph-start"]')).includes('驯鹰师：猎鹰'), true);
eq('round 1: no baroness income yet', (await A.textContent('[data-k^="ph-start"]')).includes('男爵夫人'), false);
eq('next waits for passes', await A.isDisabled('[data-act="next"]'), true);
await A.click('[data-act="df"]'); await wait(150);
eq('dont-forget list', await A.$$eval('[data-k="ph-act"] .steps li', l => l.length), 8);
await shot(A, '04_round1', true);

// five rounds: passes come from both phones, a double tap on "next" only advances once
for (let r = 1; r <= 5; r++) {
  eq(`round ${r} order`, await trackOrder(A), rot(start0, r - 1));
  if (r === 2) eq('round 2 baroness income', (await B.textContent('[data-k^="ph-start"]')).includes('男爵夫人：拿牌列第 II 格'), true);
  const order = await trackOrder(B);
  for (const [i, id] of order.entries()) { await (i % 2 ? A : B).click(`[data-act="pass"][data-id="${id}"]`); await wait(150); }
  await until(async () => !(await A.isDisabled('[data-act="next"]')));
  eq(`round ${r}: passes in order on A`, await A.$$eval('.slot .m', m => m.map(x => x.textContent)), ['第 1 个跳过', '第 2 个跳过', '第 3 个跳过']);
  const steps = await A.$$eval('[data-k^="ph-end"] .steps li', l => l.length);
  if (r === 5) eq('round V cleanup is short', steps, 3);   // archaeologists back, lizard fear, then score
  else {
    const txt = await A.textContent('[data-k^="ph-end"]');
    eq(`round ${r} cleanup has lizard + moon staff`, txt.includes('蜥蜴神庙') && txt.includes('月之权杖'), true);
    if (r === 1) { await A.click('[data-k^="ph-end"] li.ck'); await shot(A, '05_cleanup', true); }
  }
  if (r === 3) {
    const tap = q => q.evaluate(() => document.querySelector('[data-act="next"]').click());
    await Promise.all([tap(A), tap(B)]);
  } else await (r % 2 ? A : B).click('[data-act="next"]');
  await until(async () => (await statusText(A)) !== `第${r}/ 5 轮` && (await statusText(B)) !== `第${r}/ 5 轮`);
  if (r < 5) eq(`now round ${r + 1}`, await statusText(B), `第${r + 1}/ 5 轮`);
}
await until(async () => (await statusText(B)) === '游戏结束');
eq('game over on B', await statusText(B), '游戏结束');
await B.click('[data-act="undo"]'); await until(async () => (await statusText(A)) === '第5/ 5 轮');
eq('undo goes back to round 5', await statusText(A), '第5/ 5 轮');
await A.click('[data-act="next"]'); await until(async () => (await statusText(B)) === '游戏结束');
eq('over again', await statusText(B), '游戏结束');

// scoring: A fills red in "my scoring", B fills the others in the full table
const keyIn = async (p, id, key, seq) => {
  await p.click(`[data-act="cell"][data-id="${id}"][data-key="${key}"]`);
  for (const k of seq) await p.click(k[0] === 'q' ? `[data-act="q"][data-v="${k.slice(1)}"]` : `[data-act="k"][data-k="${k}"]`);
  await wait(250);
};
await A.click('[data-act="tab"][data-tab="score"]'); await B.click('[data-act="tab"][data-tab="score"]');
eq('A asked who it is', (await A.textContent('h2.h')).includes('你是哪位玩家'), true);
eq('no rival tab in a 3-player game', await A.$('[data-act="view"][data-v="rival"]'), null);
await A.click('[data-act="me"][data-id="red"]'); await B.click('[data-act="view"][data-v="all"]'); await wait(200);
eq('my scoring shows only red', await A.$$eval('[data-act="cell"]', c => [...new Set(c.map(x => x.dataset.id))]), ['red']);
await keyIn(A, 'red', 'res', ['2', '3', '+', '8', 'ok']);           // 31
eq('research terms', (await A.textContent('[data-k="ms-res"] .ms-ex')).trim(), '23 + 8');
await keyIn(A, 'red', 'temple', ['q11', 'q6', 'ok']);             // 17
await keyIn(A, 'red', 'temple', ['q11', 'q6', '5', 'ok']);
eq('impossible temple value flagged', (await A.textContent('[data-k="ms-temple"] .ms-w')).includes('只有 11、6、2'), true);
await keyIn(A, 'red', 'temple', ['clr', 'q11', 'q6', 'ok']);
eq('flag gone after fixing', await A.$('[data-k="ms-temple"] .ms-w'), null);
await keyIn(A, 'red', 'idol', ['3', 'ok']);                        // 9
await keyIn(A, 'red', 'slot', ['7', 'ok']);                        // 7
await keyIn(A, 'red', 'guard', ['2', 'ok']);                       // 10
await A.click('[data-act="cell"][data-id="red"][data-key="guard"]'); await wait(150);
eq('keypad shows points for counts', (await A.textContent('.disp .cur')).trim(), '= 2 个 · 10 分');
await shot(A, '06_keypad'); await A.click('[data-act="k"][data-k="ok"]'); await wait(200);
await keyIn(A, 'red', 'card', ['3', '+', '2', '+', '4', 'ok']);   // 9
await keyIn(A, 'red', 'fear', ['3', 'ok']);                        // −3  → 31+17+9+7+10+9−3 = 80
eq('my total on A', (await A.textContent('.ms-tot b')).trim(), '80');
eq('captain has no leader note on fear', await A.$('[data-k="ms-fear"] .ms-l'), null);
await shot(A, '07_myscore', true);
await keyIn(B, 'green', 'res', ['2', '1', '+', '9', 'ok']);       // 30
await keyIn(B, 'green', 'temple', ['q11', 'q11', 'ok']);         // 22
await keyIn(B, 'green', 'idol', ['4', 'ok']);                     // 12
await keyIn(B, 'green', 'guard', ['3', 'ok']);                    // 15
await keyIn(B, 'green', 'card', ['1', '+', '1', 'ok']);            // 2   → 81
await keyIn(B, 'yellow', 'res', ['2', '0', '+', '8', 'ok']);       // 28
await keyIn(B, 'yellow', 'temple', ['q6', 'q2', 'ok']);           // 8
await keyIn(B, 'yellow', 'idol', ['5', 'ok']);                    // 15
await keyIn(B, 'yellow', 'slot', ['4', 'ok']);                    // 4
await keyIn(B, 'yellow', 'guard', ['3', 'ok']);                   // 15
await keyIn(B, 'yellow', 'card', ['1', '2', 'ok']);                // 12
await keyIn(B, 'yellow', 'fear', ['1', 'ok']);                    // −1  → 81
await A.click('[data-act="view"][data-v="all"]'); await wait(300);
const rowTotals = async p => Object.fromEntries(await p.$$eval('td.tt', ts => ts.map(t => [t.dataset.tt, t.textContent])));
eq('totals same on both phones', await rowTotals(A), await rowTotals(B));
{ const t = await rowTotals(B); eq('totals', [t.red, t.green, t.yellow], ['80', '81', '81']); }
eq('fear shown with minus sign class', await A.$$eval('[data-act="cell"][data-key="fear"].neg', c => c.map(x => x.dataset.id)), ['red', 'yellow']);
await shot(B, '08_score', true);

// results: tie between green and yellow (both 81, nobody reached the Lost Temple → research 30 vs 28)
await B.click('[data-act="tab"][data-tab="mvp"]'); await A.click('[data-act="tab"][data-tab="mvp"]'); await wait(400);
eq('MVP is 小鹰 (green, higher research)', (await B.textContent('.mvp .nm')).trim(), '小鹰');
eq('ranking', await B.$$eval('.rk .row', rs => rs.map(r => r.querySelector('.stepn').textContent + ':' + r.querySelector('.tot').textContent)), ['1:81', '2:81', '3:80']);
eq('tie card shown', await B.isVisible('.tie'), true);
await A.click('[data-act="lt"][data-id="yellow"]'); await wait(400);
eq('yellow reached the Lost Temple first → MVP', (await B.textContent('.mvp .nm')).trim(), '男爵');
const achs = await B.$$eval('.ach .an', a => a.map(x => x.textContent));
console.log('achievements', achs.join(' / '));
eq('temple hunter is green (22)', await B.$$eval('[data-k="ach-temple"] .fg', f => f.map(x => x.textContent)), ['小鹰']);
eq('review card present', await B.isVisible('.rv'), true);
await shot(B, '09_mvp', true);

// reconnect keeps state
await A.reload(); await A.waitForSelector('.status'); await wait(300);
eq('A after reload still over', await statusText(A), '游戏结束');
eq('A after reload mvp', (await A.textContent('.mvp .nm')).trim(), '男爵');

console.log(fails ? `${fails} FAILED` : 'ALL PASS', [...A.errs, ...B.errs].length ? '\nERRORS:\n' + [...A.errs, ...B.errs].join('\n') : '');
await b.close();
process.exit(fails ? 1 : 0);
