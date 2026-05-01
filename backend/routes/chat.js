const express = require("express");
const config = require("../config");
const { db, parseTemplate, log } = require("../db");
const { recognizeIntent } = require("../core/intent");

const router = express.Router();

function listTemplates() {
  const rows = db
    .prepare(
      `SELECT *
       FROM prompt_templates
       ORDER BY scene ASC, category ASC, id ASC`
    )
    .all();

  return rows.map(parseTemplate);
}

router.post("/", async (req, res, next) => {
  const { input, context, model } = req.body || {};
  const normalizedInput = String(input || "").trim();

  if (!normalizedInput) {
    return res.status(400).json({ message: "input 必填" });
  }

  try {
    const templates = listTemplates();
    const result = await recognizeIntent({
      input: normalizedInput,
      context,
      templates,
      model: model || config.llm.defaultModel,
    });

    const insert = db.prepare(
      `INSERT INTO intent_results (
        input,
        context,
        model,
        type,
        matched_template_id,
        confidence,
        prefilled_variables,
        missing_variables,
        question,
        reasoning,
        llm_response
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const record = insert.run(
      normalizedInput,
      context ? JSON.stringify(context) : null,
      model || config.llm.defaultModel,
      result.type,
      result.template?.id || null,
      result.confidence,
      JSON.stringify(result.prefilled_variables || {}),
      JSON.stringify(result.missing_variables || []),
      result.question || null,
      result.reasoning || null,
      result.raw_response || null
    );

    log("info", "intent", "完成意图识别", {
      intent_result_id: record.lastInsertRowid,
      template_id: result.template?.id || null,
      type: result.type,
      source: result.source,
      confidence: result.confidence,
    });

    return res.status(201).json({
      id: record.lastInsertRowid,
      type: result.type,
      template: result.template,
      prefilled_variables: result.prefilled_variables,
      missing_variables: result.missing_variables,
      question: result.question,
      confidence: result.confidence,
      reasoning: result.reasoning,
      source: result.source,
    });
  } catch (error) {
    log("error", "intent", "意图识别失败", {
      message: error.message,
    });
    return next(error);
  }
});

router.patch("/:id/feedback", (req, res) => {
  const id = Number(req.params.id);
  const { correct, note } = req.body || {};

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "无效的意图识别记录 id" });
  }

  if (typeof correct !== "boolean") {
    return res.status(400).json({ message: "correct 必须是布尔值" });
  }

  const existing = db
    .prepare("SELECT id FROM intent_results WHERE id = ?")
    .get(id);

  if (!existing) {
    return res.status(404).json({ message: "意图识别记录不存在" });
  }

  db.prepare(
    `UPDATE intent_results
     SET evaluation = ?,
         evaluation_note = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(correct ? "correct" : "incorrect", note ? String(note).trim() : null, id);

  log("info", "intent", "提交意图识别反馈", {
    intent_result_id: id,
    evaluation: correct ? "correct" : "incorrect",
  });

  return res.json({
    success: true,
  });
});

module.exports = router;
