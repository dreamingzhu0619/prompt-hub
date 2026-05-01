# Prompt Hub 开发计划

## 项目概述

本地 Web 工具：管理 Prompt 模板、支持自由对话/手动选模板，可选搜索/知识库增强，支持手动模式和 Agent 模式切换，执行链路可追踪可调试。

## 技术栈

| 层 | 技术 | 负责 |
|---|---|---|
| 前端 | React 18 + Vite + TailwindCSS | Claude Code |
| 后端 | Express + better-sqlite3 | Codex |
| 通信 | REST API + SSE (Agent流式) | 前后端协作 |
| 数据库 | SQLite | Codex |
| 部署 | 本地运行 (npm run dev) | - |

## 项目结构

```
prompt-hub/
├── frontend/                    # React + Vite (Claude Code 负责)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Sidebar/        # 模板树 + 知识库列表
│   │   │   ├── FreeInput/      # 自由输入区
│   │   │   ├── TemplateEditor/ # 模板编辑/查看
│   │   │   ├── VariableForm/   # 变量填充表单
│   │   │   ├── ToolsPanel/     # 搜索/知识库增强面板
│   │   │   ├── ResultPanel/    # 生成结果展示
│   │   │   ├── AgentSteps/     # Agent链路步骤展示
│   │   │   ├── History/        # 历史面板
│   │   │   └── Settings/       # 模型选择、温度等
│   │   ├── hooks/              # 自定义 hooks (useSSE, useApi等)
│   │   ├── services/           # API 调用封装
│   │   └── styles/
│   └── public/
│
├── backend/                     # Express (Codex 负责)
│   ├── package.json
│   ├── server.js               # Express 入口
│   ├── config.js               # 配置加载
│   ├── .env.example            # 环境变量模板
│   ├── routes/
│   │   ├── prompts.js          # CRUD /api/prompts
│   │   ├── generate.js         # POST /api/generate (手动模式)
│   │   ├── chat.js             # POST /api/chat (自由输入→意图识别)
│   │   ├── agent.js            # POST /api/agent + SSE stream
│   │   ├── search.js           # POST /api/search
│   │   ├── knowledge.js        # CRUD /api/knowledge
│   │   ├── history.js          # GET /api/history
│   │   ├── logs.js             # GET /api/logs
│   │   └── models.js           # GET /api/models
│   ├── core/
│   │   ├── intent.js           # 意图识别模块
│   │   ├── agent.js            # ReAct 循环引擎
│   │   ├── llm/
│   │   │   ├── index.js        # Provider 工厂
│   │   │   └── openai-compat.js
│   │   ├── tools/
│   │   │   ├── index.js        # 工具注册表
│   │   │   ├── web-search.js   # Tavily 搜索
│   │   │   └── knowledge-search.js
│   │   └── knowledge/
│   │       └── index.js        # 知识库管理
│   ├── db/
│   │   ├── index.js            # SQLite 初始化
│   │   └── schema.sql          # 建表语句
│   └── data/
│       ├── prompts/            # 种子模板数据
│       └── knowledge/          # 知识库文件存放
│
├── DEVELOPMENT-PLAN.md          # 本文件
├── API-SPEC.md                  # API 接口规范（前后端契约）
└── .gitignore
```

---

## API 接口规范（前后端契约）

前后端分工的关键是**先定义好 API 接口**，两边各自开发，最后对接。

### 模板管理

```
GET    /api/prompts                    → 获取所有模板（含分类树）
GET    /api/prompts/:id                → 获取单个模板详情
POST   /api/prompts                    → 创建模板
PUT    /api/prompts/:id                → 更新模板（version自增）
DELETE /api/prompts/:id                → 删除模板
GET    /api/prompts/scenes             → 获取所有场景列表
```

### 生成

```
POST   /api/generate                   → 手动模式生成
  Body: { template_id, variables, model, temperature, search_results?, knowledge_results? }
  Response: { id, result, tokens, cost, duration_ms }

POST   /api/chat                       → 自由输入（意图识别）
  Body: { input, context? }
  Response: { type: 'ready'|'clarification', template?, prefilled_variables?, question? }

POST   /api/agent                      → Agent模式启动
  Body: { template_id, variables, model, tools }
  Response: { agent_id }

GET    /api/agent/:id/stream           → Agent执行SSE流
  Event types: 'step', 'result', 'error'
```

### 搜索/知识库

```
POST   /api/search                     → 执行网络搜索
  Body: { query }
  Response: { results: [{ title, url, content }] }

GET    /api/knowledge                  → 列出知识库文件
POST   /api/knowledge/upload           → 上传知识库文件
DELETE /api/knowledge/:filename        → 删除知识库文件
POST   /api/knowledge/search           → 检索知识库
  Body: { query }
  Response: { results: [{ file, score, preview }] }
```

### 历史/日志

```
GET    /api/history                    → 获取生成历史
  Query: { page, limit, template_id?, is_favorite? }
GET    /api/history/:id                → 获取单条历史详情（含执行链路）
PATCH  /api/history/:id                → 更新（收藏/备注/意图评估）
GET    /api/logs                       → 获取操作日志
  Query: { level?, category?, limit? }
```

### 配置

```
GET    /api/models                     → 获取可用模型列表
GET    /api/config                     → 获取前端需要的配置
```

---

## 开发分块（6 Blocks）

### Block 1: 基础框架 + 手动模式

**后端 (Codex):**
- [ ] Express 项目初始化 (package.json, server.js, config.js)
- [ ] SQLite 建库建表 (prompt_templates, generations, execution_steps, logs)
- [ ] 模板 CRUD API (/api/prompts)
- [ ] 种子模板数据（3-5个示例模板）
- [ ] LLM 统一调用层 (core/llm/)
- [ ] 手动生成 API (/api/generate)：接收模板+变量 → 拼接prompt → 调LLM → 存数据库 → 返回结果
- [ ] 模型列表 API (/api/models)
- [ ] .env.example 配置模板

**前端 (Claude Code):**
- [ ] Vite + React 项目初始化
- [ ] 主布局（左侧栏 + 主内容区）
- [ ] 模板树组件（两级分类：场景→任务→模板）
- [ ] 模板编辑/查看区（system_prompt + user_prompt 编辑）
- [ ] 变量填充表单（根据模板 variables 动态生成）
- [ ] 模型选择 + 温度设置
- [ ] 生成按钮 + 结果展示区
- [ ] API 调用层封装 (services/)

**验证标准:** 选模板 → 填变量 → 选模型 → 点生成 → 看到结果 → 数据库有记录

---

### Block 2: 搜索工具

**后端 (Codex):**
- [ ] Tavily 搜索集成 (core/tools/web-search.js)
- [ ] 搜索 API (/api/search)
- [ ] 搜索结果存入 generations 记录

**前端 (Claude Code):**
- [ ] 增强工具面板组件（搜索关键词输入 + 搜索按钮）
- [ ] 搜索结果列表（可勾选）
- [ ] 勾选的搜索结果作为 context 传入生成请求

**验证标准:** 点搜索 → 看结果 → 勾选 → 塞入生成 → 生成内容引用了搜索结果

---

### Block 3: 知识库

**后端 (Codex):**
- [ ] 知识库文件管理 (上传/列表/删除)
- [ ] 关键词检索 (core/knowledge/index.js)
- [ ] 知识库 API (/api/knowledge, /api/knowledge/search, /api/knowledge/upload)

**前端 (Claude Code):**
- [ ] 左侧栏知识库文件列表
- [ ] 文件上传组件
- [ ] 知识库检索（关键词输入 + 检索按钮）
- [ ] 检索结果可勾选注入

**验证标准:** 上传md → 检索 → 勾选 → 生成时引用了知识库内容

---

### Block 4: 意图识别

**后端 (Codex):**
- [ ] 意图识别模块 (core/intent.js)
- [ ] Chat API (/api/chat)：自由输入 → 意图识别 → 返回模板+变量+追问
- [ ] 意图结果存数据库

**前端 (Claude Code):**
- [ ] 自由输入框组件
- [ ] 意图识别结果展示（选了什么模板、置信度、推理过程）
- [ ] 追问交互（当需要补充信息时）
- [ ] 自动填充变量 → 跳转到手动模式流程
- [ ] 意图评估反馈按钮（正确/错误+备注）

**验证标准:** 输入"帮我改简历" → 识别出简历优化模板 → 追问JD → 自动填充 → 生成

---

### Block 5: Agent 模式

**后端 (Codex):**
- [ ] ReAct 循环引擎 (core/agent.js)
- [ ] Agent API (/api/agent) + SSE 流式推送 (/api/agent/:id/stream)
- [ ] 每步执行存 execution_steps 表
- [ ] 工具注册表 (web_search + knowledge_search)

**前端 (Claude Code):**
- [ ] 手动/Agent 模式切换开关
- [ ] Agent 步骤实时展示组件（SSE 接收 + 逐步渲染）
- [ ] 每步可展开查看详情（工具参数、返回结果）
- [ ] Agent 最终结果展示

**验证标准:** 切Agent模式 → 提交 → 看到LLM思考步骤 → 自动搜索 → 自动检索 → 最终生成

---

### Block 6: 润色完善

**后端 (Codex):**
- [ ] 历史记录 API (/api/history) + 分页
- [ ] 日志 API (/api/logs)
- [ ] 收藏/备注 PATCH API
- [ ] 费用统计汇总 API

**前端 (Claude Code):**
- [ ] 复制按钮（全部/纯文本）
- [ ] 历史面板（列表 + 详情）
- [ ] 执行链路详情弹窗
- [ ] 日志面板
- [ ] 费用统计展示
- [ ] 收藏功能
- [ ] UI 细节打磨

**验证标准:** 日常使用顺畅，所有功能闭环

---

## 开发流程约定

### 并行开发规则

1. **Block 内前后端可并行**：后端写 API，前端用 mock 数据先开发 UI
2. **Block 间串行**：Block N 完成后才开始 Block N+1
3. **每个 Block 完成后 git commit + push**

### 前端 Mock 策略

前端开发时，后端 API 未就绪前使用 mock：
- `frontend/src/services/mock/` 存放 mock 数据
- 通过环境变量 `VITE_USE_MOCK=true` 切换 mock/real API
- 后端就绪后切换为真实 API

### 前后端联调

- 前端 Vite dev server 通过 proxy 转发 `/api/*` 到 backend 的 3000 端口
- 后端 Express 监听 3000 端口
- 联调时两边同时启动：`cd frontend && npm run dev` + `cd backend && npm run dev`

### Git 分支策略

- main 分支：稳定版本
- 每个 Block 一个分支：`block-1/base-framework`, `block-2/search`, ...
- 前后端在同一分支上各自提交

---

## Claude Code 任务清单（前端）

### Block 1 具体任务

```
1. npm create vite@latest frontend -- --template react
2. 安装依赖: tailwindcss, axios, react-router-dom, lucide-react (图标)
3. 配置 TailwindCSS
4. 配置 vite.config.js proxy 到 localhost:3000
5. 实现主布局 App.jsx (左侧栏240px + 主区域)
6. 实现 Sidebar 组件（模板树，两级折叠）
7. 实现 TemplateEditor 组件（查看/编辑 system_prompt + user_prompt）
8. 实现 VariableForm 组件（动态表单）
9. 实现 Settings 区域（模型下拉 + 温度滑块）
10. 实现 ResultPanel 组件（Markdown 渲染）
11. 实现 API service 层 + Mock 数据
12. 串联完整流程：选模板→填变量→生成→展示结果
```

---

## Codex 任务清单（后端）

### Block 1 具体任务

```
1. npm init + 安装依赖 (express, cors, dotenv, better-sqlite3)
2. 创建 .env.example + config.js
3. 创建 db/schema.sql + db/index.js (建表 + 基础操作封装)
4. 种子模板数据（求职场景3个模板）
5. 实现 routes/prompts.js (CRUD)
6. 实现 core/llm/openai-compat.js (统一 LLM 客户端)
7. 实现 core/llm/index.js (Provider 工厂 + model 路由)
8. 实现 routes/generate.js (手动模式：拼接prompt + 调LLM + 存DB)
9. 实现 routes/models.js (返回可用模型列表)
10. server.js 串联所有路由
11. 基本错误处理 + 日志记录
```

---

## 启动命令

```bash
# 后端
cd prompt-hub/backend
cp .env.example .env  # 填入 API keys
npm install
npm run dev           # 监听 3000 端口

# 前端
cd prompt-hub/frontend
npm install
npm run dev           # 监听 5173 端口, proxy /api → 3000
```

---

## 关键设计决策

1. **前后端分目录**：各自独立 package.json，互不干扰
2. **React + Vite**：组件化开发，适合复杂交互
3. **TailwindCSS**：快速搭建 UI，不需要写 CSS 文件
4. **API 契约先行**：前后端按规范各自开发，减少联调成本
5. **Mock 策略**：前端不等后端，用 mock 先跑起来
6. **SQLite**：单文件数据库，无需安装，适合本地工具
