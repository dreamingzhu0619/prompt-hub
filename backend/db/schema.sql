CREATE TABLE IF NOT EXISTS prompt_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  scene TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  variables TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS generations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  template_version INTEGER NOT NULL,
  model TEXT NOT NULL,
  temperature REAL NOT NULL DEFAULT 0.7,
  variables TEXT NOT NULL,
  search_results TEXT,
  knowledge_results TEXT,
  rendered_prompt TEXT NOT NULL,
  result TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES prompt_templates(id)
);

CREATE TABLE IF NOT EXISTS execution_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  generation_id INTEGER,
  agent_id TEXT,
  step_type TEXT NOT NULL,
  step_name TEXT NOT NULL,
  input TEXT,
  output TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (generation_id) REFERENCES generations(id)
);

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS intent_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  input TEXT NOT NULL,
  context TEXT,
  model TEXT,
  type TEXT NOT NULL,
  matched_template_id INTEGER,
  confidence REAL NOT NULL DEFAULT 0,
  prefilled_variables TEXT,
  missing_variables TEXT,
  question TEXT,
  reasoning TEXT,
  llm_response TEXT,
  evaluation TEXT,
  evaluation_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matched_template_id) REFERENCES prompt_templates(id)
);

CREATE INDEX IF NOT EXISTS idx_prompt_templates_scene_category
  ON prompt_templates(scene, category);

CREATE INDEX IF NOT EXISTS idx_generations_template_id
  ON generations(template_id);

CREATE INDEX IF NOT EXISTS idx_execution_steps_generation_id
  ON execution_steps(generation_id);

CREATE INDEX IF NOT EXISTS idx_logs_category_created_at
  ON logs(category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_intent_results_template_created_at
  ON intent_results(matched_template_id, created_at DESC);
