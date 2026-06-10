# titan007 欧冠杯 CupMatch c103.js 数据结构分析

## 页面与数据源

目标页面：

- 页面地址：<https://zq.titan007.com/cn/CupMatch/2023-2024/103.html>
- 主数据脚本：<https://zq.titan007.com/jsData/matchResult/2023-2024/c103.js>
- 赛季列表脚本：<https://zq.titan007.com/jsData/LeagueSeason/sea103.js>
- 赔率统计接口：<https://zq.titan007.com/League/LeagueOddsAjax?sclassId=103&subSclassId=&matchSeason=2023-2024&round=1>

这个页面的 HTML 只负责布局。核心数据来自 `c103.js`，页面脚本 `Script/page/cupMatch.js` 会读取这些变量并渲染赛程、积分榜、阶段切换和比赛链接。因此爬取时不建议解析 DOM 表格，而应直接解析数据脚本。

## 文件总体结构

`c103.js` 不是 JSON，而是一组 JavaScript 变量赋值：

```js
var arrCup = [...];
jh["G23389"] = [...];
jh["S23702A"] = [...];
var arrCupKind = [...];
var arrTeam = [...];
var lastUpdateTime = "2026-03-18 08:30:59";
```

实际加载后的数据规模：

| 项目 | 数量 |
| --- | ---: |
| 球队 | 78 支 |
| `jh` 数据键 | 26 个 |
| 赛程键 `G...` | 18 个 |
| 积分榜键 `S...` | 8 个 |
| 单场比赛记录 | 214 场 |
| 两回合淘汰赛组合 | 57 组 |
| 页面最后更新时间 | `2026-03-18 08:30:59` |

## arrCup：赛事基础信息

`arrCup` 保存赛事基础信息、名称、logo、主题色和赛制说明。

```js
[
  103,
  "欧洲联赛冠军杯赛",
  "歐洲聯賽冠軍盃賽",
  "UEFA Champions League",
  "欧冠杯",
  "歐冠盃",
  "UEFA CL",
  "2025-2026",
  "/Image/league_match/images/166675006178.png",
  "#f75000",
  "赛制说明 HTML...",
  "1"
]
```

字段说明：

| 下标 | 字段 | 说明 |
| ---: | --- | --- |
| 0 | `sclassId` | 赛事 ID，欧冠杯为 `103` |
| 1 | `nameCn` | 简体中文全称 |
| 2 | `nameTc` | 繁体中文全称 |
| 3 | `nameEn` | 英文全称 |
| 4 | `shortNameCn` | 简体中文简称 |
| 5 | `shortNameTc` | 繁体中文简称 |
| 6 | `shortNameEn` | 英文简称 |
| 7 | `defaultSeason` | 站点当前默认赛季，不一定等于页面 URL 中的赛季 |
| 8 | `logo` | 赛事 logo 路径 |
| 9 | `themeColor` | 页面主题色 |
| 10 | `ruleHtml` | 赛制说明 HTML |
| 11 | `flag` | 赛事状态或页面标记 |

注意：页面地址中的 `2023-2024` 才是当前抓取赛季，不能直接用 `arrCup[7]` 作为目标赛季。

## arrCupKind：阶段与轮次定义

`arrCupKind` 定义页面顶部的阶段标签，例如预选赛、分组赛、十六强、决赛。

字段结构：

```js
[
  stageId,
  grouped,
  nameCn,
  nameTc,
  nameEn,
  groupCount,
  current,
  qualifyCount
]
```

字段说明：

| 下标 | 字段 | 说明 |
| ---: | --- | --- |
| 0 | `stageId` | 阶段 ID |
| 1 | `grouped` | 是否分组，`1` 表示有 A/B/C 等分组 |
| 2 | `nameCn` | 简体阶段名 |
| 3 | `nameTc` | 繁体阶段名 |
| 4 | `nameEn` | 英文阶段名 |
| 5 | `groupCount` | 分组数量 |
| 6 | `current` | 页面默认选中阶段 |
| 7 | `qualifyCount` | 出线球队数量或页面渲染辅助值 |

2023-2024 欧冠杯阶段列表：

| 阶段 ID | 名称 | 是否分组 | 分组数 | 默认选中 | 对应赛程键 |
| ---: | --- | ---: | ---: | ---: | --- |
| 23389 | 预选赛 | 0 | 0 | 0 | `G23389` |
| 23409 | 预选决赛 | 0 | 0 | 0 | `G23409` |
| 23390 | 第一圈 | 0 | 0 | 0 | `G23390` |
| 23506 | 第二圈 | 0 | 0 | 0 | `G23506` |
| 23537 | 第三圈 | 0 | 0 | 0 | `G23537` |
| 23635 | 附加赛 | 0 | 0 | 0 | `G23635` |
| 23702 | 分组赛 | 1 | 8 | 0 | `G23702A` 至 `G23702H` |
| 24250 | 十六强 | 0 | 0 | 0 | `G24250` |
| 24559 | 半准决赛 | 0 | 0 | 0 | `G24559` |
| 24722 | 准决赛 | 0 | 0 | 0 | `G24722` |
| 24821 | 决赛 | 0 | 0 | 1 | `G24821` |

## arrTeam：球队字典

`arrTeam` 是球队 ID 到名称与 logo 的映射，赛程和积分榜都通过球队 ID 关联这里的数据。

字段结构：

```js
[
  teamId,
  nameCn,
  nameTc,
  nameEn,
  reserved,
  logo
]
```

示例：

```js
[82, "皇家马德里", "皇家馬德里", "Real Madrid", "", "images/164871252161.png"]
[99, "多特蒙德", "多蒙特", "Borussia Dortmund", "", "images/164870996363.png"]
```

建议解析后建立 Map：

```js
const teamMap = new Map(
  arrTeam.map((team) => [
    team[0],
    {
      id: team[0],
      nameCn: team[1],
      nameTc: team[2],
      nameEn: team[3],
      logo: team[5],
    },
  ]),
);
```

## jh：核心业务数据

`jh` 是 `c103.js` 中最重要的数据容器。

命名规则：

| key 类型 | 示例 | 含义 |
| --- | --- | --- |
| `G...` | `G24821` | 赛程/赛果 |
| `S...` | `S23702A` | 分组积分榜 |

### G：赛程与赛果

普通单场比赛结构：

```js
[
  matchId,
  sclassId,
  status,
  time,
  homeTeamId,
  awayTeamId,
  fullScore,
  halfScore,
  homeRankText,
  awayRankText,
  asianHandicapFull,
  asianHandicapHalf,
  totalGoalsFull,
  totalGoalsHalf,
  hasAnalysis,
  hasEuropeOdds,
  hasAsianOdds,
  hasOverUnderOdds,
  homeRedCards,
  awayRedCards,
  remark,
  reserved21,
  extraInfo,
  neutralFlag,
  homeRankCode,
  awayRankCode
]
```

字段说明：

| 下标 | 字段 | 说明 |
| ---: | --- | --- |
| 0 | `matchId` | 比赛 ID，可拼详情页、分析页、赔率页 |
| 1 | `sclassId` | 赛事 ID |
| 2 | `status` | 比赛状态，`-1` 通常表示完场 |
| 3 | `time` | 比赛时间 |
| 4 | `homeTeamId` | 主队 ID |
| 5 | `awayTeamId` | 客队 ID |
| 6 | `fullScore` | 全场比分 |
| 7 | `halfScore` | 半场比分 |
| 8 | `homeRankText` | 主队赛前联赛排名文本 |
| 9 | `awayRankText` | 客队赛前联赛排名文本 |
| 10 | `asianHandicapFull` | 全场亚让盘口 |
| 11 | `asianHandicapHalf` | 半场亚让盘口 |
| 12 | `totalGoalsFull` | 全场大小球盘口 |
| 13 | `totalGoalsHalf` | 半场大小球盘口 |
| 14 | `hasAnalysis` | 是否有分析页 |
| 15 | `hasEuropeOdds` | 是否有欧赔页 |
| 16 | `hasAsianOdds` | 是否有亚让页 |
| 17 | `hasOverUnderOdds` | 是否有大小球页 |
| 18 | `homeRedCards` | 主队红牌数 |
| 19 | `awayRedCards` | 客队红牌数 |
| 20 | `remark` | 备注 |
| 21 | `reserved21` | 保留字段，常为空 |
| 22 | `extraInfo` | 加时、点球、两回合说明等扩展信息 |
| 23 | `neutralFlag` | 是否中立场，`1` 表示中立场 |
| 24 | `homeRankCode` | 主队联赛排名编码 |
| 25 | `awayRankCode` | 客队联赛排名编码 |

决赛示例：

```js
[
  2576780,
  103,
  -1,
  "2024-06-02 03:00",
  99,
  82,
  "0-2",
  "0-0",
  "德甲5",
  "西甲1",
  -0.75,
  -0.25,
  "2.5/3",
  "1/1.5",
  1,
  1,
  1,
  1,
  0,
  0,
  "",
  "",
  "",
  "1",
  "GER D1-5",
  "SPA D1-1"
]
```

解析后可得到：

| 字段 | 值 |
| --- | --- |
| 比赛 ID | `2576780` |
| 时间 | `2024-06-02 03:00` |
| 主队 | 多特蒙德 |
| 客队 | 皇家马德里 |
| 比分 | `0-2` |
| 半场 | `0-0` |
| 中立场 | 是 |
| 全场亚让 | `-0.75` |
| 全场大小球 | `2.5/3` |

### 两回合淘汰赛结构

早期淘汰赛阶段不是简单的单场数组，而是对阵组合：

```js
[
  homeTeamId,
  awayTeamId,
  aggregateHomeGoals,
  aggregateAwayGoals,
  leg1MatchRow,
  leg2MatchRow
]
```

示例：

```js
[
  2517,
  2560,
  2,
  2,
  [2401630, 103, -1, "2023-07-11 23:00", 2517, 2560, "0-1", ...],
  [2401644, 103, -1, "2023-07-19 02:00", 2560, 2517, "1-2", ...]
]
```

这类数据需要：

1. 保留组合层的总比分。
2. 展开每一回合为单场比赛。
3. 结合 `extraInfo` 判断晋级方、加时、点球等特殊结果。

### extraInfo：加时、点球与晋级说明

比赛行下标 `22` 是扩展说明字段，常见格式：

```js
";|;|;|90,1-2;2-2;1,2-3;4-3;1"
```

页面脚本中会使用 `PoJie()` 解析这个字段。

大致规则：

```js
const parts = extraInfo.split("|");
const resultParts = parts[3].split(";");
```

`resultParts` 中可能包含：

| 位置 | 含义 |
| --- | --- |
| 0 | 90 分钟比分说明 |
| 1 | 两回合总比分说明 |
| 2 | 加时比分说明 |
| 3 | 点球比分说明 |
| 4 | 胜方标记，`1` 表示主队方向，`2` 表示客队方向 |

淘汰赛晋级判断不能只看单场比分，必须结合组合总比分和 `extraInfo`。

## S：分组积分榜

`S23702A` 至 `S23702H` 分别表示 A-H 组积分榜。

字段结构：

```js
[
  rank,
  teamId,
  played,
  win,
  draw,
  loss,
  goalsFor,
  goalsAgainst,
  goalDiff,
  points,
  qualifyCount,
  pointDeduction,
  note
]
```

字段说明：

| 下标 | 字段 | 说明 |
| ---: | --- | --- |
| 0 | `rank` | 排名 |
| 1 | `teamId` | 球队 ID |
| 2 | `played` | 比赛场次 |
| 3 | `win` | 胜 |
| 4 | `draw` | 平 |
| 5 | `loss` | 负 |
| 6 | `goalsFor` | 进球 |
| 7 | `goalsAgainst` | 失球 |
| 8 | `goalDiff` | 净胜球 |
| 9 | `points` | 积分 |
| 10 | `qualifyCount` | 出线显示辅助值 |
| 11 | `pointDeduction` | 扣分 |
| 12 | `note` | 备注 |

A 组示例：

| 排名 | 球队 | 场 | 胜 | 平 | 负 | 得 | 失 | 净 | 分 |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 拜仁慕尼黑 | 6 | 5 | 1 | 0 | 12 | 6 | 6 | 16 |
| 2 | 哥本哈根 | 6 | 2 | 2 | 2 | 8 | 8 | 0 | 8 |
| 3 | 加拉塔萨雷 | 6 | 1 | 2 | 3 | 10 | 13 | -3 | 5 |
| 4 | 曼彻斯特联 | 6 | 1 | 1 | 4 | 12 | 15 | -3 | 4 |

## 推荐归一化模型

建议把 `c103.js` 解析成以下结构：

```js
{
  competition: {
    id,
    nameCn,
    nameEn,
    shortNameCn,
    logo,
    themeColor,
    ruleHtml,
  },
  season: "2023-2024",
  seasons: [],
  stages: [],
  teams: [],
  matches: [],
  ties: [],
  standings: [],
  lastUpdateTime,
}
```

`matches` 单场模型：

```js
{
  matchId,
  stageId,
  group,
  time,
  status,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  fullScore,
  halfScore,
  homeRankText,
  awayRankText,
  asianHandicapFull,
  asianHandicapHalf,
  totalGoalsFull,
  totalGoalsHalf,
  hasAnalysis,
  hasEuropeOdds,
  hasAsianOdds,
  hasOverUnderOdds,
  homeRedCards,
  awayRedCards,
  neutral,
  extraInfo,
}
```

`standings` 分组积分榜模型：

```js
{
  stageId: 23702,
  group: "A",
  rows: [
    {
      rank,
      teamId,
      teamName,
      played,
      win,
      draw,
      loss,
      goalsFor,
      goalsAgainst,
      goalDiff,
      points,
      pointDeduction,
      note,
    },
  ],
}
```

## 抓取与解析流程

推荐流程：

1. 从页面 URL 提取赛季和赛事 ID：

   ```text
   /CupMatch/2023-2024/103.html
   season = 2023-2024
   sclassId = 103
   ```

2. 请求主数据脚本：

   ```text
   https://zq.titan007.com/jsData/matchResult/{season}/c{sclassId}.js
   ```

3. 请求赛季列表：

   ```text
   https://zq.titan007.com/jsData/LeagueSeason/sea{sclassId}.js
   ```

4. 可选请求赔率统计：

   ```text
   https://zq.titan007.com/League/LeagueOddsAjax?sclassId={sclassId}&subSclassId=&matchSeason={season}&round=1
   ```

5. 解析变量：

   - `arrCup`
   - `arrCupKind`
   - `arrTeam`
   - `jh`
   - `arrSeason`
   - `lastUpdateTime`

6. 建立 `teamMap`。

7. 遍历 `jh`：

   - `G...` 归一化为赛程/赛果。
   - `S...` 归一化为积分榜。
   - 两回合结构要展开单场，并保留总比分和晋级信息。

## 注意事项

- 不要从 DOM 表格反爬数据，表格是由 `c103.js` 渲染出来的。
- `c103.js` 是 JS 赋值，不是 JSON，不能直接 `JSON.parse`。
- 解析远端 JS 时应避免在服务端直接执行不可信代码。更稳妥的方式是编写受控解析器，或只提取固定变量赋值片段。
- 盘口字段中，亚让可能是数字，大小球通常是字符串，如 `2.5/3`。
- `neutralFlag` 为字符串，常见值是 `"0"` 或 `"1"`。
- 淘汰赛晋级逻辑要结合组合总比分和 `extraInfo`，不能只看单场比分。
- `arrCup[7]` 是站点默认赛季，不代表当前页面赛季，当前赛季应从 URL 提取。

