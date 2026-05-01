import axios from 'axios';
import { mockTemplates, mockModels, mockGenerateResult, mockSearchResults, mockKnowledgeFiles, mockKnowledgeSearchResults } from './mock/templates';

const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

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
    const form = new FormData();
    form.append('file', file);
    const res = await http.post('/knowledge/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
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
