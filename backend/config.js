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

function compact(items) {
  return items.filter(Boolean);
}

function createProvider({
  key,
  type,
  baseUrl,
  apiKey,
  defaultModel,
  models,
  anthropicVersion,
  maxTokens,
}) {
  if (!apiKey || !models.length) {
    return null;
  }

  return {
    key,
    type,
    baseUrl,
    apiKey,
    defaultModel,
    models,
    anthropicVersion,
    maxTokens,
  };
}

function buildProviders() {
  const legacyModels = parseList(process.env.OPENAI_COMPAT_MODELS, [
    "gpt-4o",
    "gpt-4o-mini",
    "deepseek-chat",
  ]);
  const maxTokens = Number(process.env.LLM_MAX_TOKENS || 2000);
  const anthropicVersion = process.env.ANTHROPIC_VERSION || "2023-06-01";

  const providers = compact([
    createProvider({
      key: "claude",
      type: "anthropic",
      baseUrl:
        process.env.CLAUDE_BASE_URL ||
        process.env.ANTHROPIC_BASE_URL,
      apiKey:
        process.env.CLAUDE_API_KEY ||
        process.env.ANTHROPIC_AUTH_TOKEN,
      defaultModel:
        process.env.CLAUDE_DEFAULT_MODEL ||
        process.env.ANTHROPIC_MODEL ||
        "claude-opus-4-6",
      models: parseList(process.env.CLAUDE_MODELS, [
        "claude-opus-4-6",
        "claude-sonnet-4-5",
      ]),
      anthropicVersion,
      maxTokens,
    }),
    createProvider({
      key: "deepseek",
      type: "openai-compatible",
      baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
      apiKey: process.env.DEEPSEEK_API_KEY,
      defaultModel: process.env.DEEPSEEK_DEFAULT_MODEL || "deepseek-v4-flash",
      models: parseList(process.env.DEEPSEEK_MODELS, [
        "deepseek-v4-flash",
        "deepseek-v4-pro",
        "deepseek-chat",
      ]),
      maxTokens,
    }),
    createProvider({
      key: "kimi",
      type: "openai-compatible",
      baseUrl:
        process.env.KIMI_BASE_URL ||
        process.env.MOONSHOT_BASE_URL ||
        "https://api.moonshot.ai/v1",
      apiKey:
        process.env.KIMI_API_KEY ||
        process.env.MOONSHOT_API_KEY,
      defaultModel: process.env.KIMI_DEFAULT_MODEL || "kimi-k2.5",
      models: parseList(process.env.KIMI_MODELS, [
        "kimi-k2.5",
        "kimi-k2-turbo-preview",
        "kimi-k2-thinking",
      ]),
      maxTokens,
    }),
    createProvider({
      key: "glm",
      type: "openai-compatible",
      baseUrl:
        process.env.GLM_BASE_URL ||
        process.env.ZAI_BASE_URL ||
        "https://open.bigmodel.cn/api/paas/v4/",
      apiKey:
        process.env.GLM_API_KEY ||
        process.env.ZAI_API_KEY,
      defaultModel: process.env.GLM_DEFAULT_MODEL || "glm-5.1",
      models: parseList(process.env.GLM_MODELS, [
        "glm-5.1",
        "glm-5",
        "glm-4.5-air",
      ]),
      maxTokens,
    }),
  ]);

  if (providers.length > 0) {
    return providers;
  }

  return compact([
    createProvider({
      key: process.env.LLM_PROVIDER || "default",
      type: process.env.LLM_PROVIDER || "openai-compatible",
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
        legacyModels[0],
      models: legacyModels,
      anthropicVersion,
      maxTokens,
    }),
  ]);
}

const providers = buildProviders();
const defaultProvider = providers[0] || null;
const modelCatalog = providers.flatMap((provider) =>
  provider.models.map((id) => ({
    id,
    name: id,
    provider: provider.key,
    protocol: provider.type,
    is_default: id === provider.defaultModel,
  }))
);
const modelMap = new Map(modelCatalog.map((model) => [model.id, model]));

module.exports = {
  port: Number(process.env.PORT || 3001),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  dbPath: path.resolve(__dirname, process.env.DB_PATH || "./data/app.db"),
  llm: {
    provider: defaultProvider?.type || process.env.LLM_PROVIDER || "openai-compatible",
    baseUrl: defaultProvider?.baseUrl || "",
    apiKey: defaultProvider?.apiKey || "",
    defaultModel:
      process.env.LLM_DEFAULT_MODEL ||
      defaultProvider?.defaultModel ||
      modelCatalog[0]?.id ||
      "gpt-4o-mini",
    models: modelCatalog.map((model) => model.id),
    modelCatalog,
    modelMap,
    providers,
    anthropicVersion: defaultProvider?.anthropicVersion || "2023-06-01",
    maxTokens: defaultProvider?.maxTokens || Number(process.env.LLM_MAX_TOKENS || 2000),
  },
  paths: {
    root: __dirname,
    dataDir,
  },
};
