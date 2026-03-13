# 盘算（pansuan）— OpenClaw 足彩分析师 Agent

盘算是一个运行在 OpenClaw 上的专业足彩分析师 AI Agent，能够自动抓取竞彩足球赛程、筛选高价值场次、深度分析、生成推荐，并在赛后自动复盘。

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

- `browser.enabled: true` — 启用浏览器
- `agents.pansuan.cron` — 定时任务（11:10 赛程同步，17:00 赛前分析，09:30 赛后复盘）
- `agents.pansuan.workspace` — workspace 路径

### 4. 确保浏览器可用

```bash
# 安装/检查 OpenClaw 管理的浏览器
openclaw browser status
openclaw browser start

# 测试浏览器能否访问 titan007
openclaw browser navigate https://jc.titan007.com/index.aspx
openclaw browser wait --load networkidle
openclaw browser screenshot
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

安装完成后，盘算会按 Cron 配置自动执行：

- **每天 11:10**：抓取当日赛程，推送赛程列表（仅展示，不分析）
- **每天 17:00**：全流程赛前分析（抓取 → 初筛 → 深度分析 → 精选推荐 + 串关）
- **每天 09:30**：获取赛果 → 复盘 → 更新统计（推送复盘报告）

### 手动模式

也可以随时通过消息和盘算交互：

**分步操作**（掌控模式）：

| 你说                                       | 盘算做什么                             | 是否等你确认     |
| ------------------------------------------ | -------------------------------------- | ---------------- |
| 「同步赛程」「同步比赛」「今天有什么比赛」 | 重新抓取并展示赛程（每次刷新最新数据） | 展示后停下       |
| 「筛选比赛」「帮我筛一下」                 | 初筛，推送带编号的候选列表             | **等你确认**     |
| 「精选比赛」「精选3场」「精选1,3,5场」     | 对指定场次深度分析 + 推荐（一条龙）    | 全自动           |
| 「去掉第3场」「加上利物浦那场」            | 调整候选列表                           | **等你再次确认** |

**一步到位**（懒人模式）：

| 你说                                              | 盘算做什么                    |
| ------------------------------------------------- | ----------------------------- |
| 「给推荐」「今天买什么」                          | 全流程一条龙（不停顿）        |
| 「分析 2950979」                                  | 用比赛 ID 直接深度分析 + 推荐 |
| 「分析这场 https://zq.titan007.com/analysis/...」 | 用 URL 直接深度分析 + 推荐    |
| 「昨天结果怎么样」                                | 复盘昨日推荐                  |
| 「战绩怎么样」                                    | 展示累计统计                  |
| 「只看英超」                                      | 调整筛选范围                  |
| 「多推几场」                                      | 放宽推荐数量                  |

### 调整参数

直接告诉盘算即可：

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

## 注意事项

- titan007 是 JS 动态渲染页面，必须使用 browser 工具，不能用普通 HTTP
- 浏览器操作每步之间需等待页面渲染（networkidle）
- 每日初筛最多 8 场（建议 3-5 场），精选 2-3 场核心推荐（最多 4 场）
- MEMORY.md 保持精简，不超过 200 行
- 所有分析基于数据，不保证胜率，仅供参考
