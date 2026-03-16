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

### 步骤 3：提取赛程数据

竞彩页面（`jc.titan007.com`）默认已显示全部赛事，无需点击「显示全部」。直接提取。

优先使用 eval 直接执行 JS 提取表格数据，**重点提取比赛 ID**：

**⚠️ matchId 在 onclick 里，不在 href 里**。页面的「析」链接格式为 `<a href="javascript:" onclick="analysis(2958853);">析</a>`，必须从 `onclick` 属性提取 matchId，而非 `href`。

**⚠️ rowspan=2**：每场比赛占两行 `<tr>`，matchId 所在的「数据」`<td>` 有 `rowspan="2"`，仅挂在第一行。脚本只提取含 `analysis()` onclick 的行，自动跳过第二行，避免重复。

```
agent-browser eval '(() => {
  const rows = document.querySelectorAll("#table_live tr[id]");
  if (!rows.length) return [];
  const results = [];
  for (const tr of rows) {
    const cells = Array.from(tr.cells).map(td => td.textContent.trim());
    let matchId = null;
    const analysisBtn = tr.querySelector("a[onclick*=\"analysis(\"]");
    if (analysisBtn) {
      const m = analysisBtn.getAttribute("onclick").match(/analysis\((\d+)\)/);
      if (m) matchId = m[1];
    }
    if (!matchId) {
      const barDiv = tr.querySelector("div[id^=\"bar_\"]");
      if (barDiv) {
        const m = barDiv.id.match(/bar_(\d+)/);
        if (m) matchId = m[1];
      }
    }
    if (matchId) {
      results.push({ id: tr.id, matchId, cells });
    }
  }
  return results;
})()'
```

**提取逻辑**（按优先级）：

1. 找 `a[onclick*="analysis("]`，从 `onclick="analysis(2958853)"` 提取数字 → matchId
2. 若无，找 `div[id^="bar_"]`，从 `id="bar_2958853"` 提取数字 → matchId
3. 两者都找不到的行跳过（通常是 rowspan 的第二行，无 matchId 数据单元格）

如果 eval 返回空数据或报错，退化到 snapshot 模式：

```
agent-browser snapshot
```

从 snapshot 文本中查找 `analysis(数字)` 模式提取比赛 ID，配合行文本解析队名和时间。

### 步骤 4：过滤销售日期（关键！）

**目的**：只保留销售日期为今天的比赛，防止跨天比赛混入。

**竞彩销售窗口规则**：
- 销售日期不是自然日，而是 **今天 11:00 到 明天 11:00**
- 例如：周一销售窗口 = 周一 11:00 到 周二 11:00
- 页面显示的竞彩编号前缀（周一/周二）即代表销售日期

**过滤规则**：
1. 获取当前日期对应的 **星期前缀**（周一、周二、...、周日）
2. 对每场比赛，从竞彩编号提取星期前缀
3. **只保留星期前缀 = 今天星期前缀** 的比赛

**实现方式**（在 eval 后添加过滤逻辑）：

```javascript
// 计算今天是星期几（1=周一，7=周日）
const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const todayWeekday = weekdays[new Date().getDay()];

// 从 results 中提取竞彩编号（通常是第 1 列，格式 "周一 001" 或 "001"）
const filteredResults = results.filter(r => {
  const numCell = r.cells[0] || '';  // 场号列，如 "周一 001"
  // 检查编号是否包含今天的前缀
  if (numCell.includes(todayWeekday)) return true;
  // 如果没有前缀（仅数字），默认保留（可能是当天比赛）
  if (/^\d+$/.test(numCell.trim())) return true;
  return false;
});
```

**备选方案**（如果编号列无前缀）：
- 使用开球时间判断：保留开球时间在 **今天 11:00 到 明天 11:00** 之间的比赛

**过滤后处理**：
- 如果过滤后场次 = 0 → 按「当日无比赛」流程处理
- 如果过滤后场次 < 原始场次 → 在输出中说明「过滤掉 N 场非今日销售比赛」

---

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

### 步骤 7：写入每日记忆

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
3. 等待页面重新渲染后，按步骤 3-6 正常提取（**步骤 4 过滤逻辑仍会执行，但基于目标日期判断**）

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
