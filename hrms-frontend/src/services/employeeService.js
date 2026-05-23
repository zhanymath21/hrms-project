// src/services/employeeService.js
import api from './api';

const employeeService = {
  // Get all employees
  getAll: async (params = {}) => {
    const response = await api.get('/employees', { params });
    return response.data;
  },

  // Get employee by ID
  getById: async (id) => {
    const response = await api.get(`/employees/${id}`);
    return response.data;
  },

  // Create employee
  create: async (data) => {
    const response = await api.post('/employees', data);
    return response.data;
  },

  // Update employee
  update: async (id, data) => {
    const response = await api.put(`/employees/${id}`, data);
    return response.data;
  },

  // Delete employee
  delete: async (id) => {
    const response = await api.delete(`/employees/${id}`);
    return response.data;
  },

  // Get departments
  getDepartments: async () => {
    const response = await api.get('/departments');
    return response.data;
  },

  // Get positions
  getPositions: async () => {
    const response = await api.get('/positions');
    return response.data;
  },
};

export default employeeService;