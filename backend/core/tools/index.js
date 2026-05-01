const { webSearch } = require("./web-search");
const { searchKnowledge } = require("../knowledge");

const toolRegistry = {
  web_search: {
    name: "web_search",
    description: "联网搜索公开信息。输入 { query: string }，返回搜索结果列表。",
    async execute(input = {}) {
      const query = String(input.query || "").trim();
      if (!query) {
        const error = new Error("web_search 缺少 query");
        error.statusCode = 400;
        throw error;
      }

      return webSearch(query);
    },
  },
  knowledge_search: {
    name: "knowledge_search",
    description: "检索本地知识库文件。输入 { query: string }，返回最相关的知识片段。",
    async execute(input = {}) {
      const query = String(input.query || "").trim();
      if (!query) {
        const error = new Error("knowledge_search 缺少 query");
        error.statusCode = 400;
        throw error;
      }

      return {
        query,
        results: searchKnowledge(query),
      };
    },
  },
};

function getAllTools() {
  return Object.values(toolRegistry).map(({ name, description }) => ({
    name,
    description,
  }));
}

function resolveEnabledTools(selectedTools) {
  if (Array.isArray(selectedTools)) {
    const names = selectedTools
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    return names.length > 0 ? names : Object.keys(toolRegistry);
  }

  if (selectedTools && typeof selectedTools === "object") {
    const names = Object.entries(selectedTools)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([name]) => name);

    return names.length > 0 ? names : Object.keys(toolRegistry);
  }

  return Object.keys(toolRegistry);
}

function getToolDefinitions(selectedTools) {
  return resolveEnabledTools(selectedTools)
    .map((name) => toolRegistry[name])
    .filter(Boolean)
    .map(({ name, description }) => ({ name, description }));
}

function getToolExecutor(name) {
  return toolRegistry[name] || null;
}

module.exports = {
  getAllTools,
  getToolDefinitions,
  getToolExecutor,
};
