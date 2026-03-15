# Agent（pansuan）— OpenClaw 足彩分析师 Agent

Agent是一个运行在 OpenClaw 上的专业足彩分析师 AI Agent，能够自动抓取竞彩足球赛程、筛选高价值场次、深度分析、生成推荐，并在赛后自动复盘。

## 功能概览

| 功能     | 说明                                                                           | 触发方式          |
| -------- | ------------------------------------------------------------------------------ | ----------------- |
| 赛程抓取 | 从球探体育(titan007)抓取当日全量赛程                                           | 自动(Cron) / 手动 |
| 赛事初筛 | 6 阶段流程筛选出 3-8 场高价值比赛                                              | 自动(Cron) / 手动 |
| 深度分析 | 10 步分析法（基本面→伤停→欧指→亚盘→大小球→合理性→变动→矛盾→风险→泊松比分建模） | 自动(Cron) / 手动 |
| 推荐输出 | 逐场推送 → 精选 2-3 场 → 汇总（含串关建议）                                    | 自动(Cron) / 手动 |
| 赛后复盘 | 核对结果、计算命中率、分析失误、更新统计                                       | 自动(Cron) / 手动 |

## 安装步骤

### 1. 确保 OpenClaw 已安装且 pansuan agent 已创建

```bash
# 确认 OpenClaw 已安装
openclaw --version

# 确认 pansuan agent 存在
openclaw agents list
```

如果 pansuan agent 尚未创建，参考 OpenClaw 多 Agent 文档创建。

### 2. 复制 Workspace 文件

```bash
# 确定 pansuan 的 workspace 路径
PANSUAN_WS=~/.openclaw/agents/pansuan/workspace

# 复制核心文件
cp IDENTITY.md SOUL.md AGENTS.md USER.md TOOLS.md HEARTBEAT.md MEMORY.md "$PANSUAN_WS/"

# 复制 Skills
cp -r skills/ "$PANSUAN_WS/skills/"

# 复制工具脚本
cp -r scripts/ "$PANSUAN_WS/scripts/"

# 创建 memory 目录
mkdir -p "$PANSUAN_WS/memory/"
```

### 3. 合并配置

将 `openclaw-config-snippet.json5` 中的配置合并到 `~/.openclaw/openclaw.json`。

关键配置项：

- `browser.enabled: false` — 禁用内置浏览器（已迁移到 agent-browser CLI）
- `agents.pansuan.cron` — 定时任务（11:10 赛程同步，17:00 赛前分析，09:30 赛后复盘）
- `agents.pansuan.workspace` — workspace 路径

### 4. 安装 agent-browser

浏览器自动化使用 [agent-browser](https://github.com/vercel-labs/agent-browser) CLI：

```bash
# 安装 agent-browser
npm install -g agent-browser

# 下载 Chromium
agent-browser install

# 测试能否访问 titan007
agent-browser open https://jc.titan007.com/index.aspx
agent-browser wait --load networkidle
agent-browser screenshot
agent-browser close
```

### 5. 刷新 Skills

```bash
# 让 OpenClaw 发现新的 Skills
# 方法1: 在对话中告诉 agent "刷新 skills"
# 方法2: 重启 Gateway
openclaw gateway restart
```

### 6. 测试

```bash
# 手动触发一次赛前分析
openclaw agent --agent pansuan --message "执行今日赛前全流程"

# 手动触发一次复盘
openclaw agent --agent pansuan --message "复盘昨天的推荐"
```

## 使用方式

### 自动模式（推荐）

安装完成后，Agent会按 Cron 配置自动执行：

- **每天 11:10**：抓取当日赛程，推送赛程列表（仅展示，不分析）
- **每天 17:00**：全流程赛前分析（抓取 → 初筛 → 深度分析 → 精选推荐 + 串关）
- **每天 09:30**：获取赛果 → 复盘 → 更新统计（推送复盘报告）

### 手动模式

也可以随时通过消息和Agent交互：

**分步操作**（掌控模式）：

| 你说                                       | Agent做什么                            | 是否等你确认     |
| ------------------------------------------ | -------------------------------------- | ---------------- |
| 「同步赛程」「同步比赛」「今天有什么比赛」 | 重新抓取并展示赛程（每次刷新最新数据） | 展示后停下       |
| 「筛选比赛」「帮我筛一下」                 | 初筛，推送带编号的候选列表             | **等你确认**     |
| 「精选比赛」「精选3场」「精选1,3,5场」     | 对指定场次深度分析 + 推荐（一条龙）    | 全自动           |
| 「去掉第3场」「加上利物浦那场」            | 调整候选列表                           | **等你再次确认** |

**一步到位**（懒人模式）：

| 你说                                              | Agent做什么                            |
| ------------------------------------------------- | -------------------------------------- |
| 「给推荐」「今天买什么」                          | 全流程一条龙（不停顿）                 |
| 「分析 2950979」                                  | 用比赛 ID 直接深度分析 + 推荐          |
| 「分析这场 https://zq.titan007.com/analysis/...」 | 用 URL 直接深度分析 + 推荐             |
| 「昨天结果怎么样」「复盘」                        | 赛后复盘（赛果→命中率→失误分析）       |
| 「战绩怎么样」                                    | 展示累计统计                           |
| 「只看英超」「英冠也要看」                        | 调整联赛筛选范围                       |
| 「多推几场」「今天来 4 场」                       | 放宽精选数量                           |
| 「今天不分析了」「今天休息」                      | 写入跳过标记，当日不再自动触发赛前分析 |
| 「还是分析吧」「恢复分析」                        | 删除跳过标记，恢复自动触发             |

### 调整参数

直接告诉Agent即可：

- 「以后最多推 3 场」→ 调整 ELITE_DAILY（精选场次数）
- 「今天来 4 场」→ 临时扩展精选到 4 场
- 「英冠也要看」→ 调整联赛层级
- 「推送时间改到 16:00」→ 调整 Cron 配置

## 文件结构

```
workspace/
├── IDENTITY.md          # 身份：名字、角色、目标
├── SOUL.md              # 灵魂：性格、风格、原则、边界
├── AGENTS.md            # 操作手册：完整方法论和规则
├── USER.md              # 用户偏好
├── TOOLS.md             # 工具指南：titan007 浏览器操作
├── HEARTBEAT.md         # 定时检查清单
├── MEMORY.md            # 长期记忆：累计统计、策略结论
├── memory/              # 每日记忆
│   └── YYYY-MM-DD.md   # 每日分析日志
├── scripts/             # 工具脚本
│   └── verify_poisson.py # 泊松比分公式验证
└── skills/              # 技能
    ├── match-scraper/   # 赛程抓取
    ├── match-screening/ # 初筛
    ├── deep-analysis/   # 深度分析
    ├── recommendation/  # 推荐输出
    └── post-review/     # 赛后复盘
```

## 渠道支持

| 渠道     | 状态     | 说明                               |
| -------- | -------- | ---------------------------------- |
| Telegram | 原生支持 | OpenClaw 内置 Telegram channel     |
| 飞书     | 需适配   | 通过飞书机器人 Webhook + bash/curl |
| 企业微信 | 需适配   | 通过企业微信 Webhook + bash/curl   |

建议先用 Telegram 跑通全流程，再通过 Webhook 扩展到飞书/企业微信。

## 深度分析与浏览器限制（重要）

### 问题

当**多场深度分析并行**执行时（例如龙王同时说「分析 004」「分析 005」，或赛前全流程中多个 worker 同时跑），会出现**数据串号**：某场的 worker 抓到的赔率页面实际是另一场的，导致 matchId 不符、分析中断或结果错乱。

### 原因

`agent-browser` 是**共享单例**——所有 subagent 通过 Shell 调用时，操作的是**同一个**浏览器进程、**同一组** tab。多个 worker 的 `tab new` / `tab switch` / `snapshot` 会交叉执行，tab 编号互踩，某一 worker 的 snapshot 可能拿到的是其他 worker 刚打开的页面。

因此「每个 worker 有独立浏览器标签页、互不干扰」的假设**不成立**，并行多场深度分析存在数据串号风险。

### 当前策略

采用**一场场分析（串行）**：

- 每次只跑**一场**深度分析，该场完成后再进行下一场。
- 赛前全流程：初筛通过多场时，对每场**串行** spawn worker（等上一场 announce 后再 spawn 下一场），不并行。
- 手动多场（如「分析 002 和 005」）：同样串行，先分析完第一场再分析第二场。

这样同一时刻只有一个深度分析在使用浏览器，从根源上避免串号。未来若需要提速，可考虑「先集中抓取数据、再并行分析」的两阶段方案（待实施），详见 `docs/FLOW-AUDIT-2026-03.md`。

---

## 注意事项

- titan007 是 JS 动态渲染页面，必须使用 agent-browser CLI，不能用普通 HTTP
- 浏览器操作每步之间需等待页面渲染（`agent-browser wait --load networkidle`）
- 每日初筛最多 8 场（建议 3-5 场），精选 2-3 场核心推荐（最多 4 场）
- MEMORY.md 策略调优和关键教训不允许重复，主题相同时合并更新原条目
- 所有分析基于数据，不保证胜率，仅供参考
