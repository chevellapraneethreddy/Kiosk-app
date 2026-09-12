import axios from 'axios';
import { Experience, Style, Generation, SessionResponse, ResultResponse, AdminStats } from '../types';

export const envApiUrl = import.meta.env.VITE_API_URL || '';
export const API_BASE = envApiUrl ? `${envApiUrl.replace(/\/$/, '')}/api` : '/api';

/**
 * Resolves relative backend paths (/uploads/..., /generated/...) to absolute URLs
 * using VITE_API_URL so cross-origin image loading and downloading work seamlessly.
 */
export const resolveMediaUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const backendBase = envApiUrl ? envApiUrl.replace(/\/$/, '') : '';
  return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const api = {
  // Health
  getHealth: async () => {
    const res = await axios.get(`${API_BASE}/health`);
    return res.data;
  },

  // Experiences & Styles
  getExperiences: async (): Promise<Experience[]> => {
    const res = await axios.get(`${API_BASE}/experiences`);
    return res.data;
  },

  getStyles: async (experienceId?: string, category?: string): Promise<Style[]> => {
    const res = await axios.get(`${API_BASE}/styles`, { params: { experienceId, category } });
    return res.data;
  },

  // Sessions
  createSession: async (): Promise<SessionResponse> => {
    const res = await axios.post(`${API_BASE}/sessions`);
    return res.data;
  },

  getSession: async (token: string) => {
    const res = await axios.get(`${API_BASE}/sessions/${token}`);
    return res.data;
  },

  // Uploads
  uploadImage: async (file: File): Promise<{ filePath: string; publicUrl: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await axios.post(`${API_BASE}/uploads`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // Mobile Upload
  mobileUploadPhoto: async (token: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await axios.post(`${API_BASE}/mobile-upload/${token}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getMobileUploadStatus: async (token: string) => {
    const res = await axios.get(`${API_BASE}/mobile-upload/${token}/status`);
    return res.data;
  },

  // Generations
  createGeneration: async (data: {
    sessionId?: string;
    experienceId?: string;
    styleId?: string;
    originalImagePath: string;
    customPrompt?: string;
  }): Promise<Generation> => {
    const res = await axios.post(`${API_BASE}/generations`, data);
    return res.data;
  },

  getGenerationStatus: async (id: string): Promise<Generation> => {
    const res = await axios.get(`${API_BASE}/generations/${id}/status`);
    const data = res.data;
    if (data?.generatedImagePath) {
      data.generatedImagePath = resolveMediaUrl(data.generatedImagePath);
    }
    if (data?.originalImagePath) {
      data.originalImagePath = resolveMediaUrl(data.originalImagePath);
    }
    return data;
  },

  // Results
  getResultByToken: async (token: string): Promise<ResultResponse> => {
    const res = await axios.get(`${API_BASE}/results/${token}`);
    const data = res.data;
    if (data?.generation?.generatedImagePath) {
      data.generation.generatedImagePath = resolveMediaUrl(data.generation.generatedImagePath);
    }
    if (data?.generation?.originalImagePath) {
      data.generation.originalImagePath = resolveMediaUrl(data.generation.originalImagePath);
    }
    return data;
  },

  // Admin API
  adminLogin: async (credentials: { email: string; password: string }) => {
    const res = await axios.post(`${API_BASE}/admin/login`, credentials);
    return res.data;
  },

  getAdminStats: async (token: string): Promise<AdminStats> => {
    const res = await axios.get(`${API_BASE}/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  getAdminGenerations: async (token: string, status?: string) => {
    const res = await axios.get(`${API_BASE}/admin/generations`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { status },
    });
    return res.data;
  },

  createStyle: async (token: string, styleData: any) => {
    const res = await axios.post(`${API_BASE}/admin/styles`, styleData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  updateStyle: async (token: string, id: string, styleData: any) => {
    const res = await axios.put(`${API_BASE}/admin/styles/${id}`, styleData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  deleteStyle: async (token: string, id: string) => {
    const res = await axios.delete(`${API_BASE}/admin/styles/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  triggerCleanup: async (token: string) => {
    const res = await axios.post(`${API_BASE}/admin/cleanup`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },
};
