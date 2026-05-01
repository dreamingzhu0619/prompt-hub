const config = require("../../config");
const { generateCompletion } = require("./openai-compat");
const { generateMessage } = require("./anthropic");

function resolveProvider(model) {
  const selectedModel = model || config.llm.defaultModel;
  const modelMeta = config.llm.modelMap.get(selectedModel);

  if (!modelMeta) {
    const error = new Error(`不支持的模型: ${selectedModel}`);
    error.statusCode = 400;
    throw error;
  }

  const provider = config.llm.providers.find(
    (item) => item.key === modelMeta.provider
  );

  if (!provider) {
    const error = new Error(`模型 ${selectedModel} 未配置可用 provider`);
    error.statusCode = 500;
    throw error;
  }

  return {
    model: selectedModel,
    provider,
  };
}

async function generate({ model, temperature, systemPrompt, userPrompt }) {
  const { model: selectedModel, provider } = resolveProvider(model);
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  if (provider.type === "anthropic") {
    return generateMessage({
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      model: selectedModel,
      temperature,
      messages,
      anthropicVersion: provider.anthropicVersion,
      maxTokens: provider.maxTokens,
    });
  }

  return generateCompletion({
    baseUrl: provider.baseUrl,
    apiKey: provider.apiKey,
    model: selectedModel,
    temperature,
    messages,
  });
}

module.exports = {
  generate,
};
