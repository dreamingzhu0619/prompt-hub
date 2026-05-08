# FreeInput 智能问答 Agent 改造方案

## 目标

将"自由输入"从简单的意图识别改造为完整的 Agent Q&A：
1. 用户提问
2. 展示 AI 思考过程（可折叠，类似 DeepSeek）
3. 展示工具调用步骤（搜索知识库、网络搜索等）
4. 给出 Markdown 格式最终答案
5. 用户可 👍👎 反馈 + 继续追问（多轮对话）

## 架构决策

- **新建独立 smart-agent 核心**，不修改现有 template-based agent（两者目标不同）
- **复用现有 SSE 基础设施**（useAgentSSE hook、事件格式）
- **LLM 层扩展** `generateChat()` 支持传入完整多轮 messages 数组
- **新建 DB 表**存储会话和消息（不动现有 intent_results）

## 分 4 个 Block 执行

---

### Block 7A: 数据库 + Smart Agent 核心

**新建/修改文件：**
- `backend/db/schema.sql` — 添加 `chat_sessions` + `chat_messages` 表
- `backend/db/index.js` — 迁移逻辑
- `backend/core/llm/index.js` — 新增 `generateChat({ model, temperature, messages })` 函数
- `backend/core/smart-agent.js` — **新建** ReAct 智能 Agent

**Smart Agent 设计要点：**
- 系统提示：不依赖模板，自主决定是否调用工具
- 输入：conversation messages + available tools
- 输出：thought (思考) + action (tool/final) + final_answer
- 最大迭代：5 次（复用 config.agent.maxIterations）
- 多轮支持：conversation history 作为 messages 数组传入

**DB Schema：**
```sql
chat_sessions (id TEXT PK, title, model, status, created_at, updated_at)
chat_messages (id INTEGER PK, session_id, role, content, thinking JSON, tool_calls JSON, tokens_used, duration_ms, feedback, feedback_note, created_at)
```

---

### Block 7B: 后端 API 路由

**新建文件：** `backend/routes/smart-chat.js`

| 端点 | 功能 |
|------|------|
| `POST /api/smart-chat/sessions` | 创建会话 |
| `GET /api/smart-chat/sessions` | 列出会话 |
| `GET /api/smart-chat/sessions/:id` | 获取会话+消息 |
| `POST /api/smart-chat/sessions/:id/messages` | 发送消息（触发 Agent） |
| `GET /api/smart-chat/agent/:id/stream` | SSE 流 |
| `PATCH /api/smart-chat/messages/:id/feedback` | 提交反馈 |

**修改文件：** `backend/server.js` — 注册新路由

**SSE 事件格式（与现有 agent 一致）：**
- `step` → `{ step_type: "reasoning", output: { thought } }`
- `step` → `{ step_type: "tool", step_name, output: { results } }`
- `result` → `{ result, tokens, duration_ms }`

---

### Block 7C: 前端 FreeInput 重写

**新建文件：**
- `frontend/src/hooks/useSmartChat.js` — 管理会话/消息/Agent 连接状态
- `frontend/src/components/FreeInput/ChatMessage.jsx` — 消息气泡
- `frontend/src/components/FreeInput/ThinkingBlock.jsx` — 可折叠思考过程
- `frontend/src/components/FreeInput/ToolStepBlock.jsx` — 工具执行展示
- `frontend/src/components/FreeInput/FeedbackButtons.jsx` — 反馈按钮

**重写文件：**
- `frontend/src/components/FreeInput/index.jsx` — 完整重写为 Agent Chat UI
- `frontend/src/hooks/useAgentSSE.js` — 添加可选 `streamUrlBuilder` 参数
- `frontend/src/services/api.js` — 添加 smart-chat API 方法
- `frontend/src/App.jsx` — 更新 FreeInput props

**UI 布局：**
```
┌─────────────────────────────────┐
│ [消息列表 - 可滚动]              │
│                                 │
│  用户消息气泡                    │
│                                 │
│  [▼ 思考过程 (3步)]  ← 可折叠   │
│  AI 最终答案 (Markdown)          │
│  👍 👎                          │
│                                 │
│  用户追问气泡                    │
│  ...                            │
├─────────────────────────────────┤
│ [输入框]                [发送]   │
└─────────────────────────────────┘
```

---

### Block 7D: 会话历史 + 完善

- 会话列表（新建对话 / 切换历史对话）
- 自动标题（取用户首条消息前 50 字符）
- 发送中禁用输入
- 超长对话截断（保留最近 20 条消息）
- 模型选择（per-session）

---

## 执行顺序

```
Block 7A → Block 7B → Block 7C → Block 7D
```

每个 Block 完成后 git commit + push。

## 验证方式

1. 启动 backend (`npm start`)，确认新表创建成功
2. 用 curl 测试 API：创建 session → 发送 message → 连接 SSE 看步骤
3. 启动 frontend (`npm run dev`)，在自由输入打字发送
4. 验证：能看到思考折叠块 → 工具步骤 → 最终答案 → 反馈按钮可点
5. 验证多轮：基于上一轮答案继续追问，上下文保持
