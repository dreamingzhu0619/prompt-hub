const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.join(__dirname, ".env"),
});

function parseList(value, fallback) {
  if (!value) {
    return fallback;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const dataDir = path.join(__dirname, "data");

module.exports = {
  port: Number(process.env.PORT || 3001),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  dbPath: path.resolve(__dirname, process.env.DB_PATH || "./data/app.db"),
  llm: {
    provider: process.env.LLM_PROVIDER || "openai-compatible",
    baseUrl:
      process.env.LLM_BASE_URL ||
      process.env.OPENAI_BASE_URL ||
      process.env.ANTHROPIC_BASE_URL ||
      "https://api.openai.com/v1",
    apiKey:
      process.env.LLM_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_AUTH_TOKEN ||
      "",
    defaultModel:
      process.env.LLM_DEFAULT_MODEL ||
      process.env.OPENAI_MODEL ||
      process.env.ANTHROPIC_MODEL ||
      "gpt-4o-mini",
    models: parseList(process.env.OPENAI_COMPAT_MODELS, [
      "gpt-4o",
      "gpt-4o-mini",
      "deepseek-chat",
    ]),
    anthropicVersion: process.env.ANTHROPIC_VERSION || "2023-06-01",
    maxTokens: Number(process.env.LLM_MAX_TOKENS || 2000),
  },
  paths: {
    root: __dirname,
    dataDir,
  },
};
