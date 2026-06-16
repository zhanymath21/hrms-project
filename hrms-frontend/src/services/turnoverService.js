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

const turnoverService = {
  /**
   * Get turnover statistics
   * @param {object} params - { year, department_id }
   */
  getTurnoverStats: async (params = {}) => {
    const res = await api.get('/reports/turnover', { params });
    return res.data.data || res.data;
  },

  /**
   * Get employees who left
   * @param {object} params - { year, month, department_id }
   */
  getResignedEmployees: async (params = {}) => {
    const res = await api.get('/reports/turnover/resigned', { params });
    return res.data.data || res.data || [];
  },

  /**
   * Get turnover rate per department
   */
  getTurnoverByDepartment: async (year) => {
    const res = await api.get('/reports/turnover/by-department', { 
      params: { year: year || new Date().getFullYear() } 
    });
    return res.data.data || res.data || [];
  },

  /**
   * Get turnover rate per month
   */
  getTurnoverByMonth: async (year) => {
    const res = await api.get('/reports/turnover/by-month', { 
      params: { year: year || new Date().getFullYear() } 
    });
    return res.data.data || res.data || [];
  },

  /**
   * Get departments for filter
   */
  getDepartments: async () => {
    const res = await api.get('/departments');
    return res.data.data || res.data || [];
  },
};

export default turnoverService;