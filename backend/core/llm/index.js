const config = require("../../config");
const { generateCompletion } = require("./openai-compat");
const { generateMessage } = require("./anthropic");

async function generate({ model, temperature, systemPrompt, userPrompt }) {
  const selectedModel = model || config.llm.defaultModel;
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  if (config.llm.provider === "anthropic") {
    return generateMessage({
      baseUrl: config.llm.baseUrl,
      apiKey: config.llm.apiKey,
      model: selectedModel,
      temperature,
      messages,
      anthropicVersion: config.llm.anthropicVersion,
      maxTokens: config.llm.maxTokens,
    });
  }

  return generateCompletion({
    baseUrl: config.llm.baseUrl,
    apiKey: config.llm.apiKey,
    model: selectedModel,
    temperature,
    messages,
  });
}

module.exports = {
  generate,
};
