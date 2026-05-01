const config = require("../../config");

class SearchConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "SearchConfigError";
    this.statusCode = 500;
  }
}

function normalizeResult(item) {
  return {
    title: String(item?.title || "").trim(),
    url: String(item?.url || "").trim(),
    content: String(item?.content || item?.raw_content || "").trim(),
  };
}

async function webSearch(query) {
  if (!config.tavily.apiKey) {
    throw new SearchConfigError("缺少 TAVILY_API_KEY，无法执行搜索。");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.tavily.timeoutMs);

  let response;
  try {
    response = await fetch(`${config.tavily.baseUrl.replace(/\/$/, "")}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: config.tavily.apiKey,
        query,
        max_results: config.tavily.maxResults,
        include_raw_content: config.tavily.includeRawContent,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("搜索请求超时，请稍后重试。");
      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(`搜索服务响应不是合法 JSON，状态码 ${response.status}`);
  }

  if (!response.ok) {
    const message =
      payload?.detail ||
      payload?.error ||
      payload?.message ||
      `搜索请求失败，状态码 ${response.status}`;
    const err = new Error(message);
    err.statusCode = response.status;
    throw err;
  }

  const results = Array.isArray(payload?.results)
    ? payload.results.map(normalizeResult).filter((item) => item.title || item.url || item.content)
    : [];

  return {
    query,
    results,
    raw: payload,
  };
}

module.exports = {
  webSearch,
  SearchConfigError,
};
