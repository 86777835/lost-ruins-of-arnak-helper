// Unit tests for the shared rules (public/logic.js) and the step lists (public/steps.js). Run: node tests/test_logic.mjs
import assert from 'node:assert/strict';
import { initialState, reduce, turnOrder, parts, results, chapterScore, campTotal, gameRecord, RIVAL } from '../public/logic.js';
import { setupList, roundStart, cleanup, dontForget, setupN } from '../public/steps.js';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const run = (S, ...acts) => acts.reduce((s, a) => { const r = reduce(s, a); assert.ok(r, 'rejected: ' + JSON.stringify(a)); return r; }, S);
const no = (S, a) => assert.equal(reduce(S, a), null, 'should reject ' + JSON.stringify(a));
const allPass = S => S.players.slice(0, S.n).reduce((s, p) => reduce(s, { t: 'pass', round: s.round, id: p.id }), S);
const flat = secs => secs.flatMap(s => s.items.map(i => i.t)).join('\n');

t('setup defaults', () => {
  const S = initialState();
  assert.equal(S.n, 4); assert.equal(S.stage, 'setup'); assert.deepEqual(turnOrder(S), ['red', 'blue', 'yellow', 'green']);
});

t('turn order rotates left each round (base p.17)', () => {
  let S = run(initialState(), { t: 'first', id: 'yellow' }, { t: 'begin' });
  assert.deepEqual(turnOrder(S), ['yellow', 'green', 'red', 'blue']);
  S = run(allPass(S), { t: 'next', round: 1 });
  assert.equal(S.round, 2); assert.deepEqual(turnOrder(S), ['green', 'red', 'blue', 'yellow']);
});

t('next needs everyone passed; stale round rejected; pass twice rejected', () => {
  let S = run(initialState(), { t: 'setN', n: 2 }, { t: 'begin' });
  no(S, { t: 'next', round: 1 });
  S = run(S, { t: 'pass', round: 1, id: 'red' });
  no(S, { t: 'pass', round: 1, id: 'red' });
  no(S, { t: 'pass', round: 2, id: 'blue' });
  S = run(S, { t: 'pass', round: 1, id: 'blue' }, { t: 'next', round: 1 });
  no(S, { t: 'next', round: 1 });
  assert.deepEqual(S.passLog, [['red', 'blue']]);
});

t('five rounds then over; undo comes back', () => {
  let S = run(initialState(), { t: 'setN', n: 2 }, { t: 'begin' });
  for (let r = 1; r <= 5; r++) S = run(allPass(S), { t: 'next', round: r });
  assert.equal(S.stage, 'over');
  S = run(S, { t: 'undo' });
  assert.equal(S.stage, 'play'); assert.equal(S.round, 5); assert.equal(S.passed.length, 2);
});

t('solo: rival starts every round (base p.20)', () => {
  let S = run(initialState(), { t: 'setN', n: 1 }, { t: 'begin' });
  assert.deepEqual(turnOrder(S), [RIVAL, 'red']);
  S = run(allPass(S), { t: 'next', round: 1 });
  assert.deepEqual(turnOrder(S), [RIVAL, 'red']);
});

t('campaign: needs the expansion; rival last in round I then rotates (campaign p.2–3)', () => {
  no(initialState(), { t: 'mode', mode: 'camp' });
  let S = run(initialState(), { t: 'opt', key: 'me', on: true }, { t: 'mode', mode: 'camp' });
  assert.equal(S.n, 2);
  no(S, { t: 'setN', n: 3 });
  no(S, { t: 'begin' });   // leaders required
  S = run(S, { t: 'player', i: 0, leader: 'journalist' }, { t: 'player', i: 1, leader: 'mechanic' }, { t: 'first', id: 'blue' }, { t: 'begin' });
  assert.deepEqual(turnOrder(S, 1), ['blue', 'red', RIVAL]);
  assert.deepEqual(turnOrder(S, 2), ['red', RIVAL, 'blue']);
  assert.deepEqual(turnOrder(S, 3), [RIVAL, 'blue', 'red']);
});

t('leaders: expansion gate, unique, cleared when expansion off', () => {
  let S = run(initialState(), { t: 'opt', key: 'el', on: true }, { t: 'opt', key: 'lead', on: true });
  no(S, { t: 'player', i: 0, leader: 'journalist' });
  S = run(S, { t: 'player', i: 0, leader: 'mystic' });
  no(S, { t: 'player', i: 1, leader: 'mystic' });
  no(S, { t: 'begin' });
  S = run(S, { t: 'deal' });
  const ls = S.players.map(p => p.leader);
  assert.equal(new Set(ls).size, 4); assert.ok(ls.every(Boolean)); assert.equal(S.deal, 1);
  S = run(S, { t: 'opt', key: 'el', on: false });
  assert.ok(S.players.every(p => !p.leader)); assert.equal(S.lead, false);
});

t('track / variants gated by expansion', () => {
  const S = initialState();
  no(S, { t: 'track', track: 'lizard' }); no(S, { t: 'track', track: 'tree' });
  let E = run(S, { t: 'opt', key: 'el', on: true }, { t: 'track', track: 'lizard' }, { t: 'opt', key: 'redMoon', on: true });
  E = run(E, { t: 'opt', key: 'el', on: false });
  assert.equal(E.track, 'board'); assert.equal(E.redMoon, false);
});

const scored = (S, id, d) => Object.entries(d).reduce((s, [key, value]) => run(s, { t: 'score', id, key, value }), S);

t('player score: base p.18', () => {
  let S = run(initialState(), { t: 'setN', n: 2 }, { t: 'begin' });
  S = scored(S, 'red', { res: [21, 8], temple: [11, 2], idol: '3', slot: '7', guard: '2', card: [3, 2, 1], fear: '4', ftile: '1' });
  const p = parts(S, 'red');
  assert.equal(p.res, 29); assert.equal(p.temple, 13); assert.equal(p.idol, 16); assert.equal(p.guard, 10); assert.equal(p.card, 6); assert.equal(p.minus, 6);
  assert.equal(p.total, 29 + 13 + 16 + 10 + 6 - 6);
  no(S, { t: 'score', id: 'red', key: 'idolU', value: '1' });   // rival-only field
  no(S, { t: 'score', id: RIVAL, key: 'res', value: [1] });     // no rival in a 2-player game
  S = run(S, { t: 'score', id: 'blue', key: 'idol', value: 'x' });
  assert.ok(results(S).error);
});

t('ties: Lost Temple order, then research (base p.18)', () => {
  let S = run(initialState(), { t: 'setN', n: 3 }, { t: 'begin' });
  S = scored(S, 'red', { res: [10], card: [20] });
  S = scored(S, 'blue', { res: [20], card: [10] });
  S = scored(S, 'yellow', { res: [5] });
  let R = results(S);
  assert.equal(R.rows[0].id, 'blue');   // nobody reached: higher research wins
  assert.equal(R.rows[1].place, 2);
  S = run(S, { t: 'lt', id: 'red' });
  R = results(S);
  assert.equal(R.rows[0].id, 'red'); assert.equal(R.rows[0].place, 1); assert.equal(R.rows[1].place, 2);
  S = run(S, { t: 'lt', id: 'red' });   // tap again takes it back
  assert.deepEqual(S.lt, []);
});

t('exact tie with same research shares the place', () => {
  let S = run(initialState(), { t: 'setN', n: 2 }, { t: 'begin' });
  S = scored(S, 'red', { res: [10], card: [5] }); S = scored(S, 'blue', { res: [10], card: [5] });
  const R = results(S);
  assert.equal(R.rows[0].place, 1); assert.equal(R.rows[1].place, 1);
});

t('solo rival score (base p.21)', () => {
  let S = run(initialState(), { t: 'setN', n: 1 }, { t: 'begin' });
  S = scored(S, RIVAL, { res: [12], temple: [6], guard: '1', card: [4, 2], idolU: '3', idolD: '2' });
  assert.equal(parts(S, RIVAL).total, 12 + 6 + 5 + 6 + 9 + 4);
  const rec = gameRecord(scored(S, 'red', { res: [3] }));
  assert.equal(rec.rival.total, 42); assert.equal(rec.n, 1); assert.equal(rec.exp, 'base');
});

t('campaign chapter score: halves kept, rival subtracted, −10 on loss, total rounded up (campaign p.5, p.36)', () => {
  let S = run(initialState(), { t: 'opt', key: 'me', on: true }, { t: 'mode', mode: 'camp' },
    { t: 'player', i: 0, leader: 'journalist' }, { t: 'player', i: 1, leader: 'traveler' }, { t: 'begin' });
  S = scored(S, 'red', { card: [41] }); S = scored(S, 'blue', { card: [40] }); S = scored(S, RIVAL, { card: [30] });
  assert.equal(chapterScore(S), 10.5);
  assert.equal(gameRecord(S), null);   // campaign chapters are not archived
  S = run(S, { t: 'chapter', res: 'win', ach: 2, plot: '7' });
  assert.equal(S.stage, 'setup'); assert.equal(S.camp.ch, 2); assert.deepEqual(S.score, {});
  S = run(S, { t: 'begin' }, { t: 'chapter', res: 'lose', ach: 0, plot: '' });
  assert.deepEqual(S.camp.log.map(c => c.score), [10.5, -10]);
  assert.equal(campTotal(S), 1);   // 0.5 rounds up
  S = run(S, { t: 'unchapter' });
  assert.equal(S.camp.ch, 2); assert.equal(S.camp.log.length, 1);
  no(S, { t: 'chapter', res: 'win', ach: 0 });   // only during a chapter
});

t('chapter 6 achievements count; win needs valid scores', () => {
  let S = run(initialState(), { t: 'opt', key: 'me', on: true }, { t: 'mode', mode: 'camp' }, { t: 'setN', n: 1 }, { t: 'player', i: 0, leader: 'mechanic' });
  S.camp.ch = 6;
  S = run(S, { t: 'begin' });
  S = scored(S, 'red', { card: [10], ach: '5' }); S = scored(S, RIVAL, { card: [3] });
  assert.equal(chapterScore(S), 12);
  S = run(S, { t: 'score', id: RIVAL, key: 'guard', value: 'z' });
  no(S, { t: 'chapter', res: 'win', ach: 1 });
  S = run(S, { t: 'chapter', res: 'lose', ach: 1 });
  assert.equal(S.camp.ch, 7);
});

t('reset keeps the campaign log', () => {
  let S = run(initialState(), { t: 'opt', key: 'me', on: true }, { t: 'mode', mode: 'camp' }, { t: 'setN', n: 1 }, { t: 'player', i: 0, leader: 'mechanic' }, { t: 'begin' });
  S = run(S, { t: 'chapter', res: 'lose', ach: 0 }, { t: 'begin' }, { t: 'reset' });
  assert.equal(S.camp.log.length, 1); assert.equal(S.stage, 'setup');
});

t('setup list: counts follow player count, solo uses 2, campaign n+1', () => {
  const S4 = initialState();
  assert.equal(setupN(S4), 4);
  assert.match(flat(setupList(S4)), /4 人局不用封锁标记/);
  const S1 = run(initialState(), { t: 'setN', n: 1 }, { t: 'rival', red: 3 });
  assert.equal(setupN(S1), 2);
  const t1 = flat(setupList(S1));
  assert.match(t1, /每堆 <b>2<\/b> 块/); assert.match(t1, /红色 <b>3<\/b> 块/); assert.match(t1, /1 金币 \+ 1 指南针/);
  const C = run(initialState(), { t: 'opt', key: 'me', on: true }, { t: 'mode', mode: 'camp' });
  assert.equal(setupN(C), 3);
  assert.match(flat(setupList(C)), /不使用封锁标记/);
  const S3 = run(initialState(), { t: 'setN', n: 3 }, { t: 'first', id: 'blue' });
  assert.match(flat(setupList(S3, id => id)), /red 2 金币 \+ 1 指南针；blue 2 金币；yellow 1 金币 \+ 1 指南针/);
});

t('setup list: leaders, tracks, snake side', () => {
  const S = run(initialState(), { t: 'opt', key: 'el', on: true }, { t: 'opt', key: 'lead', on: true }, { t: 'side', side: 'snake' }, { t: 'track', track: 'lizard' },
    { t: 'player', i: 0, leader: 'baroness' }, { t: 'player', i: 1, leader: 'explorer' });
  const x = flat(setupList(S));
  assert.match(x, /石钥匙/); assert.match(x, /男爵夫人/); assert.match(x, /零食标记/); assert.match(x, /蜥蜴神庙/); assert.match(x, /救援格/); assert.match(x, /两堆各 4 个/);
});

t('round start / cleanup by leader and round', () => {
  const S = run(initialState(), { t: 'opt', key: 'el', on: true }, { t: 'opt', key: 'me', on: true }, { t: 'opt', key: 'lead', on: true },
    { t: 'player', i: 0, leader: 'baroness' }, { t: 'player', i: 1, leader: 'mechanic' }, { t: 'player', i: 2, leader: 'falconer' }, { t: 'player', i: 3, leader: 'explorer' });
  const r1 = roundStart(S, 1).map(i => i.t).join('\n'), r3 = roundStart(S, 3).map(i => i.t).join('\n');
  assert.doesNotMatch(r1, /男爵夫人/); assert.match(r1, /机械师：抽牌后翻开牌列第 I 格/); assert.match(r1, /猎鹰/);
  assert.match(r3, /男爵夫人：拿牌列第 III 格/); assert.match(r3, /鲁斯蒂/); assert.match(r3, /第 3 个零食标记/);
  assert.equal(cleanup(S, 5).length, 2);
  assert.match(cleanup(S, 2).map(i => i.t).join('\n'), /零食标记回到版图/);
  assert.equal(dontForget(S).length, 8);
});

console.log(`\n${n} passed`);
