// src/services/recruitmentService.js
import api from './api';
import { handleApiResponse } from '../utils/apiHelper';

const recruitmentService = {
  // Candidates
  getCandidates: async (params = {}) => {
    const response = await api.get('/candidates', { params });
    return handleApiResponse(response);
  },

  getCandidate: async (id) => {
    const response = await api.get(`/candidates/${id}`);
    return response.data?.data || null;
  },

  createCandidate: async (data) => {
    const response = await api.post('/candidates', data);
    return response.data;
  },

  updateCandidate: async (id, data) => {
    const response = await api.put(`/candidates/${id}`, data);
    return response.data;
  },

  deleteCandidate: async (id) => {
    const response = await api.delete(`/candidates/${id}`);
    return response.data;
  },

  uploadCV: async (id, formData) => {
    const response = await api.post(`/candidates/${id}/cv`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Vacancies
  getVacancies: async (params = {}) => {
    const response = await api.get('/vacancies', { params });
    return handleApiResponse(response);
  },

  // Applications
  getApplications: async (params = {}) => {
    const response = await api.get('/applications', { params });
    return handleApiResponse(response);
  },

  // Onboarding
  getOnboarding: async (params = {}) => {
    const response = await api.get('/onboarding', { params });
    return handleApiResponse(response);
  },
};

export default recruitmentService;