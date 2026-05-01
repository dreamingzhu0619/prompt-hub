const config = require("../config");
const { generate } = require("./llm");
const { getToolExecutor } = require("./tools");

function renderTemplate(template, variables) {
  return template.user_prompt.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (match, key) => {
    const value = variables[key];
    return value != null && String(value).trim() !== "" ? String(value) : match;
  });
}

function stringifyJson(value) {
  return JSON.stringify(value, null, 2);
}

function extractJsonBlock(text) {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return text.trim();
}

function parseDecision(rawText) {
  const normalized = extractJsonBlock(String(rawText || ""));

  try {
    const parsed = JSON.parse(normalized);
    return {
      thought: String(parsed.thought || "").trim(),
      action: parsed.action === "tool" ? "tool" : "final",
      tool_name: parsed.tool_name ? String(parsed.tool_name).trim() : "",
      tool_input:
        parsed.tool_input && typeof parsed.tool_input === "object"
          ? parsed.tool_input
          : {},
      final_answer: String(parsed.final_answer || "").trim(),
    };
  } catch (error) {
    return {
      thought: "",
      action: "final",
      tool_name: "",
      tool_input: {},
      final_answer: String(rawText || "").trim(),
    };
  }
}

function buildScratchpad(steps) {
  if (steps.length === 0) {
    return "暂无已执行步骤。";
  }

  return steps
    .map((step, index) => {
      if (step.type === "reasoning") {
        return `步骤 ${index + 1} 思考:\n${step.thought || "无"}`;
      }

      return [
        `步骤 ${index + 1} 工具: ${step.tool_name}`,
        `输入: ${stringifyJson(step.tool_input)}`,
        `输出: ${stringifyJson(step.tool_output)}`,
      ].join("\n");
    })
    .join("\n\n");
}

function buildPlannerPrompt({ template, variables, templatePrompt, toolDefinitions, steps, iteration }) {
  const toolsText = toolDefinitions
    .map((tool) => `- ${tool.name}: ${tool.description}`)
    .join("\n");

  return [
    "你是 Prompt Hub 的 Agent 执行器，采用 ReAct 风格工作。",
    "目标：必要时调用工具补充信息，最后输出能直接交付给用户的最终内容。",
    "规则：",
    "1. 你的回复必须是 JSON，不要输出 JSON 之外的内容。",
    '2. JSON 格式固定为 {"thought":"","action":"tool|final","tool_name":"","tool_input":{},"final_answer":""}。',
    "3. 只有在确实需要额外信息时才调用工具。",
    "4. action=tool 时必须提供 tool_name 和 tool_input；action=final 时必须提供 final_answer。",
    "5. 如果已有信息足够完成任务，不要继续调用工具。",
    "",
    `当前迭代: ${iteration}/${config.agent.maxIterations}`,
    `模板名称: ${template.name}`,
    `模板场景: ${template.scene} / ${template.category}`,
    `系统提示词: ${template.system_prompt}`,
    `用户变量: ${stringifyJson(variables)}`,
    `渲染后的用户请求:\n${templatePrompt}`,
    "",
    "可用工具：",
    toolsText || "- 无",
    "",
    "已执行步骤：",
    buildScratchpad(steps),
  ].join("\n");
}

function collectToolResults(steps, toolName) {
  return steps
    .filter((step) => step.type === "tool" && step.tool_name === toolName)
    .flatMap((step) => {
      const results = step.tool_output?.results;
      return Array.isArray(results) ? results : [];
    });
}

async function executeAgent({
  template,
  variables,
  model,
  toolDefinitions,
  onStep,
}) {
  const templatePrompt = renderTemplate(template, variables);
  const steps = [];
  const tokenTotals = {
    prompt: 0,
    completion: 0,
    total: 0,
  };

  for (let iteration = 1; iteration <= config.agent.maxIterations; iteration += 1) {
    const plannerPrompt = buildPlannerPrompt({
      template,
      variables,
      templatePrompt,
      toolDefinitions,
      steps,
      iteration,
    });

    const llmResponse = await generate({
      model,
      temperature: 0.2,
      systemPrompt: "你是一个严格遵守 JSON 输出格式的任务规划 Agent。",
      userPrompt: plannerPrompt,
    });

    tokenTotals.prompt += llmResponse.tokens.prompt;
    tokenTotals.completion += llmResponse.tokens.completion;
    tokenTotals.total += llmResponse.tokens.total;

    const decision = parseDecision(llmResponse.result);
    const reasoningStep = {
      type: "reasoning",
      thought: decision.thought,
      raw: llmResponse.result,
      iteration,
    };
    steps.push(reasoningStep);

    await onStep({
      step_type: "reasoning",
      step_name: `agent_reasoning_${iteration}`,
      status: "completed",
      input: {
        iteration,
        prompt: plannerPrompt,
        model,
      },
      output: {
        thought: decision.thought,
        action: decision.action,
        tool_name: decision.tool_name,
        tool_input: decision.tool_input,
        final_answer: decision.final_answer,
        raw_response: llmResponse.result,
      },
    });

    if (decision.action === "final") {
      const finalAnswer = decision.final_answer || llmResponse.result;
      return {
        result: finalAnswer,
        renderedPrompt: templatePrompt,
        searchResults: collectToolResults(steps, "web_search"),
        knowledgeResults: collectToolResults(steps, "knowledge_search"),
        tokens: tokenTotals,
      };
    }

    const tool = getToolExecutor(decision.tool_name);
    if (!tool) {
      const error = new Error(`未知工具: ${decision.tool_name}`);
      error.statusCode = 400;
      throw error;
    }

    const enabled = toolDefinitions.some((item) => item.name === decision.tool_name);
    if (!enabled) {
      const error = new Error(`工具未启用: ${decision.tool_name}`);
      error.statusCode = 400;
      throw error;
    }

    const toolOutput = await tool.execute(decision.tool_input);
    const toolStep = {
      type: "tool",
      tool_name: decision.tool_name,
      tool_input: decision.tool_input,
      tool_output: toolOutput,
      iteration,
    };
    steps.push(toolStep);

    await onStep({
      step_type: "tool",
      step_name: decision.tool_name,
      status: "completed",
      input: {
        iteration,
        tool_name: decision.tool_name,
        tool_input: decision.tool_input,
      },
      output: toolOutput,
    });
  }

  const error = new Error(`Agent 超过最大迭代次数 ${config.agent.maxIterations}，未能得到最终结果`);
  error.statusCode = 500;
  throw error;
}

module.exports = {
  executeAgent,
  renderTemplate,
};
