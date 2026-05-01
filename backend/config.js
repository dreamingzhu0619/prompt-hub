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
    baseUrl: process.env.LLM_BASE_URL || "https://api.openai.com/v1",
    apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "",
    defaultModel: process.env.LLM_DEFAULT_MODEL || "gpt-4o-mini",
    models: parseList(process.env.OPENAI_COMPAT_MODELS, [
      "gpt-4o",
      "gpt-4o-mini",
      "deepseek-chat",
    ]),
  },
  paths: {
    root: __dirname,
    dataDir,
  },
};
