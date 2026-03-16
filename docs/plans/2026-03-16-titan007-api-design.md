## titan007 抓取 → 缓存层 → 内部 API 化设计方案

### 1. 目标与范围

- **目标**：
  - 把目前所有依赖浏览器（Playwright/agent-browser）直接操作 `titan007` 页面获取数据的流程，收敛到一个统一的「采集服务 + 缓存存储 + 内部 API」。
  - 让各个 `skills/*/SKILL.md` 不再描述「如何点网页」，而是描述「如何调用内部 API + 如何用 JSON 做分析」。
- **范围**：
  - 数据源：`https://jc.titan007.com/index.aspx` 及其相关分析 / 赔率 / 赛果页面。
  - 覆盖流程：赛程抓取、初筛、单场深度分析、推荐输出、赛后复盘。
  - 不在本次方案中解决：对外公开 API，仅服务本地 Agent/Skill 使用。

---

### 2. 整体架构

整体分为四层：

- **采集层（Crawler Worker）**
  - 技术栈：Node.js + Playwright（沿用现有经验）。
  - 职责：
    - 根据任务（「抓当日赛程」「抓某场比赛的赔率历史」「抓赛果」）打开对应的 `titan007` 页面。
    - 用 DOM 解析还原结构化数据（JSON），不做业务决策。
    - 将结果写入中间存储（数据库 + 缓存）。
  - 调用方式：
    - 由内部 API 层调度：仅在数据缺失或缓存过期时触发。

- **存储与缓存层（中间层）**
  - 推荐组合：PostgreSQL（主存储） + Redis（可选热点缓存）。
  - 作用：
    - PostgreSQL：存储结构化的赛程、联赛、球队、赔率时间序列、赛果。
    - Redis 或内存缓存：当日赛程、1 小时内活跃比赛的最新赔率快取。
  - 原则：
    - 所有业务逻辑（初筛、分析、复盘）只读这里，不直接碰网页。
    - 所有「网页操作」集中在采集 Worker 内部。

- **内部 API 层（API Gateway）**
  - 技术栈示例：Node.js（Express/Fastify）、Go（Gin）、Python（FastAPI）任选其一。
  - 对 Agent 暴露 REST API，例如：
    - `GET /matches/today`
    - `GET /matches/{matchId}`
    - `GET /matches/{matchId}/odds`
    - `GET /matches/{matchId}/result`
  - 行为：
    - 先查存储层。
    - 若无数据或已过期，则发采集任务给 Crawler Worker，等待完成后返回。

- **调用端（Agent / Skills）**
  - 所有 `skills/*/SKILL.md` 从「浏览器脚本」迁移为「HTTP API 调用 + JSON 处理」：
    - 赛程：调用 `GET /matches/today`。
    - 深度分析：调用 `GET /matches/{id}` + `GET /matches/{id}/odds`。
    - 复盘：调用 `GET /results/batch` + `GET /matches/{id}/odds?onlyPreMatch=true`。

---

### 3. 数据结构设计

#### 3.1 比赛基础信息 `matches`

用于承载每日赛程与对阵的基础字段，所有流程都以 `match_id`（内部 ID）为主键。

```text
matches (
  id                BIGSERIAL PK,     -- 内部 match_id
  external_id       VARCHAR,          -- titan007 自带的比赛ID
  jc_number         VARCHAR,          -- 今日竞彩编号（001、002…）
  date              DATE,
  kickoff_time      TIMESTAMP,
  league_id         INTEGER,
  home_team_id      INTEGER,
  away_team_id      INTEGER,
  status            VARCHAR,          -- scheduled / playing / finished
  created_at        TIMESTAMP,
  updated_at        TIMESTAMP
)
```

说明：

- 赛程抓取时，根据 `external_id`/`jc_number` 做 upsert。
- 初筛依赖 `jc_number` 映射（001、002…）到比赛。

#### 3.2 联赛与球队 `leagues` / `teams`

用于支持「联赛层级配置」「近期战绩」「联赛优先级」等逻辑。

```text
leagues (
  id          SERIAL PK,
  name        VARCHAR,
  country     VARCHAR,
  level       INTEGER,    -- 初筛中用到的联赛层级/优先级
  ...
)

teams (
  id          SERIAL PK,
  name        VARCHAR,
  league_id   INTEGER,
  ...
)
```

初期可以只使用最小字段（id/name/league_id），后续根据需要扩展球队 Elo、赛季数据等。

#### 3.3 赔率时间序列 `odds_snapshots`

这是泊松建模、盘口走势阅读的核心表，一行代表一个「时间点 + 一家公司 + 一条盘口」。

```text
odds_snapshots (
  id              BIGSERIAL PK,
  match_id        BIGINT,
  bookmaker       VARCHAR,      -- 平博、365 等
  market_type     VARCHAR,      -- "1x2", "ahc", "ou" 等
  line            NUMERIC,      -- 亚盘盘口 / 大小球大小；1x2 可为空
  home_odds       NUMERIC,      -- 胜 / 上盘 / 大
  draw_odds       NUMERIC,      -- 平（仅 1x2）
  away_odds       NUMERIC,      -- 负 / 下盘 / 小
  is_opening      BOOLEAN,      -- 是否开盘价
  is_closing      BOOLEAN,      -- 是否临盘价（比赛开始前的最后一条）
  collected_at    TIMESTAMP,    -- 抓取时间（同时可视为盘口变化时间）
  source_page     VARCHAR       -- 来源页面标识，便于 debug
)
```

使用方式：

- 过滤 `collected_at < kickoff_time` 获取纯赛前赔率。
- 按 `collected_at` 排序分析：
  - 盘口升降（line 变化）。
  - 赔率强弱拉扯（home_odds/draw_odds/away_odds 变化）。
  - 确定开盘价/临盘价。

#### 3.4 赛果 `results`

供赛后复盘、CLV、泊松质量评估使用。

```text
results (
  match_id        BIGINT PK,
  home_goals      INTEGER,
  away_goals      INTEGER,
  half_home_goals INTEGER,
  half_away_goals INTEGER,
  finished_at     TIMESTAMP,
  collected_at    TIMESTAMP
)
```

---

### 4. 内部 API 设计（草案）

#### 4.1 赛程相关

- `GET /matches/today`
  - 描述：返回当日全部竞彩赛程列表。
  - 参数：
    - `forceRefresh`（可选，bool）：`true` 时强制触发一次赛程抓取（采集 Worker），然后再返回最新数据。
  - 返回字段（示例）：
    - `matches: [ { id, external_id, jc_number, date, kickoff_time, league: { id, name, level }, home_team: { id, name }, away_team: { id, name }, status } ]`

- `GET /matches/{matchId}`
  - 描述：单场比赛的基础信息。
  - 返回字段：与 `matches` 表一致，必要时可附带联赛/球队简单统计（如积分/排名）。

#### 4.2 赔率相关

- `GET /matches/{matchId}/odds`
  - 描述：返回该场比赛的赔率时间序列。
  - 参数：
    - `market`：`1x2` / `ahc` / `ou` / `all`
    - `bookmaker`：公司名或 `all`
    - `history`：bool，是否返回全量历史；`false` 时仅返回最新一条。
    - `onlyPreMatch`：bool，仅返回 `collected_at < kickoff_time` 的记录。
  - 返回字段（示例）：
    - `snapshots: [ { bookmaker, market_type, line, home_odds, draw_odds, away_odds, is_opening, is_closing, collected_at } ]`

#### 4.3 赛果相关

- `GET /matches/{matchId}/result`
  - 描述：单场比赛赛果。

- `GET /results/batch?matchIds=1,2,3`
  - 描述：批量获取赛果，用于赛后复盘。
  - 返回字段：`results: [ { match_id, home_goals, away_goals, half_home_goals, half_away_goals, finished_at } ]`

---

### 5. 更新频率与缓存策略

核心原则：赛程低频，赔率中频（靠近开球时加密），赛果一次性。

#### 5.1 赛程

- 同步时机：
  - 每天 11:10（与现有「赛程同步」定时任务对齐）。
  - 龙王手动说「同步赛程」时。
- 策略：
  - 抓取到的每一场按 `external_id`/`jc_number` upsert 到 `matches`。
  - 当日内 `GET /matches/today` 默认只读 DB/缓存，不强制刷新。
  - 只有 `forceRefresh=true` 时，才重新触发赛程采集。

#### 5.2 赔率与盘口

按照距离开球时间分区间处理：

- 距开球 > 6 小时：
  - 不主动轮询，只在需要时 on-demand 抓取：
    - 第一次深度分析需要该场赔率；
    - 或赛程同步时顺便抓首批开盘价（可选）。

- 距开球 6 小时 ~ 1 小时：
  - 进入「观察区」：
    - 对已进入候选/精选池的比赛：
      - 每 10～15 分钟刷新一次关键公司的赔率（1x2 + 亚盘 + 大小球）。

- 距开球 1 小时 ~ 开球：
  - 高频区：
    - 候选/精选比赛：
      - 每 2～5 分钟刷新一次。
    - 深度分析时默认取「最近 10 分钟内」最新一次记录作为即时赔率。

- 开球后：
  - 常规刷新停止。
  - 如需在赛后复盘中使用「临盘价」，可在复盘任务开始时补拉一次赛前最后一条记录。

简化版本（可作为 MVP）：

- 所有赔率只在「有请求时」按需抓取：
  - 若 DB 中不存在该场的赛前赔率历史：
    - 调用采集 Worker 抓取全量历史 + 当前价。
  - 若已有数据且距离上次抓取 < N 分钟（例如 10 分钟）：
    - 直接返回缓存数据。

#### 5.3 赛果

- 抓取时机：
  - 每天 09:30（与现有「赛后复盘」定时任务对齐）。
  - 或龙王手动触发复盘时。
- 策略：
  - 取昨天所有有推荐记录的 match_id 作批量请求。
  - 采集 Worker 调用赛果页，写入 `results`。
  - 复盘流程通过内部 API 读取，不再访问网页。

---

### 6. 反爬与稳定性策略

#### 6.1 请求节奏（Rate Limiting）

- 站级 QPS：
  - 全局限制在 1～3 QPS。
  - 实现：简单 token bucket（每秒补 1～2 个 token，每个 HTTP 请求消耗 1 个）。
- 并发控制：
  - 同时处理的「比赛数」上限（例如每次最多 3 场并行抓赔率）。
  - 同一比赛内的多个赔率页面串行访问，页面间隔 1～2 秒。

#### 6.2 指纹与随机性

- User-Agent & headers：
  - 轮换几组常见浏览器 UA（Chrome/Edge 多个版本）。
  - 补全 Accept-Language / Accept-Encoding 等常用头。
- 时间随机化：
  - 轮询间隔使用 `base ± random` 策略，例如 `60 ± 10` 秒。
  - 大批量任务掺入小的随机 sleep，避免固定节奏。

#### 6.3 错误处理与封锁检测

- 自动重试：
  - 针对 5xx 或网络错误：
    - 指数退避重试 3 次（1s / 2s / 4s）。
- 封锁检测：
  - 若一段时间内 403/429 明显增多：
    - 暂停对该站的所有请求 10～30 分钟。
    - 对内部 API 返回「当前数据源受限，请稍后重试」，而不是无限重试。
- 缓存兜底：
  - 深度分析时若最新赔率抓取失败：
    - 退回使用最近一次成功抓取的记录。
    - 在分析报告中显式标注「本场赔率更新截止到 XX:XX」。

---

### 7. 对现有 `skills/*/SKILL.md` 的改造点

总体原则：把「浏览器操作步骤」改写为「API 调用步骤 + JSON 字段说明」，分析逻辑不变。

#### 7.1 `skills/match-scraper/SKILL.md`（赛程抓取）

- 现状：
  - 使用 agent-browser 打开 `https://jc.titan007.com/index.aspx`，等待 JS 渲染，解析表格 DOM。
- 改造：
  - 在 SKILL 中改为：
    - 调用内部 API：`GET /matches/today?forceRefresh=true`。
    - 解释返回 JSON 的结构（id、external_id、jc_number、kickoff_time、联赛、主客队名等）。
    - 按现有规范将赛程写入 `memory/YYYY-MM-DD.md` 的 `## 赛程抓取（HH:MM）` 段落。
  - 删除所有关于「滚动页面、点击、等待渲染」的说明。

#### 7.2 `skills/match-screening/SKILL.md`（初筛）

- 现状：
  - 读取当日赛程（来自赛程抓取记忆），可能还会再访问部分网页补充信息。
- 改造：
  - 明确：
    - 初筛的输入数据来源：
      - `memory` 中最近一段 `## 赛程抓取`；
      - 必要时调用 API（如 `GET /leagues/{id}` / `GET /teams/{id}/form?window=5`）获取联赛级别、近期战绩等。
  - 删除「再去网页查看」类操作，统一通过 API 获取。
  - 将联赛层级与过滤规则直接绑定到 `leagues.level` 等字段。

#### 7.3 `skills/deep-analysis/SKILL.md`（深度分析）

- 现状：
  - 步骤 1：在分析页查看基本面。
  - 步骤 1.5：在各赔率页面查看欧指、亚盘、大小球的开盘与走势。
  - 后续步骤：基于网页视觉信息做 10 步分析。
- 改造：
  - 在文档开头新增「数据获取」章节：
    - 调用：
      - `GET /matches/{id}`：获取比赛、联赛、主客队基础信息。
      - `GET /matches/{id}/stats`（若有）：获取近期战绩、进球统计等。
      - `GET /matches/{id}/odds?market=1x2&history=true&onlyPreMatch=true`
      - `GET /matches/{id}/odds?market=ahc&history=true&onlyPreMatch=true`
      - `GET /matches/{id}/odds?market=ou&history=true&onlyPreMatch=true`
    - 详细说明每个 JSON 字段对应的含义（开盘价、临盘价、时间戳、盘口线等）。
  - 10 步分析的叙述改为基于 JSON：
    - 例如：「从 `odds_snapshots` 数组中找到 `is_opening=true` 的记录，作为开盘价」。
    - 「按 `collected_at` 排序观察赔率和盘口的变化路径」。
  - 强化「只用赛前赔率」规则：
    - 在 SKILL 中明确要求对任一时间序列，先过滤出 `collected_at < kickoff_time` 的记录再分析。

#### 7.4 `skills/recommendation/SKILL.md`（推荐输出）

- 现状：
  - 主要基于深度分析结果的结构化摘要与文本结论做精选 + 串关。
- 改造：
  - 不再单独要求访问任意网页。
  - 若需要对赔率/盘口做最后确认，改为「使用深度分析 subagent 返回的结构化数据」而不是线上网页。

#### 7.5 `skills/post-review/SKILL.md`（赛后复盘）

- 现状：
  - 为每场推荐比赛访问赛果页和可能的赔率页面，手动比对推荐与结果。
- 改造：
  - 在文档开头新增 API 使用说明：
    - `GET /results/batch?matchIds=...`：批量获取赛果。
    - `GET /matches/{id}/odds?market=all&history=true&onlyPreMatch=true`：获取赛前赔率用于 CLV、泊松评估。
  - 所有 CLV、泊松质量、命中率统计基于 API 返回的结构化数据完成，不再依赖网页。

---

### 8. 后续落地步骤建议

1. **搭基础服务骨架**
   - 在仓库新增一个 `api/` 或 `services/` 目录，搭建最小 Node.js/Go/FastAPI 服务。
   - 定义 `GET /matches/today` / `GET /matches/{id}` / `GET /matches/{id}/odds` / `GET /results/batch` 的路由与伪实现。

2. **实现赛程抓取 MVP**
   - 先只接通：
     - Playwright 打开 `index.aspx` → 解析今日赛程 → 落到本地 SQLite/PostgreSQL。
     - `GET /matches/today` 从 DB 返回结果。
   - 同时把 `skills/match-scraper/SKILL.md` 改写为用 API。

3. **实现单场赔率抓取 + 落库**
   - 为某场比赛实现：
     - 抓欧指/亚盘/大小球历史 → 写入 `odds_snapshots`。
     - `GET /matches/{id}/odds` 返回对应时间序列。
   - 对 `skills/deep-analysis/SKILL.md` 做第一轮改造，只做「用 API 填充数据」，不改分析逻辑。

4. **接通复盘链路**
   - 实现赛果抓取 + `GET /results/batch`。
   - 改写 `skills/post-review/SKILL.md` 使其仅依赖内部 API。

5. **再根据实际使用情况，细化反爬策略与缓存策略**
   - 结合请求量、封锁情况，调整 QPS、重试、随机化等参数。
   - 根据存储占用与分析需要，决定保留多久的赔率历史（例如最近 30 天/90 天）。

此文档作为第一版 API 化方案的设计基线，后续在实际落地过程中可按需要继续细化字段、接口与调度策略。
