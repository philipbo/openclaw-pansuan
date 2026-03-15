---
name: match-scraper
description: "从球探体育(titan007)抓取竞彩足球赛程数据。在用户说「抓取赛程」「获取今日比赛」「今天有什么比赛」或赛前分析流程启动时使用。"
metadata: { "openclaw": { "emoji": "🕷️" } }
---

# 赛程抓取（match-scraper）

从 `https://jc.titan007.com/index.aspx` 抓取当日竞彩足球全量赛程数据。

## 前提条件

- `agent-browser` CLI 已安装且可用（通过 Shell 调用）
- titan007 页面是 JS 动态渲染的，不能用普通 HTTP 请求
- **每次执行都必须实时抓取最新页面数据**，不得复用之前抓取的旧数据

## 销售窗口检查（定时任务触发时必须执行）

如果是 Cron 定时触发（非用户手动询问），先检查当前时间是否在竞彩销售窗口内：

- 周一至周五：11:00 ~ 22:00
- 周六、周日：11:00 ~ 23:00

**如果当前时间不在销售窗口内 → 直接终止，不抓取数据，不执行后续流程。** 向龙王发送一条简短通知：「当前不在竞彩销售时间内，跳过本次执行。」

用户手动询问（如"今天有什么比赛"）不受此限制，任何时间都可以查询。

## 执行步骤

### 步骤 1：打开赛程页面

```
agent-browser open https://jc.titan007.com/index.aspx
```

### 步骤 2：等待页面渲染

```
agent-browser wait --load networkidle
```

如果超时，再等 5 秒后重试一次。

### 步骤 3：展开全部赛事

页面默认隐藏部分场次。需要：

```
agent-browser snapshot -i
```

在 snapshot 结果中找到「显示全部」按钮（文字可能是"显示全部"或"ShowAllMatch"），点击它：

```
agent-browser click {显示全部按钮的ref}
```

然后等待新数据加载：

```
agent-browser wait 3000
```

### 步骤 4：提取赛程数据

优先使用 eval 直接执行 JS 提取表格数据，**重点提取比赛 ID**：

```
agent-browser eval '(() => {
  const rows = document.querySelectorAll("#scheTab tr[id]");
  if (!rows.length) {
    const allRows = document.querySelectorAll("table tr");
    return Array.from(allRows).slice(1).map(tr => ({
      cells: Array.from(tr.cells).map(td => td.textContent.trim())
    }));
  }
  return Array.from(rows).map(tr => {
    const cells = Array.from(tr.cells).map(td => td.textContent.trim());
    const links = Array.from(tr.querySelectorAll("a[href]")).map(a => ({
      text: a.textContent.trim(),
      href: a.href
    }));
    let matchId = null;
    const analysisLink = links.find(l => l.href && l.href.includes("analysis/"));
    if (analysisLink) {
      const m = analysisLink.href.match(/analysis\/(\d+)cn/);
      if (m) matchId = m[1];
    }
    return { id: tr.id, matchId, cells, links };
  });
})()'
```

如果 eval 返回空数据或报错，退化到 snapshot 模式：

```
agent-browser snapshot
```

然后从 snapshot 文本中手动解析赛程信息，并尝试从链接中提取比赛 ID。

### 步骤 5：结构化输出

先输出日期汇总头，再按编号升序逐场列出：

```
⚽ **{星期X} {YYYY-MM-DD}** 共{N}场比赛

| 编号    | 对阵               | 时间             | 联赛   |
| ------- | ------------------ | ---------------- | ------ |
| {编号}  | [{主队} VS {客队}](https://zq.titan007.com/analysis/{matchId}cn.htm) | {YYYY-MM-DD HH:MM} | {联赛} |
| ...     | ...                | ...              | ...    |
```

同时保存结构化数据供后续 skill 使用（每场一条）：

```
- 编号: {竞彩编号}
  比赛ID: {matchId}
  联赛: {联赛名称}
  联赛层级: {高/中/低/排除}
  时间: {开球时间}
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

1. 打开赛程页后，找到日期选择器/日期切换按钮
2. 切换到目标日期
3. 等待页面重新渲染后，按步骤 3-5 正常提取

## 异常处理

- 页面加载超时：等待 5 秒后重试，最多重试 2 次
- 表格为空：可能是页面结构变化，用 snapshot 检查页面当前状态并报告
- 部分数据缺失：正常记录已有数据，缺失字段标记为「无数据」
- **当日无比赛**：如果抓取结果为 0 场比赛：
  1. 告知龙王「今日无竞彩足球赛事」
  2. 在当日 memory 中追加写入 `## 推荐`，内容为「今日无竞彩赛事，无推荐」（确保 Heartbeat 和 post-review 的闭环一致性）
  3. 结束流程，不触发后续 skill

## 输出

将完整的结构化赛程列表返回，供后续 match-screening 使用。
