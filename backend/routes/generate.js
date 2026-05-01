const express = require("express");
const { db, parseTemplate, log } = require("../db");
const { generate } = require("../core/llm");

const router = express.Router();

function renderTemplate(template, variables) {
  return template.user_prompt.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (match, key) => {
    const value = variables[key];
    // Keep placeholder if value is null/undefined/empty, consistent with frontend preview
    return value != null && String(value).trim() !== "" ? String(value) : match;
  });
}

function validateVariables(template, input) {
  const missing = template.variables
    .filter((field) => field.required && !String(input[field.name] || "").trim())
    .map((field) => field.label || field.name);

  return missing;
}

function normalizeSearchResults(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => ({
      title: String(item?.title || "").trim(),
      url: String(item?.url || "").trim(),
      content: String(item?.content || "").trim(),
    }))
    .filter((item) => item.title || item.url || item.content);
}

function buildSearchContext(searchResults) {
  if (searchResults.length === 0) {
    return "";
  }

  const lines = searchResults.map((item, index) => {
    return [
      `[搜索结果 ${index + 1}]`,
      `标题: ${item.title || "未命名"}`,
      `链接: ${item.url || "无"}`,
      `摘要: ${item.content || "无"}`,
    ].join("\n");
  });

  return `以下是可供参考的搜索结果，请优先基于这些外部信息作答，并在合适时引用其中事实：\n\n${lines.join(
    "\n\n"
  )}`;
}

function normalizeKnowledgeResults(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => ({
      file: String(item?.file || "").trim(),
      score: Number(item?.score || 0),
      preview: String(item?.preview || "").trim(),
      content: String(item?.content || "").trim(),
    }))
    .filter((item) => item.file || item.preview || item.content);
}

function buildKnowledgeContext(knowledgeResults) {
  if (knowledgeResults.length === 0) {
    return "";
  }

  const lines = knowledgeResults.map((item, index) => {
    return [
      `[知识库片段 ${index + 1}]`,
      `文件: ${item.file || "未命名"}`,
      `相关度: ${item.score > 0 ? `${Math.round(item.score * 100)}%` : "未知"}`,
      `摘要: ${item.preview || "无"}`,
      `内容: ${item.content || item.preview || "无"}`,
    ].join("\n");
  });

  return `以下是用户选中的知识库内容，请优先结合这些内部资料作答，不要忽略其中细节：\n\n${lines.join(
    "\n\n"
  )}`;
}

router.post("/", async (req, res, next) => {
  const startedAt = Date.now();
  const {
    template_id: templateId,
    variables = {},
    model,
    temperature = 0.7,
    search_results: searchResultsInput,
    knowledge_results: knowledgeResultsInput,
  } = req.body || {};
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

  const searchResults = normalizeSearchResults(searchResultsInput);
  const knowledgeResults = normalizeKnowledgeResults(knowledgeResultsInput);
  const searchContext = buildSearchContext(searchResults);
  const knowledgeContext = buildKnowledgeContext(knowledgeResults);
  const templatePrompt = renderTemplate(template, variables);
  const contexts = [knowledgeContext, searchContext].filter(Boolean);
  const renderedPrompt = contexts.length > 0 ? `${contexts.join("\n\n---\n\n")}\n\n---\n\n${templatePrompt}` : templatePrompt;

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
      selectedModel,
      temperature,
      JSON.stringify(variables),
      searchResults.length > 0 ? JSON.stringify(searchResults) : null,
      knowledgeResults.length > 0 ? JSON.stringify(knowledgeResults) : null,
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

    if (searchResults.length > 0) {
      db.prepare(
        `INSERT INTO execution_steps (
          generation_id, step_type, step_name, input, output, status
        ) VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        record.lastInsertRowid,
        "tool",
        "search_context",
        JSON.stringify({
          count: searchResults.length,
        }),
        JSON.stringify(searchResults),
        "completed"
      );
    }

    if (knowledgeResults.length > 0) {
      db.prepare(
        `INSERT INTO execution_steps (
          generation_id, step_type, step_name, input, output, status
        ) VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        record.lastInsertRowid,
        "tool",
        "knowledge_context",
        JSON.stringify({
          count: knowledgeResults.length,
        }),
        JSON.stringify(knowledgeResults),
        "completed"
      );
    }

    log("info", "generate", "完成手动生成", {
      generation_id: record.lastInsertRowid,
      template_id: template.id,
      model: selectedModel,
      search_results_count: searchResults.length,
      knowledge_results_count: knowledgeResults.length,
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
