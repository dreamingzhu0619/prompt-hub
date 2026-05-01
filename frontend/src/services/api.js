import axios from 'axios';
import { mockTemplates, mockModels, mockGenerateResult } from './mock/templates';

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

  // Generate
  async generate({ template_id, variables, model, temperature }) {
    if (useMock) {
      await new Promise((r) => setTimeout(r, 1500));
      return mockGenerateResult;
    }
    const res = await http.post('/generate', {
      template_id,
      variables,
      model,
      temperature,
    });
    return res.data;
  },
};
