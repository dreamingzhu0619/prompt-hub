const { LlmConfigError } = require("./openai-compat");

function extractText(content) {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .filter((item) => item && item.type === "text")
    .map((item) => item.text || "")
    .join("\n");
}

async function generateMessage({
  baseUrl,
  apiKey,
  model,
  temperature,
  messages,
  anthropicVersion,
  maxTokens,
}) {
  if (!apiKey) {
    throw new LlmConfigError("缺少 LLM_API_KEY，无法调用模型。");
  }

  const systemMessage = messages.find((message) => message.role === "system");
  const userMessages = messages.filter((message) => message.role !== "system");

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": anthropicVersion,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      system: systemMessage?.content || undefined,
      messages: userMessages,
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

  const inputTokens =
    payload?.usage?.input_tokens ||
    payload?.usage?.cache_creation_input_tokens ||
    0;
  const outputTokens = payload?.usage?.output_tokens || 0;

  return {
    result: extractText(payload?.content),
    tokens: {
      prompt: inputTokens,
      completion: outputTokens,
      total: inputTokens + outputTokens,
    },
    raw: payload,
  };
}

module.exports = {
  generateMessage,
};
