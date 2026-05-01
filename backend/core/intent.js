const { generate } = require("./llm");

const INTENT_PROMPT = [
  "你是 Prompt Hub 的意图识别模块。",
  "你的任务是根据用户自由输入，从候选模板中选择最匹配的一项，并抽取可以直接填入模板的变量。",
  "如果缺少关键变量，返回 clarification 并给出一个简短、直接的追问。",
  "如果信息足够支持直接进入模板填写，返回 ready。",
  "只能返回 JSON，不要输出 Markdown，不要解释。",
  'JSON schema: {"template_id":number|null,"type":"ready|clarification","confidence":0-1,"reasoning":"string","prefilled_variables":{},"missing_variables":["string"],"question":"string"}',
].join("\n");

const TEMPLATE_ALIASES = {
  "简历优化": ["简历", "简历优化", "润简历", "改简历", "优化简历", "resume", "cv"],
  "面试准备": ["面试", "面试准备", "模拟面试", "interview"],
  "求职信撰写": ["求职信", "cover letter", "自荐信"],
  "周报生成": ["周报", "日报", "汇报", "总结"],
  "文案润色": ["润色", "文案", "改写", "优化文案", "polish"],
  jd: ["jd", "岗位描述", "职位描述", "job description"],
  resume: ["简历", "履历", "工作经历", "项目经历", "resume", "cv"],
  position: ["岗位", "职位", "role", "position"],
  company: ["公司", "企业", "雇主", "company"],
  strengths: ["优势", "亮点", "卖点", "擅长"],
  content: ["文案", "内容", "文章", "文本"],
  style: ["风格", "语气", "口吻"],
  audience: ["受众", "读者", "用户群体"],
  done: ["完成", "已做", "本周做了", "工作内容"],
  problems: ["问题", "困难", "风险", "阻塞"],
  plan: ["计划", "下周", "后续安排"],
};

function extractJson(text) {
  if (!text) {
    return null;
  }

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch (error) {
    return null;
  }
}

function clampConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Math.max(0, Math.min(1, number));
}

function normalizeText(value) {
  return String(value || "").trim();
}

function findAliasHits(text, aliases) {
  return aliases.filter((alias) => text.includes(alias.toLowerCase())).length;
}

function scoreTemplate(template, loweredInput) {
  const terms = [
    template.name,
    template.scene,
    template.category,
    template.description,
    ...template.variables.map((field) => field.name),
    ...template.variables.map((field) => field.label || ""),
    ...(TEMPLATE_ALIASES[template.name] || []),
  ]
    .map((item) => normalizeText(item).toLowerCase())
    .filter(Boolean);

  const uniqueTerms = Array.from(new Set(terms));
  return uniqueTerms.reduce((score, term) => {
    if (loweredInput.includes(term)) {
      return score + Math.max(1, Math.min(term.length / 2, 4));
    }
    return score;
  }, 0);
}

function pickBestTemplate(templates, input) {
  const loweredInput = normalizeText(input).toLowerCase();
  const ranked = templates
    .map((template) => ({
      template,
      score: scoreTemplate(template, loweredInput),
    }))
    .sort((a, b) => b.score - a.score);

  if (!ranked.length || ranked[0].score <= 0) {
    return null;
  }

  return ranked[0];
}

function extractSection(input, aliases) {
  const lines = normalizeText(input).split(/\n+/);

  for (const line of lines) {
    const normalized = line.trim();
    const lowered = normalized.toLowerCase();
    const hasAlias = aliases.some((alias) => lowered.includes(alias.toLowerCase()));
    if (!hasAlias) {
      continue;
    }

    const parts = normalized.split(/[:：]/);
    if (parts.length >= 2) {
      const value = parts.slice(1).join(":").trim();
      if (value) {
        return value;
      }
    }
  }

  return "";
}

function inferVariables(template, input) {
  const text = normalizeText(input);
  const lowered = text.toLowerCase();
  const prefilled = {};

  for (const field of template.variables) {
    const aliases = TEMPLATE_ALIASES[field.name] || [field.name, field.label || ""];
    const sectionValue = extractSection(text, aliases);

    if (sectionValue) {
      prefilled[field.name] = sectionValue;
      continue;
    }

    if (field.name === "resume" && /简历|resume|cv/.test(lowered) && text.length > 40) {
      prefilled[field.name] = text;
      continue;
    }

    if (field.name === "content" && text.length > 40) {
      prefilled[field.name] = text;
      continue;
    }

    if (field.name === "done" && /周报|日报|汇报/.test(lowered) && text.length > 20) {
      prefilled[field.name] = text;
    }
  }

  if (template.variables.length === 1) {
    const [field] = template.variables;
    if (!prefilled[field.name] && text) {
      prefilled[field.name] = text;
    }
  }

  return prefilled;
}

function buildClarificationQuestion(template, missingFields) {
  const labels = missingFields.map((field) => field.label || field.name);
  if (!labels.length) {
    return "请补充更多信息，我才能准确匹配模板并预填内容。";
  }

  if (labels.length === 1) {
    return `请补充${labels[0]}。`;
  }

  return `还缺少这些信息：${labels.join("、")}。请补充后我再帮你继续。`;
}

function normalizeResult(rawResult, templates, fallbackSource) {
  const template =
    rawResult?.template_id != null
      ? templates.find((item) => item.id === Number(rawResult.template_id))
      : null;

  if (!template && fallbackSource) {
    return fallbackSource;
  }

  if (!template) {
    return {
      type: "clarification",
      template: null,
      confidence: 0,
      prefilled_variables: {},
      missing_variables: [],
      question: "请再具体说明你想完成什么任务，比如优化简历、准备面试或撰写求职信。",
      reasoning: rawResult?.reasoning || "未匹配到合适模板。",
    };
  }

  const inputVariables = rawResult?.prefilled_variables || {};
  const prefilledVariables = {};
  for (const field of template.variables) {
    const value = normalizeText(inputVariables[field.name]);
    if (value) {
      prefilledVariables[field.name] = value;
    }
  }

  const missingFields = template.variables.filter(
    (field) => field.required && !normalizeText(prefilledVariables[field.name])
  );
  const missingNames = missingFields.map((field) => field.name);
  const type =
    rawResult?.type === "ready" && missingFields.length === 0
      ? "ready"
      : "clarification";

  return {
    type,
    template,
    confidence: clampConfidence(rawResult?.confidence),
    prefilled_variables: prefilledVariables,
    missing_variables: missingNames,
    question:
      type === "clarification"
        ? normalizeText(rawResult?.question) || buildClarificationQuestion(template, missingFields)
        : "",
    reasoning: normalizeText(rawResult?.reasoning),
  };
}

function buildHeuristicResult(templates, input) {
  const best = pickBestTemplate(templates, input);
  if (!best) {
    return {
      type: "clarification",
      template: null,
      confidence: 0,
      prefilled_variables: {},
      missing_variables: [],
      question: "请再具体说明你想完成什么任务，比如优化简历、准备面试或撰写求职信。",
      reasoning: "启发式匹配未命中任何模板。",
    };
  }

  const prefilledVariables = inferVariables(best.template, input);
  const missingFields = best.template.variables.filter(
    (field) => field.required && !normalizeText(prefilledVariables[field.name])
  );
  const confidenceBase = Math.min(0.95, 0.35 + best.score / 10);

  return {
    type: missingFields.length === 0 ? "ready" : "clarification",
    template: best.template,
    confidence: confidenceBase,
    prefilled_variables: prefilledVariables,
    missing_variables: missingFields.map((field) => field.name),
    question: buildClarificationQuestion(best.template, missingFields),
    reasoning: `启发式匹配命中模板「${best.template.name}」，score=${best.score.toFixed(2)}。`,
  };
}

function buildUserPrompt({ input, context, templates }) {
  const catalog = templates.map((template) => ({
    id: template.id,
    name: template.name,
    scene: template.scene,
    category: template.category,
    description: template.description,
    variables: template.variables.map((field) => ({
      name: field.name,
      label: field.label || field.name,
      required: Boolean(field.required),
    })),
  }));

  return JSON.stringify(
    {
      input,
      context: context || null,
      templates: catalog,
    },
    null,
    2
  );
}

async function recognizeIntent({ input, context, templates, model }) {
  const heuristic = buildHeuristicResult(templates, input);

  try {
    const llmResponse = await generate({
      model,
      temperature: 0,
      systemPrompt: INTENT_PROMPT,
      userPrompt: buildUserPrompt({ input, context, templates }),
    });
    const parsed = extractJson(llmResponse.result);
    const normalized = normalizeResult(parsed, templates, heuristic);

    return {
      ...normalized,
      source: "llm",
      raw_response: llmResponse.result,
    };
  } catch (error) {
    return {
      ...heuristic,
      source: "heuristic",
      raw_response: error.message,
    };
  }
}

module.exports = {
  recognizeIntent,
};
