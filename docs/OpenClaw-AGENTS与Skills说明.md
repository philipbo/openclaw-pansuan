# OpenClaw：AGENTS.md 与 Skills 说明

> 基于 [OpenClaw 官方文档](https://docs.openclaw.ai/) 整理，说明工作区 `AGENTS.md` 与 Skills 的作用、用法、区别及分工建议。

---

## 一、Workspace 里的 AGENTS.md

### 1. 是什么

`AGENTS.md` 是 **工作区（workspace）的「操作手册」**，位于 agent 的 home 目录（默认 `~/.openclaw/workspace/`）。它是 **bootstrap 文件之一**，每次会话启动时会被 **整份注入** 到系统上下文中，agent 默认就会看到。

- 官方定义：["Operating instructions for the agent and how it should use memory"](https://docs.openclaw.ai/concepts/agent-workspace.md)
- 模板：<https://docs.openclaw.ai/reference/templates/AGENTS.md>

### 2. 作用

- **会话启动流程**：规定 agent 必须先读 `MEMORY.md`、`memory/YYYY-MM-DD.md`、`USER.md`、`SOUL.md` 等再做事。
- **记忆与写作规范**：说明长期记忆（`MEMORY.md`）与每日记忆（`memory/YYYY-MM-DD.md`）的用途，以及「写下来而不是心里记着」的规则。
- **红线与安全**：如不擅自执行破坏性命令、不泄露私人数据、`trash` 优于 `rm` 等。
- **内外边界**：哪些可以自由做（工作区内、搜索、读文件），哪些要先问（发邮件、发推、离开本机）。
- **群聊/心跳等行为**：何时在群里说话、何时用表情反应、心跳时如何利用 `HEARTBEAT.md`、心跳 vs cron 的取舍等。
- **与 Skills 的关系**：说明「Skills 提供工具，需要时去看对应技能的 `SKILL.md`」，本地环境备注放在 `TOOLS.md`。

**总结**：AGENTS.md = **全局行为规范 + 工作流约定 + 记忆/安全/沟通策略**，面向的是「这个 agent 在这个 workspace 里该怎么运转」。

### 3. 使用方式

- **位置**：`<workspace>/AGENTS.md`（例如 `~/.openclaw/workspace/AGENTS.md`）。
- **编辑**：直接改这份 Markdown；OpenClaw 会在每次会话把当前内容注入。
- **与系统提示词的关系**：和 `SOUL.md`、`USER.md`、`TOOLS.md`、`HEARTBEAT.md` 等一起作为「Workspace bootstrap」注入，有长度限制（如单文件约 20000 字符、总约 150000 字符），超出的会被截断。
- **子 agent**：子会话通常只注入 `AGENTS.md` 和 `TOOLS.md`，其它 bootstrap 不注入，以节省上下文。

---

## 二、OpenClaw Skills

### 1. 是什么

Skills 是 **按「技能」组织的可插拔能力包**：每个 skill 是一个目录，里面至少有一个 `SKILL.md`（YAML frontmatter + 说明），可选脚本或资源。兼容 [AgentSkills](https://agentskills.io/) 规范，用来 **教 agent 在什么场景下、如何用哪些工具**。

- 文档：<https://docs.openclaw.ai/tools/skills.md>、<https://docs.openclaw.ai/tools/creating-skills.md>

### 2. 加载位置与优先级

Skills 从三个来源加载，**同名时**优先级为：

1. **Workspace skills**：`<workspace>/skills/`（最高）
2. **托管/本地 skills**：`~/.openclaw/skills`
3. **内置 skills**：随安装包一起的 bundled skills（最低）

还可通过 `skills.load.extraDirs` 增加目录（优先级最低）。多 agent 时，每个 agent 有自己的 workspace，因此 **每个 agent 的 `workspace/skills/` 仅对该 agent 生效**；共享能力可放在 `~/.openclaw/skills` 或 `extraDirs`。

### 3. 作用

- **按需教「怎么做」**：在 `SKILL.md` 里写清楚何时用、用哪个工具、步骤和注意点，agent 在需要时通过 `read` 读对应 `SKILL.md` 再执行。
- **可选门控**：用 frontmatter 的 `metadata.openclaw.requires` 声明依赖（如某二进制、某 env、某 config），不满足时该 skill 不会进入「可用列表」。
- **配置与密钥**：在 `~/.openclaw/openclaw.json` 的 `skills.entries.<skill名>` 里配置 `enabled`、`env`、`apiKey` 等，便于不同环境启用/禁用或注入密钥。
- **与系统提示词的关系**：有可用 skills 时，OpenClaw 只在系统提示词里注入一个 **紧凑的「技能列表」**（name、description、location），**不**把每个 `SKILL.md` 全文注入；agent 需要时再按 location 去读对应 `SKILL.md`，从而控制 token 消耗。

因此：**Skills = 分主题的「如何做某事」的说明书 + 可选工具/环境约束**，是「能力模块」，不是全局行为规范。

### 4. 使用方式

- **创建**：在 workspace 下建目录，如 `~/.openclaw/workspace/skills/hello-world/`，其中放 `SKILL.md`（至少包含 `name`、`description` 的 frontmatter 和说明正文）。
- **安装他人 skill**：例如用 ClawHub：`clawhub install <skill>`，默认会装到当前 workspace 的 `./skills`。
- **配置**：在 `~/.openclaw/openclaw.json` 的 `skills.entries` 里开关、配 env/apiKey 等；用 `skills.load.watch` 可在修改 `SKILL.md` 后自动刷新。
- **生效时机**：新会话或 skills 快照刷新后，新/改动的 skill 会出现在「可用技能列表」里，agent 按需读取对应 `SKILL.md`。

---

## 三、AGENTS.md 与 Skills 的区别

| 维度            | AGENTS.md                                      | Skills                                             |
| --------------- | ---------------------------------------------- | -------------------------------------------------- |
| **性质**        | 单文件，工作区级「总则」                       | 多目录，按技能拆分的「说明书」                     |
| **注入方式**    | 每次会话整份注入到系统提示词（bootstrap）      | 只注入技能名+描述+路径的列表；具体内容按需 `read`  |
| **控制范围**    | 全局：怎么启动、怎么记记忆、红线、群聊、心跳等 | 局部：某个技能何时用、用哪些工具、步骤与注意点     |
| **粒度**        | 一个 workspace 一份                            | 一个能力一个 skill，可多个                         |
| **优先级/覆盖** | 无「覆盖」概念，就是当前 workspace 的那一份    | 同名校验：workspace > ~/.openclaw/skills > bundled |
| **Token 成本**  | 整份常驻上下文，需控制篇幅                     | 仅列表常驻，正文按需加载，便于控制                 |

---

## 四、使用场景划分

### 适合放在 AGENTS.md 的（全局行为与规范）

- 会话启动时必须执行的步骤（读 MEMORY、memory、USER、SOUL 等）。
- 记忆体系约定：`MEMORY.md` 与 `memory/YYYY-MM-DD.md` 的用途，以及「写下来」的规则。
- 安全与红线：不删东西不确认、不泄露隐私、不擅自对外发消息等。
- 内外边界：什么可以自己做、什么要先问用户。
- 群聊/频道里的发言策略、表情反应、何时静默。
- 心跳与 cron 的用法、何时主动联系用户、何时保持安静。
- 对「工具从哪来」的总体说明：工具来自 Skills，需要时查各技能的 `SKILL.md`，本地备注在 `TOOLS.md`。
- 平台相关格式（如 WhatsApp 不用表头、Discord 链接用 `<>` 等），若你希望所有对话都遵守。

这些是 **所有对话、所有技能** 都该遵守的「怎么当这个 agent、怎么用工作区」的规则，因此放在 AGENTS.md。

### 适合做成 Skills 的（按主题的能力与流程）

- 完成某一类任务的具体步骤（例如：如何做赛程抓取、如何做初筛、如何做深度分析、如何复盘）。
- 依赖特定环境/二进制/API 的能力（浏览器、某 CLI、某 API key），用 skill 的 metadata 声明 `requires.bins`、`requires.env` 等。
- 希望可插拔、可复用的流程（例如从 ClawHub 安装/更新，或在不同 workspace 间共享一部分 skills）。
- 需要单独开关或配置的能力（在 `skills.entries` 里 `enabled`、`env`、`apiKey`）。
- 步骤较多、说明较长、不希望每次都占满上下文的「手册」（因为只有列表进 prompt，正文按需读）。

这些是 **按任务/按能力** 的「怎么做某件事」，所以用 Skills + `SKILL.md` 更合适。

---

## 五、二者如何分工（建议）

- **AGENTS.md**
  - 只写 **谁是这个 agent、怎么启动、怎么记记忆、红线、沟通策略、和 Skills/TOOLS 的关系**。
  - 保持 **短而稳**，避免把某一大类任务的详细步骤都塞进去；否则每次会话 token 成本高，且难以按技能单独更新或复用。

- **Skills**
  - 每个 skill 对应 **一类能力或一套流程**，在 `SKILL.md` 里写：
    - 何时用这个技能
    - 用哪些工具、按什么顺序、注意什么
    - 可选：依赖的 bins/env/config（frontmatter）
  - 需要时在 AGENTS.md 里用一两句话说明：「具体做某类事时，去读对应技能的 SKILL.md」。

- **TOOLS.md**
  - 文档建议：环境相关、本机相关的备注（相机名、SSH、语音偏好等）放在 `TOOLS.md`，AGENTS.md 里只提一句「本地工具与约定见 TOOLS.md」。

这样分工的效果是：

- **行为与边界**由 AGENTS.md 统一约束，稳定、可预测。
- **具体能力与流程**由 Skills 按需加载，易扩展、省 token、便于共享和配置。
- AGENTS.md 不随某个技能迭代而膨胀，Skills 可以独立增删改而不用动总则。

---

## 参考链接

- [OpenClaw 首页](https://docs.openclaw.ai/)
- [Agent Workspace](https://docs.openclaw.ai/concepts/agent-workspace.md)
- [AGENTS.md 模板](https://docs.openclaw.ai/reference/templates/AGENTS.md)
- [Skills（工具文档）](https://docs.openclaw.ai/tools/skills.md)
- [Creating Skills](https://docs.openclaw.ai/tools/creating-skills.md)
- [System Prompt](https://docs.openclaw.ai/concepts/system-prompt.md)
- [Skills Config](https://docs.openclaw.ai/tools/skills-config.md)
