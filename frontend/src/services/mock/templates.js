export const mockTemplates = [
  {
    id: 1,
    name: '简历优化',
    scene: '求职',
    category: '简历',
    system_prompt: '你是一位资深HR和职业顾问。请根据用户提供的JD和简历内容，优化简历使其更匹配目标岗位。',
    user_prompt: '目标岗位JD：\n{{jd}}\n\n我的简历内容：\n{{resume}}\n\n请帮我优化简历，使其更匹配这个岗位要求。',
    variables: [
      { name: 'jd', label: '目标岗位JD', type: 'textarea', required: true },
      { name: 'resume', label: '当前简历内容', type: 'textarea', required: true },
    ],
    version: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: '面试准备',
    scene: '求职',
    category: '面试',
    system_prompt: '你是一位面试辅导专家。请根据岗位信息，为用户生成可能的面试问题及参考回答。',
    user_prompt: '岗位名称：{{position}}\n岗位JD：{{jd}}\n\n请生成5个最可能被问到的面试问题，并给出参考回答。',
    variables: [
      { name: 'position', label: '岗位名称', type: 'text', required: true },
      { name: 'jd', label: '岗位JD', type: 'textarea', required: true },
    ],
    version: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: '求职信撰写',
    scene: '求职',
    category: '求职信',
    system_prompt: '你是一位专业的求职信撰写顾问。请根据用户的背景和目标岗位，撰写一封有说服力的求职信。',
    user_prompt: '目标公司：{{company}}\n目标岗位：{{position}}\n我的核心优势：{{strengths}}\n\n请帮我撰写一封专业的求职信。',
    variables: [
      { name: 'company', label: '目标公司', type: 'text', required: true },
      { name: 'position', label: '目标岗位', type: 'text', required: true },
      { name: 'strengths', label: '核心优势', type: 'textarea', required: true },
    ],
    version: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 4,
    name: '周报生成',
    scene: '工作效率',
    category: '汇报',
    system_prompt: '你是一位职场写作助手。请根据用户提供的工作内容，生成结构清晰的周报。',
    user_prompt: '本周完成的工作：\n{{done}}\n\n遇到的问题：\n{{problems}}\n\n下周计划：\n{{plan}}\n\n请帮我生成一份结构清晰的周报。',
    variables: [
      { name: 'done', label: '本周完成的工作', type: 'textarea', required: true },
      { name: 'problems', label: '遇到的问题', type: 'textarea', required: false },
      { name: 'plan', label: '下周计划', type: 'textarea', required: false },
    ],
    version: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 5,
    name: '文案润色',
    scene: '内容创作',
    category: '润色',
    system_prompt: '你是一位资深文案编辑。请根据用户要求的风格和目标受众，对文案进行润色优化。',
    user_prompt: '原始文案：\n{{content}}\n\n目标风格：{{style}}\n目标受众：{{audience}}\n\n请润色这篇文案。',
    variables: [
      { name: 'content', label: '原始文案', type: 'textarea', required: true },
      { name: 'style', label: '目标风格', type: 'text', required: true },
      { name: 'audience', label: '目标受众', type: 'text', required: false },
    ],
    version: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

export const mockModels = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic' },
  { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'deepseek' },
];

export const mockSearchResults = [
  {
    title: '2024年前端工程师面试高频题目汇总',
    url: 'https://example.com/frontend-interview-2024',
    content: '前端工程师面试中常见的问题包括：React Hooks原理、虚拟DOM diff算法、性能优化方案、TypeScript类型体操、微前端架构设计等。建议候选人重点准备项目经验描述和技术深度问题。',
  },
  {
    title: '如何写出让HR眼前一亮的简历 - 求职指南',
    url: 'https://example.com/resume-tips',
    content: '优秀的简历应该：1. 用数据量化成果（如提升30%性能）；2. 突出与JD匹配的关键词；3. STAR法则描述项目经验；4. 保持一页纸原则；5. 避免千篇一律的自我评价。',
  },
  {
    title: '大厂面试官分享：我们到底在看什么',
    url: 'https://example.com/interviewer-perspective',
    content: '面试官关注的核心能力：解决问题的思路、技术深度与广度、沟通表达能力、团队协作经验、学习能力和成长潜力。技术面试不仅看答案对不对，更看思考过程。',
  },
  {
    title: 'React 18新特性与性能优化实践',
    url: 'https://example.com/react-18-performance',
    content: 'React 18引入了并发特性(Concurrent Features)、自动批处理(Automatic Batching)、Transitions API等。Suspense配合lazy实现代码分割，useDeferredValue优化大列表渲染。',
  },
  {
    title: '2024年互联网行业薪资报告',
    url: 'https://example.com/salary-report-2024',
    content: '根据最新调研，一线城市前端工程师平均薪资：初级15-25K，中级25-40K，高级40-60K，专家/架构师60K+。跳槽涨幅通常在20-30%之间。',
  },
];

export const mockKnowledgeFiles = [
  {
    filename: 'react-hooks-guide.md',
    size: 12480,
    uploaded_at: '2024-03-15T10:30:00Z',
  },
  {
    filename: '前端面试题库.md',
    size: 34560,
    uploaded_at: '2024-03-10T08:00:00Z',
  },
  {
    filename: 'system-design-notes.md',
    size: 8720,
    uploaded_at: '2024-03-08T14:20:00Z',
  },
];

export const mockKnowledgeSearchResults = [
  {
    file: 'react-hooks-guide.md',
    score: 0.92,
    preview: 'useEffect 的清理函数会在组件卸载时执行，也会在依赖变化导致重新执行 effect 之前执行。常见陷阱：在 useEffect 中使用了闭包中的旧值...',
  },
  {
    file: '前端面试题库.md',
    score: 0.85,
    preview: 'React Hooks 相关面试题：1. useState 的更新是同步还是异步？2. useEffect 和 useLayoutEffect 的区别？3. 自定义 Hook 的命名规范和使用场景...',
  },
  {
    file: 'system-design-notes.md',
    score: 0.71,
    preview: '前端状态管理方案对比：Redux vs MobX vs Zustand vs Jotai。在大型应用中推荐使用模块化的状态管理，将全局状态和局部状态分离...',
  },
];

export const mockChatReadyResult = {
  type: 'ready',
  template: {
    id: 1,
    name: '简历优化',
    scene: '求职',
    category: '简历',
  },
  prefilled_variables: {
    jd: '',
    resume: '',
  },
  confidence: 0.92,
  reasoning: '用户明确提到了"简历"和"优化"，与简历优化模板高度匹配。',
};

export const mockChatClarificationResult = {
  id: 2,
  type: 'clarification',
  template: {
    id: 1,
    name: '简历优化',
    scene: '求职',
    category: '简历',
  },
  prefilled_variables: {},
  missing_variables: ['jd', 'resume'],
  question: '您想优化简历以匹配具体岗位，还是想全面润色简历内容？如果是匹配岗位，请提供目标岗位的JD。',
  confidence: 0.65,
  reasoning: '用户表达了简历相关需求，已匹配到简历优化模板，但还缺少必填信息。',
};

export const mockGenerateResult = {
  id: 1,
  result: `## 优化后的简历

### 个人信息
- 姓名：张三
- 邮箱：zhangsan@example.com

### 工作经验

**高级前端工程师 | ABC科技有限公司 | 2021-至今**

- 主导了公司核心产品的前端架构升级，将 React Class 组件迁移至 Hooks，提升了 30% 的开发效率
- 设计并实现了通用组件库，被 5 个团队共 20+ 项目采用
- 优化了首屏加载性能，LCP 从 3.2s 降至 1.1s

### 技能
- 精通 React、TypeScript、Node.js
- 熟悉微前端架构、CI/CD 流程
- 良好的跨团队沟通协作能力`,
  tokens: { prompt: 450, completion: 320, total: 770 },
  cost: 0.012,
  duration_ms: 3200,
};
