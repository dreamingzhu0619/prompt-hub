const express = require("express");
const { db, parseTemplate, log } = require("../db");
const { generate } = require("../core/llm");

const router = express.Router();

function renderTemplate(template, variables) {
  return template.user_prompt.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const value = variables[key];
    return value == null ? "" : String(value);
  });
}

function validateVariables(template, input) {
  const missing = template.variables
    .filter((field) => field.required && !String(input[field.name] || "").trim())
    .map((field) => field.label || field.name);

  return missing;
}

router.post("/", async (req, res, next) => {
  const startedAt = Date.now();
  const { template_id: templateId, variables = {}, model, temperature = 0.7 } = req.body || {};
  const selectedModel = model || require("../config").llm.defaultModel;

  if (!templateId) {
    return res.status(400).json({ message: "template_id 必填" });
  }

  const row = db.prepare("SELECT * FROM prompt_templates WHERE id = ?").get(templateId);
  const template = parseTemplate(row);

  if (!template) {
    return res.status(404).json({ message: "模板不存在" });
  }

  const missing = validateVariables(template, variables);
  if (missing.length > 0) {
    return res.status(400).json({ message: `请填写必填变量: ${missing.join(", ")}` });
  }

  const renderedPrompt = renderTemplate(template, variables);

  try {
    const llmResponse = await generate({
      model: selectedModel,
      temperature,
      systemPrompt: template.system_prompt,
      userPrompt: renderedPrompt,
    });

    const durationMs = Date.now() - startedAt;
    const insert = db.prepare(
      `INSERT INTO generations (
        template_id,
        template_version,
        model,
        temperature,
        variables,
        rendered_prompt,
        result,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        cost,
        duration_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const record = insert.run(
      template.id,
      template.version,
      selectedModel,
      temperature,
      JSON.stringify(variables),
      renderedPrompt,
      llmResponse.result,
      llmResponse.tokens.prompt,
      llmResponse.tokens.completion,
      llmResponse.tokens.total,
      0,
      durationMs
    );

    db.prepare(
      `INSERT INTO execution_steps (
        generation_id, step_type, step_name, input, output, status
      ) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      record.lastInsertRowid,
      "llm",
      "manual_generate",
      JSON.stringify({
        system_prompt: template.system_prompt,
        user_prompt: renderedPrompt,
        model: selectedModel,
        temperature,
      }),
      JSON.stringify(llmResponse.raw),
      "completed"
    );

    log("info", "generate", "完成手动生成", {
      generation_id: record.lastInsertRowid,
      template_id: template.id,
      model: selectedModel,
    });

    return res.status(201).json({
      id: record.lastInsertRowid,
      result: llmResponse.result,
      tokens: llmResponse.tokens,
      cost: 0,
      duration_ms: durationMs,
    });
  } catch (error) {
    log("error", "generate", "手动生成失败", {
      template_id: template.id,
      message: error.message,
    });
    return next(error);
  }
});

module.exports = router;
