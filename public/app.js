import { ROUNDS, COLOR_ORDER, COLOR_ZH, RIVAL, LEADERS, SIDES, TRACKS, CAMP_DIFF, CHAPTERS, CAMP_LOSS, IDOL_PTS, GUARD_PTS, FEAR_TILE_PTS, RIVAL_DUP_IDOL_PTS,
  num, parts, results, chapterScore, campTotal, turnOrder, humans, seated, camp, hasRival, usesLeaders, leaderOk } from './logic.js';
import { LEADER_INFO, setupList, roundStart, cleanup, dontForget, ROMAN } from './steps.js';

const COLORS = { red: 'var(--p-red)', blue: 'var(--p-blue)', yellow: 'var(--p-yellow)', green: 'var(--p-green)', rival: 'var(--p-rival)' };
const CATS = [
  { k: 'res', n: '研究', c: 'var(--c-res)' }, { k: 'temple', n: '神庙', c: 'var(--c-temple)' }, { k: 'idol', n: '神像', c: 'var(--c-idol)' },
  { k: 'guard', n: '守卫', c: 'var(--c-guard)' }, { k: 'card', n: '卡牌', c: 'var(--c-card)' }
];
// Score sheet rows (base rulebook p.18). list: one value per item, summed; count: a number of things worth `mult` each; neg: points lost.
// quick: keypad shortcuts; allow: the only values an item can have (anything else is flagged).
const FIELD = {
  res: { n: '研究轨', hint: '放大镜和笔记本各按所在那一行印的分数，两个都填（如 8+4）。放大镜在失落的神庙的，按它所在那一格的分数。', list: true },
  temple: { n: '神庙板块', hint: '每块神庙板块上的分数', list: true, quick: [['11 分', 11], ['6 分', 6], ['2 分', 2]], allow: [11, 6, 2] },
  idol: { n: '神像', hint: `你拥有的神像个数，放进神像槽的也算，每个 ${IDOL_PTS} 分`, count: true, mult: IDOL_PTS },
  slot: { n: '空神像槽', hint: '版图上还空着的神像槽，把槽上印的分数加起来' },
  guard: { n: '守卫', hint: `击败的守卫个数，每个 ${GUARD_PTS} 分，奖励用没用过都算`, count: true, mult: GUARD_PTS },
  card: { n: '物品和神器', hint: '牌库、手牌、出牌区里每张物品和神器卡右下角的分数', list: true },
  fear: { n: '恐惧卡', hint: '牌库、手牌、出牌区里恐惧卡的张数，每张 −1', count: true, mult: 1, neg: true },
  ftile: { n: '恐惧板块', hint: `恐惧卡拿完后才会拿的恐惧板块，每块 −${FEAR_TILE_PTS}（很少用到）`, count: true, mult: FEAR_TILE_PTS, neg: true },
  ach: { n: '成就分', hint: '第六章：本章成就的分值也计入本章得分（冒险手册第 35 页）' }
};
const RFIELD = {
  res: { n: '研究轨', hint: '对手只有放大镜：按它所在那一行（或失落的神庙那一格）的分数', list: true },
  temple: { n: '神庙板块', hint: '对手拿到的每块神庙板块的分数', list: true, quick: [['11 分', 11], ['6 分', 6], ['2 分', 2]], allow: [11, 6, 2] },
  guard: { n: '守卫', hint: `对手击败的守卫个数，每个 ${GUARD_PTS} 分`, count: true, mult: GUARD_PTS },
  card: { n: '物品和神器', hint: '对手版图上每张物品和神器卡的分数', list: true },
  idolU: { n: '不同神像', hint: `各种类第一个神像（正面朝上那些）的个数，每个 ${IDOL_PTS} 分`, count: true, mult: IDOL_PTS },
  idolD: { n: '重复神像', hint: `「−1」那格里的神像个数，每个 ${RIVAL_DUP_IDOL_PTS} 分`, count: true, mult: RIVAL_DUP_IDOL_PTS }
};
const P_ROWS = ['res', 'temple', 'idol', 'slot', 'guard', 'card', 'fear', 'ftile'];
const R_ROWS = ['res', 'temple', 'guard', 'card', 'idolU', 'idolD'];
const rowsFor = id => id === RIVAL ? R_ROWS : camp(S) && S.camp.ch === CHAPTERS ? [...P_ROWS, 'ach'] : P_ROWS;
const fieldOf = (id, k) => (id === RIVAL ? RFIELD : FIELD)[k];

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} }
};

let code = cleanCode(new URLSearchParams(location.search).get('r'));
let S = null, noRoom = false, online = false, ws = null, queue = [], retry = 0;
// rn: rename inputs on the results tab; df: "don't forget" open; chk: ticked cleanup steps (this phone only); rv: rating form
const ui = { tab: store.get('arnak-tab') || 'flow', sheet: null, err: '', busy: false, rooms: null, rn: false, saving: false, df: false, chk: {}, rv: null,
  res: 'win', ach: 0, plot: '' };

function mine() {
  try { const v = JSON.parse(store.get('arnak-mine')); if (Array.isArray(v)) return v; } catch {}
  return [];
}
const remember = c => store.set('arnak-mine', JSON.stringify([c, ...mine().filter(x => x !== c)].slice(0, 8)));
const forget = c => store.set('arnak-mine', JSON.stringify(mine().filter(x => x !== c)));
function ago(t) {
  const m = Math.floor((Date.now() - t) / 60000);
  return m < 1 ? '刚刚' : m < 60 ? `${m} 分钟前` : m < 1440 ? `${Math.floor(m / 60)} 小时前` : `${Math.floor(m / 1440)} 天前`;
}

async function loadRooms() {
  if (code) return;
  try { const r = await fetch('/api/rooms'); if (r.ok) { ui.rooms = await r.json(); render(); } } catch {}
}
setInterval(() => { if (!code && !document.hidden) loadRooms(); }, 8000);
const pending = new Map(); // debounced text inputs: key -> {timer, flush}

function cleanCode(v) { const c = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); return c.length === 4 ? c : null; }

/* ---------- connection ---------- */
function connect() {
  if (!code) return;
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/room/${code}/ws`);
  ws.onopen = () => { retry = 0; online = true; queue.splice(0).forEach(m => ws.send(m)); render(); };
  ws.onmessage = e => {
    if (e.data === 'pong') return;
    const m = JSON.parse(e.data);
    if (m.type === 'state') {
      const drew = S && (m.state.draw || 0) > (S.draw || 0);
      const dealt = S && (m.state.deal || 0) > (S.deal || 0);
      S = m.state; remember(code); render();
      if (drew) playDraw();
      if (dealt) toast('队长已随机分配');
    }
    else if (m.type === 'error' && m.error === 'noroom') { noRoom = true; forget(code); ws.close(); render(); }
  };
  ws.onclose = () => {
    online = false; render();
    if (!noRoom && code) setTimeout(connect, Math.min(5000, 400 * 2 ** retry++));
  };
}
setInterval(() => { if (ws && ws.readyState === 1) ws.send('ping'); }, 25000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && code && !noRoom && (!ws || ws.readyState > 1)) { retry = 0; connect(); }
});
function send(action) {
  const m = JSON.stringify({ action });
  if (ws && ws.readyState === 1) ws.send(m); else queue.push(m);
}
function debounced(key, fn, delay = 350) {
  const old = pending.get(key); if (old) clearTimeout(old.timer);
  const entry = { flush() { clearTimeout(entry.timer); pending.delete(key); fn(); } };
  entry.timer = setTimeout(entry.flush, delay);
  pending.set(key, entry);
}
const flushAll = () => [...pending.values()].forEach(p => p.flush());

/* ---------- helpers ---------- */
const P = id => S.players.find(p => p.id === id);
const pname = id => id === RIVAL ? '对手' : P(id).name || (P(id).leader && usesLeaders(S) ? LEADERS[P(id).leader].zh : `${COLOR_ZH[id]}玩家`);
const psub = id => { const p = P(id); return [p.name && p.leader && usesLeaders(S) ? LEADERS[p.leader].zh : '', COLOR_ZH[id]].filter(Boolean).join(' · '); };
const face = id => id === RIVAL ? 'img/rival.jpg' : P(id).leader && usesLeaders(S) ? `img/leaders/${P(id).leader}.jpg` : `img/${id}.jpg`;
const por = (id, cls = '') => `<span class="por ${cls}" style="--c:${COLORS[id]}"><img src="${face(id)}" alt=""></span>`;
const expName = s => [s.el && '探险队长', s.me && '失踪的探险队'].filter(Boolean).join(' + ') || '基础版';
function toast(t) { const el = $('#toast'); el.innerHTML = `<div class="toast">${esc(t)}</div>`; clearTimeout(toast.t); toast.t = setTimeout(() => el.innerHTML = '', 1800); }
const src = s => s ? `<i class="src">${esc(s)}</i>` : '';
const stepList = (items, key) => `<ul class="steps">${items.map((it, i) => {
  const k = key && `${key}-${i}`, on = k && ui.chk[k];
  return `<li class="${key ? 'ck' : ''}${on ? ' on' : ''}" ${key ? `data-act="chk" data-ck="${k}"` : ''}>${key ? '<span class="box"></span>' : ''}<span>${it.t}${src(it.src)}</span></li>`;
}).join('')}</ul>`;

/* ---------- render (DOM morph keeps focus and typed text) ---------- */
function morph(a, b) {
  const ac = [...a.childNodes], bc = [...b.childNodes];
  bc.forEach((y, i) => {
    const x = ac[i];
    if (!x) { a.appendChild(y); return; }
    if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName || (x.nodeType === 1 && x.getAttribute('data-k') !== y.getAttribute('data-k'))) { a.replaceChild(y, x); return; }
    if (x.nodeType !== 1) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; return; }
    for (const at of [...x.attributes]) if (!y.hasAttribute(at.name)) x.removeAttribute(at.name);
    for (const at of [...y.attributes]) if (x.getAttribute(at.name) !== at.value) x.setAttribute(at.name, at.value);
    if (x.tagName === 'INPUT') {
      const v = y.getAttribute('value') ?? '';
      if (x !== document.activeElement && !pending.has(x.dataset.pk) && x.value !== v) x.value = v;
      return;
    }
    if ('disabled' in x) x.disabled = y.hasAttribute('disabled');
    morph(x, y);
  });
  while (a.childNodes.length > bc.length) a.removeChild(a.lastChild);
}
function render() {
  const t = document.createElement('div');
  t.innerHTML = view();
  morph($('#app'), t);
  $('#sheet').innerHTML = ui.sheet ? sheetView() : '';
}

function view() {
  if (!code) return landing();
  if (noRoom) return `${hero()}<div class="wrap"><h2 class="h">房间 ${code} 不存在</h2><p class="note">房间码可能输错了，或者房间已失效。</p><button class="btn" data-act="leave">返回首页</button></div>`;
  if (!S) return `${hero()}<div class="wrap"><h2 class="h">正在连接房间 ${code}…</h2></div>`;
  return bar() + `<div class="wrap" data-k="stage-${S.stage === 'setup' ? 'setup' : 'play'}">` + (S.stage === 'setup' ? setupView() : playView()) + '</div>';
}
const homeNav = () => `<div class="back-row"><button class="back-nav" data-act="leave" data-html2canvas-ignore>‹ 首页</button></div>`;
const hero = () => `<div class="hero with-back" data-k="hero">${homeNav()}<div class="en">LOST RUINS OF ARNAK</div><h1>阿纳克遗迹小助手</h1><div class="orn"></div></div><div class="band"></div>`;
const bar = () => `<div class="bar" data-k="bar">${homeNav()}<span class="ttl">阿纳克遗迹${S && camp(S) ? ' · 冒险模式' : ''}</span>
  <button class="room" data-act="share"><small>房间</small>${code}<small>邀请</small></button><span class="conn ${online ? 'on' : ''}" title="${online ? '已连接' : '重新连接中'}"></span></div>`;

function landing() {
  const rooms = ui.rooms;
  const stageText = r => r.mode === 'camp' ? (r.ch > CHAPTERS ? '冒险完成' : `冒险第 ${r.ch} 章${r.stage === 'setup' ? ' · 准备中' : r.stage === 'over' ? ' · 计分' : ` · 第 ${r.round} 轮`}`)
    : r.stage === 'setup' ? '准备中' : r.stage === 'over' ? '已结束' : `第 ${r.round} / ${ROUNDS} 轮`;
  const my = mine();
  const tag = c => my.includes(c) ? '<em>我的</em>' : '';
  const listed = rooms && rooms.slice().sort((a, b) => my.includes(b.code) - my.includes(a.code));
  const unlisted = rooms ? my.filter(c => !rooms.some(r => r.code === c)) : [];
  const lp = p => `<span class="por xs" style="--c:${COLORS[p.id]}"><img src="${p.leader ? `img/leaders/${p.leader}.jpg` : `img/${p.id}.jpg`}" alt=""></span>`;
  const roomList = rooms === null ? '<div class="empty">加载中…</div>' : listed.length + unlisted.length ? listed.map(r => `
      <button class="card lobby" data-act="rejoin" data-code="${r.code}" data-k="lb-${r.code}">
        <span class="lc">${r.code}${tag(r.code)}</span>
        <span class="lp">${r.players.map(lp).join('')}</span>
        <span class="ls"><b class="st st-${r.stage}">${stageText(r)}</b><small>${r.online ? `<i class="od on"></i>${r.online} 人在线` : ago(r.updated)}</small></span>
      </button>`).join('') + unlisted.map(c => `
      <button class="card lobby" data-act="rejoin" data-code="${c}" data-k="lb-${c}">
        <span class="lc">${c}${tag(c)}</span><span class="lp"></span><span class="ls"><small>点击进入</small></span>
      </button>`).join('') : '<div class="empty">暂无进行中的房间</div>';
  return `<div class="hero-art cover" data-k="hero"><div class="back-row"><a class="back-nav" href="https://boardgame.leisurecat.cloud" data-html2canvas-ignore>‹ 全部游戏</a></div><img src="img/cover-bg.jpg" alt=""><img class="cv" src="img/cover.jpg" alt="《阿纳克遗迹》游戏盒封面"><div class="ht">
      <div class="hz">阿纳克遗迹小助手</div><div class="hs">轮次不乱 · 计分不漏</div></div></div>
    <div class="wrap" data-k="landing">
    <div class="card start">
      <button class="btn" data-act="create" ${ui.busy ? 'disabled' : ''}>创建新房间</button>
      <div class="or">或输入房间码加入</div>
      <div class="join"><input id="joinCode" maxlength="4" autocomplete="off" autocapitalize="characters" placeholder="房间码"><button class="btn navy" data-act="join">加入</button></div>
      ${ui.err ? `<div class="err">${esc(ui.err)}</div>` : ''}
    </div>
    <div class="tiles">
      <a class="card tile" href="guide"><span class="ti"><img src="img/rules-poster.jpg" alt=""></span><span><b>新手教程</b>图文 + 常见问题</span></a>
      <a class="card tile" href="history"><span class="ti rec">录</span><span><b>往期对局</b>战绩与成绩参照</span></a>
    </div>
    <h2 class="h">房间<small>${rooms && rooms.length ? `${rooms.length} 个` : ''}</small></h2>
    <div class="list">${roomList}</div>
    <footer>非官方玩家工具 · 封面版权归出版社所有</footer></div>`;
}

/* ---------- setup ---------- */
function setupView() {
  const used = seated(S).map(p => p.id), C = camp(S), L = usesLeaders(S);
  const chip = (on, act, attrs, label) => `<button class="chip${on ? ' on' : ''}" data-act="${act}" ${attrs}>${label}</button>`;
  const missing = L && seated(S).some(p => !p.leader);
  const tracks = Object.entries(TRACKS).filter(([, t]) => !t.x || S[t.x]);
  const campDone = C && S.camp.ch > CHAPTERS;
  return `
    <h2 class="h">扩展</h2>
    <div class="chips">${chip(S.el, 'opt', `data-key="el" data-on="${!S.el}"`, '探险队长')}${chip(S.me, 'opt', `data-key="me" data-on="${!S.me}"`, '失踪的探险队')}</div>
    ${S.me ? `<h2 class="h">模式</h2><div class="chips">${chip(!C, 'mode', 'data-mode="game"', '标准游戏')}${chip(C, 'mode', 'data-mode="camp"', '冒险模式')}</div>` : ''}
    ${C ? campSetupView() : ''}
    ${campDone ? '' : `
    <h2 class="h">玩家人数</h2>
    <div class="chips">${(C ? [1, 2] : [1, 2, 3, 4]).map(k => chip(k === S.n, 'n', `data-n="${k}"`, `${k} 人`)).join('')}</div>
    ${C ? '<p class="note">冒险模式是单人或双人合作，对一位虚拟对手。</p>' : ''}
    <h2 class="h">版图</h2>
    <div class="chips">${Object.entries(SIDES).map(([k, n]) => chip(S.side === k, 'side', `data-side="${k}"`, n)).join('')}</div>
    ${tracks.length > 1 ? `<div class="chips wrap2">${tracks.map(([k, t]) => chip(S.track === k, 'track', `data-track="${k}"`, k === 'board' ? '原版研究轨' : t.zh)).join('')}</div>` : ''}
    ${(S.el || S.me) && !C ? `<h2 class="h">规则选项</h2><div class="chips">${chip(S.lead, 'opt', `data-key="lead" data-on="${!S.lead}"`, '使用探险队长')}${S.el ? chip(S.redMoon, 'opt', `data-key="redMoon" data-on="${!S.redMoon}"`, '红色月之权杖') : ''}</div>` : ''}
    ${C && S.el ? `<div class="chips" style="margin-top:8px">${chip(S.redMoon, 'opt', `data-key="redMoon" data-on="${!S.redMoon}"`, '红色月之权杖')}</div>` : ''}
    ${S.redMoon ? '<p class="note">红色月之权杖（《探险队长》变体）：每轮结束移除离权杖最近的 2 张物品和 2 张神器，能看到更多卡。</p>' : ''}
    ${S.n === 1 && !C ? `<h2 class="h">对手难度<small>红色行动板块的块数</small></h2><div class="chips">${[0, 1, 2, 3, 4, 5].map(k => chip(S.rival === k, 'rival', `data-red="${k}"`, k)).join('')}</div>` : ''}
    <h2 class="h">${S.n > 1 ? '座位与颜色<small>按顺时针排列</small>' : '玩家'}</h2>
    <div class="list">${seated(S).map((p, i) => `
      <div class="card row" data-k="seat-${i}">
        ${S.n > 1 ? `<div class="stepn">${i + 1}</div>` : ''}
        ${L ? `<button class="por" style="--c:${COLORS[p.id]}" data-act="lead" data-i="${i}" aria-label="选队长"><img src="${p.leader ? `img/leaders/${p.leader}.jpg` : `img/${p.id}.jpg`}" alt=""></button>` : por(p.id)}
        <div class="who">
          <input class="pn" data-pk="name-${i}" data-name="${i}" value="${esc(p.name)}" placeholder="玩家名" maxlength="12" enterkeyhint="done">
          <div class="dots">${COLOR_ORDER.map(c => `<button class="dot${c === p.id ? ' on' : ''}" style="--c:${COLORS[c]}" data-act="color" data-i="${i}" data-c="${c}" ${c !== p.id && used.includes(c) ? 'disabled' : ''} aria-label="${COLOR_ZH[c]}"></button>`).join('')}
            ${S.n > 1 ? `<button class="fst${S.start === p.id ? ' on' : ''}" data-act="first" data-id="${p.id}">${S.start === p.id ? '起始玩家' : '设为起始'}</button>` : ''}</div>
          ${L ? `<button class="ldr${p.leader ? '' : ' none'}" data-act="lead" data-i="${i}">${p.leader ? `${LEADERS[p.leader].zh}<small>换队长</small>` : '点这里选队长'}</button>` : ''}
          ${C ? `<div class="dif">${Object.entries(CAMP_DIFF).map(([k, n]) => `<button class="${p.diff === k ? 'on' : ''}" data-act="diff" data-i="${i}" data-d="${k}">${n.replace('阿纳克', '')}</button>`).join('')}</div>` : ''}
        </div>
        ${S.n > 1 ? `<button class="ib" data-act="move" data-i="${i}" data-j="${i - 1}" ${i === 0 ? 'disabled' : ''} aria-label="上移">↑</button>
        <button class="ib" data-act="move" data-i="${i}" data-j="${i + 1}" ${i === S.n - 1 ? 'disabled' : ''} aria-label="下移">↓</button>` : ''}
      </div>`).join('')}</div>
    ${S.n > 1 ? `<p class="note">规则书：最近去过一个从没去过的地方的人当起始玩家。也可以随机抽。${C ? '对手在第 I 轮最后行动。' : ''}</p>` : ''}
    <div class="btns">${S.n > 1 ? '<button class="btn ghost" data-act="draw">随机抽起始玩家</button>' : ''}${L ? '<button class="btn ghost" data-act="deal">随机分配队长</button>' : ''}</div>
    <button class="btn ghost" data-act="setup">看布置清单</button>
    <button class="btn" data-act="begin" ${missing ? 'disabled' : ''}>${missing ? '先给每位玩家选队长' : C ? `开始第 ${S.camp.ch} 章` : '开始游戏'}</button>`}`;
}

function campSetupView() {
  const log = S.camp.log, done = S.camp.ch > CHAPTERS;
  return `<h2 class="h">冒险记录<small>${done ? '六章已完成' : `接下来：第 ${S.camp.ch} 章`}</small></h2>
    ${campLog()}
    ${done ? `<div class="card camp-end"><b>冒险总分 ${campTotal(S)}</b><p>数一数各条路径的故事符号，读计数最高那条路径的结局（冒险手册第 36 页）。</p></div>
      <button class="btn" data-act="newcamp">开始新的冒险</button>` : ''}
    ${log.length ? `<button class="btn ghost" data-act="unchapter">撤销第 ${log.at(-1).ch} 章的记录</button>` : ''}`;
}
function campLog() {
  const log = S.camp.log;
  if (!log.length) return '<p class="note">还没有记录。每章结束后，在「本章」页记录结果，进度会存在这个房间里，记住房间码就能下次接着玩。</p>';
  return `<div class="list">${log.map(c => `<div class="card row cl" data-k="cl-${c.ch}"><div class="stepn">${c.ch}</div>
      <div class="who"><div class="nm">${c.res === 'win' ? '胜利' : '接受失败'}${c.ach ? ` · 成就 ${c.ach}` : ''}${c.plot ? ` · 剧情点 ${esc(c.plot)}` : ''}</div>
      <div class="fg">${c.players.map(p => `${esc(p.name || COLOR_ZH[p.id])}（${LEADERS[p.leader]?.zh || ''} · ${CAMP_DIFF[p.diff].replace('阿纳克', '')}）`).join('、')}</div></div>
      <div class="tot">${fmtPts(c.score)}</div></div>`).join('')}
    <div class="card ms-tot"><span>累计</span><b>${fmtPts(log.reduce((a, c) => a + c.score, 0))}</b></div></div>`;
}
// Campaign scores keep half points (2-player chapters): 10.5 → 10½, 0.5 → ½
const fmtPts = v => { const a = Math.abs(v), w = Math.floor(a); return (v < 0 ? '−' : '') + (a % 1 ? (w || '') + '½' : a); };

/* ---------- play ---------- */
function playView() {
  const tabs = [['flow', '流程'], ['score', '计分'], camp(S) ? ['mvp', '本章'] : ['mvp', '结算']];
  if (!tabs.some(t => t[0] === ui.tab)) ui.tab = 'flow';
  return `<div class="tabs">${tabs.map(([k, n]) => `<button class="tab${ui.tab === k ? ' on' : ''}" data-act="tab" data-tab="${k}">${n}</button>`).join('')}</div>
    ${status()}${banner()}
    <div data-k="tab-${ui.tab}">${ui.tab === 'flow' ? flowTab() : ui.tab === 'score' ? scoreTab() : camp(S) ? chapterTab() : mvpTab()}</div>`;
}

function status() {
  const ch = camp(S) ? `第 ${S.camp.ch} 章 · ` : '';
  if (S.stage === 'over') return `<div class="status"><span class="medal">终</span><div><div class="t">${ch}游戏结束</div><div class="s">第 V 轮已结束，开始终局计分</div></div></div>`;
  const left = S.n - S.passed.length;
  const pips = Array.from({ length: ROUNDS }, (_, i) => `<i class="${i + 1 < S.round ? 'done' : i + 1 === S.round ? 'cur' : ''}"></i>`).join('');
  return `<div class="status"><span class="medal" style="font-size:19px">${ROMAN[S.round]}</span>
    <div><div class="t">${ch}第<b>${S.round}</b>/ ${ROUNDS} 轮</div><div class="s">${left ? `还有 ${left} 人没跳过` : S.round === ROUNDS ? '都跳过了：收回考古学家，然后计分' : '都跳过了：做轮末整理'}</div></div>
    <div class="pips">${pips}</div></div>`;
}

function banner() {
  if (S.stage === 'over' && ui.tab !== 'mvp')
    return `<div class="banner"><div style="flex:1"><b>游戏结束</b>，请填写终局计分</div><button data-act="goto" data-tab="${ui.tab === 'score' ? 'mvp' : 'score'}">${ui.tab === 'score' ? (camp(S) ? '记录本章' : '看结算') : '去计分'}</button></div>`;
  return '';
}

function flowTab() {
  const order = turnOrder(S);
  const k = id => S.passed.indexOf(id);
  const track = `<div class="track"><div class="t">${S.n === 1 && !camp(S) ? '单人游戏 · 对手每轮先手' : '行动顺序 · 从起始玩家起顺时针'}</div><div class="slots">${order.map((id, i) => `
    <div class="slot${k(id) >= 0 ? ' out' : ''}" data-k="slot-${id}"><div class="o">${i + 1}</div>${por(id)}<div class="n">${esc(pname(id))}</div>${k(id) >= 0 ? `<span class="m">第 ${k(id) + 1} 个跳过</span>` : i === 0 && S.n > 1 ? '<span class="m">起始</span>' : ''}</div>`).join('')}</div></div>`;
  const tools = `<div class="btns"><button class="btn ghost" data-act="undo" ${S.back.length ? '' : 'disabled'}>撤销上一步</button><button class="btn ghost" data-act="setup">布置清单</button><button class="btn ghost" data-act="reset">${camp(S) ? '重玩本章' : '重新开局'}</button></div>`;
  if (S.stage === 'over') return track + tools;
  const all = S.passed.length === S.n, last = S.round === ROUNDS;
  const passBtns = `<div class="pick passes">${humans(S).map(id => `<button class="${k(id) >= 0 ? 'on' : ''}" data-act="pass" data-id="${id}" ${k(id) >= 0 ? 'disabled' : ''}>${por(id, 'sm')}<span>${esc(pname(id))}${k(id) >= 0 ? ' · 已跳过' : ' 跳过'}</span></button>`).join('')}</div>`;
  return `${track}
    <div class="card ph${all ? ' done' : ' cur'}" data-k="ph-start-${S.round}"><div class="phh"><span class="phn">1</span><b>第 ${ROMAN[S.round]} 轮开始</b>${all ? "<small>已完成</small>" : ""}</div>${all ? "" : `<div class="phb">${stepList(roundStart(S, S.round))}</div>`}</div>
    <div class="card ph${all ? ' done' : ' cur'}" data-k="ph-act"><div class="phh"><span class="phn">2</span><b>轮流行动</b><small>${all ? "都跳过了" : "每回合 1 个主要行动"}</small></div>
      ${all ? "" : `<div class="phb"><p>谁不再行动了，就点自己「跳过」。全员跳过后进入轮末整理。${S.n === 1 && !camp(S) ? '对手要翻完 10 块行动板块才跳过，不用在这里点。' : camp(S) ? '对手不用点，它按单人规则行动。' : ''}</p>${passBtns}
      <button class="tbh df" data-act="df"><b>别忘了</b><span>${ui.df ? '收起' : '展开 8 条'}</span></button>${ui.df ? stepList(dontForget(S)) : ''}</div>`}</div>
    <div class="card ph${all ? ' cur' : ' off'}" data-k="ph-end-${S.round}"><div class="phh"><span class="phn">3</span><b>${last ? '第 V 轮结束' : '轮末整理'}</b><small>${all ? '点一条勾一条' : '全员跳过后进行'}</small></div>
      ${all ? `<div class="phb">${stepList(cleanup(S, S.round), `r${S.round}`)}</div>` : ''}</div>
    <button class="btn" data-act="next" ${all ? '' : 'disabled'}>${!all ? '等所有人跳过' : last ? '进入终局计分' : `整理完了，开始第 ${ROMAN[S.round + 1]} 轮`}</button>
    ${tools}`;
}

/* ---------- scoring ---------- */
const meKey = () => `arnak-me-${code}`;
const myId = () => { const m = store.get(meKey()); return humans(S).includes(m) ? m : null; };

function scoreTab() {
  const views = [['me', '我的计分'], ['all', '全桌总览'], ...(hasRival(S) ? [['rival', '对手']] : [])];
  const view = views.some(v => v[0] === ui.view) ? ui.view : 'me', me = myId();
  const seg = `<div class="seg">${views.map(([k, n]) => `<button class="${k === view ? 'on' : ''}" data-act="view" data-v="${k}">${n}</button>`).join('')}</div>`;
  if (view === 'me' && !me) return seg + `<h2 class="h">你是哪位玩家？</h2><p class="note">选好后这台手机只填你自己的分数，其他人在各自手机上填，结果实时汇总。</p>
    <div class="pick me">${humans(S).map(id => `<button data-act="me" data-id="${id}">${por(id, 'sm')}<span>${esc(pname(id))}</span></button>`).join('')}</div>`;
  return seg + (view === 'me' ? myScore(me) : view === 'rival' ? rivalScore() : fullTable());
}

// Things worth checking before the totals are trusted (community-reported mistakes, see docs/调研).
function warnOf(id, key) {
  const f = fieldOf(id, key), d = (S.score[id] || {})[key];
  if (f.allow && Array.isArray(d)) { const bad = d.filter(v => !f.allow.includes(v)); if (bad.length) return `${bad.join('、')} 不是神庙板块的分值（只有 11、6、2）`; }
  if (key === 'res' && Array.isArray(d) && d.length > (id === RIVAL ? 1 : 2)) return id === RIVAL ? '对手只有一个放大镜，只填一个数' : '研究轨只有放大镜和笔记本两个标记，最多填两个数';
  return '';
}
// Notes that depend on the player's leader.
function leaderNote(id, key) {
  const l = id !== RIVAL && usesLeaders(S) && P(id).leader;
  if (key === 'fear' && l === 'mystic') return '神秘人：祭典牌堆里的恐惧卡不扣分，不要算进来。';
  if (key === 'card' && l === 'professor') return '教授：档案里还没买下的神器不是你的卡，不算。';
  if (key === 'slot' && l === 'mystic') return '神秘人有 5 个神像槽。';
  return '';
}

function cellBtn(id, key) {
  const f = fieldOf(id, key), d = (S.score[id] || {})[key], warn = warnOf(id, key) ? ' warn' : '';
  if (f.list) { const t = (d || []).reduce((a, b) => a + b, 0); return `<button class="cell ${d && d.length ? '' : 'empty'}${warn}" data-act="cell" data-id="${id}" data-key="${key}">${d && d.length ? t : '加'}</button>`; }
  const filled = d !== undefined && d !== '';
  const bad = filled && num(d) === null;
  const neg = f.neg && filled && !bad && num(d) > 0;
  return `<button class="cell ${filled ? '' : 'empty'} ${bad ? 'bad' : ''} ${neg ? 'neg' : ''}${warn}" data-act="cell" data-id="${id}" data-key="${key}">${filled ? esc(d) + (f.count ? '<small>个</small>' : '') : '0'}</button>`;
}
const rowName = (id, k) => { const f = fieldOf(id, k); return `${f.n}${f.count ? `<small>每个 ${f.neg ? '−' : '×'}${f.mult}</small>` : ''}`; };

function myScore(id) {
  const p = parts(S, id);
  const item = k => {
    const w = warnOf(id, k), ln = leaderNote(id, k), d = (S.score[id] || {})[k], f = FIELD[k];
    const detail = f.list && d && d.length > 1 ? `<div class="ms-ex">${d.map((v, i) => (i ? (v < 0 ? ' − ' : ' + ') : v < 0 ? '−' : '') + Math.abs(v)).join('')}</div>` : '';
    return `<div class="card ms" data-k="ms-${k}"><div class="ms-t"><b>${rowName(id, k)}</b><div class="ms-h">${f.hint}</div>${detail}${ln ? `<div class="ms-l">${ln}</div>` : ''}${w ? `<div class="ms-w">${esc(w)}</div>` : ''}</div>${cellBtn(id, k)}</div>`;
  };
  const rows = rowsFor(id);
  const others = humans(S).filter(o => o !== id).map(o => { const q = parts(S, o); return `<span>${por(o, 'xs')}${esc(pname(o))} <b>${q ? q.total : '—'}</b></span>`; }).join('');
  return `<div class="ms-who">${por(id, 'sm')}<div><b>${esc(pname(id))}</b><small>只填你自己的分数</small></div><button class="tbh" data-act="me" data-id=""><span>换人</span></button></div>
    <h2 class="h">得分</h2><div class="list">${rows.filter(k => !FIELD[k].neg).map(item).join('')}</div>
    <h2 class="h">扣分</h2><div class="list">${rows.filter(k => FIELD[k].neg).map(item).join('')}</div>
    <div class="ms-tot card"><span>我的合计</span><b data-tt="${id}">${p ? p.total : '—'}</b></div>
    <div class="ms-others">${others}</div>`;
}

function rivalScore() {
  const p = parts(S, RIVAL);
  const item = k => { const w = warnOf(RIVAL, k); return `<div class="card ms" data-k="rs-${k}"><div class="ms-t"><b>${rowName(RIVAL, k)}</b><div class="ms-h">${RFIELD[k].hint}</div>${w ? `<div class="ms-w">${esc(w)}</div>` : ''}</div>${cellBtn(RIVAL, k)}</div>`; };
  return `<div class="ms-who">${por(RIVAL, 'sm')}<div><b>对手</b><small>按单人规则计分：不拿恐惧卡、没有资源</small></div></div>
    <div class="list" style="margin-top:10px">${R_ROWS.map(item).join('')}</div>
    <div class="ms-tot card"><span>对手合计</span><b data-tt="rival">${p ? p.total : '—'}</b></div>`;
}

function fullTable() {
  const order = humans(S), rows = rowsFor(order[0]);
  const row = k => `<tr data-k="sr-${k}"><th>${rowName(order[0], k)}</th>${order.map(id => `<td>${cellBtn(id, k)}</td>`).join('')}</tr>`;
  const tots = order.map(id => parts(S, id));
  const warns = order.flatMap(id => rows.map(k => warnOf(id, k) && `${pname(id)} · ${FIELD[k].n}：${warnOf(id, k)}`)).filter(Boolean);
  const head = t => `<tr class="grp" data-k="g-${t}"><td colspan="${order.length + 1}">${t}</td></tr>`;
  return `<table class="sc"><thead><tr><th></th>${order.map(id => `<th><div class="pv">${por(id, 'xs')}<span>${esc(pname(id))}</span></div></th>`).join('')}</tr></thead>
    <tbody>${head('得分')}${rows.filter(k => !FIELD[k].neg).map(row).join('')}${head('扣分')}${rows.filter(k => FIELD[k].neg).map(row).join('')}
    <tr data-k="sr-total"><th>合计</th>${order.map((id, i) => `<td class="tt" data-tt="${id}">${tots[i] ? tots[i].total : '—'}</td>`).join('')}</tr></tbody></table>
    ${warns.map(w => `<p class="note">${esc(w)}</p>`).join('')}
    <p class="legend">研究轨、神庙板块、物品和神器逐项输入（如 11+6），合计自动相加；神像、守卫、恐惧填个数，自动乘分。没手机的玩家可以由别人在这里代填。</p>`;
}

/* ---------- results ---------- */
function tieCard(R) {
  const tied = R.rows.filter(r => r.tied);
  if (!tied.length) return '';
  return `<div class="card tie" data-html2canvas-ignore><b>同分怎么分胜负</b><p>先到达失落的神庙的玩家胜；同分的人都没到达，就比研究轨分数；还一样就并列。按到达失落的神庙的先后点一下（没到达的不点）：</p>
    <div class="pick">${tied.map(r => { const k = S.lt.indexOf(r.id); return `<button class="${k >= 0 ? 'on' : ''}" data-act="lt" data-id="${r.id}">${por(r.id, 'xs')}<span>${esc(pname(r.id))}${k >= 0 ? ` · 第 ${k + 1} 个到` : ''}</span></button>`; }).join('')}</div></div>`;
}

function mvpTab() {
  const R = results(S);
  if (R.error) return `<p class="note">计分里有无效数字，请先到「计分」修正。</p>`;
  const solo = S.n === 1, top = R.rows.filter(r => r.place === 1), champ = top[0];
  const win = solo && champ.total > R.rival.total;
  const maxSum = Math.max(1, ...R.rows.map(r => CATS.reduce((a, c) => a + Math.max(0, r[c.k]), 0)), R.rival ? CATS.reduce((a, c) => a + Math.max(0, R.rival[c.k]), 0) : 0);
  const rkRow = (r, place) => `
      <div class="card row" data-k="rk-${r.id}"><div class="stepn">${place}</div>${por(r.id, 'sm')}
        <div class="who"><div class="nm">${esc(pname(r.id))}${r.id !== RIVAL ? ` <span class="fg" style="display:inline">${esc(psub(r.id))}</span>` : ''}</div>
          <div class="stack">${CATS.map(c => `<i style="width:${Math.max(0, r[c.k]) / maxSum * 100}%;background:${c.c}"></i>`).join('')}</div>
          <div class="parts">${CATS.filter(c => r[c.k]).map(c => `<em style="background:${c.c}"></em>${c.n} ${r[c.k]}`).join(' ')}${r.minus ? ` <span class="mn">恐惧 −${r.minus}</span>` : ''}</div></div>
        <div class="tot">${r.total}</div></div>`;
  // solo: whoever has more points wins (base rulebook p.21); equal points are shown as a tie
  const ranked = solo ? [{ ...champ, place: champ.total >= R.rival.total ? 1 : 2 }, { ...R.rival, id: RIVAL, place: R.rival.total >= champ.total ? 1 : 2 }].sort((a, b) => a.place - b.place) : R.rows;
  return `<div id="shot">
    <div class="mvp" style="margin-top:8px">
      <div class="crown">${solo ? (win ? '探 险 成 功' : champ.total === R.rival.total ? '与 对 手 平 分' : '对 手 领 先') : top.length > 1 ? '并 列 第 一' : 'M V P · 传 奇 探 险 家'}</div>
      ${por(champ.id)}
      <div class="nm">${top.map(r => esc(pname(r.id))).join(' · ')}</div>
      <div class="fg">${S.n} 人局 · ${expName(S)}${S.n === 1 ? ` · 对手难度 ${S.rival}` : ''}</div>
      <div class="pts">${champ.total}<small>分${solo ? ` · 对手 ${R.rival.total}` : ''}</small></div>
    </div>
    <div class="btns sv" data-html2canvas-ignore><button class="btn ghost" data-act="rn">${ui.rn ? '收起改名' : '修改玩家名'}</button><button class="btn navy" data-act="save" ${ui.saving ? 'disabled' : ''}>${ui.saving ? '正在生成…' : '保存结算长图'}</button></div>
    ${ui.rn ? `<div class="card" data-k="rn" data-html2canvas-ignore style="margin-top:8px;padding:2px 10px 8px">${humans(S).map(id => { const i = S.players.findIndex(p => p.id === id); return `<div class="tb">${por(id, 'xs')}<input class="pn" data-pk="name-${i}" data-name="${i}" value="${esc(P(id).name)}" placeholder="玩家名" maxlength="12" enterkeyhint="done"></div>`; }).join('')}</div>` : ''}
    ${solo ? '' : tieCard(R)}
    <h2 class="h">排名与得分构成</h2>
    <div class="list rk">${ranked.map(r => rkRow(r, r.place)).join('')}</div>
    <p class="legend">${CATS.map(c => `<em class="lg" style="background:${c.c}"></em>${c.n}`).join(' ')}（神像含空神像槽分）</p>
    ${R.ach.length ? `<h2 class="h">成就</h2>
    <div class="achs">${R.ach.map(a => `
      <div class="card ach" data-k="ach-${a.k}"><span class="medal">${a.ch}</span><div style="min-width:0"><div class="an">${a.name}</div><div class="ad">${a.desc}</div>
        <div class="aw">${a.who.map(id => por(id, 'xs')).join('')}${a.who.length === 1 ? `<span class="fg" style="align-self:center;margin-left:3px">${esc(pname(a.who[0]))}</span>` : ''}</div></div></div>`).join('')}</div>` : ''}</div>
    ${reviewCard()}`;
}

// Campaign: this chapter's result (campaign book p.4–5) and the running log.
function chapterTab() {
  const ch = S.camp.ch, sc = chapterScore(S), R = results(S);
  const sumP = R.error ? null : R.rows.reduce((a, r) => a + r.total, 0);
  const calc = R.error ? '<p class="note">计分里有无效数字，请先到「计分」修正。</p>'
    : `<div class="card calc"><div>本方 ${R.rows.map(r => `${esc(pname(r.id))} ${r.total}`).join(' + ')}${S.n === 2 ? ` = ${sumP}，÷ 2 = ${fmtPts(sumP / 2)}` : ''}</div>
      <div>减去对手 ${R.rival.total}</div><b>胜利时章节分 ${fmtPts(sc)}</b><small>接受失败时章节分记 ${CAMP_LOSS}，不算分。章节分可以是负数，负数也算胜利。</small></div>`;
  const chip = (on, act, attrs, label) => `<button class="chip${on ? ' on' : ''}" data-act="${act}" ${attrs}>${label}</button>`;
  const ready = ui.res === 'lose' || sc !== null;
  return `<h2 class="h">第 ${ch} 章结果</h2>
    ${S.stage !== 'over' ? '<p class="note">一般打完第 V 轮再记录。章节目标达成就算胜利（看本章概述卡）。</p>' : ''}
    <div class="chips">${chip(ui.res === 'win', 'res', 'data-r="win"', '目标完成 · 胜利')}${chip(ui.res === 'lose', 'res', 'data-r="lose"', '接受失败')}</div>
    ${ui.res === 'lose' ? '<p class="note">不想接受失败，可以在「流程」点「重玩本章」，就当这局没发生过。接受失败会读替代结局，下一章开局带惩罚。</p>' : calc}
    <h2 class="h">本章成就<small>赢得的成就卡张数</small></h2>
    <div class="chips">${[0, 1, 2, 3].map(k => chip(ui.ach === k, 'ach', `data-n="${k}"`, k)).join('')}</div>
    <h2 class="h">剧情点<small>记录纸上到达的编号，可不填</small></h2>
    <div class="join"><input class="plot" data-plot value="${esc(ui.plot)}" maxlength="40" placeholder="如 3、7" inputmode="text"></div>
    <p class="note">剧情点的卡牌下一章开局放在牌库底；记得在冒险记录纸上画好本章的故事符号。</p>
    <button class="btn" data-act="chapter" ${ready ? '' : 'disabled'}>记录第 ${ch} 章${ch < CHAPTERS ? '，准备下一章' : '，完成冒险'}</button>
    <h2 class="h">冒险记录</h2>${campLog()}
    ${reviewCard()}`;
}

/* ---------- rating this game (stars + comment), shown on the hub boardgame.leisurecat.cloud ---------- */
const REVIEW_API = 'https://boardgame.leisurecat.cloud/api/reviews';
const STAR_TXT = ['点星星打分', '不推荐', '一般', '还行', '好玩', '超好玩'];
const savedReview = () => { try { return JSON.parse(store.get('arnak-rv-' + code)) || {}; } catch { return {}; } };
function reviewCard() {
  if (ui.rv?.room !== code) ui.rv = { who: myId(), stars: 0, text: '', state: '', err: '', ...savedReview(), room: code };   // "who" starts as the player picked on the score tab
  const rv = ui.rv;
  if (rv.state === 'sent') return `<div class="card rv" data-k="rv"><div class="rv-done">${'★'.repeat(rv.stars)}${'☆'.repeat(5 - rv.stars)}</div>
    <p>谢谢 ${esc(rv.who && humans(S).includes(rv.who) ? pname(rv.who) : '')} 的评价！</p><div class="btns"><button class="btn ghost" data-act="rv-edit">修改评价</button><a class="btn navy" href="https://boardgame.leisurecat.cloud">看大家的评价</a></div></div>`;
  return `<h2 class="h">给这款游戏打个分</h2><div class="card rv" data-k="rv">
    <div class="rv-l">我是</div><div class="rv-who">${humans(S).map(id => `<button class="${rv.who === id ? 'on' : ''}" data-act="rv-who" data-id="${id}">${por(id, 'xs')}<span>${esc(pname(id))}</span></button>`).join('')}</div>
    <div class="rv-st">${[1, 2, 3, 4, 5].map(n => `<button class="${n <= rv.stars ? 'on' : ''}" data-act="rv-star" data-n="${n}" aria-label="${n} 星">★</button>`).join('')}<span>${STAR_TXT[rv.stars]}</span></div>
    <textarea data-rv placeholder="说说这局的感受（可不填）" maxlength="300">${esc(rv.text)}</textarea>
    <button class="btn" data-act="rv-send" ${!rv.who || !rv.stars || rv.state === 'sending' ? 'disabled' : ''}>${rv.state === 'sending' ? '提交中…' : '提交评价'}</button>
    ${rv.err ? `<p class="err">${esc(rv.err)}</p>` : ''}
    <p class="note">评价和玩家名会显示在「桌游小助手」首页，并计入这款游戏的整体评分。同一局再次提交会覆盖之前的评价。</p></div>`;
}
async function sendReview() {
  const rv = ui.rv;
  rv.state = 'sending'; rv.err = ''; render();
  try {
    const r = await fetch(REVIEW_API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ game: 'arnak', stars: rv.stars, name: pname(rv.who), text: rv.text, room: code }) });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `提交失败（${r.status}）`);
    rv.state = 'sent';
    store.set('arnak-rv-' + code, JSON.stringify({ who: rv.who, stars: rv.stars, text: rv.text, state: 'sent' }));
  } catch (e) {
    rv.state = ''; rv.err = e.message === 'Failed to fetch' ? '网络连接失败，请稍后再试' : e.message;
  }
  render();
}

/* ---------- results as one long image ---------- */
const loadScript = src => new Promise((ok, fail) => {
  if (window.html2canvas) return ok();
  const el = document.createElement('script');
  el.src = src; el.onload = ok; el.onerror = () => fail(new Error('截图组件加载失败'));
  document.head.appendChild(el);
});
async function saveImage() {
  ui.saving = true; render();
  try {
    await loadScript('vendor/html2canvas.min.js');
    const canvas = await window.html2canvas($('#shot'), {
      scale: Math.max(2, window.devicePixelRatio || 1), backgroundColor: '#efe6cf',
      onclone: doc => {
        const c = doc.getElementById('shot');
        c.style.cssText = 'margin:0 -14px;padding:18px 14px 14px';   // grow outward so the content keeps its on-screen width
        c.insertAdjacentHTML('afterbegin', `<div style="text-align:center;padding-bottom:6px"><div style="font:900 22px var(--serif);color:var(--red);letter-spacing:4px">阿纳克遗迹</div>
          <div style="font:500 12px var(--sans);color:var(--ink2);margin-top:4px">终局结算 · 房间 ${code} · ${new Date().toLocaleDateString('zh-CN')}</div></div>`);
        c.insertAdjacentHTML('beforeend', `<div style="text-align:center;font:500 11px var(--sans);color:var(--ink2);margin-top:16px">阿纳克遗迹小助手 · ${location.host}</div>`);
      }
    });
    showImage(canvas.toDataURL('image/jpeg', 0.92));
  } catch (e) { toast('生成长图失败：' + e.message); }
  ui.saving = false; render();
}
function showImage(url) {
  const el = document.createElement('div');
  el.className = 'shotv';
  el.innerHTML = `<div class="sv-top"><span>长按图片保存到相册</span><a href="${url}" download="阿纳克遗迹结算-${code}.jpg">下载</a><button type="button">关闭</button></div><img src="${url}" alt="结算长图">`;
  el.querySelector('button').onclick = () => el.remove();
  document.body.appendChild(el);
}

/* ---------- start player draw (plays on every phone when someone draws) ---------- */
const BAG_SVG = `<svg viewBox="0 0 120 130" width="120" height="130" aria-hidden="true">
  <path d="M40 34C26 50 10 66 10 94c0 24 20 32 50 32s50-8 50-32c0-28-16-44-30-60z" fill="#6b4a2b"/>
  <path d="M40 34C26 50 10 66 10 94c0 24 20 32 50 32" fill="none" stroke="#4a321c" stroke-width="3" stroke-dasharray="5 4"/>
  <path d="M42 30 32 8l14 9 6-13 8 12 8-12 6 13 14-9-10 22z" fill="#7d5a36"/><path d="M38 33h44l-3 8H41z" fill="#3e2a16"/>
  <circle cx="60" cy="88" r="17" fill="none" stroke="#e6c97d" stroke-width="3"/>
  <path d="M60 74l5 9 9 2-7 6 2 9-9-5-9 5 2-9-7-6 9-2z" fill="none" stroke="#e6c97d" stroke-width="2.4" stroke-linejoin="round"/></svg>`;
const DRAW_START_MS = 1100, DRAW_STEP_MS = 650, DRAW_HOLD_MS = 1500;
function playDraw() {
  const order = turnOrder(S).filter(id => id !== RIVAL);
  document.getElementById('draw')?.remove();
  const el = document.createElement('div');
  el.id = 'draw'; el.className = 'draw';
  el.style.setProperty('--start', DRAW_START_MS + 'ms'); el.style.setProperty('--step', DRAW_STEP_MS + 'ms');
  el.innerHTML = `<div class="dr-box"><div class="dr-t">抽起始玩家</div>
    <div class="dr-slots">${order.map((id, i) => `<div class="dr-s${i === 0 ? ' first' : ''}" style="--d:${(order.length - 1) / 2 - i};--i:${i}">
      ${por(id)}<b>${i === 0 ? '起始' : i + 1}</b><i>${esc(pname(id))}</i></div>`).join('')}</div>
    <div class="dr-bag">${BAG_SVG}</div><div class="dr-skip">点击任意处跳过</div></div>`;
  el.addEventListener('click', () => el.remove());
  document.body.appendChild(el);
  const end = DRAW_START_MS + order.length * DRAW_STEP_MS + DRAW_HOLD_MS;
  setTimeout(() => el.classList.add('out'), end);
  setTimeout(() => el.remove(), end + 400);
}

/* ---------- sheets: keypad, leader picker, setup checklist ---------- */
function sheetView() {
  const s = ui.sheet;
  if (s.kind === 'lead') {
    const me = S.players[s.i];
    const taken = seated(S).filter(p => p !== me).map(p => p.leader);
    const list = Object.keys(LEADERS).filter(k => leaderOk(S, k));
    return `<div class="mask" data-act="close"></div><div class="sheet tall"><h3>${esc(me.name || COLOR_ZH[me.id] + '玩家')} · 选择探险队长</h3>
      <div class="hint">《探险队长》的六位按从易到难排列，新手建议选靠前的。</div>
      <div class="ldrs">${list.map(k => `<button data-act="pickl" data-l="${k}" class="${k === me.leader ? 'on' : ''}" ${taken.includes(k) ? 'disabled' : ''}>
        <span class="por" style="--c:${COLORS[me.id]}"><img src="img/leaders/${k}.jpg" alt=""></span>
        <span><b>${LEADERS[k].zh}<small>${LEADERS[k].en}${LEADERS[k].x === 'me' ? ' · 失踪的探险队' : ''}</small></b>${LEADER_INFO[k].one}${LEADER_INFO[k].tip ? `<em>注意：${LEADER_INFO[k].tip}</em>` : ''}</span></button>`).join('')}</div>
      <button class="btn ghost" data-act="close">关闭</button></div>`;
  }
  if (s.kind === 'setup') {
    const secs = setupList(S, pname);
    return `<div class="mask" data-act="close"></div><div class="sheet tall"><h3>布置清单</h3>
      <div class="hint">${S.n} 人${camp(S) ? ' · 冒险模式' : ''} · ${expName(S)} · ${SIDES[S.side]}${S.track !== 'board' ? ` + ${TRACKS[S.track].zh}` : ''}。点一条勾一条，只在这台手机上记。来源页码：基 = 基础规则书，队 = 探险队长，失 = 失踪的探险队，冒 = 冒险手册。</div>
      <div class="sl">${secs.map((sec, i) => `<h4>${sec.h}</h4>${stepList(sec.items, `s${i}`)}`).join('')}</div>
      <button class="btn ghost" data-act="close">关闭</button></div>`;
  }
  const f = fieldOf(s.id, s.key);
  return `<div class="mask" data-act="close"></div><div class="sheet">
    <h3>${esc(pname(s.id))} · ${f.neg ? '扣分 · ' : ''}${f.n}</h3><div class="hint">${f.hint}</div>
    <div class="disp"><div class="ex">${esc(exprText(s)) || '&nbsp;'}</div><div class="cur">= ${exprTotal(s)}${f.count ? ` 个 · ${f.neg ? '−' : ''}${exprTotal(s) * f.mult} 分` : ''}</div></div>
    ${f.quick ? `<div class="quick">${f.quick.map(([n, v]) => `<button data-act="q" data-v="${v}">${n}</button>`).join('')}</div>` : ''}
    <div class="keys">
      <button data-act="k" data-k="7">7</button><button data-act="k" data-k="8">8</button><button data-act="k" data-k="9">9</button><button class="op" data-act="k" data-k="+">+</button>
      <button data-act="k" data-k="4">4</button><button data-act="k" data-k="5">5</button><button data-act="k" data-k="6">6</button><button class="op" data-act="k" data-k="-">−</button>
      <button data-act="k" data-k="1">1</button><button data-act="k" data-k="2">2</button><button data-act="k" data-k="3">3</button>
      <button class="ok" data-act="k" data-k="ok">完成</button>
      <button class="fn" data-act="k" data-k="clr">清空</button><button data-act="k" data-k="0">0</button><button class="fn" data-act="k" data-k="bs">⌫</button>
    </div></div>`;
}

// Calculator: committed signed terms, then the operator being typed (op) and its digits (cur).
const exprTotal = s => s.terms.reduce((a, b) => a + b, 0) + (s.cur ? (s.op === '-' ? -1 : 1) * Number(s.cur) : 0);
function exprText(s) {
  let out = s.terms.map((t, i) => (i === 0 ? (t < 0 ? '−' : '') : t < 0 ? ' − ' : ' + ') + Math.abs(t)).join('');
  if (s.cur || s.opShown) out += (s.terms.length ? (s.op === '-' ? ' − ' : ' + ') : s.op === '-' ? '−' : '') + s.cur;
  return out;
}

function keypad(k) {
  const s = ui.sheet, f = fieldOf(s.id, s.key);
  const commit = () => { if (s.cur !== '') { s.terms.push((s.op === '-' ? -1 : 1) * Number(s.cur)); s.cur = ''; } };
  if (/^\d$/.test(k)) { if (s.cur.length < 3) s.cur = (s.cur === '0' ? '' : s.cur) + k; }
  else if (k === '+' || k === '-') { commit(); s.op = k; s.opShown = true; }
  else if (k === 'bs') {
    if (s.cur) s.cur = s.cur.slice(0, -1);
    else if (s.opShown) s.opShown = false;
    else if (s.terms.length) { const t = s.terms.pop(); s.cur = String(Math.abs(t)); s.op = t < 0 ? '-' : '+'; s.opShown = t < 0 || s.terms.length > 0; }
  }
  else if (k === 'clr') { s.terms = []; s.cur = ''; s.op = '+'; s.opShown = false; }
  else if (k.startsWith('q')) { commit(); s.terms.push(Number(k.slice(1))); s.op = '+'; s.opShown = false; }
  else if (k === 'ok') {
    const empty = !s.terms.length && s.cur === '';
    commit();
    const value = f.list ? s.terms : empty ? '' : String(s.terms.reduce((a, b) => a + b, 0));
    send({ t: 'score', id: s.id, key: s.key, value });
    ui.sheet = null;
  }
  render();
}

/* ---------- events ---------- */
async function createRoom() {
  ui.busy = true; ui.err = ''; render();
  try {
    const r = await fetch('/api/room', { method: 'POST' });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || '创建失败');
    enterRoom(j.code);
  } catch (e) { ui.err = '创建房间失败：' + e.message; }
  ui.busy = false; render();
}
function enterRoom(c) {
  code = c; noRoom = false; S = null; ui.err = ''; ui.chk = {};
  history.replaceState(null, '', '/?r=' + c);
  connect(); render();
}
function leave() {
  code = null; S = null; noRoom = false; if (ws) { ws.onclose = null; ws.close(); }
  history.replaceState(null, '', '/'); ui.rooms = null; render(); loadRooms();
}
async function share() {
  const url = `${location.origin}/?r=${code}`;
  const text = `阿纳克遗迹小助手｜轮次不乱，计分不漏\n邀请你加入《阿纳克遗迹》房间 ${code}，点开链接就能和大家同步流程与计分（无需下载）：`;
  if (navigator.share) { try { await navigator.share({ title: '阿纳克遗迹 · 房间 ' + code, text, url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); toast('邀请已复制，发给朋友即可'); } catch { toast('房间码 ' + code); }
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t || t.disabled) return;
  const d = t.dataset;
  switch (d.act) {
    case 'create': createRoom(); break;
    case 'join': { const c = cleanCode($('#joinCode').value); if (c) enterRoom(c); else { ui.err = '请输入 4 位房间码'; render(); } break; }
    case 'rejoin': enterRoom(d.code); break;
    case 'leave': leave(); break;
    case 'share': share(); break;
    case 'n': send({ t: 'setN', n: +d.n }); break;
    case 'mode': send({ t: 'mode', mode: d.mode }); break;
    case 'opt': send({ t: 'opt', key: d.key, on: d.on === 'true' }); break;
    case 'side': send({ t: 'side', side: d.side }); break;
    case 'track': send({ t: 'track', track: d.track }); break;
    case 'rival': send({ t: 'rival', red: +d.red }); break;
    case 'color': send({ t: 'player', i: +d.i, color: d.c }); break;
    case 'diff': send({ t: 'player', i: +d.i, diff: d.d }); break;
    case 'lead': ui.sheet = { kind: 'lead', i: +d.i }; render(); break;
    case 'pickl': send({ t: 'player', i: ui.sheet.i, leader: d.l }); ui.sheet = null; render(); break;
    case 'deal': send({ t: 'deal' }); break;
    case 'first': send({ t: 'first', id: d.id }); break;
    case 'move': flushAll(); send({ t: 'move', i: +d.i, j: +d.j }); break;
    case 'draw': flushAll(); send({ t: 'draw' }); break;
    case 'begin': flushAll(); ui.chk = {}; send({ t: 'begin' }); break;
    case 'setup': ui.sheet = { kind: 'setup' }; render(); break;
    case 'tab': ui.tab = d.tab; store.set('arnak-tab', d.tab); render(); window.scrollTo(0, 0); break;
    case 'goto': ui.tab = d.tab; render(); window.scrollTo(0, 0); break;
    case 'df': ui.df = !ui.df; render(); break;
    case 'chk': ui.chk[d.ck] = !ui.chk[d.ck]; render(); break;
    case 'rn': ui.rn = !ui.rn; render(); break;
    case 'save': if (!ui.saving) saveImage(); break;
    case 'pass': send({ t: 'pass', round: S.round, id: d.id }); break;
    case 'next': send({ t: 'next', round: S.round }); window.scrollTo({ top: 0, behavior: 'smooth' }); break;
    case 'undo': send({ t: 'undo' }); break;
    case 'reset': if (confirm(camp(S) ? '重玩本章？本章的流程和计分会清空，冒险记录保留，所有人同步。' : '重新开局？本房间的流程和计分都会清空，所有人同步。')) send({ t: 'reset' }); break;
    case 'view': ui.view = d.v; render(); break;
    case 'me': store.set(meKey(), d.id); ui.view = 'me'; render(); window.scrollTo(0, 0); break;
    case 'lt': send({ t: 'lt', id: d.id }); break;
    case 'res': ui.res = d.r; render(); break;
    case 'ach': ui.ach = +d.n; render(); break;
    case 'chapter':
      if (confirm(`记录第 ${S.camp.ch} 章：${ui.res === 'win' ? '胜利' : '接受失败'}？之后回到准备页开始下一章。`)) {
        send({ t: 'chapter', res: ui.res, ach: ui.ach, plot: ui.plot }); ui.res = 'win'; ui.ach = 0; ui.plot = ''; ui.chk = {}; ui.tab = 'flow';
      }
      break;
    case 'unchapter': if (confirm(`撤销第 ${S.camp.log.at(-1).ch} 章的记录？`)) send({ t: 'unchapter' }); break;
    case 'newcamp': if (confirm('开始新的冒险？这个房间之前的冒险记录会清空。')) send({ t: 'newcamp' }); break;
    case 'rv-who': ui.rv.who = d.id; render(); break;
    case 'rv-star': ui.rv.stars = +d.n; render(); break;
    case 'rv-send': sendReview(); break;
    case 'rv-edit': ui.rv.state = ''; render(); break;
    case 'cell': {
      const f = fieldOf(d.id, d.key), v = (S.score[d.id] || {})[d.key];
      const n0 = f.list ? null : num(v);
      ui.sheet = f.list
        ? { kind: 'key', id: d.id, key: d.key, terms: [...(v || [])], cur: '', op: '+', opShown: (v || []).length > 0 }
        : { kind: 'key', id: d.id, key: d.key, terms: [], cur: n0 ? String(n0) : '', op: '+', opShown: false };
      render(); break;
    }
    case 'q': keypad('q' + d.v); break;
    case 'k': keypad(d.k); break;
    case 'close': ui.sheet = null; render(); break;
  }
});

document.addEventListener('input', e => {
  const el = e.target, d = el.dataset;
  if (d.name !== undefined) debounced(d.pk, () => send({ t: 'player', i: +d.name, name: el.value }));
  else if (d.rv !== undefined) ui.rv.text = el.value;
  else if (d.plot !== undefined) ui.plot = el.value;
});
document.addEventListener('focusout', e => { const k = e.target.dataset?.pk; if (k) pending.get(k)?.flush(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'joinCode') document.querySelector('[data-act="join"]').click();
  if (e.key === 'Enter' && e.target.dataset?.pk) e.target.blur();
});

render();
connect();
loadRooms();
