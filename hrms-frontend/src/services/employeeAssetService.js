// src/services/employeeAssetService.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const employeeAssetService = {
  // Assets
  getAssets: async (params = {}) => {
    const res = await api.get('/employee-assets', { params });
    return res.data.data || [];
  },

  assignAsset: async (data) => {
    const res = await api.post('/employee-assets/assign', data);
    return res.data;
  },

  returnAsset: async (id, data) => {
    const res = await api.post(`/employee-assets/${id}/return`, data);
    return res.data;
  },

  replaceAsset: async (data) => {
    const res = await api.post('/employee-assets/replace', data);
    return res.data;
  },

  getAssetHistory: async (employeeId) => {
    const res = await api.get(`/employee-assets/history/${employeeId}`);
    return res.data.data || [];
  },

  // Documents
  getDocuments: async (employeeId) => {
    const res = await api.get(`/employees/${employeeId}/documents`);
    return res.data.data || [];
  },

  uploadDocument: async (employeeId, formData) => {
    const res = await api.post(`/employees/${employeeId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  deleteDocument: async (documentId) => {
    const res = await api.delete(`/employee-documents/${documentId}`);
    return res.data;
  },

  // Employees
  getEmployees: async () => {
    const res = await api.get('/employees', { params: { per_page: 1000 } });
    return res.data.data?.data || res.data.data || [];
  },
};

export default employeeAssetService;