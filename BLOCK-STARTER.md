# Block 开发开场白模板

每完成一个 Block → git commit + push → 开新对话 → 粘贴对应开场白。

---

## Claude Code（前端）

```
我在开发 prompt-hub 项目的前端部分。
项目路径：/Users/dreamingzhu/Desktop/vibe_coding/prompt-hub/frontend

请先：
1. 读 /Users/dreamingzhu/Desktop/vibe_coding/prompt-hub/DEVELOPMENT-PLAN.md 了解整体计划
2. 运行 git log --oneline -10 看当前进度
3. 读当前代码文件了解现状

现在请开发 Block X 的前端任务（具体任务见计划文档中"Claude Code 任务清单"部分）。
完成后 git commit + push。
```

---

## Codex（后端）

```
我在开发 prompt-hub 项目的后端部分。
项目路径：/Users/dreamingzhu/Desktop/vibe_coding/prompt-hub/backend

请先：
1. 读 /Users/dreamingzhu/Desktop/vibe_coding/prompt-hub/DEVELOPMENT-PLAN.md 了解整体计划
2. 运行 git log --oneline -10 看当前进度
3. 读当前代码文件了解现状

现在请开发 Block X 的后端任务（具体任务见计划文档中"Codex 任务清单"部分）。
完成后 git commit + push。
```

---

## 使用方法

1. 把上面的 `X` 替换成当前 Block 编号（1/2/3/4/5/6）
2. 新对话中粘贴对应开场白
3. 如果一个 Block 太大做不完，可以追加限定范围，比如：
   - "Block 1 前端，这次只做布局和 Sidebar 组件"
   - "Block 1 后端，这次只做数据库和模板 CRUD"

---

## 联调阶段追加提示

当前后端都完成同一个 Block 后，需要联调时：

```
Block X 前后端都已开发完毕，现在需要联调。
请先：
1. 读 DEVELOPMENT-PLAN.md 中 Block X 的验证标准
2. 启动前后端服务
3. 检查 API 对接是否正常，修复不匹配的地方

联调完成后 git commit + push。
```

---

## Block 进度检查表

| Block | 后端 | 前端 | 联调 |
|-------|------|------|------|
| 1 基础框架 | [ ] | [ ] | [ ] |
| 2 搜索工具 | [ ] | [ ] | [ ] |
| 3 知识库 | [ ] | [ ] | [ ] |
| 4 意图识别 | [ ] | [ ] | [ ] |
| 5 Agent模式 | [ ] | [ ] | [ ] |
| 6 润色完善 | [ ] | [ ] | [ ] |
