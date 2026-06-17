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

const ppeCategoryService = {
  getCategories: async () => {
    const res = await api.get('/ppe/categories');
    return res.data.data || [];
  },

  createCategory: async (data) => {
    const res = await api.post('/ppe/categories', data);
    return res.data;
  },

  updateCategory: async (id, data) => {
    const res = await api.put(`/ppe/categories/${id}`, data);
    return res.data;
  },

  deleteCategory: async (id) => {
    const res = await api.delete(`/ppe/categories/${id}`);
    return res.data;
  },
};

export default ppeCategoryService;