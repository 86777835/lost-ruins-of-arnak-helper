// N-minute teach: a script the teacher reads aloud to start a first game, written from the official rulebooks
// (same wording as tools/讲解稿.md). It names every important element in a sentence and leaves the fine rulings to the
// rules assistant. Terms in {text|id} open a note with a picture cropped from the rulebook (img/teach/<icon>.webp); the
// 「问」 buttons and each note's 「问规则助手」 ask the rules assistant (chat.js) straight away.
// Two modes, chosen at the top and remembered: base game only (default) or with the expansions' expedition leaders.
// A line, question or note is for both, or {b} base only / {x} expansions only. After the script, 注意事项 (NOTES)
// lists the easy-to-get-wrong points. Pictures: CGE's Simplified Chinese rulebooks (base, 探险队长), credited in the footer.
const ICON = (id, cls = '') => id ? `<img class="ico ${cls}" src="img/teach/${id}.webp" alt="">` : '';

// id: name, where you see it on the table, what it means. icon: a picture in img/teach/.
const TERMS = {
  playerboard: { name: '玩家版图', icon: 'playerboard', where: '每人面前一块帐篷图案的版图。', what: '放你的牌库、考古学家、资源、助手；上方一排是神像槽。' },
  archaeologist: { name: '考古学家', icon: 'archaeologist', where: '你颜色的小人，开局 2 个站在玩家版图的帐篷上。', what: '你的工人：挖掘、发现遗址都要派它出去，轮末收回来。两个都派出去了，就不能再挖掘或发现。' },
  funding: { name: '资金卡', icon: 'funding', where: '起始牌库里 2 张金币图案的卡。', what: '打出效果拿 1 枚金币（快速行动）；也可以不打效果，用左上角的移动值付路费。' },
  exploration: { name: '探索卡', icon: 'exploration', where: '起始牌库里 2 张指南针图案的卡。', what: '打出效果拿 1 个指南针（快速行动）；也可以不打效果，用左上角的移动值付路费。' },
  fear: { name: '恐惧卡', icon: 'fear', where: '紫黑色、画着一双眼睛的卡；开局每人 2 张，恐惧牌堆在牌列旁。', what: '没有效果，但能当 1 个靴子付路费。终局每张扣 1 分，能移除就移除。' },
  coin: { name: '金币', icon: 'coin', where: '金色圆片，资源版图上。', what: '探险经费，主要用来买物品；2 枚金币还能随时换一架飞机。' },
  compass: { name: '指南针', icon: 'compass', where: '绿色圆片，资源版图上。', what: '探索岛屿的时间和精力：发现新遗址、买神器都用它。' },
  tablet: { name: '石板', icon: 'tablet', where: '刻着文字的石片，资源版图上。', what: '古代文字：从手牌打出神器时常要付它，研究轨上也常用。' },
  arrowhead: { name: '箭头', icon: 'arrowhead', where: '蓝色的残缺武器，资源版图上。', what: '击败守卫时常要用到，研究轨上也会用。' },
  jewel: { name: '宝石', icon: 'jewel', where: '红色宝石，资源版图上。', what: '最难拿到的资源，研究轨越往上越需要它。' },
  travelvalue: { name: '移动值', icon: 'travelvalue', where: '每张卡左上角的交通图标。', what: '不打效果时，可以用它付去遗址的路费。一张卡只能二选一：用移动值，或者用效果。' },
  free: { name: '快速行动', icon: 'free', where: '卡牌、助手、守卫奖励上的闪电图标。', what: '不算你这回合的主要行动，在主要行动之前、之后甚至中间都能做，次数不限。' },
  playarea: { name: '出牌区', icon: 'playarea', where: '玩家版图旁边，用过的卡正面朝上摆在这里。', what: '相当于一个摊开的弃牌堆。轮末把它们洗混放到牌库底部，平时不洗牌。' },
  startplayer: { name: '起始玩家标记', icon: 'startplayer', where: '闹钟图案的标记。', what: '拿着它的人每轮第一个行动；每轮结束传给左边的人。' },
  moonstaff: { name: '月之权杖', icon: 'moonstaff', where: '插在牌列里的权杖，左边是神器，右边是物品。', what: '表示现在是第几轮。每轮结束移除它两侧的牌、右移一格，所以神器越来越多、物品越来越少。' },
  site: { name: '遗址', icon: 'site', where: '岛上的地点板块，下方是放考古学家的行动格，格上印着路费。', what: '派考古学家来挖掘，拿遗址给的资源或卡。同一处遗址有空行动格就能再来人。' },
  boot: { name: '靴子', icon: 'boot', where: '最常见的交通图标。', what: '最低一级的路费：任何交通图标都能付靴子。' },
  jeep: { name: '吉普车', icon: 'jeep', where: '交通图标，橙色圆圈里的车。', what: '中间一级：能付吉普车或靴子，但不能付船。' },
  ship: { name: '船', icon: 'ship', where: '交通图标，绿色圆圈里的船。', what: '中间一级：能付船或靴子，但不能付吉普车。' },
  plane: { name: '飞机', icon: 'pilot', where: '交通图标，蓝色圆圈里的飞机；规则书写「两枚金币换一架飞机」。', what: '最高一级，能付任何交通图标。随时可以花 2 金币换一架。' },
  hierarchy: { name: '移动等级', icon: 'hierarchy', where: '规则书和快速参考上的交通图标关系图。', what: '高级图标能付低级的费用：飞机抵一切；吉普车和船都能抵靴子，互相不能抵。' },
  discover: { name: '发现费用', icon: 'discover', where: '主版图上一级、二级遗址区域旁印的指南针数量。', what: '发现新遗址时先付这些指南针，再付路费。之后再来挖掘就不用付它。' },
  blocking: { name: '封锁标记', icon: 'blocking', where: '2、3 人局盖在部分遗址第二个行动格上的圆片。', what: '被盖住的行动格整局不能用。3 人局随机封 3 个，2 人局 5 个全封，4 人局不用。' },
  idol: { name: '神像', icon: 'idol', where: '六边形的神像板块，开局放在没被发现的遗址上。', what: '发现遗址时拿到，立刻得到它正面的奖励。终局每个 3 分。' },
  idolslot: { name: '神像槽', icon: 'idolslot', where: '玩家版图顶部的一排空格，旁边列着 5 种奖励。', what: '快速行动：把神像放进最左边的空槽，选一种奖励立刻拿。放进去就拿不出来；空着的槽终局另有分。' },
  guardian: { name: '守卫', icon: 'guardian', where: '发现新遗址时翻出来放在遗址上的怪兽板块。', what: '轮末从有守卫的遗址收回考古学家，每个拿 1 张恐惧卡。付板块下方的费用能击败它，终局每个 5 分。' },
  boon: { name: '守卫的奖励', icon: 'boon', where: '守卫板块右上角的图标。', what: '击败守卫后可以用一次（快速行动或当路费），用完把守卫翻面。' },
  item: { name: '物品卡', icon: 'item', where: '牌列里月之权杖右边的卡，右上角是工具图标。', what: '付卡底的金币买，放到牌库底部，通常下一轮才抽到。右下角是终局分。' },
  artifact: { name: '神器卡', icon: 'artifact', where: '牌列里月之权杖左边的卡，右上角是蓝色神器图标。', what: '付卡底的指南针买，直接放进出牌区，可以马上免费结算一次。以后从手牌打出要付卡角的费用。' },
  exile: { name: '移除', icon: 'exile', where: '卡牌效果里的红叉图标。', what: '把手牌或出牌区的一张牌移出游戏；恐惧卡回到恐惧牌堆。常用来丢掉恐惧卡，可以不用。' },
  tokens: { name: '研究标记', icon: 'tokens', where: '你颜色的放大镜和笔记本，开局叠在研究轨底部起点。', what: '研究时把其中一个往上移一层。笔记本不能超过放大镜，两个终局都按所在层计分。' },
  track: { name: '研究轨', icon: 'track', where: '主版图上一层层往上的格子，通往最顶上的神庙。', what: '每层有自己的效果（放大镜、笔记本不同），格子之间的「桥」上印着费用。越往上终局分越高。' },
  bonus: { name: '研究奖励板块', icon: 'bonus', where: '研究轨格子上正面朝上的小板块。', what: '第一个走到那格的人拿走，立刻获得上面的奖励。' },
  assistant: { name: '助手', icon: 'assistant', where: '资源版图上三堆人物板块，银色面朝上。', what: '笔记本走到特定层时招募一个。每轮能用一次，用后横放，轮末重置。' },
  upgrade: { name: '升级助手', icon: 'upgrade', where: '研究轨某些层右边的金色助手图标。', what: '笔记本到这层时，把一个助手翻成更强的金色面，并顺便重置它。' },
  losttemple: { name: '失落的神庙', icon: 'losttemple', where: '研究轨最顶上一层，印着 23、21、20、19 这样的分数。', what: '放大镜第一个到的拿最高分，越晚越少；到达时再从奖励堆挑 1 块。笔记本进不了这一层。' },
  templetile: { name: '神庙板块', icon: 'templetile', where: '神庙下方的三层板块堆：11 分、6 分、2 分。', what: '放大镜到了失落的神庙后，再研究就是付费买它们。每堆块数等于人数，拿完就没了。' },
  // expansions (pictures from the 探险队长 rulebook)
  leaderboard: { name: '探险队长', icon: 'leaderboard', where: '扩展里的人物版图，每位队长一块，配一套专属起始卡。', what: '代替基础的玩家版图和基础卡，每位都有独特能力。本站开局页点头像能看每位的能力和常见误解。' },
  blueslot: { name: '蓝色神像槽', icon: 'blueslot', where: '队长版图上蓝色的神像槽。', what: '放神像进去，除了普通的 5 种奖励，还能选这位队长的特殊奖励。用队长时神像槽不必按顺序用。' },
  tent: { name: '帐篷标记', icon: 'tent', where: '四种颜色的帐篷板块，背面是夜晚。', what: '放在队长版图上表示你的颜色；你跳过时翻到夜晚面，一眼看出谁已经跳过。' },
  newtrack: { name: '新研究轨', icon: 'newtrack', where: '扩展里盖在原研究轨上的新版图：猴之神庙、蜥蜴神庙（探险队长）、瀑布神庙、古树神庙（失踪的探险队）。', what: '走法和原研究轨一样，有几格多了特殊规则；有的离神庙还差一两层时就能买 6 分或 2 分的神庙板块。' }
};

// The script: what to read aloud. Every important element gets one sentence; how it is ruled exactly is for the assistant.
const PARTS = [
  { title: '怎么赢', sec: 30, lines: [
    { b: '这局玩《阿纳克遗迹》。我先讲一遍主流程，讲完再一条条过注意事项。', x: '这局玩《阿纳克遗迹》，带扩展的探险队长。我先讲一遍主流程，讲完再一条条过注意事项。' },
    '我们各带一支探险队登上阿纳克岛：挖掘遗址、击败守卫、收集物品和神器，沿研究轨去找失落的神庙。',
    '全局只有 5 轮，最后分最高的人赢。',
    '分数主要来自研究轨、{神庙板块|templetile}、{神像|idol}、{守卫|guardian}和卡牌，{恐惧卡|fear}要扣分。'
  ], ask: ['终局怎么计分？', '同分怎么判胜负？'] },
  { title: '牌库和资源', sec: 45, xsec: 65, lines: [
    { b: '每人一块{玩家版图|playerboard}、2 个{考古学家|archaeologist}；牌库是 2 张{资金卡|funding}、2 张{探索卡|exploration}和 2 张{恐惧卡|fear}。', x: '每人选一位{探险队长|leaderboard}：专属版图和起始卡代替基础的玩家版图和基础卡，另加 2 张{恐惧卡|fear}，{考古学家|archaeologist}照常用。' },
    { x: '队长从易到难：海军上校、驯鹰师、男爵夫人、教授、探险家、神秘人，《失踪的探险队》还有记者和机械师。用{帐篷标记|tent}表示颜色，跳过时翻到夜晚面。' },
    '每张牌有两种用法，二选一：用左上角的{移动值|travelvalue}付路费，或者打出它的效果。',
    '用过的牌放进{出牌区|playarea}，轮末才洗回牌库底。买来的牌让牌库越来越强，这就是牌库构筑。',
    '资源五种：{金币|coin}买物品，{指南针|compass}发现遗址、买神器，{石板|tablet}打出神器和研究常用，{箭头|arrowhead}多用来打守卫，{宝石|jewel}最稀有，研究轨越往上越要它。'
  ], ask: ['一张手牌能同时用移动值和效果吗？', '手牌能超过 5 张吗？能自己洗牌库吗？'] },
  { title: '一轮怎么走', sec: 35, lines: [
    '每轮开始，大家把手牌补到 5 张。',
    '从拿{起始玩家标记|startplayer}的人开始顺时针轮流：每回合只能做 1 个主要行动，带闪电的{快速行动|free}不限次数。',
    '不想做了就跳过，这一轮你就不再行动；所有人都跳过，这一轮结束。',
    '轮末收回考古学家，出牌区洗好放到牌库底，牌列换牌，{月之权杖|moonstaff}右移一格，起始玩家传给左边。本站「流程」页会逐条提示。'
  ], ask: ['一个回合能做几件事？可以只做快速行动吗？', '跳过之后还能做事吗？'] },
  { title: '派考古学家', sec: 55, lines: [
    '最常用的主要行动是派{考古学家|archaeologist}去{遗址|site}挖掘：放到空的行动格上，付格子上的路费，拿遗址给的资源或卡。',
    '路费是交通图标：{靴子|boot}、{吉普车|jeep}、{船|ship}，高级能抵低级，看{移动等级|hierarchy}；随时可以花 2 金币换一架{飞机|plane}，飞机抵任何图标。',
    '另一个主要行动是发现新遗址：先付版图上的{指南针费用|discover}，再付路费，拿走那里的{神像|idol}，翻开遗址板块结算，最后会冒出一个{守卫|guardian}。',
    '2、3 人局有的行动格被{封锁标记|blocking}挡住，那格整局都不能用。'
  ], ask: ['飞机怎么用？', '挖掘已发现的遗址要付多少？', '二级遗址有两个神像，两个都结算吗？'] },
  { title: '守卫和神像', sec: 40, xsec: 50, lines: [
    '{守卫|guardian}不挡别人挖，但轮末从有守卫的遗址收回一个考古学家，就拿 1 张恐惧卡。',
    '击败守卫是主要行动：你的考古学家要在那里，付守卫下方的费用；之后它的{奖励|boon}能用一次，终局每个守卫 5 分。',
    '{神像|idol}每个 3 分。快速行动把它放进{神像槽|idolslot}，能立刻拿一种奖励；但空着的神像槽终局也有分。',
    { x: '队长版图还有{蓝色神像槽|blueslot}，放进去能用队长的特殊奖励，神像槽也不必按顺序用。' }
  ], ask: ['守卫什么时候让我拿恐惧卡？', '守卫的奖励能用几次？', '神像放进神像槽后还算分吗？'] },
  { title: '买卡', sec: 35, lines: [
    '牌列被{月之权杖|moonstaff}分成两半：左边神器，右边物品。',
    '{物品卡|item}用金币买，放到牌库底部，一般下一轮才抽到。',
    '{神器卡|artifact}用指南针买，直接放进出牌区，马上能免费用一次；以后从手牌打出，要付卡角的费用。',
    '卡上带红叉的效果是{移除|exile}：把一张牌移出游戏，常用来丢掉恐惧卡。'
  ], ask: ['买的物品什么时候能用？', '神器买来要付石板吗？', '牌列什么时候补？'] },
  { title: '研究', sec: 50, xsec: 60, lines: [
    '研究也是主要行动：把{研究标记|tokens}里的放大镜或笔记本沿{研究轨|track}往上走一层，付两格之间的费用。',
    '第一个到的人拿走那格的{研究奖励板块|bonus}；每层还有自己的效果，放大镜和笔记本各不同。笔记本不能超过放大镜。',
    '笔记本走到特定的层能招募{助手|assistant}，再往上能{升级|upgrade}助手；助手每轮能用一次。',
    '放大镜到顶层就是发现{失落的神庙|losttemple}，越早到分越高；之后再研究，就是买{神庙板块|templetile}，分 11、6、2 三种。',
    { x: '扩展另有几条{新研究轨|newtrack}，盖在原来的研究轨上，走法一样，有几格多了特殊规则。' }
  ], ask: ['笔记本能超过放大镜吗？', '研究时拿到奖励板块，那一层的效果还结算吗？', '到了失落的神庙之后研究还能做什么？'] },
  { title: '结束和计分', sec: 30, lines: [
    '第 V 轮结束时只收回考古学家、拿恐惧卡，然后计分。',
    '加分：两个研究标记所在层的分、神庙板块、每个神像 3 分加空神像槽的分、每个守卫 5 分、所有物品和神器卡（牌库里的也算）。',
    '扣分：每张恐惧卡 −1。同分时，先到失落的神庙的人赢。',
    '本站「计分」页每人用自己的手机填，自动加总。流程就这些，接下来过一遍注意事项。'
  ], ask: ['牌库里没抽到的卡也计分吗？', '同分怎么判胜负？', '恐惧卡拿完了怎么办？'] }
];

// 注意事项: the easy-to-get-wrong points outside the main flow, gone through one by one after the script. Each is a
// title and a written answer (own words, from tools/faq.json and the rulebooks; pages in docs/规则来源.md);
// what isn't here goes to the rules assistant. A third item 'x' keeps a note to the expansions mode.
const NOTES = [
  ['飞机和移动等级', '随时可以花 2 金币换一架飞机，抵任意一个交通图标，守卫费用里的交通图标也能这样付。飞机抵一切；吉普车和船都能抵靴子，但吉普车和船不能互抵。一张卡多出来的移动值，本回合用不掉就浪费了。'],
  ['挖掘已发现的遗址', '付遗址板块上那个行动格印的路费；版图上的指南针费用只在发现时付一次。行动格必须空着，被封锁的格子不能用。两个考古学家都派出去了，就不能再挖掘或发现。'],
  ['二级遗址的两个神像', '发现二级遗址时两个神像都拿走，但只结算正面朝上那个的奖励，另一个背面朝上放进资源箱。两个神像终局都各算 3 分。'],
  ['什么时候拿恐惧卡', '守卫只在轮末收回考古学家时起作用：每从一处还有守卫的遗址收回一个考古学家，拿 1 张恐惧卡放进出牌区，不管守卫是谁唤醒的。先拿恐惧卡，再把出牌区洗回牌库底。'],
  ['守卫的奖励只能用一次', '击败守卫后，它的奖励整局只能用一次，用完把守卫翻面。有的奖励是路费，有的是快速行动。不管用没用，终局每个守卫都是 5 分。'],
  ['奖励要立刻用', '把神像放进神像槽时，要马上从 5 种奖励里选一种拿走；研究奖励板块也是到达时立刻获得，不能存着以后用。放进槽的神像拿不出来，每个槽一局只能用一次。'],
  ['物品和神器怎么买', '物品付金币买，放到牌库底部，一般下一轮才抽到。神器付指南针买，放进出牌区，可以马上免费结算效果；以后从手牌打出神器，要付卡角的费用。'],
  ['牌列什么时候补', '在你的回合结束时补：同类卡朝月之权杖滑动，再从外侧补一张；某类牌堆用完就不再补。轮末再移除月之权杖两侧各一张牌，权杖右移一格，补满。'],
  ['移除', '红叉效果能把手牌或出牌区的一张牌移出游戏，恐惧卡回到恐惧牌堆，也可以选择不用。先打出这张牌、再从出牌区移除，比直接移除手牌更划算。'],
  ['手牌和洗牌', '手牌可以超过 5 张，5 张只限制每轮开始的补牌。牌库只在开局洗一次，之后只在轮末把出牌区洗混放到牌库底。牌库抽空就不能再抽。'],
  ['研究怎么走', '每次研究把放大镜或笔记本往上移一层，只能走到相连的格子，先付桥上的费用再拿奖励。笔记本最多和放大镜同一层，也进不了失落的神庙。每层效果每次都要结算，奖励板块只给第一个到的人。'],
  ['到了失落的神庙之后', '放大镜到顶层时，放在空着的分最高那格，再从奖励堆里挑一块。之后用放大镜研究，就改成付费买神庙板块：11 分、6 分、2 分三种，每堆拿完就没了。'],
  ['助手', '笔记本到有助手图标的层，从资源版图挑一个银色助手；到有升级图标的层，把一个助手翻成金色面并重置它。每个助手每轮用一次，用后横放，轮末重置。用助手大多是快速行动，只有打折买卡那位算主要行动。'],
  ['跳过', '跳过本身算主要行动，跳过前可以先用掉快速行动。跳过后本轮你不再有回合；只剩一个人没跳过时，他可以连续行动。没有别的主要行动可做时，必须跳过。'],
  ['2、3 人局的封锁', '3 人局随机封 3 个遗址的第二个行动格，2 人局 5 个全封，每处遗址只能放 1 个考古学家。被封锁的格子整局都不能用；4 人局不用封锁标记。'],
  ['终局计分容易漏的', '牌库、手牌、出牌区里的物品和神器都算分，恐惧卡在哪里都扣分。放进神像槽的神像照样 3 分，空神像槽另外加分。剩下的资源不算分。'],
  ['同分', '先到达失落的神庙的人赢；同分的人都没到，就比研究轨分数；还一样就共享胜利。本站「结算」页点一下谁先到神庙，会自动判。'],
  ['怎么选探险队长', '可以自己挑，也可以随机抽角色标记。规则书从易到难排：海军上校、驯鹰师、男爵夫人、教授、探险家、神秘人，新手选前几位。用队长时换上新版的石钥匙神器和矿工助手。', 'x'],
  ['蓝色神像槽', '用队长时神像槽不必按顺序用。普通的 5 种奖励在任何槽都能选，蓝色槽的特殊奖励只有放进蓝色槽才能用。', 'x'],
  ['神秘人的恐惧卡', '神秘人移除的恐惧卡进祭典牌堆，终局不扣分，还能花 2、3、4 张举行祭典，举行祭典算主要行动。他每轮补满手牌后再多拿 1 张恐惧卡。', 'x'],
  ['探险家的零食标记', '探险家只有 1 个考古学家，花零食标记就能把它再派出去；零食标记留在离开的遗址上，之后不能回到那里。用零食离开有守卫的遗址不拿恐惧卡。第 3 个零食第 III 轮才有，零食轮末回到版图。', 'x'],
  ['新研究轨', '猴之神庙、蜥蜴神庙离神庙还差一两层时，就能用研究买 6 分或 2 分的神庙板块，11 分的只能在神庙那层买。蜥蜴神庙的守卫挡在研究轨上，轮末研究标记停在守卫那层也要拿恐惧卡。', 'x'],
  ['记者和机械师', '记者的笔记本可以比放大镜高一层；在有考古学家的遗址上写文章是快速行动，要付该遗址的一个路费，之后发表文章执行报纸上的行动。机械师第 I、III、V 轮装黄金部件，第 III 轮得到猴子助手鲁斯蒂。', 'x'],
  ['红色月之权杖', '可选变体：每轮结束，移除离权杖最近的 2 张物品和 2 张神器，再右移权杖、补满牌列，能看到更多卡。', 'x']
];

// Icon guide, grouped the way things sit on the table.
const GROUPS = [
  ['你的东西', ['playerboard', 'archaeologist', 'tokens', 'startplayer']],
  ['卡牌', ['funding', 'exploration', 'fear', 'item', 'artifact', 'travelvalue', 'free', 'exile', 'playarea', 'moonstaff']],
  ['资源', ['coin', 'compass', 'tablet', 'arrowhead', 'jewel']],
  ['交通', ['boot', 'jeep', 'ship', 'plane', 'hierarchy']],
  ['岛屿', ['site', 'discover', 'blocking', 'idol', 'idolslot', 'guardian', 'boon']],
  ['研究轨', ['track', 'bonus', 'assistant', 'upgrade', 'losttemple', 'templetile']],
  ['扩展', ['leaderboard', 'blueslot', 'tent', 'newtrack'], 'x']
];

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const term = (text, id) => `<button type="button" class="term" data-t="${id}">${ICON(TERMS[id].icon)}${esc(text)}</button>`;
const line = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\{([^|}]+)\|(\w+)\}/g, (_, t, id) => term(t, id));
// inside a button the terms show their icon but are not buttons themselves
const label = s => esc(s).replace(/\{([^|}]+)\|(\w+)\}/g, (_, t, id) => `<span class="tlab">${ICON(TERMS[id].icon)}${esc(t)}</span>`);
const askBtn = (text, q) => `<button type="button" class="tq" data-q="${esc(q)}">问 <span>${label(text)}</span></button>`;

// mode: 'b' base game only (default), 'x' with the expansions' expedition leaders; remembered in this browser
let mode = 'b';
try { if (localStorage.getItem('arnak-teach-mode') === 'x') mode = 'x'; } catch {}
const pick = x => typeof x === 'string' ? x : x[mode];          // a line or question for both modes, or {b, x}
const only = list => list.map(pick).filter(Boolean);
const notes = () => NOTES.filter(n => !n[2] || n[2] === mode);
const secs = p => mode === 'x' && p.xsec ? p.xsec : p.sec;

function render() {
  const total = PARTS.reduce((t, p) => t + secs(p), 0) / 60;
  document.getElementById('teach').innerHTML = `
  <div class="tmode" role="group" aria-label="这局怎么玩"><span>这局</span>
    <button type="button" data-mode="b" aria-pressed="${mode === 'b'}">只玩基础</button><button type="button" data-mode="x" aria-pressed="${mode === 'x'}">带扩展队长</button></div>
  <p class="tlead">讲的人照着念，约 ${Math.round(total)} 分钟就能开局。<b>带下划线的词</b>点一下看图和解释；有疑问点「问」，规则助手马上回答。</p>
  <nav class="tnav">${PARTS.map((p, i) => `<a href="#p${i + 1}"><i>${i + 1}</i>${p.title}</a>`).join('')}<a href="#later">注意事项</a><a href="#icons">图标速查</a></nav>
  ${PARTS.map((p, i) => `<section class="card tpart" id="p${i + 1}">
    <h2 class="h"><span><i>${i + 1}</i>${p.title}</span><small>约 ${secs(p)} 秒</small></h2>
    ${only(p.lines).map(s => `<p class="tline">${line(s)}</p>`).join('')}
    <div class="tasks"><em>桌上常见疑问</em>${only(p.ask).map(q => askBtn(q, q)).join('')}</div>
  </section>`).join('')}
  <section class="card tpart" id="later">
    <h2 class="h"><span><i>!</i>注意事项</span><small>${notes().length} 条</small></h2>
    <p class="tnote">流程讲完后，一条一条过一遍。这些是主流程之外容易出错、容易争的地方，点开念答案。</p>
    ${notes().map(([t, a, m], i) => `<details class="fq tnotei"><summary><i>${i + 1}</i>${esc(t)}${m === 'x' ? '<em class="tnw">扩展</em>' : ''}</summary><p>${esc(a)}</p>
      <button type="button" class="tq tmore" data-q="${esc(`「${t}」这一条我还有疑问，请再讲讲。`)}">还有疑问？问规则助手</button></details>`).join('')}
    <p class="tnote">注意事项里没有的，点右下角「规则」问 AI，本站资料查不到会联网找。</p>
  </section>
  <a class="btn tgo" href="/">讲完了，去建房间</a>
  <h2 class="h" id="icons">图标速查<small>点图标看解释</small></h2>
  ${GROUPS.filter(g => !g[2] || g[2] === mode).map(([g, ids]) => `<div class="card tgrid"><h3>${g}</h3><div>${ids.map(id => `<button type="button" class="tic" data-t="${id}">${ICON(TERMS[id].icon)}<span>${TERMS[id].name}</span></button>`).join('')}</div></div>`).join('')}
  <footer>依据 CGE 官方规则书 · 图片截自 CGE 官方规则书简体中文版（<a href="https://filemanager.czechgames.com/storage/files/lost-ruins-of-arnak/rules/lost-ruins-of-arnak-rules-zh-s.pdf" target="_blank" rel="noopener">基础版</a>、<a href="https://filemanager.czechgames.com/storage/files/lost-ruins-of-arnak-expedition-leaders/rules/lost-ruins-of-arnak-expedition-leaders-rules-zh-s.pdf" target="_blank" rel="noopener">探险队长</a>），版权归 Czech Games Edition 所有 · 非官方玩家工具</footer>`;
}
render();

// The note for a term: a sheet from the bottom with the icon, where it is and what it means.
const sheet = document.createElement('div');
sheet.className = 'tsheet hidden';
document.body.appendChild(sheet);
const close = () => sheet.classList.add('hidden');
function show(id) {
  const t = TERMS[id];
  sheet.innerHTML = `<div class="tsbg"></div><div class="tsbox" role="dialog" aria-label="${esc(t.name)}">
    <div class="tshd">${ICON(t.icon, 'big')}<b>${esc(t.name)}</b><button type="button" class="tsx" aria-label="关闭">×</button></div>
    <p><em>在哪儿看到</em>${esc(t.where)}</p><p><em>什么意思</em>${esc(t.what)}</p>
    <button type="button" class="btn navy tsask" data-q="${esc(`「${t.name}」是什么，怎么用？`)}">还不懂？问规则助手</button></div>`;
  sheet.classList.remove('hidden');
}
const ask = q => { close(); window.askRules?.(q); };
document.addEventListener('click', e => {
  const m = e.target.closest('[data-mode]');
  if (m) {
    if (m.dataset.mode === mode) return;
    mode = m.dataset.mode;
    try { localStorage.setItem('arnak-teach-mode', mode); } catch {}
    return render();
  }
  const t = e.target.closest('[data-t]');
  if (t) return show(t.dataset.t);
  const q = e.target.closest('[data-q]');
  if (q) return ask(q.dataset.q);
  if (e.target.closest('.tsx,.tsbg')) close();
});
addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
