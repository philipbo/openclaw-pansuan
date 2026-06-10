---
name: match-scraper
description: "从球探体育(titan007)抓取竞彩足球赛程数据。在用户说「抓取赛程」「获取今日比赛」「今天有什么比赛」或赛前分析流程启动时使用。"
metadata: { "openclaw": { "emoji": "📆" } }
---

# 赛程抓取（match-scraper）

通过仓库内 `scripts/sporttery-sniper` 脚本抓取当日竞彩足球全量赛程数据。

## 前提条件

- `sporttery-sniper` 位于当前仓库的 `scripts/sporttery-sniper` 目录。
- `sporttery-sniper` 使用 titan007 的 XML/文本数据源。
- 脚本失败时直接报告失败原因，不改用其它抓取方式。
- **每次执行都必须实时运行脚本抓取最新数据**，不得复用之前抓取的旧数据。

## 销售窗口检查（定时任务触发时必须执行）

如果是 Cron 定时触发（非用户手动询问），先检查当前时间是否在竞彩销售窗口内（时间边界以 **AGENTS.md 六、可配置参数** 为准：`SCHEDULE_PUBLISH_TIME` ～ `SALES_CUTOFF_WEEKDAY` / `SALES_CUTOFF_WEEKEND`）：

- 周一至周五：11:00 ~ 22:00（默认）
- 周六、周日：11:00 ~ 23:00（默认）

**如果当前时间不在销售窗口内 → 直接终止，不抓取数据，不执行后续流程。** 向龙王发送一条简短通知：「当前不在竞彩销售时间内，跳过本次执行。」

用户手动询问（如"今天有什么比赛"）不受此限制，任何时间都可以查询。

## 执行步骤

### 步骤 1：检查脚本目录

确认 `scripts/sporttery-sniper/package.json` 存在。若不存在，直接报告「scripts/sporttery-sniper 不存在，无法同步赛程」，结束流程，不写 memory。

### 步骤 2：运行脚本同步赛程

销售日期使用当前自然日（`YYYY-MM-DD`）。手动查询非当天赛程时，将目标日期传给 `--date`。

```bash
cd scripts/sporttery-sniper
npm run schedule -- --date {YYYY-MM-DD} --format openclaw-json
```

脚本输出必须是 JSON，且 `kind` 必须为 `openclaw.schedule`。若脚本失败、JSON 无法解析、`kind` 不匹配，或 `matches` 字段缺失，直接报告失败原因，结束流程，不写 memory。

### 步骤 3：解析脚本输出

从 `openclaw.schedule` JSON 中读取：

| JSON 字段 | 写入 memory 字段 |
| --- | --- |
| `matches[].no` | 编号 |
| `matches[].matchId` | 比赛ID |
| `matches[].league` | 联赛 |
| `matches[].leagueLevel` | 联赛层级 |
| `matches[].kickoffTime` | 开球 |
| `matches[].status` | 状态 |
| `matches[].homeTeam` | 主队 |
| `matches[].score` | 比分 |
| `matches[].awayTeam` | 客队 |
| `matches[].analysisUrl` | 分析页 |

同时读取 `summary.total/notStarted/inProgress/finished` 作为汇总计数。若脚本输出中某些字段为空，用「无数据」或 `-` 标记，不要臆造。

### 步骤 4：格式化输出并写入 memory

按「结构化输出」和「写入每日记忆」章节格式生成赛程摘要，追加写入 `memory/{今天日期}.md`。

脚本输出中已按销售日过滤；若命令指定 `--date`，以该日期作为销售日。若 `matches.length = 0`，执行「当日无比赛」流程。

### 步骤 5：结构化输出

先输出日期汇总头，再按编号升序逐场列出：

```
⚽ **{星期X} {YYYY-MM-DD}** 共{N}场比赛

| 编号    | 对阵               | 开球             | 联赛   |
| ------- | ------------------ | ---------------- | ------ |
| {编号}  | [{主队} VS {客队}](https://zq.titan007.com/analysis/{matchId}cn.htm) | {开球 YYYY-MM-DD HH:MM} | {联赛} |
| ...     | ...                | ...              | ...    |
```

同时保存结构化数据供后续 skill 使用（每场一条）：

```
- 编号: {竞彩编号}
  比赛ID: {matchId}
  联赛: {联赛名称}
  联赛层级: {高/中/低/排除}
  开球: {YYYY-MM-DD HH:mm}
  状态: {未开场/进行中/已完场}
  主队: {主队名}
  比分: {比分或 - }
  客队: {客队名}
  分析页: https://zq.titan007.com/analysis/{matchId}cn.htm
```

**联赛层级预分类规则**（供 match-screening 阶段1 直接使用）：

- **高**：英超、西甲、德甲、意甲、法甲、欧冠、欧联杯、欧协联
- **中**：英冠、西乙、德乙、意乙、法乙、葡超、荷甲、比甲、土超、巴甲、阿甲、中超、日职联、韩K联、美职联、澳超
- **低**：北欧（瑞典超、挪超、丹超、芬超）、东欧（波兰甲、捷甲、罗甲）及其他未列出联赛
- **排除**：赛事名称含「友谊」「热身」「邀请」，或 U21/U23 青年赛事

**比赛 ID 是后续深度分析的关键**，用于直接拼接分析页 URL，无需再从列表页点击跳转。

### 步骤 6：写入每日记忆

**首次运行检查**：写入前确认 `memory/` 目录存在。如果不存在，先创建该目录。

将赛程摘要**追加**写入 `memory/{今天日期}.md`（不覆盖已有赛程 section，同一天可保留多段）。

**Section 标题**：使用 `## 赛程抓取（{执行时间 HH:MM}）`，例如 `## 赛程抓取（11:10）`、`## 赛程抓取（14:25）`。每次赛程同步在文件末尾追加上述 section。初筛、分析编号、编排流程以**当日 memory 中最后一个以 `## 赛程抓取` 开头的 section** 作为当前赛程列表。

格式：

```
## 赛程抓取（11:10）

⚽ {星期X} {YYYY-MM-DD} 共{N}场比赛

抓取时间：{当前时间}
- 未开场：{N} 场
- 进行中：{N} 场
- 已完场：{N} 场

### 赛程列表
{按编号升序的赛程数据}
```

## 查看其他日期赛程

如果需要查看非当天的赛程（如龙王说「看看昨天的比赛」，或复盘需要查历史赛程）：

1. 运行脚本：`cd scripts/sporttery-sniper && npm run schedule -- --date {目标日期} --format openclaw-json`
2. 解析 `openclaw.schedule` JSON 并按步骤 3～4 输出。

## 异常处理

- 脚本目录不存在：报告 `scripts/sporttery-sniper` 不存在，结束流程。
- 脚本执行失败：记录错误信息，重试 1 次；仍失败则结束流程，不写 memory。
- JSON 解析失败或 `kind` 不匹配：记录原始错误，结束流程，不写 memory。
- 部分数据缺失：正常记录已有数据，缺失字段标记为「无数据」。
- **当日无比赛**：如果抓取结果为 0 场比赛：
  1. 告知龙王「今日无竞彩足球赛事」
  2. 执行 recommendation（输入 0 场），按其标准结构写入当日 `## 推荐`（内容为「今日无竞彩赛事，无推荐」，但必须包含 ### 精选场次/候补场次/串关组合 这些块，表可为空），确保 post-review 解析一致
  3. 结束流程，不触发后续 skill

## 输出

将完整的结构化赛程列表返回，供后续 match-screening 使用。
