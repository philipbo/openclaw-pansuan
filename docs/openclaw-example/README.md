# OpenClaw 示例：AGENTS.md + Skills 结构模板

本目录是 **纯结构示例**，不涉及任何业务细节。用于参考：

- **AGENTS.md**：工作区级「总则」的提纲写法
- **skills/**：2～3 个示例 Skill 的目录与 `SKILL.md` 写法

## 目录结构

```
openclaw-example/
├── README.md           # 本说明
├── AGENTS.md           # 工作区操作手册提纲（模板）
└── skills/
    ├── daily-check/    # 示例技能 1：每日检查
    │   └── SKILL.md
    ├── data-fetch/     # 示例技能 2：数据抓取
    │   └── SKILL.md
    └── report-generate/ # 示例技能 3：报告生成
        └── SKILL.md
```

## 如何使用

1. **复制到真实 workspace**：将 `AGENTS.md` 拷到 `~/.openclaw/workspace/`，按需增删章节、填入你的规则。
2. **参考 Skills 结构**：新建 skill 时可按 `skills/*/SKILL.md` 的 frontmatter + 章节结构来写，保持「何时用 → 前提 → 步骤 → 输出」的节奏。
3. **不直接替换**：本示例仅作文档参考，不要用本目录替代现有 workspace；实际运行仍以 OpenClaw 配置的 workspace 路径为准。

## 相关文档

- [OpenClaw-AGENTS与Skills说明.md](../OpenClaw-AGENTS与Skills说明.md) — 概念、区别与分工
