# agentOS · 本地模式

面向工程团队的 **Agentic OS 控制台**（纯前端）——Issue 驱动、Skill 编排、Draft PR 人工 Gate、审计与价值度量。

> 默认 **无需后端**。任务、日志、Gate、预算、指标均在浏览器内模拟并持久化（`localStorage`）。

## 一键启动

```bash
cd agentos
npm install
npm run dev
```

打开 **http://localhost:3000**

## 三页功能

| 页面 | 能力 |
|------|------|
| **任务** | Issue 意图（标题+详情）→ 执行 → Draft PR 预览 → **Human Gate**（通过 / 要求修改 / 打回重做）→ 审计轨迹 |
| **智能体** | Prompt · Skill 挂载 · Tool 白名单 · **月度 Token 预算**（80% 预警 / 100% 硬停）· 复制/删除 |
| **架构** | 智造基地 9 步对照 · 六层架构 · 工厂闭环 · 路线图 · **实时指标**（打回率 / 修改率 / Issue→PR） |

## 推荐体验路径

1. **任务** → 新建任务（填 Issue 详情）→ 等待 Draft PR
2. 按 **Issue → 摘要 → PR → Gate** 顺序验收；试「要求修改」看 PR 摘要是否带上你的说明
3. **智能体** → 调整 Prompt / Skill / 月度预算
4. **架构** → 查看智造基地对照与平台指标

## 核心能力

- **Human Gate** — Draft PR 必须人工验收，不可自动完成
- **Skill 最小授权** — 挂载内置 Skill，Tool 自动推导
- **审计轨迹** — Gate 与状态变更不可变记录
- **成本流控** — 按智能体月度 Token 预算（Paperclip 式）
- **价值度量** — 成功率、打回率、修改率、Issue→PR 转化率

## 可选：联调真实 API

```bash
npm run dev:full
# 或
VITE_FRONTEND_DEMO=false npm run dev -w @agentos/web
```

## 构建与部署

```bash
npm run build -w @agentos/web
npm run preview -w @agentos/web
```

部署 `apps/web/dist/` 到 Vercel / Netlify / GitHub Pages 等静态托管。

## 项目结构

```
agentos/apps/web/src/
├── App.tsx                 # 任务页
├── AgentEditor.tsx         # 智能体页
├── SkillsCatalog.tsx       # Skill 目录
├── ApprovalGate.tsx        # Human Gate
├── PlatformOverview.tsx    # 三页/能力概览
├── platformFeatures.ts     # 功能定义（各页共用）
├── architecture/           # 架构页
└── demo/store.ts           # 本地状态机 + 持久化
```

后端 `apps/api/` 已实现骨架，本地模式不依赖；P1 需要时再启用。

## 文档

见 [`../docs/`](../docs/)
