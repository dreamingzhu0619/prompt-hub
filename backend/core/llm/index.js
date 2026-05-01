const config = require("../../config");
const { generateCompletion } = require("./openai-compat");

async function generate({ model, temperature, systemPrompt, userPrompt }) {
  const selectedModel = model || config.llm.defaultModel;
  return generateCompletion({
    baseUrl: config.llm.baseUrl,
    apiKey: config.llm.apiKey,
    model: selectedModel,
    temperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
}

module.exports = {
  generate,
};
