import axios from 'axios';

const api = axios.create({
  baseURL: 'http://192.168.0.13:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const departmentService = {
  getDepartments: async () => {
    const res = await api.get('/departments');
    const data = res.data.data || res.data;
    return Array.isArray(data) ? data : [];
  },

  getPositions: async (departmentId) => {
    const params = departmentId ? { department_id: departmentId } : {};
    const res = await api.get('/positions', { params });
    const data = res.data.data || res.data;
    return Array.isArray(data) ? data : [];
  },

  createDepartment: async (formData) => {
    const res = await api.post('/departments', {
      name: formData.name,
      code: formData.code,
      description: formData.description || ''
    });
    return res.data;
  },

  updateDepartment: async (id, formData) => {
    const res = await api.put(`/departments/${id}`, {
      name: formData.name,
      code: formData.code,
      description: formData.description || ''
    });
    return res.data;
  },

  deleteDepartment: async (id) => {
    const res = await api.delete(`/departments/${id}`);
    return res.data;
  },

  createPosition: async (formData) => {
    const res = await api.post('/positions', {
      title: formData.title,
      code: formData.code || formData.title.substring(0, 10).toUpperCase().replace(/\s/g, ''),
      department_id: formData.department_id,
      description: formData.description || ''
    });
    return res.data;
  },

  updatePosition: async (id, formData) => {
    const res = await api.put(`/positions/${id}`, {
      title: formData.title,
      code: formData.code || formData.title.substring(0, 10).toUpperCase().replace(/\s/g, ''),
      department_id: formData.department_id,
      description: formData.description || ''
    });
    return res.data;
  },

  deletePosition: async (id) => {
    const res = await api.delete(`/positions/${id}`);
    return res.data;
  },
};

export default departmentService;