module.exports = [
  {
    name: "简历优化",
    scene: "求职",
    category: "简历",
    description: "根据目标岗位 JD 优化现有简历。",
    system_prompt:
      "你是一位资深HR和职业顾问。请根据用户提供的JD和简历内容，优化简历使其更匹配目标岗位。",
    user_prompt:
      "目标岗位JD：\n{{jd}}\n\n我的简历内容：\n{{resume}}\n\n请帮我优化简历，使其更匹配这个岗位要求。",
    variables: [
      { name: "jd", label: "目标岗位JD", type: "textarea", required: true },
      { name: "resume", label: "当前简历内容", type: "textarea", required: true },
    ],
  },
  {
    name: "面试准备",
    scene: "求职",
    category: "面试",
    description: "生成岗位面试问题和参考回答。",
    system_prompt:
      "你是一位面试辅导专家。请根据岗位信息，为用户生成可能的面试问题及参考回答。",
    user_prompt:
      "岗位名称：{{position}}\n岗位JD：{{jd}}\n\n请生成5个最可能被问到的面试问题，并给出参考回答。",
    variables: [
      { name: "position", label: "岗位名称", type: "text", required: true },
      { name: "jd", label: "岗位JD", type: "textarea", required: true },
    ],
  },
  {
    name: "求职信撰写",
    scene: "求职",
    category: "求职信",
    description: "根据候选人优势和岗位要求生成求职信。",
    system_prompt:
      "你是一位专业的求职信撰写顾问。请根据用户的背景和目标岗位，撰写一封有说服力的求职信。",
    user_prompt:
      "目标公司：{{company}}\n目标岗位：{{position}}\n我的核心优势：{{strengths}}\n\n请帮我撰写一封专业的求职信。",
    variables: [
      { name: "company", label: "目标公司", type: "text", required: true },
      { name: "position", label: "目标岗位", type: "text", required: true },
      { name: "strengths", label: "核心优势", type: "textarea", required: true },
    ],
  },
  {
    name: "周报生成",
    scene: "工作效率",
    category: "汇报",
    description: "把输入工作内容整理成结构化周报。",
    system_prompt:
      "你是一位职场写作助手。请根据用户提供的工作内容，生成结构清晰的周报。",
    user_prompt:
      "本周完成的工作：\n{{done}}\n\n遇到的问题：\n{{problems}}\n\n下周计划：\n{{plan}}\n\n请帮我生成一份结构清晰的周报。",
    variables: [
      { name: "done", label: "本周完成的工作", type: "textarea", required: true },
      { name: "problems", label: "遇到的问题", type: "textarea", required: false },
      { name: "plan", label: "下周计划", type: "textarea", required: false },
    ],
  },
  {
    name: "文案润色",
    scene: "内容创作",
    category: "润色",
    description: "对原始文案按目标风格和受众进行润色。",
    system_prompt:
      "你是一位资深文案编辑。请根据用户要求的风格和目标受众，对文案进行润色优化。",
    user_prompt:
      "原始文案：\n{{content}}\n\n目标风格：{{style}}\n目标受众：{{audience}}\n\n请润色这篇文案。",
    variables: [
      { name: "content", label: "原始文案", type: "textarea", required: true },
      { name: "style", label: "目标风格", type: "text", required: true },
      { name: "audience", label: "目标受众", type: "text", required: false },
    ],
  },
];
