# SSE 基础设施概念 Q&A

## Q1: SSE 基础设施是什么？

文档中提到的"复用现有 SSE 基础设施"指的是项目中已经存在的 Server-Sent Events (SSE) 实时流式通信机制，具体包括：

**前端部分：**
- `useAgentSSE` hook — 一个自定义 React hook，负责建立到后端的 SSE 连接，监听事件流，解析事件数据并更新组件状态

**后端部分：**
- 已有的 SSE 事件推送格式，包含以下事件类型：
  - `step` 事件 — 推送中间步骤（如 `{ step_type: "reasoning", output: { thought } }` 或 `{ step_type: "tool", step_name, output: { results } }`）
  - `result` 事件 — 推送最终结果（`{ result, tokens, duration_ms }`）

**它解决什么问题：**

SSE 允许服务器主动向客户端推送数据（单向流），这样 Agent 在后端执行多步推理时，前端可以实时看到每一步的进展（思考过程、工具调用、最终答案），而不用等 Agent 全部执行完再一次性返回。

**与 Block 7 的关系：**

Block 7 的 Smart Chat 不需要重新实现这套流式通信，只需复用已有的 `useAgentSSE` hook（加一个 `streamUrlBuilder` 参数让它支持新的 URL 路径 `/api/smart-chat/agent/:id/stream`），后端发出的事件格式也保持一致。

简单来说：SSE 基础设施 = 已经写好的"后端推流 + 前端接流 + 事件解析"这整套管道。

---

## Q2: 什么叫实时流、组件状态、事件、事件数据？

### 实时流

普通 HTTP 请求是"一问一答"：前端发请求 → 后端处理完 → 一次性返回全部结果。

**SSE 实时流**是：前端发请求 → 后端**持续不断地**往前端推数据，像水管流水一样。

类比：ChatGPT 回答问题时文字一个一个蹦出来，而不是等 30 秒后一次性显示，用的就是流式传输。

### 组件状态

React 组件里用 `useState` 存的数据就叫"状态"（state）。比如：

```jsx
const [messages, setMessages] = useState([])  // 消息列表
const [loading, setLoading] = useState(false)  // 是否加载中
```

"更新组件状态" = 收到后端推过来的新数据后，调用 `setMessages` 把新消息加进去，页面就自动重新渲染了。

### 事件（Event）

SSE 里的"事件"就是后端推过来的**一条消息**，每条消息有个类型名。

比如后端推了 3 条：
```
event: step        ← 这是事件类型
data: {...}        ← 这是事件数据

event: step
data: {...}

event: result
data: {...}
```

"事件"这个词来自"事件驱动"模型——有事发生了（Agent 想了一步、调了一个工具、出了最终结果），就发一条通知。

### 事件数据（Event Data）

就是每条事件里携带的 JSON 内容。比如：

```json
// 事件类型: step
// 事件数据:
{ "step_type": "reasoning", "output": { "thought": "用户在问天气，我需要调用搜索工具" } }
```

前端收到这条数据后，就知道该在界面上显示"AI 正在思考：用户在问天气..."。

**串起来：** 后端通过 SSE **实时流**不断推送**事件**（每条事件带着**事件数据**），前端的 hook 接收并解析这些数据，然后更新**组件状态**，页面就实时显示 Agent 的思考和执行过程。

---

## Q3: 事件类型是可以自定义的吗？

对，完全是自定义的。

SSE 规范只规定了格式必须是 `event: xxx`，但 `xxx` 写什么由你自己决定。

这个项目选了 `step` 和 `result`，但你也可以叫别的名字，或者加更多类型：

```
event: thinking
event: tool_call
event: error
event: done
event: progress
event: 随便什么都行
```

唯一的约束：前端和后端要**对得上**。后端发 `event: step`，前端就得用 `addEventListener('step', ...)` 来接。名字不一致就收不到。

---

## Q4: 不是用户先在前端操作，后端才做相应动作吗？

没错，流程确实是用户先触发的。完整顺序是：

1. **用户点发送** → 前端发一个普通 POST 请求（"我要问这个问题"）
2. **后端收到请求** → 开始跑 Agent（调 LLM、搜索知识库等，要好几秒）
3. **前端打开 SSE 连接** → 相当于竖起耳朵说"我准备好了，你有进展就告诉我"
4. **后端边跑边推** → 每完成一步就通过 SSE 推一条消息给前端

所以 SSE 不是说后端"无缘无故"给前端推数据，而是用户触发之后，后端**在处理过程中**持续把中间结果推回来。

**对比两种方式：**

```
没有 SSE：
用户点发送 → 等 8 秒 → 一次性收到最终答案（中间啥也看不到）

有 SSE：
用户点发送 → 第 1 秒看到"AI 在思考..."
           → 第 3 秒看到"正在搜索知识库..."
           → 第 6 秒看到"搜索到 3 条结果"
           → 第 8 秒看到最终答案
```

本质上还是用户发起的，SSE 只是改变了**响应的返回方式**——从"一次性返回"变成"分批推送"。

---

## Q5: "stream disconnected before completion" 报错是什么原因？

这是 ChatGPT Codex 的报错，意思是：**SSE 流在 AI 还没回答完之前就断开了**。

常见原因：

1. **网络不稳定** — 尤其是用 VPN 访问 OpenAI 时，连接容易中途断掉
2. **OpenAI 服务端过载** — 服务器忙不过来，主动断开连接
3. **请求超时** — 回答生成时间太长，连接被中间某一层（代理/CDN）掐断

解决办法：重试、换 VPN 节点、把任务拆小。

---

## Q6: Windows 上怎么配置 Claude Code 环境变量？

Mac 上是在 `~/.zshrc` 里写 `export`，Windows 上对应方式：

### 方式一：PowerShell 临时设置（关窗口就没了）

```powershell
$env:ANTHROPIC_AUTH_TOKEN="你的key"
$env:ANTHROPIC_BASE_URL="https://ace2.ezclaude.com"
$env:ANTHROPIC_MODEL="claude-opus-4-6"
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1"
```

### 方式二：永久设置（推荐）

**图形界面：**
1. Win + R → 输入 `sysdm.cpl` → 回车
2. 点"高级"标签 → 点"环境变量"
3. 在"用户变量"下点"新建"，逐个添加：

| 变量名 | 值 |
|--------|-----|
| `ANTHROPIC_AUTH_TOKEN` | 你的 key |
| `ANTHROPIC_BASE_URL` | `https://ace2.ezclaude.com` |
| `ANTHROPIC_MODEL` | `claude-opus-4-6` |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | `1` |

4. 全部确定保存，**重启终端**才生效

**或用命令行永久设置：**

```powershell
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", "你的key", "User")
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", "https://ace2.ezclaude.com", "User")
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_MODEL", "claude-opus-4-6", "User")
[System.Environment]::SetEnvironmentVariable("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "1", "User")
```

---

## Q7: Cursor 下载 Windows 版怎么选？

下载 **Windows (x64) (User)**。

**x64 vs ARM64：**
- x64：绝大多数 Windows 电脑（Intel/AMD 处理器）
- ARM64：只有高通芯片的设备（如 Surface Pro X）才需要

**User vs System：**

| | User | System |
|--|------|--------|
| 安装位置 | `C:\Users\你的用户名\AppData\` | `C:\Program Files\` |
| 需要管理员权限 | 不需要 | 需要 |
| 谁能用 | 只有你 | 这台电脑所有用户 |

除非多人共用一台电脑，否则选 User 就行。
