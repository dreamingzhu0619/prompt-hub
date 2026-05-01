const express = require("express");
const { db, parseTemplate, log } = require("../db");

const router = express.Router();

const VARIABLE_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function validateVariables(variables) {
  for (const v of variables) {
    if (!v.name || !VARIABLE_NAME_REGEX.test(v.name)) {
      return `变量名 "${v.name || ""}" 格式无效，需使用字母/数字/下划线且以字母或下划线开头`;
    }
    if (!v.label || !String(v.label).trim()) {
      return `变量 "${v.name}" 的展示名称不能为空`;
    }
    if (v.type && !["text", "textarea"].includes(v.type)) {
      return `变量 "${v.name}" 的类型无效，仅支持 text 或 textarea`;
    }
  }
  const names = variables.map((v) => v.name);
  const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
  if (duplicates.length > 0) {
    return `变量名重复: ${[...new Set(duplicates)].join(", ")}`;
  }
  return null;
}

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
    default_tools: defaultTools,
  } = req.body || {};

  if (
    !name ||
    !scene ||
    !category ||
    typeof systemPrompt !== "string" ||
    typeof userPrompt !== "string" ||
    !Array.isArray(variables) ||
    !Array.isArray(defaultTools)
  ) {
    return res.status(400).json({ message: "缺少必要字段" });
  }

  const varError = validateVariables(variables);
  if (varError) {
    return res.status(400).json({ message: varError });
  }

  const result = db
    .prepare(
      `INSERT INTO prompt_templates (
        name, scene, category, description, system_prompt, user_prompt, variables, default_tools
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      name,
      scene,
      category,
      description || null,
      systemPrompt,
      userPrompt,
      JSON.stringify(variables),
      JSON.stringify(defaultTools)
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
    default_tools: defaultTools,
  } = req.body || {};

  if (
    !name ||
    !scene ||
    !category ||
    !systemPrompt ||
    !userPrompt ||
    !Array.isArray(variables) ||
    !Array.isArray(defaultTools)
  ) {
    return res.status(400).json({ message: "缺少必要字段" });
  }

  const varError = validateVariables(variables);
  if (varError) {
    return res.status(400).json({ message: varError });
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
         default_tools = ?,
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
    JSON.stringify(defaultTools),
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
