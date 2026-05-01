const crypto = require("crypto");
const express = require("express");
const config = require("../config");
const { db, parseTemplate, log } = require("../db");
const { executeAgent } = require("../core/agent");
const { getToolDefinitions } = require("../core/tools");

const router = express.Router();
const agentRuns = new Map();

function validateVariables(template, input) {
  return template.variables
    .filter((field) => field.required && !String(input[field.name] || "").trim())
    .map((field) => field.label || field.name);
}

function getAgentState(agentId) {
  return agentRuns.get(agentId) || null;
}

function writeSseEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function emitAgentEvent(agentId, event, payload) {
  const state = getAgentState(agentId);
  if (!state) {
    return;
  }

  const message = {
    ...payload,
    agent_id: agentId,
    emitted_at: new Date().toISOString(),
  };

  state.events.push({ event, data: message });

  for (const client of state.clients) {
    writeSseEvent(client, event, message);
  }

  if (event === "result" || event === "error") {
    for (const client of state.clients) {
      client.end();
    }
    state.clients.clear();
  }
}

function createAgentState({ agentId, templateId, model, tools }) {
  const state = {
    id: agentId,
    template_id: templateId,
    model,
    tools,
    status: "queued",
    generation_id: null,
    result: null,
    error: null,
    events: [],
    clients: new Set(),
  };

  agentRuns.set(agentId, state);
  return state;
}

function attachGenerationToSteps(agentId, generationId) {
  db.prepare(
    `UPDATE execution_steps
     SET generation_id = ?
     WHERE agent_id = ? AND generation_id IS NULL`
  ).run(generationId, agentId);
}

async function persistStep({ agentId, generationId, step }) {
  db.prepare(
    `INSERT INTO execution_steps (
      generation_id, agent_id, step_type, step_name, input, output, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    generationId || null,
    agentId,
    step.step_type,
    step.step_name,
    step.input ? JSON.stringify(step.input) : null,
    step.output ? JSON.stringify(step.output) : null,
    step.status || "completed"
  );
}

async function runAgentTask({ agentId, template, variables, model, toolDefinitions }) {
  const state = getAgentState(agentId);
  if (!state) {
    return;
  }

  state.status = "running";
  const startedAt = Date.now();

  try {
    const result = await executeAgent({
      template,
      variables,
      model,
      toolDefinitions,
      onStep: async (step) => {
        await persistStep({
          agentId,
          generationId: state.generation_id,
          step,
        });
        emitAgentEvent(agentId, "step", step);
      },
    });

    const insert = db.prepare(
      `INSERT INTO generations (
        template_id,
        template_version,
        model,
        temperature,
        variables,
        search_results,
        knowledge_results,
        rendered_prompt,
        result,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        cost,
        duration_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const record = insert.run(
      template.id,
      template.version,
      model || config.llm.defaultModel,
      0.2,
      JSON.stringify(variables),
      result.searchResults.length > 0 ? JSON.stringify(result.searchResults) : null,
      result.knowledgeResults.length > 0 ? JSON.stringify(result.knowledgeResults) : null,
      result.renderedPrompt,
      result.result,
      result.tokens.prompt,
      result.tokens.completion,
      result.tokens.total,
      0,
      Date.now() - startedAt
    );

    state.generation_id = record.lastInsertRowid;
    state.status = "completed";
    state.result = result.result;

    attachGenerationToSteps(agentId, state.generation_id);

    const payload = {
      generation_id: state.generation_id,
      result: result.result,
      tokens: result.tokens,
    };

    emitAgentEvent(agentId, "result", payload);
    log("info", "agent", "完成 Agent 执行", {
      agent_id: agentId,
      generation_id: state.generation_id,
      template_id: template.id,
      model: model || config.llm.defaultModel,
      tools: toolDefinitions.map((item) => item.name),
    });
  } catch (error) {
    state.status = "error";
    state.error = error.message;

    await persistStep({
      agentId,
      generationId: state.generation_id,
      step: {
        step_type: "error",
        step_name: "agent_error",
        status: "failed",
        input: null,
        output: {
          message: error.message,
        },
      },
    });

    emitAgentEvent(agentId, "error", {
      message: error.message,
      status_code: error.statusCode || 500,
    });
    log("error", "agent", "Agent 执行失败", {
      agent_id: agentId,
      template_id: template.id,
      message: error.message,
    });
  }
}

router.post("/", async (req, res) => {
  const {
    template_id: templateId,
    variables = {},
    model,
    tools,
  } = req.body || {};

  if (!templateId) {
    return res.status(400).json({ message: "template_id 必填" });
  }

  const templateRow = db.prepare("SELECT * FROM prompt_templates WHERE id = ?").get(templateId);
  const template = parseTemplate(templateRow);

  if (!template) {
    return res.status(404).json({ message: "模板不存在" });
  }

  const missing = validateVariables(template, variables);
  if (missing.length > 0) {
    return res.status(400).json({ message: `请填写必填变量: ${missing.join(", ")}` });
  }

  const toolDefinitions = getToolDefinitions(tools);
  if (Array.isArray(tools) && tools.length > 0 && toolDefinitions.length === 0) {
    return res.status(400).json({ message: "未识别到可用工具" });
  }

  const agentId = crypto.randomUUID();

  createAgentState({
    agentId,
    templateId: template.id,
    model: model || config.llm.defaultModel,
    tools: toolDefinitions.map((item) => item.name),
  });

  runAgentTask({
    agentId,
    template,
    variables,
    model: model || config.llm.defaultModel,
    toolDefinitions,
  });

  return res.status(202).json({
    agent_id: agentId,
  });
});

router.get("/:id/stream", (req, res) => {
  const state = getAgentState(req.params.id);

  if (!state) {
    return res.status(404).json({ message: "agent 不存在" });
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  for (const event of state.events) {
    writeSseEvent(res, event.event, event.data);
  }

  if (state.status === "completed" || state.status === "error") {
    res.end();
    return undefined;
  }

  state.clients.add(res);
  req.on("close", () => {
    state.clients.delete(res);
  });

  return undefined;
});

module.exports = router;
