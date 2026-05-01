const express = require("express");
const { db, parseJson, log } = require("../db");

const router = express.Router();

function toPositiveInteger(value, fallback, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return max ? Math.min(parsed, max) : parsed;
}

function parseBooleanFlag(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
  }

  return null;
}

function buildHistoryWhereClause({ templateId, isFavorite }) {
  const clauses = [];
  const params = [];

  if (templateId != null) {
    clauses.push("g.template_id = ?");
    params.push(templateId);
  }

  if (isFavorite != null) {
    clauses.push("g.is_favorite = ?");
    params.push(isFavorite ? 1 : 0);
  }

  return {
    sql: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

function mapHistoryRow(row) {
  return {
    ...row,
    variables: parseJson(row.variables, {}),
    search_results: parseJson(row.search_results, []),
    knowledge_results: parseJson(row.knowledge_results, []),
    is_favorite: Boolean(row.is_favorite),
    note: row.note || "",
  };
}

function stringifyField(value) {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

router.get("/stats", (req, res) => {
  const summary =
    db.prepare(
      `SELECT
         COUNT(*) AS total_generations,
         COALESCE(SUM(total_tokens), 0) AS total_tokens,
         COALESCE(SUM(cost), 0) AS total_cost,
         COALESCE(AVG(cost), 0) AS avg_cost_per_generation,
         COALESCE(AVG(total_tokens), 0) AS avg_tokens_per_generation
       FROM generations`
    ).get() || {};

  const byModel = db
    .prepare(
      `SELECT
         model,
         COUNT(*) AS count,
         COALESCE(SUM(total_tokens), 0) AS tokens,
         COALESCE(SUM(cost), 0) AS cost
       FROM generations
       GROUP BY model
       ORDER BY count DESC, tokens DESC, model ASC`
    )
    .all();

  const byDate = db
    .prepare(
      `SELECT
         DATE(created_at) AS date,
         COUNT(*) AS count,
         COALESCE(SUM(cost), 0) AS cost
       FROM generations
       GROUP BY DATE(created_at)
       ORDER BY date DESC
       LIMIT 30`
    )
    .all();

  return res.json({
    total_generations: Number(summary.total_generations || 0),
    total_tokens: Number(summary.total_tokens || 0),
    total_cost: Number(summary.total_cost || 0),
    avg_cost_per_generation: Number(summary.avg_cost_per_generation || 0),
    avg_tokens_per_generation: Number(summary.avg_tokens_per_generation || 0),
    by_model: byModel.map((item) => ({
      model: item.model,
      count: Number(item.count || 0),
      tokens: Number(item.tokens || 0),
      cost: Number(item.cost || 0),
    })),
    by_date: byDate.map((item) => ({
      date: item.date,
      count: Number(item.count || 0),
      cost: Number(item.cost || 0),
    })),
  });
});

router.get("/", (req, res) => {
  const page = toPositiveInteger(req.query.page, 1);
  const limit = toPositiveInteger(req.query.limit, 20, 100);
  const offset = (page - 1) * limit;
  const templateId = req.query.template_id ? toPositiveInteger(req.query.template_id, null) : null;
  const isFavorite = parseBooleanFlag(req.query.is_favorite);
  const where = buildHistoryWhereClause({ templateId, isFavorite });

  const totalRow = db
    .prepare(
      `SELECT COUNT(*) AS total
       FROM generations g
       ${where.sql}`
    )
    .get(...where.params);

  const rows = db
    .prepare(
      `SELECT
         g.*,
         pt.name AS template_name,
         pt.scene AS template_scene,
         pt.category AS template_category
       FROM generations g
       INNER JOIN prompt_templates pt ON pt.id = g.template_id
       ${where.sql}
       ORDER BY g.created_at DESC, g.id DESC
       LIMIT ? OFFSET ?`
    )
    .all(...where.params, limit, offset);

  return res.json({
    items: rows.map(mapHistoryRow),
    total: Number(totalRow?.total || 0),
    page,
    limit,
  });
});

router.get("/:id", (req, res) => {
  const id = toPositiveInteger(req.params.id, null);

  if (id == null) {
    return res.status(400).json({ message: "无效的历史记录 id" });
  }

  const row = db
    .prepare(
      `SELECT
         g.*,
         pt.name AS template_name,
         pt.scene AS template_scene,
         pt.category AS template_category,
         pt.system_prompt,
         pt.user_prompt
       FROM generations g
       INNER JOIN prompt_templates pt ON pt.id = g.template_id
       WHERE g.id = ?`
    )
    .get(id);

  if (!row) {
    return res.status(404).json({ message: "历史记录不存在" });
  }

  const executionSteps = db
    .prepare(
      `SELECT *
       FROM execution_steps
       WHERE generation_id = ?
       ORDER BY created_at ASC, id ASC`
    )
    .all(id)
    .map((step) => ({
      ...step,
      input: stringifyField(parseJson(step.input, step.input)),
      output: stringifyField(parseJson(step.output, step.output)),
    }));

  return res.json({
    ...mapHistoryRow(row),
    execution_steps: executionSteps,
  });
});

router.patch("/:id", (req, res) => {
  const id = toPositiveInteger(req.params.id, null);
  const { is_favorite: isFavoriteInput, note } = req.body || {};

  if (id == null) {
    return res.status(400).json({ message: "无效的历史记录 id" });
  }

  const existing = db
    .prepare("SELECT id, is_favorite, note FROM generations WHERE id = ?")
    .get(id);

  if (!existing) {
    return res.status(404).json({ message: "历史记录不存在" });
  }

  const updates = [];
  const params = [];

  if (typeof isFavoriteInput === "boolean") {
    updates.push("is_favorite = ?");
    params.push(isFavoriteInput ? 1 : 0);
  }

  if (note !== undefined) {
    const normalizedNote = String(note || "").trim();
    updates.push("note = ?");
    params.push(normalizedNote || null);
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: "至少提供 is_favorite 或 note 其中一个字段" });
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");

  db.prepare(
    `UPDATE generations
     SET ${updates.join(", ")}
     WHERE id = ?`
  ).run(...params, id);

  log("info", "history", "更新历史记录", {
    generation_id: id,
    is_favorite:
      typeof isFavoriteInput === "boolean" ? isFavoriteInput : Boolean(existing.is_favorite),
    note_updated: note !== undefined,
  });

  return res.json({
    success: true,
  });
});

module.exports = router;
