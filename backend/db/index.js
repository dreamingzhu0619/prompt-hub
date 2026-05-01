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
    return;
  }

  const insert = db.prepare(`
    INSERT INTO prompt_templates (
      name, scene, category, description, system_prompt, user_prompt, variables
    ) VALUES (
      @name, @scene, @category, @description, @system_prompt, @user_prompt, @variables
    )
  `);

  const insertMany = db.transaction((prompts) => {
    for (const prompt of prompts) {
      insert.run({
        ...prompt,
        variables: JSON.stringify(prompt.variables),
      });
    }
  });

  insertMany(seedPrompts);
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
  };
}

runSchema();
ensureColumn("generations", "search_results", "TEXT");
seedPromptTemplates();

module.exports = {
  db,
  log,
  parseTemplate,
};
