// src/pages/context/EmployeeContext.jsx

import React, { createContext, useState, useContext } from 'react';
import api from '../../services/axios';

const EmployeeContext = createContext();

export const useEmployee = () => {
  const context = useContext(EmployeeContext);
  if (!context) {
    throw new Error('useEmployee must be used within an EmployeeProvider');
  }
  return context;
};

export const EmployeeProvider = ({ children }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1
  });

  // Fetch all employees - UPDATE dengan date filters
  const fetchEmployees = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = {
        page: params.page || 1,
        per_page: params.per_page || 15,
        search: params.search || '',
        department_id: params.department_id || '',
        status: params.status || '',
        employment_type: params.employment_type || '',
        // TAMBAHKAN DATE FILTERS
        start_date: params.start_date || '',
        end_date: params.end_date || '',
      };
      
      // Hapus parameter kosong
      Object.keys(queryParams).forEach(key => {
        if (!queryParams[key]) delete queryParams[key];
      });
      
      const response = await api.get('/employees', { params: queryParams });
      
      console.log('Employees response:', response.data);
      
      if (response.data.status === 'success' && response.data.data) {
        const paginatedData = response.data.data;
        setEmployees(paginatedData.data || []);
        setPagination({
          current_page: paginatedData.current_page || 1,
          per_page: paginatedData.per_page || 15,
          total: paginatedData.total || 0,
          last_page: paginatedData.last_page || 1
        });
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.error('Fetch employees error:', err);
      
      if (err.response?.status === 403) {
        setError('Access denied. Only Admin and HR can view employees.');
      } else {
        setError(err.response?.data?.message || 'Failed to fetch employees');
      }
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // Get single employee
  const getEmployeeById = async (id) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching employee with ID:', id);
      
      const response = await api.get(`/employees/${id}`);
      
      console.log('Employee response:', response.data);
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else if (response.data.data) {
        return response.data.data;
      } else {
        return null;
      }
    } catch (err) {
      console.error('Error fetching employee:', err);
      console.error('Error response:', err.response?.data);
      
      if (err.response?.status === 404) {
        setError('Employee not found');
      } else {
        setError(err.response?.data?.message || 'Failed to fetch employee');
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Create new employee
  const addEmployee = async (employeeData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/employees', employeeData);
      
      if (response.data.status === 'success') {
        await fetchEmployees();
        return response.data.data;
      }
      throw new Error('Failed to create employee');
    } catch (err) {
      console.error('Error adding employee:', err);
      setError(err.response?.data?.message || 'Failed to add employee');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update employee
  const updateEmployee = async (id, employeeData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.put(`/employees/${id}`, employeeData);
      
      if (response.data.status === 'success') {
        setEmployees(prev => prev.map(emp => 
          emp.id === id ? { ...emp, ...employeeData } : emp
        ));
        return response.data.data;
      }
      throw new Error('Failed to update employee');
    } catch (err) {
      console.error('Error updating employee:', err);
      setError(err.response?.data?.message || 'Failed to update employee');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete employee
  const deleteEmployee = async (id) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.delete(`/employees/${id}`);
      
      if (response.data.status === 'success') {
        setEmployees(prev => prev.filter(emp => emp.id !== id));
        return true;
      }
      throw new Error('Failed to delete employee');
    } catch (err) {
      console.error('Error deleting employee:', err);
      setError(err.response?.data?.message || 'Failed to delete employee');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ========== IMPORT & EXPORT METHODS ==========

  // Download import template
  const downloadTemplate = async () => {
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
  };

  // Import employees from Excel
  const importEmployees = async (file) => {
    try {
      setLoading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/employees/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (err) {
      console.error('Import employees error:', err);
      setError(err.response?.data?.message || 'Failed to import employees');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Export employees to Excel
  const exportEmployees = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query params
      const queryParams = new URLSearchParams();
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);
      if (params.status) queryParams.append('status', params.status);
      if (params.employment_type) queryParams.append('employment_type', params.employment_type);
      if (params.department_id) queryParams.append('department_id', params.department_id);
      
      const url = `/employees/export${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await api.get(url, {
        responseType: 'blob',
      });
      
      return response;
    } catch (err) {
      console.error('Export employees error:', err);
      setError(err.response?.data?.message || 'Failed to export employees');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <EmployeeContext.Provider value={{
      employees,
      loading,
      error,
      pagination,
      fetchEmployees,
      getEmployeeById,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      // Export & Import methods
      downloadTemplate,
      importEmployees,
      exportEmployees,
    }}>
      {children}
    </EmployeeContext.Provider>
  );
};