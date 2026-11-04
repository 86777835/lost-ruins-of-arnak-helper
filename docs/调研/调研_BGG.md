# 阿纳克遗迹 · 线下辅助工具 · BGG 论坛与 Files 区调研

> 采集日期：2026-11-04。数据源：api.geekdo.com 公开 JSON 接口。
> 写法约定：「帖」= 主题帖数（含首帖），「赞」= 主题或文件的点赞（thumbs）数，「人」= 在该主题里表达同一问题的不同用户 ID 数（按 userid 去重）。
> 引用的英文原话都不超过 15 个词。没把握的地方标了【待核实】。

---

## 0. 调研范围

| 对象 | BGG id | 抓到主题列表 | 抓到正文的主题 | 正文帖数 |
|---|---|---|---|---|
| 基础版 Lost Ruins of Arnak | 312484 | 1,359（General 580 / Rules 472 / Strategy 117 / Variants 83 / Reviews 79 / News 24 / 其他 4） | 1,331 | 12,389 |
| 探险领袖 Expedition Leaders | 341254 | 275（General 111 / Rules 124 / Reviews 21 / Strategy 10 / Variants 5 / News 4） | 271 | 1,845 |
| 失踪的探险队 The Missing Expedition | 382350 | 398（Rules 217 / General 144 / Reviews 12 / Variants 11 / Strategy 8 / 其他 6） | 392 | 2,051 |
| **合计** | | **2,032** | **1,994** | **16,285** |

- **Files 区**：基础版 66 个、探险领袖 11 个、失踪的探险队 6 个，共 83 个文件页。只拿了标题、简介、点赞数和评论数，**没有下载 PDF，也没读文件评论**。
- **没抓或缺失的部分**
  - News、Sessions、Find Players 三个版块（三个对象合计 38 个主题）只有列表，没抓正文。
  - 基础版 Rules 论坛页面显示 473 个主题，接口只返回 472 个（差的 1 个可能已隐藏或删除）。
  - 后续扩展 **Twisted Paths（439816，2025）** 和 **Surprise Shipment（475207，2026）** 不在本次范围。但 Twisted Paths 的论坛已有 General 180 / Rules 51 个主题，内容量不小，建议后续补抓。
  - 主题分类靠关键词规则，只匹配标题；标题匹配不到时再看首帖前 200 字。结果有误差，量级可信，单个数字不要精确引用。
  - 文件 "Easy-To Forget Rules"（276042）的 PDF 没打开，它具体列了哪些规则【待核实】。
- **方法**：脚本在 `scratchpad/scripts/`（fetch.py 抓取、analyze.py 检索、classify2.py 分类），原始 JSON 在 `scratchpad/bgg/`。
- **一个前提修正**：Snake Temple（蛇神庙）是**基础版**主板的背面（正面是 Bird Temple 鸟神庙），不是探险领袖带来的。探险领袖新增的是 **Lizard Temple（蜥蜴）和 Monkey Temple（猴子）** 两块研究轨叠板。依据见 2752802、2624160、3409893 和文件 229286。

**总体判断（先说结论）**：BGG 上阿纳克的头号问题是**规则理解**，尤其是具体卡牌效果和行动时机，不是记账。基础版 Rules 区有 27% 的主题在问某张卡怎么用，而直接问计分的只有 8 个（约 2%）。所以手机工具的价值排序应该是：①规则/卡牌速查和易忘提醒；②终局计分器（证据中等，但做起来便宜，也确实有人缺计分纸）；③失踪的探险队的战役存档（这是**唯一一个真正需要跨局记录**的环节）。

---

## A. 建议放手机上的环节

按证据强度排序。

### A1. 规则 / 卡牌速查 + 领袖能力速查（FAQ）

- **痛点**：卡牌效果、免费行动和主行动的时机、"放逐"与"弃牌"的区别、旅行图标怎么付——这些问题在规则区反复出现。新手读完规则书照样会打错。
- **依据**
  - 基础版 Rules 472 个主题里，"具体卡牌效果/神器/物品"类 **129 个（27%）**，是最大的一类（见 C 节）。帖子最多的几个：[Effects of cards](https://boardgamegeek.com/thread/3453739)（46 帖）、[Is inspecting your own draw deck ok](https://boardgamegeek.com/thread/3677724)（29 帖）、[Effect "use up a card" mandatory?](https://boardgamegeek.com/thread/2767533)（21 帖）。
  - "免费行动 vs 主行动、一回合能做几件事"类问题反复出现：[Turns? How many? vs. Actions?](https://boardgamegeek.com/thread/2633142)（30 帖）、[Can you play a free action without a main action?](https://boardgamegeek.com/thread/3124362)（12 帖，有人说开头一两局没意识到"pass 也是一种行动"）。
  - 有人专门求全卡清单：[Looking for a file that lists all of the items and artifacts](https://boardgamegeek.com/thread/3491324)。
  - Files 区点赞最高的前 4 个里有 3 个是规则参考：[Action Andy 完整精简规则](https://boardgamegeek.com/filepage/215018) **211 赞 / 39 评论**、[官方规则书](https://boardgamegeek.com/filepage/209659) 168 赞、[官方玩家辅助卡](https://boardgamegeek.com/filepage/209660) 75 赞。另有 [Easy-To Forget Rules](https://boardgamegeek.com/filepage/276042)（19 赞）、[Player Aid & Game Flow - All Expansions](https://boardgamegeek.com/filepage/315557)（32 赞），以及西、法、意、德、日等多种语言的规则摘要。
  - 扩展领袖的困惑集中在少数几个角色。标题里出现次数：**Explorer 17**、Lizard 神庙 12、Professor 9、Mystic / Falconer / Captain / Baroness 各 7（探险领袖 Rules）；**Journalist 27**、Mechanic 12（失踪的探险队 Rules + General）。
- **建议**
  - 做成**可搜索的卡牌与图标词典**，按卡名和中文名都能检索，每张卡附上 BGG 上已有定论的答案。
  - 另做一页高频 FAQ（约 20 条，从 C 节高频主题里挑）。
  - 每个领袖一页速查，并写清"常见误解"。
  - 这部分是静态内容，不需要同步，离线也能用，成本最低、覆盖面最大。

### A2. "易忘规则"提醒（只提示，不追踪状态）

- **痛点**：有些规则大家都知道，但打的时候会忘了用或忘了付。另一类是读错规则，一直按错的打。
- **依据**
  - [Most overlooked rule(s)?](https://boardgamegeek.com/thread/2606704)（22 帖）是最直接的证据：
    - **花 2 金币雇飞机**：5 人说常忘，其中一人自述"打了 20 多局只买过一次飞机"。另见 [Shop Till You Drop??](https://boardgamegeek.com/thread/2681014) 里有人说"we often forgot that during our first games"，以及 [Paying travel cost](https://boardgamegeek.com/thread/2851786)。
    - **挖掘新遗址时忘了付旅行费**：同帖 2 人。另一主题里有人说他们 4 人局几乎每次都忘了付石板费（[Passage Shell effect](https://boardgamegeek.com/thread/3666801)）。
    - **忘了用助手的免费能力、守护者恩赐、神像槽效果**：同帖 2 人；另见 [Last card in hand is fear card?](https://boardgamegeek.com/thread/2580130)。
    - **"unoccupied"指整个遗址都没人**，不只是某一个格子（同帖 1 人，[Tigerclaw Hairpin](https://boardgamegeek.com/thread/2952339) 14 帖 7 人在讨论同一问题）。
  - **二级遗址只结算朝上那枚神像的效果**，朝下那枚直接放进补给。有人一直按两枚都结算来打：同上帖 2 人，另见 [Order of resolving rewards](https://boardgamegeek.com/thread/3011087)（12 帖）、[Can you slot an idol before resolving its bonus?](https://boardgamegeek.com/thread/3233019)（17 帖，10 赞，7 人）。
  - **研究奖励和神像奖励必须立即使用**，不能攒着：[Are research and idol bonuses to be taken immediately?](https://boardgamegeek.com/thread/3075017)（11 帖，4 赞，楼主承认一直按"可以存着"打）、[Research Tokens - Use Later?](https://boardgamegeek.com/thread/2559780)（16 帖）、[Pending use of idol tiles and research bonus tiles](https://boardgamegeek.com/thread/2659982)（10 帖）。
  - **守护者恩赐整局只能用一次**：[Clarification on guardian boon](https://boardgamegeek.com/thread/3209281)（楼主一直当成每回合都能用）、[Can I store the upgrade ability…](https://boardgamegeek.com/thread/3775411)（17 帖）。
- **建议**
  - 轮到某人时，手机上显示一张折叠的"别忘了"小卡（飞机=2 金、挖掘要付旅行费、奖励立即用、恩赐只能用一次……）。可按领袖或模块增减条目。
  - **不要**让玩家录入资源或手牌，只做提示。

### A3. 轮末清理清单（由起始玩家点完一步勾一步）

- **痛点**：轮末有好几步，顺序也有讲究：工人留在有守护者的遗址要拿恐惧卡、回收工人、处理卡牌市场和月亮杖、手里剩的牌留下还是弃掉、传起始玩家。规则区常有人问这一段。
  - 注意：直接自述"忘了做"的证据**不多**，更多是"不确定怎么做"。所以清单的作用是**防错和教学**，不是计数。
- **依据**
  - **轮末仍有工人留在有守护者的遗址 → 拿恐惧卡**：关键词命中 32 个主题。代表：[Leaving a dig site with a monster before end of round](https://boardgamegeek.com/thread/2697193)、[Gaining fear from Guardian](https://boardgamegeek.com/thread/2548646)、[passing on a guardian site](https://boardgamegeek.com/thread/3010037)、[clarification on archeologist moves](https://boardgamegeek.com/thread/2561952)（11 帖）。蜥蜴神庙研究轨上的守护者也一样，轮末标记还停在守护者格要拿恐惧卡（[Overcoming guardian research tracker](https://boardgamegeek.com/thread/2777954)）。
  - **市场与月亮杖**：[Setup next round example p.17](https://boardgamegeek.com/thread/2946046)（规则书示例让新手看不懂：先移除月亮杖两侧的牌，再移动月亮杖、滑动剩下的神器、补满）；[When does the card market refresh?](https://boardgamegeek.com/thread/2664297)（25 帖，10 赞，还涉及 BGA 的实现是否正确）；[Refilling the Buy Rows](https://boardgamegeek.com/thread/3651245)。
  - **剩余手牌可以留到下一轮**（含恐惧卡）：[Fear card in hand at end of round](https://boardgamegeek.com/thread/2559014)。
  - **起始玩家标记向左传**：[Which way do you pass the first player token?](https://boardgamegeek.com/thread/3717750)（13 帖，规则书前后用词不一致）。
  - **助手牌堆不用补充**：[When is the assistants pile renewed?](https://boardgamegeek.com/thread/2661601)（楼主是 BGA 转实体的玩家）。
  - **谁已经 pass**：有人做了 DIY 桌面立牌 [Arnak_Pass_Play](https://boardgamegeek.com/filepage/228341)（12 赞），简介说是为了记住谁已 pass。
- **建议**
  - 每人手机上有一个 "我 Pass 了" 按钮，所有人都 pass 后自动弹出轮末清单。
  - 清单按所选模块变化：有蜥蜴神庙就加一条"研究轨守护者"，失踪的探险队的各章节有额外步骤。
  - 第 5 轮结束后直接进入计分。
  - 轮次数字可以顺带显示，但这不是痛点（见 B 节）。

### A4. 终局计分器（每人在自己手机上填，汇总后同步）

- **痛点**：计分项多（研究轨两个标记、神庙板块、神像加空槽分、守护者、所有卡牌含牌库、恐惧卡负分），有几项容易算错。计分纸本也会用完。
  - 要说明：BGG 上**直接抱怨计分难的帖子不多**，基础版 Rules 里只有 8 个计分主题，也有资深玩家说"随便拿张纸记就行"（同一资深用户在 [2985590](https://boardgamegeek.com/thread/2985590) 和 [2730797](https://boardgamegeek.com/thread/2730797) 都这么说）。这一项证据强度为**中**。
- **依据**
  - **计分纸用完或买不到**：[Where can I buy just the score pad?](https://boardgamegeek.com/thread/3680009)（6 帖，2 赞；回帖推荐 BGStats 和亚克力可擦计分板）；[Scoring app??](https://boardgamegeek.com/thread/2730797)（有人说"已经快用完计分纸"，回帖推荐 BGSS 网页版、ScorePal，并提到 ScorePal 没有现成的阿纳克计分模板）；[Mangled Score Pad](https://boardgamegeek.com/thread/2985590)（13 帖）。文件 [Enlarged Score Sheet / Setup guide](https://boardgamegeek.com/filepage/220057) 有 **37 赞**，用途是覆膜后反复擦写。
  - **神像计分算错**：神像每枚 3 分，**放进槽里也算**，再加上空槽上印的分数。见 [Do I have Idol Scoring Wrong?](https://boardgamegeek.com/thread/2711361)（13 帖，4 赞，规则书示例里的 11 分让人困惑）、[Totems: Points?](https://boardgamegeek.com/thread/2788796)（5 帖）。另一主题里有人自述忘了加空槽的 10 分（1+2+3+4）（[2663432](https://boardgamegeek.com/thread/2663432)）。
  - **牌库里的牌也计分**：[Do all cards count at final scoring?](https://boardgamegeek.com/thread/3045882)（11 帖）。楼主看到某个教学视频只算了打出区的牌。
  - **恐惧卡要倒扣**：[Scoring question (cards)](https://boardgamegeek.com/thread/2768080)。
  - **放大镜和笔记本两个标记都计分**：[Solo Game Scoring Question](https://boardgamegeek.com/thread/2988538)（9 帖）。
  - **剩余资源不计分**：[Final scoring and leftover tokens?](https://boardgamegeek.com/thread/2580234)。
  - **扩展新增项**
    - 教授（Professor）档案区里的神器**不计分**（[3201588](https://boardgamegeek.com/thread/3201588)）。
    - 单人模式里 Rival 的 "-1 堆"神像每枚只算 2 分（[3502410](https://boardgamegeek.com/thread/3502410)）。
    - 失踪的探险队的章节分算法见 A5。
  - **平局判定**：先到失落神庙者胜（[2647255](https://boardgamegeek.com/thread/2647255) 引用的是 BGA 的说明）。这个顺序在实物上由神庙格的位置体现，工具只需要显示这条规则。官方规则书原文【待核实】。
- **建议**
  - 每人按"研究轨所在行（选择题）→ 神庙板块张数 → 神像数 → 空槽 → 守护者数 → 卡牌分 → 恐惧卡张数"逐项填。
  - 每一项旁边放 A2 那种一句话提示（如"神像进槽也算 3 分""牌库里的牌也算"）。
  - 汇总后同步给全桌，可导出或保存历史。
  - 研究轨分数按所选神庙（鸟/蛇/蜥蜴/猴子……）给出对应的分值表，避免玩家自己查板子。各神庙的具体分值需要另外整理【待核实】。

### A5. 《失踪的探险队》战役存档（跨局记录，最该上线的部分）

- **痛点**：6 章战役，每章结束后要记录几件事：章节分（多人取平均、减去 Rival 分、保留 0.5 分）、触发的剧情点（plot point）编号、地图上的故事路径符号（标记规则容易搞错），以及"哪些卡下章放牌库底、哪些卡进常规牌堆"。下一章开局要据此调整。这些都靠一张纸，跨周游戏很容易丢失或记错。
  - 官方明确表示**没有计划**为本扩展做 App（[3294697](https://boardgamegeek.com/thread/3294697)，回帖者疑似 CGE 人员【待核实身份】）。
  - 旧的单人战役网页 App 和本扩展**不兼容**（[3635522](https://boardgamegeek.com/thread/3635522)）。
- **依据**
  - **计分表看不懂**：[Campaign Score Sheet](https://boardgamegeek.com/thread/3165225)、[Second Row of Points on Campaign Sheet](https://boardgamegeek.com/thread/3167540)、[Campaign scoring pad](https://boardgamegeek.com/thread/3480969)（3 赞）。三帖都问计分表底部第二行是什么（答案：记录已达成的剧情点编号）。
  - **章节分算法**：[Two-player scoring - half points](https://boardgamegeek.com/thread/3743057)（保留半分；回帖提醒"取平均后、记录前要减去 Rival 分"）。累计总分决定结局（[3179439](https://boardgamegeek.com/thread/3179439)）。
  - **故事路径符号标记规则**：[Marking story path symbols - direction of movement](https://boardgamegeek.com/thread/3219078)（7 帖，楼主标错了分支）、[Query about campaign sheet symbols](https://boardgamegeek.com/thread/3182743)、[Campaign sheet symbols](https://boardgamegeek.com/thread/3182236)。
  - **跨章节保留什么**：[Do you keep earned cards in every chapter?](https://boardgamegeek.com/thread/3154427)（5 帖，6 赞）、[Do we keep cards we earn?](https://boardgamegeek.com/thread/3417772)、[Campaign: reset anything at chapter end?](https://boardgamegeek.com/thread/3352471)、[reseting the deck](https://boardgamegeek.com/thread/3261075)。
  - **成就（achievements）**：标题里出现 12 次。例如 [Timing for Achievements](https://boardgamegeek.com/thread/3205162)、[Are Achievements Acquired in the Last Round Useless…](https://boardgamegeek.com/thread/3298205)、[How viable is it to get all achievements?](https://boardgamegeek.com/thread/3518693)。
  - **体量**：失踪的探险队 Rules 区 217 个主题中，**108 个（50%）是战役/章节类**，Rival 和遭遇卡（encounter）相关的也各有二十多个主题。
  - **Files 区**：[SOLO campaign scoring table (6 chapters)](https://boardgamegeek.com/filepage/270990)（6 赞，玩家自制）、[Campaign Book v1.02](https://boardgamegeek.com/filepage/305537)（含第 1 章勘误）、[Campaign Book 第 1 章样张](https://boardgamegeek.com/filepage/263303)（18 赞）。
  - **基础版免费单人战役也有人自制计分表**：[Antoinette's Anonymous Donor](https://boardgamegeek.com/filepage/254550) 的作者附了额外计分页（见 [3157533](https://boardgamegeek.com/thread/3157533)）；另有法语自制 [Feuille de suivie](https://boardgamegeek.com/filepage/242351)。
- **建议**
  - 每个游戏小组一个战役存档：章节分自动算（平均 → 减 Rival → 保留 0.5）、累计总分、剧情点勾选、路径符号地图（按规则只允许合法的标记位置）、下章开局清单（哪些卡放牌库底）。
  - 必须做**防剧透**：章节内容默认折叠，只显示当前章节。
  - 规则书原文和章节文本有版权，工具只做结构化记录，不搬运剧情文字。

### A6. 开局配置向导 / 随机器（低成本、中等证据）

- **痛点**：组合很多——主板正反面（鸟/蛇）× 研究轨（鸟、蛇、蜥蜴、猴子，再加失踪的探险队的新神庙）× 领袖 × 人数（2 人局要封格）× 是否换用探险领袖的替换件。开局要翻规则书。
- **依据**
  - 有人做了 [Setup Randomizer](https://boardgamegeek.com/thread/3380948)（10 帖，9 赞），后来还有人求它补上新神庙。文件 [Leader Randomizer](https://boardgamegeek.com/filepage/256291)（9 赞）。
  - 探险领袖规则书文件简介强调：用新领袖时 **100% 推荐**换上新版石钥匙和矿工助手（[229286](https://boardgamegeek.com/filepage/229286)）。
  - 设计方认为基础版两块神庙配新领袖会偏简单，玩家理解成"新神庙是替代品，不是附加内容"（[3409893](https://boardgamegeek.com/thread/3409893)，17 帖）。
  - 打战役要不要移除其他扩展的内容（[3296744](https://boardgamegeek.com/thread/3296744) 等）。
  - 开局耗时 5–15 分钟，主要花在收纳上（[Setup time](https://boardgamegeek.com/thread/2783120)）。
- **建议**：开房时选人数和模块，生成一张勾选式的配置清单（封哪些格、放哪块神庙、哪些替换件）。可选随机分配领袖和神庙。

---

## B. 不建议做到手机上的环节

| 环节 | 理由 | 依据 |
|---|---|---|
| 资源实时计数（金币/指南针/石板/箭头/宝石） | 实物摆在每人面前，一眼可见。两边同时记账反而容易不一致。论坛没人抱怨资源记不清 | 资源类问题只有 14 个规则主题，都是"怎么换、要不要付"的规则问题（C 节） |
| 手牌、牌库、抽牌、洗牌 | 构筑的手感和隐藏信息都在实物里。上线等于做半个数字版 | 规则问题是"能不能翻自己的牌库"（[3677724](https://boardgamegeek.com/thread/3677724)），属于 FAQ，不是记录问题 |
| 卡牌市场 / 月亮杖 / 轮次计数 | 月亮杖本身就是轮次标记；滑牌、补牌是实物操作 | 检索"忘了第几轮 / lost track of round"零命中；只把清理顺序放进 A3 清单 |
| 研究轨位置、首达奖励归属 | 板上标记直观；首达奖励板块拿走就移出游戏，实物天然保证只发一次；平局顺序看神庙格位置 | "研究奖励"困惑在于必须立即用、能否同格再拿（[3455027](https://boardgamegeek.com/thread/3455027)），属于规则问题；**没有发现**"搞错谁先到"的抱怨 |
| 遗址、守护者、神像的随机抽取 | 翻板块的惊喜感是乐趣来源 | [2674762](https://boardgamegeek.com/thread/2674762) 等帖有人专门说翻板很刺激 |
| 恩赐是否已用、领袖专属标记（Explorer 零食、Professor 手提箱、Mystic 仪式区） | 规则规定用后翻面或放到板上指定区，实物已经有状态表示 | [3775411](https://boardgamegeek.com/thread/3775411)、[2899802](https://boardgamegeek.com/thread/2899802)、[2816715](https://boardgamegeek.com/thread/2816715)：问题都是"怎么用"，不是"记不住" |
| 单人 Rival AI 抽牌 | 官方已有网页 App（solo.arnak.game，含紫色难度和 Rival 目标），社区有 [fheir 的 Solo Helper](https://boardgamegeek.com/thread/2595609)（67 赞），还有粉丝扩展 Rival Expedition。工具定位是多人线下，不必重复 | [2689778](https://boardgamegeek.com/thread/2689778)、[2595609](https://boardgamegeek.com/thread/2595609)、[3137544](https://boardgamegeek.com/thread/3137544)（104 赞） |
| 完整规则引擎 / 线上对战 | 已有 BGA 实现、粉丝 AI 对战网站，CGE 官方在做 Steam 数字版；与"线下优先"相悖 | [3529694](https://boardgamegeek.com/thread/3529694)（63 赞，2025-06）、[3585521](https://boardgamegeek.com/thread/3585521)、[3722689](https://boardgamegeek.com/thread/3722689) |

---

## C. 规则区高频主题

分类方法：按优先级顺序做关键词匹配（战役 > 单人 > 领袖 > 计分 > 研究轨 > 守护者 > 神像 > 恐惧 > 助手 > 流程 > 遗址/移动 > 资源 > 卡牌）。只取标题；标题匹配不到时，再用首帖前 200 字。"卡牌效果"类也兜底收了含卡名的标题，所以略偏大。

### C1. 基础版 Rules（472 个主题）

| 主题 | 主题数 | 代表帖（id，帖数） |
|---|---|---|
| 具体卡牌效果 / 神器 / 物品 / 图标 | 129 | Effects of cards（[3453739](https://boardgamegeek.com/thread/3453739)，46）；Is inspecting your own draw deck ok（[3677724](https://boardgamegeek.com/thread/3677724)，29）；Effect "use up a card" mandatory?（[2767533](https://boardgamegeek.com/thread/2767533)，21） |
| 遗址 / 挖掘 / 发现 / 工人移动 / 旅行费用 | 57 | Movement symbols（[3764290](https://boardgamegeek.com/thread/3764290)，33）；Send an archeologist from one site to another?（[3050020](https://boardgamegeek.com/thread/3050020)，31）；Ocarina + sturdy boots combo（[2668476](https://boardgamegeek.com/thread/2668476)，30） |
| 回合流程（主行动 vs 免费行动、pass、市场补充、起始玩家） | 46 | Turns? How many? vs. Actions?（[2633142](https://boardgamegeek.com/thread/2633142)，30）；When does the card market refresh?（[2664297](https://boardgamegeek.com/thread/2664297)，25） |
| 守护者 / 恩赐 | 42 | What is the Boon on this Guardian?（[3204595](https://boardgamegeek.com/thread/3204595)，32）；Revisiting a site to overcome a guardian（[2702779](https://boardgamegeek.com/thread/2702779)，24） |
| 研究轨 / 神庙 / 研究奖励 | 40 | Research: Take a bonus tile（[3455027](https://boardgamegeek.com/thread/3455027)，19）；Research Tokens - Use Later?（[2559780](https://boardgamegeek.com/thread/2559780)，16） |
| 助手（升级、折扣助手） | 35 | The Discount Assistant（[2761974](https://boardgamegeek.com/thread/2761974)，13） |
| 单人 / Rival | 32 | Solo - "Dig at a Site"（[3048717](https://boardgamegeek.com/thread/3048717)，16） |
| 领袖能力（发在基础版区的扩展问题） | 29 | Place the Site Tiles face down at setup?（[3428382](https://boardgamegeek.com/thread/3428382)，24） |
| 战役（基础版免费单人战役） | 18 | Deck Building Clarification for Solo Campaign（[2665546](https://boardgamegeek.com/thread/2665546)，8） |
| 资源 / 交换 | 14 | Infinite compass game loophole?（[3593403](https://boardgamegeek.com/thread/3593403)，23） |
| 恐惧卡 | 12 | Fear tokens - am I required to use them?（[2883012](https://boardgamegeek.com/thread/2883012)，24） |
| 神像 / 神像槽 | 10 | Can you slot an idol before resolving its bonus?（[3233019](https://boardgamegeek.com/thread/3233019)，17） |
| 终局计分 / 平局 | 8 | Do I have Idol Scoring Wrong?（[2711361](https://boardgamegeek.com/thread/2711361)，13）；Do all cards count at final scoring?（[3045882](https://boardgamegeek.com/thread/3045882)，11） |

### C2. 探险领袖 Rules（124 个主题）

| 主题 | 主题数 | 代表帖 |
|---|---|---|
| 领袖能力 | 59 | Set-Up with the Professor（[2824554](https://boardgamegeek.com/thread/2824554)，26）；Understand the Professor（[2899802](https://boardgamegeek.com/thread/2899802)，21）；Mystic（[2816715](https://boardgamegeek.com/thread/2816715)，18） |
| 新卡牌效果 | 20 | Parachute（[3046395](https://boardgamegeek.com/thread/3046395)，16） |
| 蜥蜴 / 猴子神庙研究轨 | 14 | Lizard Temple's guardian（[2795491](https://boardgamegeek.com/thread/2795491)，12）；Monkey temple artifact（[2799038](https://boardgamegeek.com/thread/2799038)，10） |
| 单人 + 新内容 | 7 | Solo with new idol tiles or lizard temple（[2751059](https://boardgamegeek.com/thread/2751059)，11，9 赞） |
| 其他（遗址 5、神像/蓝槽 4、守护者 4、流程 3、助手 3、恐惧 2、资源 2、计分 1） | 24 | Cursed Idol（[2807925](https://boardgamegeek.com/thread/2807925)，10） |

### C3. 失踪的探险队 Rules（217 个主题）

| 主题 | 主题数 | 代表帖 |
|---|---|---|
| 战役 / 章节 / 剧情 / 成就 | 108 | Crashed plane (chapter one)（[3143714](https://boardgamegeek.com/thread/3143714)，19）；Chapter 3 research track（[3160782](https://boardgamegeek.com/thread/3160782)，15）；Cards when setting up Chapter 2?（[3648021](https://boardgamegeek.com/thread/3648021)，14） |
| 新卡牌 / 遭遇卡 | 33 | Dark Statuette（[3125227](https://boardgamegeek.com/thread/3125227)，12）；Encounter card use?（[3228671](https://boardgamegeek.com/thread/3228671)，11） |
| 领袖（Journalist 为主，Mechanic 次之） | 28 | Journalist: publishing effects optional?（[3439718](https://boardgamegeek.com/thread/3439718)，9）；Journalist Article setup（[3236088](https://boardgamegeek.com/thread/3236088)，8） |
| 新神庙（Waterfall 等） | 10 | Waterfall Temple shortcut（[3165631](https://boardgamegeek.com/thread/3165631)，6） |
| 其他（守护者 7、遗址 7、资源 7、单人 7、计分 4、流程 4、助手 1、恐惧 1） | 38 | Two-player scoring - half points（[3743057](https://boardgamegeek.com/thread/3743057)，5） |

**对 FAQ 的启示**：先做"卡牌词典"和"主行动/免费行动/旅行费"这三块，覆盖面最大。其次是守护者、研究轨奖励、神像槽。扩展部分以领袖速查（Explorer、Professor、Mystic、Journalist）和战役规则为主。

---

## D. 扩展相关发现

### D1. 探险领袖（Expedition Leaders）

- **神庙**：新增 Lizard、Monkey 两块研究轨（不是"Snake Temple 背面"）。
  - 玩家把它们理解为"配领袖时的替代品"（[3409893](https://boardgamegeek.com/thread/3409893)）。
  - 蜥蜴神庙的守护者在研究轨上：先到并击败的人拿走；只要守护者还在，所有人都过不去；轮末标记停在该格要拿恐惧卡（[2795491](https://boardgamegeek.com/thread/2795491)、[2777954](https://boardgamegeek.com/thread/2777954)）。
  - 猴子神庙到神器层后，放大镜和笔记本可以走不同岔路（[2934976](https://boardgamegeek.com/thread/2934976)）。基础版也有同类问题（[2636556](https://boardgamegeek.com/thread/2636556)）。
- **6 个领袖中困惑最多的**
  - **Explorer**（标题出现 17 次）：零食标记的费用、搬移后能否再次挖掘或发现、和卡牌的联动。
  - **Professor**（9 次）：手提箱里的指南针只能买档案区的神器，玩家对此有分歧（[2899802](https://boardgamegeek.com/thread/2899802)，21 帖，6 赞）；开局先放档案还是先摆市场（[2824554](https://boardgamegeek.com/thread/2824554)，26 帖）；档案区的神器不计分（[3201588](https://boardgamegeek.com/thread/3201588)）。
  - **Mystic**（7 次）：仪式不是主行动；放逐的恐惧卡进仪式区；手牌上限（[2816715](https://boardgamegeek.com/thread/2816715)、[3380756](https://boardgamegeek.com/thread/3380756)）。
  - **Falconer / Captain / Baroness**：各 7 次左右，多是具体卡牌的时机问题。有玩家评价 Falconer 和 Captain 是复杂度最低的两位（[2764229](https://boardgamegeek.com/thread/2764229)，44 赞）。
- **蓝色神像槽**：放进蓝槽只能二选一，不能叠加两种奖励（[3108999](https://boardgamegeek.com/thread/3108999)）。
- **替换件**：新版石钥匙和矿工助手，配领袖时强烈推荐换上（文件 [229286](https://boardgamegeek.com/filepage/229286)）。可放进 A6 配置向导。
- **规则书德英版本差异**：travel 值的保留时限，德版有歧义（[3308541](https://boardgamegeek.com/thread/3308541)）。中文版是否有同类问题【待核实】。
- **Files**：Action Andy 含扩展版（56 赞）、官方规则书（45 赞）、官方领袖辅助卡（25 赞）、玩家自制领袖战役（12 赞）、领袖随机器（9 赞）。

### D2. 失踪的探险队（The Missing Expedition）

- **内容**：6 章战役（单人或合作）、新领袖 Mechanic 和 Journalist、新神庙（Waterfall 等；是否还有其他新研究轨【待核实】）、遭遇卡、Rival "Antoinette"。
- **战役记录**：玩家完全依赖纸质战役表；记录内容和常见困惑见 A5。合作模式按"玩家平均分 − Rival 分，保留 0.5 分"计章节分，6 章累计决定结局。官方无 App，旧单人 App 不兼容——这是本次调研里**最明确的"需要线上记录"的空白**。
- **Journalist** 是困惑最多的单个领袖（标题出现 27 次）：
  - 文章标记要放在**所有**一、二级遗址下（共 12 个），不是二选一（[3236088](https://boardgamegeek.com/thread/3236088)）。
  - 发表的上限和时机（[3195937](https://boardgamegeek.com/thread/3195937)）。
  - 发表效果能否放弃（[3439718](https://boardgamegeek.com/thread/3439718)）。
- **Mechanic**（12 次）：齿轮产生的旅行图标必须当回合用掉（[3249088](https://boardgamegeek.com/thread/3249088)），以及强度争议。
- **求辅助工具**：[App for Missing Expedition](https://boardgamegeek.com/thread/3635522)（玩家问有没有 App 能简化设置）、[Plans for app driven opponent?](https://boardgamegeek.com/thread/3294697)（3 赞，官方答复暂无计划）、[Lost my solo pieces - can I use the online solo app?](https://boardgamegeek.com/thread/3333127)。
- **Files**：官方规则书（58 赞）、战役书样章（18 赞）、新领袖辅助卡（17 赞）、战役书 v1.02 勘误、玩家自制"6 章单人战役计分表"（6 赞）、蜥蜴/猴子神庙用于战役的变体（6 赞）。

### D3. 其他背景（影响定位）

- **官方单人网页 App**：基础版免费单人战役（Search for Professor Kutil）和单人迷你扩展都能用，玩家评价很高（[2689778](https://boardgamegeek.com/thread/2689778)）。
- **数字版**：BGA 有基础版；CGE 自研 Steam 数字版（[3529694](https://boardgamegeek.com/thread/3529694)，63 赞），据说首发就包含第一个扩展（[3585521](https://boardgamegeek.com/thread/3585521)）；还有粉丝做的 AI 对战网站（[3722689](https://boardgamegeek.com/thread/3722689)）。
- **小结**：中文线下工具不要和这些产品竞争"玩游戏"本身，应该专注于**实体桌面的记录、提示和规则查询**。
- **社区的变体需求**：多轮变体（6 轮、10 轮）、合作模式、粉丝领袖等（Variants 区：[3767980](https://boardgamegeek.com/thread/3767980)、[3053295](https://boardgamegeek.com/thread/3053295)、[2691720](https://boardgamegeek.com/thread/2691720)、[3259463](https://boardgamegeek.com/thread/3259463) 109 赞）。如果轮末流程允许自定义轮数，成本很低，但这不是本次的核心需求。
