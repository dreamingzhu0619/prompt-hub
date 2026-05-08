const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const config = require("../config");
const seedPrompts = require("../data/prompts/seed");

const dbDir = path.dirname(config.dbPath);
fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(config.dbPath);
db.pragma("journal_mode = WAL");

function runSchema() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  db.exec(sql);
}

function ensureColumn(tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function seedPromptTemplates() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM prompt_templates").get().count;
  if (count > 0) {
    const updateDefaultTools = db.prepare(`
      UPDATE prompt_templates
      SET default_tools = @default_tools
      WHERE name = @name
        AND scene = @scene
        AND category = @category
        AND (default_tools IS NULL OR default_tools = '' OR default_tools = '[]')
    `);

    const updateMany = db.transaction((prompts) => {
      for (const prompt of prompts) {
        updateDefaultTools.run({
          name: prompt.name,
          scene: prompt.scene,
          category: prompt.category,
          default_tools: JSON.stringify(prompt.default_tools || []),
        });
      }
    });

    updateMany(seedPrompts);
    return;
  }

  const insert = db.prepare(`
    INSERT INTO prompt_templates (
      name, scene, category, description, system_prompt, user_prompt, variables, default_tools
    ) VALUES (
      @name, @scene, @category, @description, @system_prompt, @user_prompt, @variables, @default_tools
    )
  `);

  const insertMany = db.transaction((prompts) => {
    for (const prompt of prompts) {
      insert.run({
        ...prompt,
        variables: JSON.stringify(prompt.variables),
        default_tools: JSON.stringify(prompt.default_tools || []),
      });
    }
  });

  insertMany(seedPrompts);
}

function parseJson(value, fallback = null) {
  if (value == null || value === "") {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function log(level, category, message, metadata) {
  db.prepare(`
    INSERT INTO logs (level, category, message, metadata)
    VALUES (?, ?, ?, ?)
  `).run(level, category, message, metadata ? JSON.stringify(metadata) : null);
}

function parseTemplate(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    variables: JSON.parse(row.variables),
    default_tools: parseJson(row.default_tools, []),
  };
}

runSchema();
ensureColumn("prompt_templates", "default_tools", "TEXT NOT NULL DEFAULT '[]'");
ensureColumn("generations", "search_results", "TEXT");
ensureColumn("generations", "knowledge_results", "TEXT");
ensureColumn("generations", "is_favorite", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("generations", "note", "TEXT");
ensureColumn("generations", "updated_at", "TEXT");
db.exec(
  `UPDATE generations
   SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
   WHERE updated_at IS NULL`
);
db.exec(
  "CREATE INDEX IF NOT EXISTS idx_generations_favorite_created_at ON generations(is_favorite, created_at DESC)"
);
seedPromptTemplates();

module.exports = {
  db,
  log,
  parseJson,
  parseTemplate,
};
