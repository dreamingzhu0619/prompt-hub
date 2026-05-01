import axios from 'axios';
import { mockTemplates, mockModels, mockGenerateResult, mockSearchResults, mockKnowledgeFiles, mockKnowledgeSearchResults, mockChatReadyResult, mockChatClarificationResult } from './mock/templates';

const useMock = import.meta.env.VITE_USE_MOCK === 'true';

const http = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export const api = {
  // Templates
  async getTemplates() {
    if (useMock) return mockTemplates;
    const res = await http.get('/prompts');
    return res.data;
  },

  async getTemplate(id) {
    if (useMock) return mockTemplates.find((t) => t.id === id);
    const res = await http.get(`/prompts/${id}`);
    return res.data;
  },

  // Models
  async getModels() {
    if (useMock) return mockModels;
    const res = await http.get('/models');
    return res.data;
  },

  // Search
  async search(query) {
    if (useMock) {
      await new Promise((r) => setTimeout(r, 800));
      return mockSearchResults;
    }
    const res = await http.post('/search', { query });
    return res.data.results;
  },

  // Knowledge
  async getKnowledgeFiles() {
    if (useMock) return mockKnowledgeFiles;
    const res = await http.get('/knowledge');
    return res.data;
  },

  async uploadKnowledgeFile(file) {
    if (useMock) {
      await new Promise((r) => setTimeout(r, 500));
      return { filename: file.name, size: file.size, uploaded_at: new Date().toISOString() };
    }
    const content = await file.text();
    const res = await http.post('/knowledge/upload', {
      filename: file.name,
      content,
    });
    return res.data;
  },

  async deleteKnowledgeFile(filename) {
    if (useMock) {
      await new Promise((r) => setTimeout(r, 300));
      return { success: true };
    }
    const res = await http.delete(`/knowledge/${encodeURIComponent(filename)}`);
    return res.data;
  },

  async searchKnowledge(query) {
    if (useMock) {
      await new Promise((r) => setTimeout(r, 600));
      return mockKnowledgeSearchResults;
    }
    const res = await http.post('/knowledge/search', { query });
    return res.data.results;
  },

  // Chat (Intent Recognition)
  async chat(input, context) {
    if (useMock) {
      await new Promise((r) => setTimeout(r, 1000));
      // Simulate: if input contains "简历" → ready, otherwise → clarification
      if (input.includes('简历') || input.includes('resume')) {
        return mockChatReadyResult;
      }
      return mockChatClarificationResult;
    }
    const res = await http.post('/chat', { input, context });
    return res.data;
  },

  // Intent Feedback
  async intentFeedback(generationId, { correct, note }) {
    if (useMock) {
      await new Promise((r) => setTimeout(r, 300));
      return { success: true };
    }
    const res = await http.patch(`/history/${generationId}`, {
      intent_correct: correct,
      intent_note: note,
    });
    return res.data;
  },

  // Generate
  async generate({ template_id, variables, model, temperature, search_results, knowledge_results }) {
    if (useMock) {
      await new Promise((r) => setTimeout(r, 1500));
      return mockGenerateResult;
    }
    const res = await http.post('/generate', {
      template_id,
      variables,
      model,
      temperature,
      search_results,
      knowledge_results,
    });
    return res.data;
  },
};
