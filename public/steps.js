// What to do at setup, at the start of each round, during play and at the end of each round.
// Every line cites its source: 基 = base rulebook (Chinese edition page numbers), 队 = 《探险队长》 rulebook,
// 失 = 《失踪的探险队》 rulebook, 冒 = 冒险模式 campaign book v1.02.
import { LEADERS, SIDES, TRACKS, ROUNDS, RIVAL, camp, usesLeaders, humans, turnOrder, seated } from './logic.js';

// Expedition leaders: one-line ability and the misunderstanding players ask about most (BGG rules forums, see docs/调研).
export const LEADER_INFO = {
  captain: { one: '有 3 个考古学家；主要行动可以派人到「召唤专家」格，使用资源版图上一个助手的银色效果，每轮一次。',
    tip: '「召唤专家」格上的考古学家不算已派出的考古学家，也不能被移动，轮末和其他人一起收回。', src: '队 6' },
  falconer: { one: '猎鹰每轮开始自动沿鹰轨前进 1 格；召回时选当前格或之前任一格的效果。守卫的奖励也可以改成让猎鹰前进。',
    tip: '猎鹰不会每轮自动飞回，只有用了它的效果才回到起点。', src: '队 8' },
  baroness: { one: '第 II–V 轮开始各拿 1 枚金币收入；特别投递卡永远回到手里，买物品时能让物品直接进手牌。',
    tip: '特别投递卡每轮都算在 5 张手牌里，就算被移除也会回来。', src: '队 10' },
  professor: { one: '开局有 3 张神器的档案，可以从档案买神器；第 II–V 轮开始把本轮的标记放进手提箱。',
    tip: '手提箱里的指南针只能用来买神器，石板只能用来支付神器从手牌打出的费用。档案只会补充一次。', src: '队 12' },
  explorer: { one: '只有 1 个考古学家，但可以花零食标记把它再派出去；第 3 个零食标记从第 III 轮开始可用。',
    tip: '不能回到放着自己零食标记的遗址；用零食标记离开有守卫的遗址，不拿恐惧卡。', src: '队 14' },
  mystic: { one: '移除的恐惧卡进祭典牌堆，终局不扣分，还能花 2、3、4 张举行祭典；每轮补满手牌后再多拿 1 张恐惧卡。',
    tip: '举行祭典算主要行动。有 5 个神像槽，往带恐惧标志的槽里放神像要拿 1 张恐惧卡。', src: '队 16' },
  journalist: { one: '笔记本可以比放大镜高一层；在遗址上写文章（快速行动），之后发表文章，执行报纸上的行动。',
    tip: '每个一级和二级遗址下面都放 1 篇文章，不是二选一。写遗址的文章要有考古学家在那里，并支付该遗址的一个移动费用。', src: '失 5–6' },
  mechanic: { one: '打出齿轮效果就转动机械，选右侧部件的效果；第 I、III、V 轮装黄金部件，第 III 轮得到猴子助手鲁斯蒂。',
    tip: '鲁斯蒂是第 3 个助手，不能被替换、交换或丢弃。齿轮给的移动值当回合用不完就作废。', src: '失 7–8' },
  prospector: { one: '简易队长：用基础玩家版图和考古学家，只换一套专属起始卡组。没有蓝色神像槽和特殊能力。', tip: '', src: '失 10' },
  traveler: { one: '简易队长：用基础玩家版图和考古学家，只换一套专属起始卡组。没有蓝色神像槽和特殊能力。', tip: '', src: '失 10' }
};

const START_RES = ['2 金币', '1 金币 + 1 指南针', '2 金币 + 1 指南针', '1 金币 + 2 指南针'];   // 基 6, by play order
// How many players the board is set up for: the solo game uses the 2-player setup (基 20), the campaign players + 1 (冒 2).
export const setupN = S => camp(S) ? S.n + 1 : Math.max(2, S.n);

const leadersIn = S => usesLeaders(S) ? seated(S).map(p => p.leader).filter(Boolean) : [];
const has = (S, k) => leadersIn(S).includes(k);

// Setup checklist, in sections: [{ h: heading, items: [{ t: text, src }] }]
export function setupList(S, name = id => id) {
  const N = setupN(S), out = [];
  const board = [
    { t: `主版图用<b>${SIDES[S.side]}</b>那一面。${S.side === 'bird' ? '首局推荐这一面。' : ''}`, src: '基 4' },
    ...(S.side === 'snake' ? [{ t: `蛇之神庙：研究轨中间的救援格放 ${N} 个随机助手（只公开最上面一个）；资源版图上的助手分 3 堆，${S.el ? '两堆各 4 个' : '两堆各 3 个'}，第三堆放剩下的。`, src: S.el ? '基 19 · 队 2' : '基 19' }] : []),
    { t: '牌列：神器、恐惧、物品各放一堆；月之权杖放在第 I 轮的位置，左边翻 1 张神器，右边翻 5 张物品。', src: '基 4' },
    { t: '神像洗混随机放到遗址：一级遗址每处 1 个正面朝上；二级遗址每处 1 个正面朝上、1 个背面朝上。', src: '基 4' },
    camp(S) ? { t: '不使用封锁标记封锁行动格（有的章节会另作他用，看本章说明）。', src: '冒 2' }
      : N === 4 ? { t: '4 人局不用封锁标记。', src: '基 4' }
      : N === 3 ? { t: '封锁标记背面朝上洗混，随机翻开 3 个，封住对应遗址的第二个行动格。', src: '基 4' }
      : { t: `${S.n === 1 ? '单人按 2 人局布置：' : ''}5 个封锁标记全部用上，每个遗址只能容纳 1 个考古学家。`, src: S.n === 1 ? '基 4 · 20' : '基 4' }
  ];
  out.push({ h: '主版图与牌列', items: board });

  const track = [
    { t: `神庙板块：11 分 1 堆、6 分 2 堆、2 分 3 堆，每堆 <b>${N}</b> 块，其余放回盒子。`, src: camp(S) ? '基 5 · 冒 2' : '基 5' },
    { t: `研究奖励板块洗混：失落神庙奖励堆放 <b>${N}</b> 块背面朝上；其余格子各放 1 块并翻开${N < 4 ? `（按 ${N} 人局：${N === 3 ? '只标「4」的格子不放' : '标「4」和「3+」的格子都不放'}）` : '（4 人局所有格子都放）'}。`, src: '基 5' }
  ];
  if (S.track !== 'board') track.unshift({ t: `把<b>${TRACKS[S.track].zh}</b>研究轨版图盖在主版图的研究轨上。`, src: TRACKS[S.track].x === 'el' ? '队 18' : '失 11–12' });
  if (S.track === 'monkey') track.push({ t: '猴之神庙：研究奖励全部背面朝上成堆，每堆张数与人数相同；神器格从神器牌堆找一张规则书指定费用的神器正面朝上放好。', src: '队 19' });
  if (S.track === 'lizard') track.push({ t: '蜥蜴神庙：摆完神像后，剩下的 4 个神像背面朝上成一堆放在对应一行旁；守卫洗混后背面朝上放 1 个到研究轨的守卫格。', src: '队 20' });
  if (S.track === 'waterfall') track.push({ t: `瀑布神庙：随机抽 ${N} 块遗址板块背面朝上放在瀑布后的隐藏遗址处；用 2 块瀑布板块盖住图示的两处研究花费。`, src: '失 11' });
  if (S.track === 'tree') track.push({ t: `古树神庙：往遗址放神像之前，先做两堆各 ${N} 个神像，背面朝上放到两个神像树屋。`, src: '失 12' });
  out.push({ h: '研究轨', items: track });

  const supply = [
    { t: `资源标记放上资源版图；一级、二级遗址板块各自洗混，背面朝上放好；守卫洗混背面朝上。`, src: '基 5' },
    { t: `助手银色面朝上洗混，${S.side === 'snake' ? '按上面蛇之神庙的分法' : `分成 3 堆，每堆 ${S.el ? 5 : 4} 个`}。`, src: S.el ? '基 5 · 队 2' : '基 5' }
  ];
  if (S.el) supply.push({ t: '《探险队长》的物品、神器、助手、守卫、神像和遗址板块已混入基础游戏。多出的 4 个神像只在用蜥蜴神庙时用，否则放回盒子。', src: '队 2' });
  if (S.me && !camp(S)) supply.push({ t: '《失踪的探险队》的物品、神器、助手、守卫和神像混入基础游戏；5 个新遗址板块也可以混入（会用到遭遇卡）。', src: '失 2 · 9' });
  out.push({ h: '资源版图', items: supply });

  const me = [];
  if (usesLeaders(S)) {
    me.push({ t: '每人拿自己队长的版图和初始卡牌，代替基础的玩家版图和基础卡，另加 2 张恐惧卡洗成牌库；考古学家和研究标记用基础游戏的，帐篷标记表示颜色（跳过时翻到夜晚面）。', src: '队 5 · 失 4' });
    if (S.el) me.push({ t: '用探险队长时，换上新版的石钥匙神器和矿工助手。', src: '队 2' });
    for (const p of seated(S)) if (p.leader) for (const t of LEADER_SETUP[p.leader](S)) me.push({ t: `${name(p.id)}（${LEADERS[p.leader].zh}）：${t}`, src: LEADER_INFO[p.leader].src });
  } else {
    me.push({ t: '每人拿一种颜色的玩家版图、2 个考古学家、放大镜和笔记本，以及 4 张基础卡（2 张资金、2 张探索）加 2 张恐惧卡，洗混作牌库。', src: '基 6' });
  }
  me.push({ t: '研究标记放在研究轨底部的起始格，放大镜叠在笔记本上面。', src: '基 6' });
  const order = turnOrder(S, 1).filter(id => id !== RIVAL);
  const pos = id => S.n === 1 && !camp(S) ? 1 : order.indexOf(id);
  me.push({ t: `初始资源（按行动顺序）：${humans(S).map(id => `${name(id)} ${START_RES[pos(id)]}`).join('；')}。`, src: S.n === 1 && !camp(S) ? '基 6 · 20' : '基 6' });
  me.push({ t: '每人抽 5 张手牌。', src: '基 7' });
  out.push({ h: '玩家', items: me });

  if (S.n === 1 && !camp(S)) out.push({ h: '单人对手', items: [
    { t: '另拿一块玩家版图，用灰色帐篷那一面代表对手；把不是你颜色的 6 个考古学家都给对手，对手的放大镜放在你旁边的起始格。', src: '基 20' },
    { t: `对手行动牌堆：5 块考古学家板块，加 5 块红绿板块（每对选一块）。红色 <b>${S.rival}</b> 块，就是难度 ${S.rival}。洗混背面朝上。`, src: '基 20' },
    { t: '对手每轮都先行动，你后手。', src: '基 20' }
  ] });
  if (camp(S)) out.push({ h: `冒险模式 · 第 ${Math.min(S.camp.ch, 6)} 章`, items: campSetup(S) });
  return out;
}

const LEADER_SETUP = {
  captain: () => ['多拿 1 个灰色考古学家，共 3 个。'],
  falconer: () => ['猎鹰放在鹰轨起点（第 I 轮开始时会前进 1 格）。'],
  baroness: () => ['在牌列第 II、III、IV、V 格各放 1 枚金币；先把特别投递卡拿进手牌，再洗牌库抽 4 张。'],
  professor: () => ['手提箱放在版图旁；从神器牌堆顶抽 3 张正面朝上放好，作为档案；按规则书图示在牌列第 II–V 格放指南针和石板。'],
  explorer: () => ['只用 1 个考古学家；2 个零食标记放在版图上，带指南针的那个放在牌列第 III 格。'],
  mystic: () => ['每次补满手牌后，从恐惧牌堆再拿 1 张恐惧卡到手里，开局也一样（开局 6 张手牌）。'],
  journalist: S => [`笔记本叠在放大镜上面；每个一级、二级遗址下面各放 1 个文章标记，版图上方凹槽放 ${S.n === 2 && !camp(S) ? 3 : 2} 个；4 块报纸随机选 2 块放进版图。`],
  mechanic: () => ['8 个黄金部件背面朝上洗混分成 4 组：1 组放版图旁，另 3 组放在牌列第 I、III、V 格；猴子助手放在牌列第 III 格作提醒。'],
  prospector: () => ['用基础的玩家版图，用勘探家的初始卡组代替 4 张基础卡。'],
  traveler: () => ['用基础的玩家版图，用旅行家的初始卡组代替 4 张基础卡。']
};

// Campaign: general chapter setup (冒 2–6) and reminders carried over from the last chapter. No chapter text is reproduced.
const PENALTY_PAGE = { 1: 12, 2: 16, 3: 20, 4: 26, 5: 30 };
function campSetup(S) {
  const items = [
    { t: '对手用红色：红色玩家版图、6 个红色考古学家，红色放大镜放在你旁边的起始格；用 5 块红色行动板块，按单人规则组成行动牌堆。', src: '冒 2' },
    { t: '对手在第 I 轮最后行动；之后起始玩家标记照常传递，对手也当作一位玩家。', src: '冒 2–3' },
    { t: `本章按冒险手册第 ${Math.min(S.camp.ch, 6)} 章的章节设置和概述卡布置，并选好每人的难度。`, src: '冒 3' }
  ];
  if (S.n === 2) items.push({ t: '每人拿 1 只鸽子：快速行动，给队友送 1 个资源，用过翻面，轮末翻回。', src: '冒 3' });
  if (S.camp.ch === 1) items.push({ t: '开始战役前，先把带扩展符号的物品、神器、助手挑出来单独存放，它们只能在战役中赢得。', src: '冒 6' });
  const last = S.camp.log.at(-1);
  if (last) {
    items.push({ t: '之前各章赢得的成就卡和助手，加入本章的常规牌堆；没赢得的留在单独存放的袋子里。', src: '冒 6' });
    if (last.plot) items.push({ t: `上一章到达的剧情点（${last.plot}）给的卡牌，放在牌库底部。`, src: '冒 5' });
    if (last.res === 'lose') items.push({ t: `上一章接受了失败：按冒险手册第 ${PENALTY_PAGE[last.ch]} 页的惩罚布置本章。`, src: `冒 ${PENALTY_PAGE[last.ch]}` });
  }
  return items;
}

// Start of round r: draw up, plus what each leader gains (队 6–17, 失 7–8).
export function roundStart(S, r) {
  const items = [{ t: r === 1 ? '开局已抽好 5 张手牌，直接从起始玩家开始。' : '所有人从牌库抽牌，补满 5 张手牌（牌库不够就全抽）。', src: '基 7 · 17' }];
  if (has(S, 'mystic')) items.push({ t: '神秘人：补满手牌后，从恐惧牌堆再拿 1 张恐惧卡到手里。', src: '队 17' });
  if (has(S, 'falconer')) items.push({ t: '驯鹰师：猎鹰沿鹰轨前进 1 格。', src: '队 8' });
  if (r > 1 && has(S, 'baroness')) items.push({ t: `男爵夫人：拿牌列第 ${ROMAN[r]} 格上方的金币。`, src: '队 10' });
  if (r > 1 && has(S, 'professor')) items.push({ t: `教授：把牌列第 ${ROMAN[r]} 格上方的标记放进手提箱。`, src: '队 12' });
  if (r === 3 && has(S, 'explorer')) items.push({ t: '探险家：拿牌列第 III 格的第 3 个零食标记，从本轮起可用。', src: '队 14' });
  if ([1, 3, 5].includes(r) && has(S, 'mechanic')) items.push({ t: `机械师：抽牌后翻开牌列第 ${ROMAN[r]} 格的黄金部件，选 1 个装进机械的空位，另一个放回盒子。`, src: '失 8' });
  if (r === 3 && has(S, 'mechanic')) items.push({ t: '机械师：得到猴子助手鲁斯蒂。', src: '失 8' });
  if (S.n === 1 && !camp(S)) items.push({ t: '对手先行动，和你轮流执行；对手翻完全部 10 块行动板块才跳过。', src: '基 20' });
  return items;
}
export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

// Rules players most often forget or get wrong at the table (BGG "Most overlooked rule(s)?" and rules threads, see docs/调研).
export function dontForget(S) {
  const items = [
    { t: '每回合 <b>1 个主要行动</b> + 任意个快速行动。没有主要行动可做时必须跳过，跳过本身就是主要行动。', src: '基 8 · 17' },
    { t: '随时可以花 <b>2 金币</b>换一架飞机，抵任意一个移动图标。', src: '基 9' },
    { t: '挖掘遗址要支付行动格上的移动费用；发现新遗址先付区域费用，再付移动费用。', src: '基 9–10' },
    { t: '研究奖励板块和神像槽的效果要<b>立刻</b>用，不能留到以后。', src: '基 11 · 14' },
    { t: '守卫的奖励<b>整局只能用一次</b>，用完把守卫翻面。', src: '基 11' },
    { t: '发现二级遗址时两个神像都拿，但只结算正面朝上那个的效果。', src: '基 10' },
    { t: '研究轨每层的效果一定要结算，有没有拿到奖励板块都一样；笔记本不能走到放大镜上面一层。', src: '基 14 · 23' },
    { t: '买的物品放到牌库<b>底部</b>；买神器时可以立刻免费结算它的效果。', src: '基 12' }
  ];
  if (has(S, 'journalist')) items[6] = { t: '研究轨每层的效果一定要结算；笔记本不能高过放大镜，只有记者可以高一层。', src: '基 14 · 失 5' };
  return items;
}

// End of round r (基 17). Round V: only take archaeologists back and gain Fear, then final scoring.
export function cleanup(S, r) {
  const back = { t: `收回考古学家：每从一处<b>有守卫</b>的遗址收回一个，拿 1 张恐惧卡放进出牌区。${has(S, 'captain') ? '海军上校「召唤专家」格上的也一起收回。' : ''}`, src: '基 17' };
  const items = [back];
  if (S.track === 'lizard') items.push({ t: '蜥蜴神庙：守卫还在研究轨上时，你停在守卫那一行的每个研究标记拿 1 张恐惧卡。', src: '队 20' });
  if (r === ROUNDS) {
    items.push({ t: '其他步骤全部跳过，直接进入终局计分。', src: '基 17' });
    return items;
  }
  if (has(S, 'explorer')) items.push({ t: '探险家：用过的零食标记回到版图。', src: '队 14' });
  items.push(
    { t: '剩下的手牌，每张可以弃到出牌区，也可以留到下一轮。', src: '基 17' },
    { t: `出牌区的牌全部洗混，放到<b>牌库底部</b>（先拿恐惧卡再洗）。${has(S, 'baroness') ? '男爵夫人的特别投递卡回到手里。' : ''}`, src: '基 17' },
    { t: '重置助手（转回竖放）。', src: '基 17' },
    S.redMoon ? { t: '红色月之权杖：移除离它最近的 2 张物品和 2 张神器，权杖右移一格，补满牌列。', src: '队 22' }
      : { t: '移除月之权杖两侧的 2 张牌（1 张神器、1 张物品），权杖右移一格，补满牌列。', src: '基 17' }
  );
  if (S.n === 1 && !camp(S)) items.push({ t: '对手：收回考古学家（对手不拿恐惧卡），行动板块洗混背面朝上。下一轮对手仍然先手。', src: '基 21' });
  else items.push({ t: `起始玩家标记传给左边的${camp(S) ? '一方（对手也算）' : '玩家'}。`, src: camp(S) ? '基 17 · 冒 3' : '基 17' });
  if (camp(S)) {
    items.push({ t: '对手：收回考古学家（对手不拿恐惧卡），行动板块洗混背面朝上。', src: '基 21' });
    if (S.n === 2) items.push({ t: '用过的鸽子翻回正面。', src: '冒 3' });
  }
  return items;
}
