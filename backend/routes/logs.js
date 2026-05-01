const express = require("express");
const { db, parseJson } = require("../db");

const router = express.Router();

function toPositiveInteger(value, fallback, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return max ? Math.min(parsed, max) : parsed;
}

router.get("/", (req, res) => {
  const limit = toPositiveInteger(req.query.limit, 50, 200);
  const level = req.query.level ? String(req.query.level).trim() : "";
  const category = req.query.category ? String(req.query.category).trim() : "";
  const clauses = [];
  const params = [];

  if (level) {
    clauses.push("level = ?");
    params.push(level);
  }

  if (category) {
    clauses.push("category = ?");
    params.push(category);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `SELECT id, level, category, message, metadata, created_at
       FROM logs
       ${whereSql}
       ORDER BY created_at DESC, id DESC
       LIMIT ?`
    )
    .all(...params, limit)
    .map((row) => ({
      ...row,
      metadata: parseJson(row.metadata, row.metadata),
    }));

  return res.json(rows);
});

module.exports = router;
