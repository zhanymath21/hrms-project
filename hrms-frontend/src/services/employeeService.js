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

    // Download import template
  downloadTemplate: async () => {
    try {
      const response = await api.get('/employees/import/template', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Employee_Import_Template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download template error:', error);
      throw error;
    }
  },

  // Import employees from Excel
  importEmployees: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/employees/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Import employees error:', error);
      throw error;
    }
  },

  // Export employees to Excel
  exportEmployees: async (params = {}) => {
    try {
      const response = await api.get('/employees/export', {
        params,
        responseType: 'blob',
      });
      return response;
    } catch (error) {
      console.error('Export employees error:', error);
      throw error;
    }
  },

};

export default employeeService;