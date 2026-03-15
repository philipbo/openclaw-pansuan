## TOOLS.md - 工具使用指南

Skills 定义了工具的工作方式。此文件用于记录你的具体信息——那些你的环境中独有的内容。

---

## 核心工具：agent-browser

你的数据全部来自 `https://jc.titan007.com/index.aspx`，这是一个 JavaScript 动态渲染页面。
必须使用 `agent-browser` CLI 操作，不能用普通 HTTP 请求。

`agent-browser` 是一个独立的 headless 浏览器自动化 CLI 工具（[vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser)），通过 Shell 调用。所有浏览器操作均以 `agent-browser` 命令执行。

**关键须知：**

- titan007 全站（含 `vip.titan007.com`）**无需登录**，任何人均可直接访问
- 全站均为 **JS 动态渲染**，每次打开页面后必须 `agent-browser wait --load networkidle` 等待渲染完成
- 比赛详情页默认显示「现场分析」，可以点击「分析」标签获取比赛的基本面信息数据
- 比赛分析数据需通过直接访问 `https://zq.titan007.com/analysis/{matchId}cn.htm` 获取
- 如果某场比赛数据缺失（页面无内容或模块缺失），直接跳过，不做无效重试
- **赔率必须实时抓取**：赔率随时在变，每次分析都要从页面刷新最新赔率数据，不得使用记忆、向量数据库中的旧赔率
- **深度分析每次均当首次**：不复用当日 memory 中的基本面，每次分析都抓取分析页（含基本面 + 即时走势）并抓取赔率变化
- **只要赛前赔率，不要滚球赔率**：赔率变化历史中，只提取比赛开始前的数据。如果赔率变化表格中出现比赛中（滚球）的赔率记录（通常有比分列显示非 0:0，或时间晚于开球时间），必须过滤掉，只保留赛前变化记录

## titan007 页面结构

### 页面 1：赛程列表

URL: `https://jc.titan007.com/index.aspx`

页面包含一个赛事表格，字段：

- 场：竞彩编号
- 赛事：联赛/杯赛名称
- 时间：开球时间
- 状态：未开场 / 进行中 / 已完场
- 主队：主队名称
- 比分：当前比分或最终比分
- 客队：客队名称
- 数据：包含「分析」链接，点击进入详情页

页面特点：

- 竞彩页面默认已显示全部赛事，无需点击「显示全部」
- 支持日期切换（可查看前几天的赛程）
- 支持按状态筛选（未开场/已完场/进行中）
- 数据通过 JavaScript 动态加载

### 页面 2：比赛分析详情页（核心数据页）

URL 规则：`https://zq.titan007.com/analysis/{matchId}cn.htm`

其中 `{matchId}` 是纯数字的比赛 ID（如 `2950977`），可从赛程列表中的「分析」链接提取。

例如：`https://zq.titan007.com/analysis/2950977cn.htm`（里尔 vs 阿斯顿维拉）

此页面包含以下数据模块（均为 JS 动态渲染）：

| 模块                 | 内容                                                             | 用途                         |
| -------------------- | ---------------------------------------------------------------- | ---------------------------- |
| 联赛积分排名         | 双方总/主/客/近6场的赛、胜、平、负、得、失、净、积分、排名、胜率 | 基本面分析 + 战意判断        |
| 对赛往绩             | 近期交手记录（可选主客相同）                                     | 交锋分析                     |
| 近期战绩             | 双方近 N 场战绩（横版/竖版）                                     | 基本面分析                   |
| 联赛盘路走势         | 亚让盘赢盘率、大小球率（全场/半场/主场/客场/近6场）              | 盘赔分析                     |
| 相同盘路             | 同一初盘下的历史赢盘/走水/输盘率                                 | 盘赔分析                     |
| 入球数分布           | 进球数 0/1/2/3/4+、上下半场分布                                  | 大小球分析                   |
| 半全场               | 半场-全场结果组合统计                                            | 辅助分析                     |
| 进球数/单双          | 大/小/走、单/双统计                                              | 大小球分析                   |
| 进球时间             | 10 分钟区间的进球分布                                            | 辅助分析                     |
| 未来五场             | 双方后续赛程与间隔天数                                           | 轮换/体能风险判断            |
| 阵容情况             | 伤停球员名单、缺阵原因、上场首发/替补阵容及评分                  | 伤停分析                     |
| 赛前简报             | AI 生成的赛前分析文字                                            | 辅助参考                     |
| 本赛季数据统计比较   | 战绩统计、得失球统计、净胜球分布                                 | 基本面分析                   |
| 即时走势（让/大/欧） | 亚盘让球、大小球、欧赔的初盘和即时盘变化                         | 盘赔分析（页面顶部标签切换） |

#### ⚠️ 即时走势比较：获取数据环节最重的一步

**仅在使用分析页时**需要此步骤。分析页 URL：`https://zq.titan007.com/analysis/{matchId}cn.htm`。赔率变化详情页、赛程列表页等其它页面**没有**「即时走势比较」表格，无需执行下面流程。

**即时走势比较**是分析页上的表格：各公司（澳*、Crow*、36*、易* 等）的**欧洲指数（主胜/和局/客胜）、实际最新亚盘、进球数**的**初盘 + 即时**。初筛阶段 5、深度分析步骤 1 都依赖它。**若这里拿错或拿不到，后续分析都是浪费。**

- 该区块由 **JavaScript 动态渲染**，纯 HTTP fetch 拿不到，必须用 **agent-browser**（或其它浏览器自动化）打开分析页后 snapshot 提取。
- 页面上**有时默认不显示**「即时走势比较」表格（取决于用户/环境是否点过「定制」）。若 snapshot 后**没有**该表格或只有标题无数据，必须按下面流程先把它调出来，再 snapshot 提取。

**当页面上没有「即时走势比较」表格时的操作流程（必做）：**

1. 在分析页 snapshot 后，从输出中查找**可点击元素**：文案为 **「定制」** 的链接/按钮（可能在页面顶部或右侧）。若该元素不在视窗内，先 `agent-browser scroll` 使其进入视窗再点击。
2. **点击「定制」**（使用 snapshot 中该元素的 ref：`agent-browser click <ref>`）。
3. **等待弹窗**：`agent-browser wait 2000`（或 1500～3000 ms），等待「分析数据定制」弹窗出现。
4. 再次 **snapshot**，在弹窗内找到文案为 **「指数比较」** 的列表项，**点击「指数比较」**（`agent-browser click <该 ref>`）。
5. 在弹窗内找到 **「确定」** 按钮，**点击「确定」**（`agent-browser click <该 ref>`）。
6. **等待弹窗关闭**：`agent-browser wait 1000`。
7. 再次 **snapshot**，此时页面上应出现「即时走势比较」表格（含 初/即时/滚球、各公司、欧洲指数、实际最新亚盘、进球数 等列），从本次 snapshot 中提取所需数据。

**注意**：snapshot 返回的 ref（如 e371、e510、e512）每次运行可能不同，**不要写死 ref**。必须在当次 snapshot 输出中按 **name/文案** 查找「定制」「指数比较」「确定」对应的 ref，再对该 ref 执行 click。

### 页面 3：赔率变化详情页（盘赔深度数据）

通过比赛 ID + 公司 ID 拼接 URL，获取各公司的赔率变化历史。

#### 博彩公司 ID 表

| 公司        | companyID | 亚让/进球数         | 胜平负(欧指)               | 备注                                     |
| ----------- | --------- | ------------------- | -------------------------- | ---------------------------------------- |
| 澳彩        | 1         | **必抓（4家之一）** | 可选                       | 亚让/大小球 4家交叉认证                  |
| 皇冠        | 3         | **必抓（4家之一）** | 可选                       | 亚让/大小球 4家交叉认证                  |
| 365         | 8         | **必抓（4家之一）** | **必抓（欧洲与威廉交叉）** | 欧指欧洲赛事与威廉交叉认证               |
| 威廉希尔    | 9         | 备选                | **必抓（欧洲比赛）**       | 欧洲赛事与365交叉；德国与Interwetten交叉 |
| 易胜博      | 12        | **必抓（4家之一）** | 可选                       | 亚让/大小球 4家交叉认证                  |
| Interwetten | 19        | 备选                | **必抓（德国联赛）**       | 德甲/德乙与威廉交叉认证                  |
| 平博        | 47        | **必抓（参照）**    | **必抓（真实概率锚点）**   | CLV 基准；亚让/大小球 4家共识后再参照    |
| 香港马会    | 48        | 亚洲联赛可选        | 亚洲联赛可选               | 仅分析日职/K联赛/澳超/中超时加入         |

**抓取优先级**：

亚让：

- **必抓 4 家**：澳彩(1)、皇冠(3)、365(8)、易胜博(12)。先对 4 家分别分析并**交叉认证**，达成共识后再以**平博(47)**为参照（尖锐资金方向）。
- **一致性规则**：4 家中若有 **1 家与其余 3 家共识不一致** → **严格警惕冷门**（该公司可能掌握额外信息）。
- 亚洲联赛：可选加入香港马会(48)

进球数(大小球)：

- **必抓 4 家**：澳彩(1)、皇冠(3)、365(8)、易胜博(12)。先对 4 家分别分析并**交叉认证**，达成共识后再以**平博(47)**为参照（尖锐资金对进球数的判断）。
- **一致性规则**：4 家中若有 **1 家与其余 3 家共识不一致** → **严格警惕冷门**（该公司可能掌握额外信息）。
- 亚洲联赛：可选加入香港马会(48)

胜平负(欧指/欧洲指数)：

- **所有比赛必抓平博(47)**：真实概率锚点，CLV 计算基准，比分概率验证参照。
- **欧洲赛事（含非德国）**：必抓**威廉(9)、365(8)**，**威廉与 365 交叉认证**。
- **德国联赛（德甲/德乙）**：必抓**威廉(9)、Interwetten(19)**，**威廉与 Interwetten 交叉认证**。
- 澳彩/皇冠/易胜博 欧指为可选（与亚让/大小球同场对比、防诱盘时可参考）。
- 亚洲联赛：可选加入香港马会(48)

#### URL 模板

**亚盘让球变化**（注意 companyID 大写 D）：

```
https://vip.titan007.com/changeDetail/handicap.aspx?id={matchId}&companyID={companyId}&l=0
```

**大小球(进球数)变化**：

```
https://vip.titan007.com/changeDetail/overunder.aspx?id={matchId}&companyid={companyId}&l=0
```

**胜平负(欧指)变化**：

```
https://vip.titan007.com/changeDetail/1x2.aspx?id={matchId}&companyid={companyId}&l=0
```

#### 示例（比赛 ID=2950979）

| 类型   | 澳彩(1)                                 | 皇冠(3)          | 365(8)           | 威廉(9)          | 易胜博(12)        |
| ------ | --------------------------------------- | ---------------- | ---------------- | ---------------- | ----------------- |
| 亚让   | `handicap.aspx?id=2950979&companyID=1`  | `...companyID=3` | `...companyID=8` | `...companyID=9` | `...companyID=12` |
| 进球数 | `overunder.aspx?id=2950979&companyid=1` | `...companyid=3` | `...companyid=8` | `...companyid=9` | `...companyid=12` |
| 欧指   | `1x2.aspx?id=2950979&companyid=1`       | `...companyid=3` | `...companyid=8` | `...companyid=9` | `...companyid=12` |

#### 页面数据格式

赔率变化页面以表格形式展示，每行包含：

- **时间**：赔率变化的时间点
- **比分**（如已开赛）
- **赔率数据**：亚让为「主队水位 + 盘口 + 客队水位」；进球数为「大球水位 + 盘口 + 小球水位」；欧指为「主胜 + 平局 + 客胜」
- **变化时间**
- **状态**：即/封/临等

重点关注：

- **只取赛前数据**：过滤掉比赛开始后的滚球赔率记录。判断方法：赔率行的时间 > 开球时间，或比分列出现非 0:0 的比分（如 1:0），均为滚球数据，必须忽略
- **初盘**（赛前最早一条记录）vs **即时盘**（赛前最新一条记录，即收盘赔率）的变化方向
- 盘口是否有升降（如从让平半升到让半球）
- 水位变化是否异常（如主队水位从低水升到高水）

## 浏览器操作标准流程

### 抓取赛程列表

```
1. agent-browser open https://jc.titan007.com/index.aspx
2. agent-browser wait --load networkidle
3. agent-browser eval '(() => {
     const rows = document.querySelectorAll("#table_live tr[id]");
     const results = [];
     for (const tr of rows) {
       const cells = Array.from(tr.cells).map(td => td.textContent.trim());
       let matchId = null;
       const btn = tr.querySelector("a[onclick*=\"analysis(\"]");
       if (btn) {
         const m = btn.getAttribute("onclick").match(/analysis\((\d+)\)/);
         if (m) matchId = m[1];
       }
       if (!matchId) {
         const bar = tr.querySelector("div[id^=\"bar_\"]");
         if (bar) { const m = bar.id.match(/bar_(\d+)/); if (m) matchId = m[1]; }
       }
       if (matchId) results.push({ id: tr.id, matchId, cells });
     }
     return results;
   })()'
   → 得到结构化赛程数据（matchId 从 onclick="analysis(ID)" 提取，每场一条）
```

如果 eval 执行失败或返回空数据，改用 snapshot 获取页面文本再解析。

### 抓取比赛分析详情

已知比赛 ID 后，直接拼接分析页 URL，无需从列表页点击跳转：

```
1. 拼接 URL: https://zq.titan007.com/analysis/{matchId}cn.htm
2. agent-browser tab new {分析页URL}  （在新标签页打开）
3. agent-browser wait --load networkidle
4. agent-browser snapshot
   → 提取：积分排名、近期战绩、对赛往绩、未来五场、赛前简报、本赛季数据统计比较、未来五场等
5. 如需获取欧赔/亚盘/大小球的即时数据，点击页面顶部「亚让」「进球数」「胜平负」标签
6. 完成后关闭标签页：agent-browser tab close
```

**提取比赛 ID 的方法**：

- 赛程列表页的「析」链接的 `href` 为 `javascript:`，**不含** matchId。必须从该行内 **`onclick="analysis(数字)"`** 提取数字，或从 **`div[id^="bar_"]`** 的 `id`（如 `bar_2958853`）提取数字，即 matchId。
- 分析页 URL 格式为 `https://zq.titan007.com/analysis/{matchId}cn.htm`，用上述 matchId 拼接即可。

### 抓取已完场比分（复盘用）

优先方案：直接打开推荐过的比赛分析页获取最终比分。

```
1. 从推荐记录中取出比赛 ID
2. agent-browser tab new https://zq.titan007.com/analysis/{matchId}cn.htm
3. agent-browser wait --load networkidle
4. agent-browser snapshot → 提取最终比分（页面顶部会显示完场比分）
5. 逐场获取，完成后关闭标签页：agent-browser tab close
```

备用方案（推荐记录中比赛 ID 丢失时）：回到赛程列表获取。

```
1. agent-browser open https://jc.titan007.com/index.aspx
2. agent-browser wait --load networkidle
3. 如果需要查看昨日赛程，切换日期选择器
4. agent-browser snapshot 或 eval 提取已完场比赛的比分
```

## 操作注意事项

1. **必须等待 JS 渲染**：每次 open/tab new 后都要 `agent-browser wait --load networkidle`，否则拿到空表格
2. **ref 不跨页面稳定**：每次页面变化后重新 snapshot 获取新的 ref
3. **优先用 eval**：直接执行 JS 提取 DOM 数据比解析 snapshot 文本更可靠
4. **控制请求频率**：不要短时间内大量请求，每次操作间隔 1-2 秒
5. **错误处理**：如果页面加载超时或数据为空，等待 3 秒后重试一次，仍然失败则跳过并记录
6. **标签页管理**：查看详情页时用新标签页，避免丢失主页状态

## Subagent 工具

### sessions_spawn — 启动后台 subagent

将耗时任务交给后台 subagent 执行，主会话立即返回，保持可用。

**参数**：

| 参数                | 必填 | 说明                                       |
| ------------------- | ---- | ------------------------------------------ |
| `task`              | 是   | 任务指令（subagent 收到的 prompt）         |
| `label`             | 否   | 标签，方便 `/subagents list` 识别          |
| `model`             | 否   | 指定 subagent 使用的模型（默认继承主会话） |
| `runTimeoutSeconds` | 否   | 超时秒数（默认 900 = 30 分钟）             |

**返回**：`{ status: "accepted", runId, childSessionKey }` — 非阻塞，立即返回。

**使用示例**：

```
# 赛程同步（单个 subagent）
sessions_spawn:
  task: "执行赛程同步。读取 skills/match-scraper/SKILL.md，抓取今日全量赛程，通过 messaging 推送赛程列表给龙王，写入 memory/{今天日期}.md。"
  label: "match-sync"

# 深度分析（编排 subagent 内部 spawn worker）
sessions_spawn:
  task: "深度分析 [英超] 阿森纳 vs 曼城（ID: 2950977）。读取 skills/deep-analysis/SKILL.md 执行完整 10 步分析。通过 messaging 推送分析报告给龙王。返回结构化综合评估结果（JSON 格式）。"
  label: "deep-analysis-2950977"
  runTimeoutSeconds: 900
```

**task 编写要点**：

- 必须包含要读取的 SKILL.md 路径（subagent 不自动知道 skill 位置）
- 必须说明输出方式（messaging 推送 + announce 返回结构化数据）
- 包含比赛的关键上下文（联赛、队名、ID），subagent 不继承主会话的上下文

### /subagents — 管理运行中的 subagent

| 命令                      | 用途                                       |
| ------------------------- | ------------------------------------------ |
| `/subagents list`         | 查看所有运行中和已完成的 subagent          |
| `/subagents info {runId}` | 查看某个 subagent 的状态、耗时、session ID |
| `/subagents log {runId}`  | 查看 subagent 的对话历史                   |
| `/subagents kill {runId}` | 终止某个 subagent（级联终止其子 subagent） |
| `/subagents kill all`     | 终止所有 subagent                          |

### Announce 机制

subagent 完成后自动向发起者（主会话或编排 subagent）推送结果：

- depth-2 worker 完成 → announce 到 depth-1 编排 subagent
- depth-1 编排 subagent 完成 → announce 到主会话
- announce 包含：状态、结果内容、token 用量、运行时间

编排 subagent 通过 announce 收集所有 worker 的分析结果后，统一执行推荐汇总和 memory 写入。

## 其他工具

### Memory 工具

- `memory_search`：搜索历史分析记录，在深度分析时召回类似比赛的历史判断
- `memory_get`：读取特定日期的分析日志

### 消息推送

- 使用 messaging 工具向龙王发送推荐和复盘报告
- 如果 messaging 不可用，将内容写入当日 memory 并告知龙王
