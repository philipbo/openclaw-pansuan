## TOOLS.md - 工具使用指南

Skills 定义了工具的工作方式。此文件记录当前仓库中可用的数据抓取工具与命令。

---

## 核心工具：sporttery-sniper

所有 titan007 数据抓取都通过仓库内脚本项目 `scripts/sporttery-sniper` 完成。正式工作流只使用该脚本。

### 运行环境

- Node.js 20 或更新版本
- 当前工作目录为仓库根目录
- 脚本目录：`scripts/sporttery-sniper`

若脚本目录不存在、命令失败、输出不是合法 JSON，当前流程应直接报告失败原因，不改用其它抓取方式。

### 赛程同步

同步当前销售日赛程：

```bash
cd scripts/sporttery-sniper
npm run schedule -- --format openclaw-json
```

同步指定销售日：

```bash
cd scripts/sporttery-sniper
npm run schedule -- --date 2026-06-11 --format openclaw-json
```

输出要求：

- JSON 顶层 `kind` 必须为 `openclaw.schedule`
- `matches` 必须为数组
- 每场至少读取 `no`、`matchId`、`league`、`leagueLevel`、`kickoffTime`、`status`、`homeTeam`、`awayTeam`、`analysisUrl`

### 单场深度分析数据抓取

按比赛 ID 抓取：

```bash
cd scripts/sporttery-sniper
npm run analyze -- 2990354 --history-window all --format openclaw-json
```

按 titan007 分析页 URL 抓取：

```bash
cd scripts/sporttery-sniper
npm run analyze -- https://zq.titan007.com/analysis/2990354cn.htm --history-window all --format openclaw-json
```

输出要求：

- JSON 顶层 `kind` 必须为 `openclaw.analysis`
- `match` 必须包含 `matchId`、`league`、`kickoffTime`、`homeTeam`、`awayTeam`、`analysisUrl`
- `context` 是给 agent 阅读和分析的 Markdown 上下文
- `detail` / `markets` 是结构化原始数据，供写 memory、推荐和复盘使用

### 数据范围

sporttery-sniper 会抓取并输出：

- 赛程：竞彩编号、比赛 ID、销售日、开球时间、赛事、状态、对阵、让球、竞彩胜平负指数
- 基本面：比赛信息、技术统计、联赛积分、对赛往绩
- 亚让和进球数：澳门、皇冠、易胜博、365bet、平博、188、香港马会
- 欧赔：威廉、Interwetten、立博、365bet、澳门、皇冠、易胜博、平博、188、香港马会
- 竞足数据：胜平负、让胜平负、总进球、比分/波胆
- Crown 全指数：波胆、入球数、总入球

### 数据安全规则

- **赔率必须实时抓取**：每次分析都重新运行 sporttery-sniper，不复用 memory 中旧赔率。
- **只用赛前赔率**：sporttery-sniper 会过滤状态为“滚”的记录，并按开赛时间截断赛前变化历史。
- **缺失不臆造**：如果某家公司或某类市场缺失，报告中必须标注数据缺口，并降低对应维度权重。
- **平博用途**：平博可用于 CLV 存档和复盘，不作为 deep-analysis 的推荐依据。

### 验证脚本

```bash
cd scripts/sporttery-sniper
npm test
```

测试不需要真实网络请求，主要验证解析器、JSON 输出和本地样例。

## Subagent 工具

### sessions_spawn — 启动后台 subagent

将耗时任务交给后台 subagent 执行，主会话立即返回，保持可用。

**参数**：

| 参数                | 必填 | 说明                                       |
| ------------------- | ---- | ------------------------------------------ |
| `task`              | 是   | 任务指令（subagent 收到的 prompt）         |
| `label`             | 否   | 标签，方便 `/subagents list` 识别          |
| `model`             | 否   | 指定 subagent 使用的模型（默认继承主会话） |
| `runTimeoutSeconds` | 否   | 超时秒数（默认 3600 = 60 分钟）            |

**返回**：`{ status: "accepted", runId, childSessionKey }` — 非阻塞，立即返回。

**使用示例**：

```
# 赛程同步（单个 subagent）
sessions_spawn:
  task: "执行赛程同步。读取 skills/match-scraper/SKILL.md。严格按照模板，使用 scripts/sporttery-sniper 抓取今日全量赛程，通过 messaging 推送赛程列表给龙王，写入 memory/{今天日期}.md。"
  label: "match-sync"

# 深度分析（编排 subagent 内部 spawn worker）
sessions_spawn:
  task: "深度分析 [英超] 阿森纳 vs 曼城（ID: 2950977）。读取 skills/deep-analysis/SKILL.md。严格按照模板，先使用 scripts/sporttery-sniper 抓取上下文，再完成全部 10 步分析；超 4000 字须分段。通过 messaging 推送分析报告给龙王。返回结构化综合评估结果（JSON 格式）。"
  label: "deep-analysis-2950977"
  runTimeoutSeconds: 900
```
