# sporttery-sniper

手动运行的 titan007 足球赔率分析数据提取工具。

## 部署

这是一个独立 Node.js 项目，不依赖 OpenClaw 工作区，也不依赖浏览器自动化。

复制到其他电脑后：

```bash
cd sporttery-sniper
npm install
npm test
```

运行环境要求：

- Node.js 20 或更新版本
- 可访问 titan007 相关数据源

## 使用方式

同步当前竞足开售赛程：

```bash
npm run schedule
```

默认同步今天的销售日，也可以指定销售日：

```bash
npm run schedule -- 2026-06-11
npm run schedule -- --date 2026-06-11
```

该命令会抓取 `https://jc.titan007.com/xml/bf_jc.txt` 和 `https://jc.titan007.com/xml/odds_jc.txt`，输出指定销售日开售池中的比赛 ID、竞彩编号、开球时间、赛事、对阵、让球和即时胜平负指数。开售池按竞足销售窗口组织，可能包含当天、次日或后续已开售比赛。

给 OpenClaw agent 使用时，输出结构化 JSON：

```bash
npm run schedule -- --format openclaw-json
npm run schedule -- --date 2026-06-11 --format openclaw-json
```

在 Codex app 的集成终端中运行：

```bash
npm run analyze -- 2990354
```

也可以输入数据分析页链接：

```bash
npm run analyze -- https://zq.titan007.com/analysis/2990354cn.htm
```

给 OpenClaw agent 使用时，输出结构化 JSON：

```bash
npm run analyze -- 2990354 --format openclaw-json
npm run analyze -- 2990354 --history-window 15 --format openclaw-json
```

可用 `--history-window`（或 `-w`）控制变化历史输出范围：

```bash
npm run analyze -- 2990354 --history-window 15
npm run analyze -- 2990354 -w all
```

可选值：`all`（默认），或任意正整数小时数（如 `3`、`15`）。按小时截取时，会额外保留最早一条初盘参考。

工具会从 live 详情页抓取比赛信息和技术统计，从 analysis 分析页抓取联赛积分排名、对赛往绩、各公司盘口与变化历史、欧赔、竞足和 Crown 全指数，并输出一段可直接交给 Codex 分析的 Markdown 上下文。当前版本不需要 OpenAI API Key，完整报告由 Codex 当前线程基于输出内容生成。

`--format openclaw-json` 会额外输出：

- `kind: openclaw.schedule`：赛程同步结构化数据
- `kind: openclaw.analysis`：单场分析结构化数据
- `context`：保留可直接交给 Codex 分析的 Markdown 上下文
- `detail` / `markets`：保留比赛基本面、赔率、竞足和 Crown 全指数等结构化原始数据

输出上下文开头包含 `# 角色设定`（分析师角色、分析原则与诱盘识别要求），以及 `## 分析指引`，约定各盘口的公司权重与分析顺序：

- **亚盘 / 大小球**：以皇冠为锚定盘口，易胜博、平博检验 sharp 盘是否同向跟随；澳门、365bet、188 观察跟随或背离；香港马会单独标注本地偏差。
- **胜平负（欧赔）**：非亚洲赛事主看威廉、365bet、立博；亚洲赛事在此基础上提高澳门、皇冠权重；Interwetten、易胜博、平博、188 作辅助验证；香港马会作本地参考。

## 抓取范围

- 亚让和进球数：澳门、皇冠、易胜博、365bet、平博、188、香港马会。
- 欧赔：威廉、Interwetten、立博、365bet、澳门、皇冠、易胜博、平博、188、香港马会。
- 欧赔数据源使用 `https://1x2d.titan007.com/<比赛ID>.js`，不是直接解析欧赔公司列表 HTML。
- 竞足数据：胜平负、让胜平负、总进球、比分/波胆。
- Crown 全指数：只抓取波胆、入球数、总入球三项。

如果某一家公司的历史页临时返回异常，工具会在报告中标出该公司未抓取到，其他公司数据继续输出。

## 数据注意事项

- 抓取请求最多允许 2 个并发，并在连续请求启动之间随机等待 0.4 到 1.0 秒，模拟人工查看节奏，降低被限流风险。
- 亚让、进球数和欧赔变化历史会按开赛时间截断，并过滤状态为“滚”的记录，避免把比赛开始后的滚球数据混入赛前分析。
- 变化历史默认输出开赛前全部记录；可通过 `--history-window` 改为开赛前 N 小时（N 为任意正整数；按小时截取时会额外保留最早初盘）。
- 如果比赛已开始，公司列表中的“即时”值会优先改用该公司开赛前最后一条变化记录；没有赛前历史的公司会清空即时值，避免混入滚球。
- 如果部分公司历史页缺失，报告会保留缺口提示。缺失历史会削弱对“市场共识”和“盘口连续性”的判断，分析时应降低相关结论权重。

## 验证

```bash
npm test
```
