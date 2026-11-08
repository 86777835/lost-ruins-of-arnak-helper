// Game rules shared by the room server (Durable Object) and the page.
// Lost Ruins of Arnak (CGE). Terms follow the Simplified Chinese edition (One Moment Games):
// base rulebook, 《探险队长》 Expedition Leaders, 《失踪的探险队》 The Missing Expedition and its 冒险模式 campaign book v1.02.
// 5 rounds; each round everyone plays turns until all have passed (base rulebook p.7, p.17).

export const ROUNDS = 5;
export const COLOR_ORDER = ['red', 'blue', 'yellow', 'green'];
export const COLOR_ZH = { red: '红色', blue: '蓝色', yellow: '黄色', green: '绿色' };
export const RIVAL = 'rival';   // the solo / campaign rival expedition (base rulebook p.20–21)

// Expedition leaders. el: 《探险队长》 (order = the rulebook's easiest first, p.4), me: 《失踪的探险队》 (rulebook p.4–10).
export const LEADERS = {
  captain: { zh: '海军上校', en: 'Captain', x: 'el' },
  falconer: { zh: '驯鹰师', en: 'Falconer', x: 'el' },
  baroness: { zh: '男爵夫人', en: 'Baroness', x: 'el' },
  professor: { zh: '教授', en: 'Professor', x: 'el' },
  explorer: { zh: '探险家', en: 'Explorer', x: 'el' },
  mystic: { zh: '神秘人', en: 'Mystic', x: 'el' },
  journalist: { zh: '记者', en: 'Journalist', x: 'me' },
  mechanic: { zh: '机械师', en: 'Mechanic', x: 'me' },
  prospector: { zh: '勘探家', en: 'Prospector', x: 'me', simple: true },   // simple leaders: base player board + a replacement starting deck
  traveler: { zh: '旅行家', en: 'Traveler', x: 'me', simple: true }
};
// Main board side (base rulebook p.4, p.19) and the research track laid over it (EL p.18–20, ME p.11–12).
export const SIDES = { bird: '鸟之神庙', snake: '蛇之神庙' };
export const TRACKS = { board: { zh: '版图自带' }, monkey: { zh: '猴之神庙', x: 'el' }, lizard: { zh: '蜥蜴神庙', x: 'el' },
  waterfall: { zh: '瀑布神庙', x: 'me' }, tree: { zh: '古树神庙', x: 'me' } };
export const CAMP_DIFF = { student: '学生模式', normal: '普通模式', expert: '阿纳克专家模式' };   // campaign book p.3
export const CHAPTERS = 6;
export const CAMP_LOSS = -10;   // campaign book p.5: a chapter whose loss you accept scores −10

// Score fields. list: one value per item, summed; the rest are whole numbers (counts or points).
export const LIST_KEYS = ['res', 'temple', 'card'];
export const NUM_KEYS = ['idol', 'slot', 'guard', 'fear', 'ftile', 'ach', 'idolU', 'idolD'];
export const RIVAL_KEYS = ['res', 'temple', 'guard', 'card', 'idolU', 'idolD'];
export const PLAYER_KEYS = ['res', 'temple', 'idol', 'slot', 'guard', 'card', 'fear', 'ftile'];
export const IDOL_PTS = 3, GUARD_PTS = 5, FEAR_PTS = 1, FEAR_TILE_PTS = 2, RIVAL_DUP_IDOL_PTS = 2;   // base rulebook p.18, p.21, p.23

export function initialState() {
  return {
    v: 0, stage: 'setup', mode: 'game', n: 4,
    players: COLOR_ORDER.map(c => ({ id: c, name: '', leader: null, diff: 'normal' })),
    start: 'red', el: false, me: false, lead: false, redMoon: false, side: 'bird', track: 'board', rival: 2,
    round: 1, passed: [], passLog: [], back: [], score: {}, lt: [],
    camp: { ch: 1, log: [] }
  };
}

// Whole number ≥ min (≤ 9999); empty counts as 0; anything else is null.
export function num(v, min = 0) {
  if (v === '' || v == null) return 0;
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= 9999 ? n : null;
}

const clone = o => JSON.parse(JSON.stringify(o));
export const seated = S => S.players.slice(0, S.n);
export const humans = S => seated(S).map(p => p.id);
export const camp = S => S.mode === 'camp';
export const hasRival = S => camp(S) || S.n === 1;
export const usesLeaders = S => camp(S) || (S.lead && (S.el || S.me));   // campaign book p.3: the campaign is played with leaders
export const leaderOk = (S, k) => !!LEADERS[k] && !!S[LEADERS[k].x];
const rotate = (a, i) => [...a.slice(i), ...a.slice(0, i)];
// Turn order of a round: the start player marker moves one place to the left (clockwise) each round (base rulebook p.17).
// Solo game: the rival is the starting player in all 5 rounds (base rulebook p.20).
// Campaign: the rival acts last in round I and then takes the start marker like any player (campaign book p.2–3).
export function turnOrder(S, round = S.round) {
  const h = humans(S), i = Math.max(0, h.indexOf(S.start));
  if (!camp(S) && S.n === 1) return [RIVAL, h[0]];
  const first = camp(S) ? [...rotate(h, i), RIVAL] : rotate(h, i);
  return rotate(first, (round - 1) % first.length);
}
const cleanText = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, '').slice(0, max);
const BACK_MAX = 40;   // undo steps kept
const flow = S => ({ stage: S.stage, round: S.round, passed: S.passed, passLog: S.passLog });
const freshPlay = () => ({ round: 1, passed: [], passLog: [], back: [], score: {}, lt: [] });

// Applies one action. Returns the new state, or null when the action is invalid or stale.
export function reduce(s, a) {
  if (!a || typeof a !== 'object') return null;
  const S = clone(s);
  const done = () => { S.v = s.v + 1; return S; };
  const ids = () => humans(S);
  const setup = S.stage === 'setup';

  switch (a.t) {
    case 'setN':
      if (!setup || !(camp(S) ? [1, 2] : [1, 2, 3, 4]).includes(a.n)) return null;
      S.n = a.n;
      if (!ids().includes(S.start)) S.start = S.players[0].id;
      return done();

    case 'mode':    // standard game or the 《失踪的探险队》 campaign (1–2 players, cooperative)
      if (!setup || !['game', 'camp'].includes(a.mode) || (a.mode === 'camp' && !S.me)) return null;
      S.mode = a.mode;
      if (a.mode === 'camp') { S.n = Math.min(S.n, 2); S.start = S.players[0].id; }
      return done();

    case 'opt': {   // expansions and variants
      if (!setup || !['el', 'me', 'lead', 'redMoon'].includes(a.key) || typeof a.on !== 'boolean') return null;
      S[a.key] = a.on;
      if (!S.el) { S.redMoon = false; if (TRACKS[S.track].x === 'el') S.track = 'board'; }
      if (!S.me) { if (TRACKS[S.track].x === 'me') S.track = 'board'; if (camp(S)) S.mode = 'game'; }
      if (!S.el && !S.me) S.lead = false;
      for (const p of S.players) if (p.leader && !leaderOk(S, p.leader)) p.leader = null;
      return done();
    }

    case 'side':
      if (!setup || !SIDES[a.side]) return null;
      S.side = a.side; return done();

    case 'track':
      if (!setup || !TRACKS[a.track] || (TRACKS[a.track].x && !S[TRACKS[a.track].x])) return null;
      S.track = a.track; return done();

    case 'rival':   // solo game: number of red rival action tiles = difficulty 0–5 (base rulebook p.20)
      if (!setup || !Number.isInteger(a.red) || a.red < 0 || a.red > 5) return null;
      S.rival = a.red; return done();

    case 'player': {
      const p = S.players[a.i]; if (!p || a.i >= S.n) return null;
      if (!setup && (a.color !== undefined || a.leader !== undefined || a.diff !== undefined)) return null;   // after the start only names can change
      if (a.name !== undefined) p.name = cleanText(a.name, 12).trim();
      if (a.color !== undefined) {
        const other = S.players.find(o => o.id === a.color);
        if (!other || (other !== p && S.players.indexOf(other) < S.n)) return null;
        if (S.start === p.id) S.start = a.color;
        else if (S.start === a.color) S.start = p.id;
        other.id = p.id; p.id = a.color;
      }
      if (a.leader !== undefined) {   // null clears; each leader can be taken by one player only
        if (a.leader !== null && (!leaderOk(S, a.leader) || seated(S).some(o => o !== p && o.leader === a.leader))) return null;
        p.leader = a.leader;
      }
      if (a.diff !== undefined) { if (!CAMP_DIFF[a.diff]) return null; p.diff = a.diff; }
      return done();
    }

    case 'deal': {  // random leaders, like drawing the random-role tokens (EL p.4)
      if (!setup || !usesLeaders(S)) return null;
      const pool = Object.keys(LEADERS).filter(k => leaderOk(S, k) && (a.simple || !LEADERS[k].simple));
      if (pool.length < S.n) return null;
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      seated(S).forEach((p, i) => { p.leader = pool[i]; });
      S.deal = (s.deal || 0) + 1;   // every phone shows the drawn leaders
      return done();
    }

    case 'move': {
      const { i, j } = a;
      if (!setup || ![i, j].every(k => Number.isInteger(k) && k >= 0 && k < S.n)) return null;
      [S.players[i], S.players[j]] = [S.players[j], S.players[i]];
      return done();
    }

    case 'first':   // setup: choose the start player by hand
      if (!setup || !ids().includes(a.id)) return null;
      S.start = a.id; return done();

    case 'begin':
      if (!setup) return null;
      if (usesLeaders(S) && seated(S).some(p => !p.leader || !leaderOk(S, p.leader))) return null;   // everyone needs a leader first
      Object.assign(S, freshPlay(), { stage: 'play', gid: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) });   // gid names this game in the archive
      if (!usesLeaders(S)) for (const p of S.players) p.leader = null;
      return done();

    case 'pass': {  // this player has passed for the rest of the round
      if (S.stage !== 'play' || a.round !== S.round || !ids().includes(a.id) || S.passed.includes(a.id)) return null;
      S.back = [...S.back.slice(1 - BACK_MAX), flow(s)];
      S.passed = [...S.passed, a.id];
      return done();
    }

    case 'next':    // everyone has passed and the round is tidied up: next round, or final scoring after round V
      if (S.stage !== 'play' || a.round !== S.round || S.passed.length !== S.n) return null;
      S.back = [...S.back.slice(1 - BACK_MAX), flow(s)];
      S.passLog = [...S.passLog, S.passed];
      S.passed = [];
      if (S.round === ROUNDS) S.stage = 'over'; else S.round += 1;
      return done();

    case 'undo':
      if (!S.back.length) return null;
      Object.assign(S, S.back.pop());   // flow only: scores stay
      return done();

    case 'score': {
      const keys = a.id === RIVAL ? (hasRival(S) ? RIVAL_KEYS : []) : ids().includes(a.id) ? [...PLAYER_KEYS, 'ach'] : [];
      if (setup || !keys.includes(a.key)) return null;
      let v = a.value;
      if (LIST_KEYS.includes(a.key)) {
        if (!Array.isArray(v) || v.length > 60 || !v.every(x => Number.isInteger(x) && x >= -99 && x <= 99)) return null;
      } else v = cleanText(v, 6);
      (S.score[a.id] ||= {})[a.key] = v;
      return done();
    }

    case 'lt': {    // tie-break: order in which tied players reached the Lost Temple (tap again to take back)
      if (setup || !ids().includes(a.id)) return null;
      S.lt = S.lt.includes(a.id) ? S.lt.filter(x => x !== a.id) : [...S.lt, a.id];
      return done();
    }

    case 'chapter': {   // campaign: record this chapter (won, or loss accepted) and set up the next one
      if (!camp(S) || S.stage === 'setup' || S.camp.ch > CHAPTERS || !['win', 'lose'].includes(a.res)) return null;
      if (!Number.isInteger(a.ach) || a.ach < 0 || a.ach > 3) return null;
      const sc = chapterScore(S);
      if (a.res === 'win' && sc === null) return null;
      S.camp.log = [...S.camp.log, {
        ch: S.camp.ch, res: a.res, score: a.res === 'win' ? sc : CAMP_LOSS, ach: a.ach, plot: cleanText(a.plot, 40).trim(),
        players: seated(S).map(p => ({ id: p.id, name: p.name, leader: p.leader, diff: p.diff }))
      }];
      S.camp.ch += 1;
      Object.assign(S, freshPlay(), { stage: 'setup' });
      return done();
    }

    case 'unchapter':   // campaign: take back the last recorded chapter
      if (!camp(S) || S.stage !== 'setup' || !S.camp.log.length) return null;
      S.camp.log = S.camp.log.slice(0, -1);
      S.camp.ch -= 1;
      return done();

    case 'reset':       // back to setup; a campaign keeps its chapter log (replaying a chapter "as though it never happened", campaign book p.4)
      Object.assign(S, freshPlay(), { stage: 'setup' });
      return done();

    case 'newcamp':     // start a new campaign from chapter 1
      if (!camp(S) || S.stage !== 'setup') return null;
      S.camp = { ch: 1, log: [] };
      return done();
  }
  return null;
}

/* ---------- scoring (base rulebook p.18; rival p.21; ME rulebook p.13) ---------- */
const sum = a => (a || []).reduce((x, y) => x + y, 0);

// One player's score parts, or null if a number field is invalid.
export function parts(S, id) {
  const d = S.score[id] || {};
  const n = {};
  for (const k of NUM_KEYS) { n[k] = num(d[k]); if (n[k] === null) return null; }
  if (id === RIVAL) {
    const p = { res: sum(d.res), temple: sum(d.temple), guard: n.guard * GUARD_PTS, card: sum(d.card),
      idol: n.idolU * IDOL_PTS + n.idolD * RIVAL_DUP_IDOL_PTS, guards: n.guard, idols: n.idolU + n.idolD, fear: 0, minus: 0, ach: 0 };
    p.total = p.res + p.temple + p.guard + p.card + p.idol;
    return p;
  }
  const ach = camp(S) && S.camp.ch === CHAPTERS ? n.ach : 0;   // chapter 6: achievement values count (campaign book p.35)
  const p = { res: sum(d.res), temple: sum(d.temple), idol: n.idol * IDOL_PTS + n.slot, guard: n.guard * GUARD_PTS, card: sum(d.card),
    minus: n.fear * FEAR_PTS + n.ftile * FEAR_TILE_PTS, ach, guards: n.guard, idols: n.idol, fear: n.fear + n.ftile, temples: (d.temple || []).length };
  p.total = p.res + p.temple + p.idol + p.guard + p.card + p.ach - p.minus;
  return p;
}

// Ties: whoever reached the Lost Temple first; if no tied player reached it, the higher research score; otherwise still tied (p.18).
function tieOrder(S, a, b) {
  const at = i => { const k = S.lt.indexOf(i); return k < 0 ? Infinity : k; };
  const la = at(a.id), lb = at(b.id);
  if (la !== lb) return la - lb;
  if (la === Infinity) return b.res - a.res;
  return 0;
}

// Final standings, score groups and achievements (players only; the rival is reported separately).
export function results(S) {
  const rows = [];
  for (const id of humans(S)) {
    const p = parts(S, id);
    if (!p) return { error: true };
    const passes = S.passLog.map(r => r.indexOf(id));
    rows.push({ id, ...p, firstOut: passes.filter(k => k === 0).length, lastOut: passes.filter((k, _, a) => k === S.n - 1).length });
  }
  const cmp = (a, b) => b.total - a.total || tieOrder(S, a, b);
  const sorted = rows.slice().sort(cmp);
  sorted.forEach((r, i) => { const p = sorted[i - 1]; r.place = p && cmp(p, r) === 0 ? p.place : i + 1; r.tied = sorted.some(o => o !== r && o.total === r.total); });
  let rival = null;
  if (hasRival(S)) { rival = parts(S, RIVAL); if (!rival) return { error: true }; }

  const best = (val, opts = {}) => {
    const vs = rows.map(val);
    const max = Math.max(...vs);
    if (!(max > (opts.min ?? 0)) || (rows.length > 1 && vs.every(v => v === max))) return [];
    return rows.filter((r, i) => vs[i] === max).map(r => r.id);
  };
  const played = S.passLog.length > 0 && S.n > 1;
  const ach = [
    { k: 'mvp', ch: '冠', name: '传奇探险家', desc: '最终排名第一', who: S.n > 1 ? sorted.filter(r => r.place === 1).map(r => r.id) : [] },
    { k: 'res', ch: '研', name: '学术泰斗', desc: '研究轨得分最高', who: best(r => r.res) },
    { k: 'temple', ch: '庙', name: '神庙寻宝人', desc: '神庙板块得分最高', who: best(r => r.temple) },
    { k: 'idol', ch: '像', name: '神像收藏家', desc: '神像与空神像槽得分最高', who: best(r => r.idol) },
    { k: 'guard', ch: '守', name: '守卫之友', desc: '击败的守卫最多', who: best(r => r.guards) },
    { k: 'card', ch: '器', name: '装备精良', desc: '物品和神器卡得分最高', who: best(r => r.card) },
    { k: 'brave', ch: '勇', name: '无所畏惧', desc: '恐惧卡最少', who: S.n > 1 ? best(r => -r.fear, { min: -Infinity }) : [] },
    { k: 'early', ch: '早', name: '早早收工', desc: '第一个跳过的轮数最多', who: played ? best(r => r.firstOut) : [] },
    { k: 'late', ch: '晚', name: '最后的探险者', desc: '最后一个跳过的轮数最多', who: played ? best(r => r.lastOut) : [] }
  ].filter(a => a.who.length);
  return { rows: sorted, ach, rival };
}

// Campaign chapter score (campaign book p.5): add the players' points, halve them in a 2-player game (halves are kept),
// then subtract the rival's score. Null while a score field is invalid.
export function chapterScore(S) {
  const R = results(S);
  if (R.error) return null;
  return R.rows.reduce((a, r) => a + r.total, 0) / S.n - R.rival.total;
}
// Campaign total (campaign book p.36): all chapter scores added; a 2-player total that is not whole is rounded up.
export const campTotal = S => Math.ceil(S.camp.log.reduce((a, c) => a + c.score, 0));

// Which expansions a game used, for the archive and the score references.
export const expKey = S => (S.el ? 'el' : '') + (S.me ? 'me' : '') || 'base';
export const EXP_ZH = { base: '基础版', el: '含探险队长', me: '含失踪的探险队', elme: '两个扩展' };

// What the archive keeps for a finished standard game. Null while a score field is invalid; campaign chapters are not archived.
export function gameRecord(S) {
  if (camp(S)) return null;
  const R = results(S);
  if (R.error) return null;
  return {
    gid: S.gid, n: S.n, exp: expKey(S), lead: usesLeaders(S), side: S.side, track: S.track,
    rival: R.rival ? { total: R.rival.total, red: S.rival } : null,
    players: R.rows.map(r => {
      const p = S.players.find(x => x.id === r.id);
      return { id: r.id, name: p.name, leader: p.leader, place: r.place, total: r.total, res: r.res, temple: r.temple, idol: r.idol, guard: r.guard, card: r.card, minus: r.minus };
    })
  };
}
