import axios from 'axios';

const api = axios.create({
  baseURL: 'http://192.168.0.13:8000/api',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const ppeService = {
  // Items CRUD
  getItems: async (params = {}) => {
    const res = await api.get('/ppe', { params });
    return res.data.data || res.data;
  },

  getItem: async (id) => {
    const res = await api.get(`/ppe/${id}`);
    return res.data.data;
  },

  createItem: async (data) => {
    const res = await api.post('/ppe', data);
    return res.data;
  },

  updateItem: async (id, data) => {
    const res = await api.put(`/ppe/${id}`, data);
    return res.data;
  },

  deleteItem: async (id) => {
    const res = await api.delete(`/ppe/${id}`);
    return res.data;
  },

  // Actions
  assignItem: async (id, data) => {
    const res = await api.post(`/ppe/${id}/assign`, data);
    return res.data;
  },

  returnItem: async (id) => {
    const res = await api.post(`/ppe/${id}/return`);
    return res.data;
  },

  moveItem: async (id, data) => {
    const res = await api.post(`/ppe/${id}/move`, data);
    return res.data;
  },

  writeOffItem: async (id, data) => {
    const res = await api.post(`/ppe/${id}/write-off`, data);
    return res.data;
  },

  // History
  getHistory: async (id) => {
    const res = await api.get(`/ppe/${id}/history`);
    return res.data.data || [];
  },

  // Categories & Stats
  getCategories: async () => {
    const res = await api.get('/ppe/categories');
    return res.data.data || [];
  },

  getStats: async (params = {}) => {
    const res = await api.get('/ppe/stats', { params });
    return res.data.data || {};
  },

  // Employees
  getEmployees: async () => {
    const res = await api.get('/employees', { params: { per_page: 1000, status: 'active' } });
    return res.data.data?.data || res.data.data || [];
  },
  /** Download import template */
  downloadTemplate: async () => {
    const res = await api.get('/ppe/import/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'PPE_Import_Template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /** Import PPE from Excel */
  importPPE: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/ppe/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },



  /** Export PPE items with filters */
  exportItems: async (params = {}) => {
    const token = localStorage.getItem('token');
    const queryParams = new URLSearchParams();
  
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.format) queryParams.append('format', params.format);
  
    const queryString = queryParams.toString();
    const url = '/ppe/export' + (queryString ? '?' + queryString : '');
  
    return await api.get(url, {
      responseType: 'blob',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
  },
};

export default ppeService;