const express = require("express");
const { db, parseTemplate, log } = require("../db");

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

router.get("/scenes", (req, res) => {
  const rows = db
    .prepare(
      `SELECT DISTINCT scene, category
       FROM prompt_templates
       ORDER BY scene ASC, category ASC`
    )
    .all();

  const grouped = rows.reduce((acc, row) => {
    if (!acc[row.scene]) {
      acc[row.scene] = [];
    }
    acc[row.scene].push(row.category);
    return acc;
  }, {});

  res.json(
    Object.entries(grouped).map(([scene, categories]) => ({
      scene,
      categories,
    }))
  );
});

router.get("/", (req, res) => {
  res.json(listTemplates());
});

router.get("/:id", (req, res) => {
  const row = db
    .prepare("SELECT * FROM prompt_templates WHERE id = ?")
    .get(req.params.id);

  if (!row) {
    return res.status(404).json({ message: "模板不存在" });
  }

  return res.json(parseTemplate(row));
});

router.post("/", (req, res) => {
  const {
    name,
    scene,
    category,
    description,
    system_prompt: systemPrompt,
    user_prompt: userPrompt,
    variables,
  } = req.body || {};

  if (
    !name ||
    !scene ||
    !category ||
    !systemPrompt ||
    !userPrompt ||
    !Array.isArray(variables)
  ) {
    return res.status(400).json({ message: "缺少必要字段" });
  }

  const result = db
    .prepare(
      `INSERT INTO prompt_templates (
        name, scene, category, description, system_prompt, user_prompt, variables
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      name,
      scene,
      category,
      description || null,
      systemPrompt,
      userPrompt,
      JSON.stringify(variables)
    );

  log("info", "prompt", "创建模板", { template_id: result.lastInsertRowid, name });

  const created = db
    .prepare("SELECT * FROM prompt_templates WHERE id = ?")
    .get(result.lastInsertRowid);

  return res.status(201).json(parseTemplate(created));
});

router.put("/:id", (req, res) => {
  const existing = db
    .prepare("SELECT * FROM prompt_templates WHERE id = ?")
    .get(req.params.id);

  if (!existing) {
    return res.status(404).json({ message: "模板不存在" });
  }

  const {
    name,
    scene,
    category,
    description,
    system_prompt: systemPrompt,
    user_prompt: userPrompt,
    variables,
  } = req.body || {};

  if (
    !name ||
    !scene ||
    !category ||
    !systemPrompt ||
    !userPrompt ||
    !Array.isArray(variables)
  ) {
    return res.status(400).json({ message: "缺少必要字段" });
  }

  db.prepare(
    `UPDATE prompt_templates
     SET name = ?,
         scene = ?,
         category = ?,
         description = ?,
         system_prompt = ?,
         user_prompt = ?,
         variables = ?,
         version = version + 1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    name,
    scene,
    category,
    description || null,
    systemPrompt,
    userPrompt,
    JSON.stringify(variables),
    req.params.id
  );

  log("info", "prompt", "更新模板", { template_id: Number(req.params.id) });

  const updated = db
    .prepare("SELECT * FROM prompt_templates WHERE id = ?")
    .get(req.params.id);

  return res.json(parseTemplate(updated));
});

router.delete("/:id", (req, res) => {
  const existing = db
    .prepare("SELECT * FROM prompt_templates WHERE id = ?")
    .get(req.params.id);

  if (!existing) {
    return res.status(404).json({ message: "模板不存在" });
  }

  db.prepare("DELETE FROM prompt_templates WHERE id = ?").run(req.params.id);
  log("info", "prompt", "删除模板", { template_id: Number(req.params.id) });
  return res.status(204).send();
});

module.exports = router;
