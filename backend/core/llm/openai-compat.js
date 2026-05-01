class LlmConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "LlmConfigError";
    this.statusCode = 500;
  }
}

async function generateCompletion({
  baseUrl,
  apiKey,
  model,
  temperature,
  messages,
}) {
  if (!apiKey) {
    throw new LlmConfigError("缺少 LLM_API_KEY，无法调用模型。");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      messages,
    }),
  });

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(`LLM 响应不是合法 JSON，状态码 ${response.status}`);
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `LLM 请求失败，状态码 ${response.status}`;
    const err = new Error(message);
    err.statusCode = response.status;
    throw err;
  }

  const result = payload?.choices?.[0]?.message?.content || "";
  const usage = payload?.usage || {};

  return {
    result,
    tokens: {
      prompt: usage.prompt_tokens || 0,
      completion: usage.completion_tokens || 0,
      total: usage.total_tokens || 0,
    },
    raw: payload,
  };
}

module.exports = {
  generateCompletion,
  LlmConfigError,
};
