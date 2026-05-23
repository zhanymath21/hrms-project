// src/pages/contexts/LeaveContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../../services/axios';

const LeaveContext = createContext();

export const useLeave = () => {
  const context = useContext(LeaveContext);
  if (!context) {
    throw new Error('useLeave must be used within a LeaveProvider');
  }
  return context;
};

export const LeaveProvider = ({ children }) => {
  const [leaves, setLeaves] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [replacementLeaves, setReplacementLeaves] = useState([]);
  const [allBalances, setAllBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1
  });

  // Check if token exists before making requests
  const checkAuth = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      setError('Please login to access leave management');
      return false;
    }
    return true;
  };

  // Get leave types
  const fetchLeaveTypes = async () => {
    if (!checkAuth()) return [];
    
    try {
      const response = await api.get('/leave-types');
      if (response.data.status === 'success') {
        setLeaveTypes(response.data.data);
        return response.data.data;
      }
    } catch (err) {
      console.error('Failed to fetch leave types:', err);
      setError(err.response?.data?.message || 'Failed to fetch leave types');
      return [];
    }
  };

  // Get my leave balance
  const fetchMyBalance = async (employeeId = null) => {
    if (!checkAuth()) return null;
    
    try {
      setLoading(true);
      const params = employeeId ? { employee_id: employeeId } : {};
      const response = await api.get('/leaves/balance', { params });
      
      if (response.data.status === 'success') {
        setLeaveBalances(response.data.data.balances || []);
        return response.data.data;
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
      setError(err.response?.data?.message || 'Failed to fetch balance');
      setLeaveBalances([]);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get leave requests
  const fetchLeaves = async (params = {}) => {
    if (!checkAuth()) return null;
    
    try {
      setLoading(true);
      const response = await api.get('/leaves', { params });
      
      if (response.data.status === 'success') {
        setLeaves(response.data.data.data || []);
        setPagination({
          current_page: response.data.data.current_page || 1,
          per_page: response.data.data.per_page || 15,
          total: response.data.data.total || 0,
          last_page: response.data.data.last_page || 1
        });
        return response.data.data;
      }
    } catch (err) {
      console.error('Failed to fetch leaves:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to fetch leaves');
      setLeaves([]);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get all employees balances (Admin/HR only)
  const fetchAllBalances = async (params = {}) => {
    if (!checkAuth()) return null;
    
    try {
      setLoading(true);
      const response = await api.get('/leaves/all-balances', { params });
      
      if (response.data.status === 'success') {
        setAllBalances(response.data.data.data || []);
        setPagination({
          current_page: response.data.data.current_page || 1,
          per_page: response.data.data.per_page || 15,
          total: response.data.data.total || 0,
          last_page: response.data.data.last_page || 1
        });
        return response.data.data;
      }
    } catch (err) {
      console.error('Failed to fetch all balances:', err);
      setError(err.response?.data?.message || 'Failed to fetch balances');
      setAllBalances([]);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Create leave request
  const createLeave = async (data) => {
    if (!checkAuth()) throw new Error('Not authenticated');
    
    try {
      setLoading(true);
      const response = await api.post('/leaves', data);
      
      if (response.data.status === 'success') {
        await fetchLeaves();
        await fetchMyBalance();
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to submit leave');
    } catch (err) {
      console.error('Failed to create leave:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to submit leave';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Approve leave
  const approveLeave = async (id) => {
    if (!checkAuth()) throw new Error('Not authenticated');
    
    try {
      setLoading(true);
      const response = await api.put(`/leaves/${id}/approve`);
      
      if (response.data.status === 'success') {
        await fetchLeaves();
        await fetchAllBalances();
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to approve leave');
    } catch (err) {
      console.error('Failed to approve leave:', err);
      setError(err.response?.data?.message || 'Failed to approve leave');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Reject leave
  const rejectLeave = async (id, reason) => {
    if (!checkAuth()) throw new Error('Not authenticated');
    
    try {
      setLoading(true);
      const response = await api.put(`/leaves/${id}/reject`, { reason });
      
      if (response.data.status === 'success') {
        await fetchLeaves();
        await fetchAllBalances();
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to reject leave');
    } catch (err) {
      console.error('Failed to reject leave:', err);
      setError(err.response?.data?.message || 'Failed to reject leave');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Initialize all data
  const initializeLeave = async () => {
    console.log('Initializing leave data...');
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No token found, cannot initialize leave');
      setError('Please login to access leave management');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      await Promise.all([
        fetchLeaveTypes(),
        fetchMyBalance(),
        fetchLeaves(),
      ]);
      console.log('Leave data initialized successfully');
    } catch (err) {
      console.error('Initialize error:', err);
      setError('Failed to load leave data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const cancelLeave = async (id) => {
  if (!checkAuth()) throw new Error('Not authenticated');
  
  try {
    setLoading(true);
    const response = await api.put(`/leaves/${id}/cancel`);
    
    if (response.data.status === 'success') {
      await fetchLeaves();
      await fetchMyBalance();
      return response.data;
    }
    throw new Error(response.data.message || 'Failed to cancel leave');
  } catch (err) {
    console.error('Failed to cancel leave:', err);
    setError(err.response?.data?.message || 'Failed to cancel leave');
    throw err;
  } finally {
    setLoading(false);
  }
  };
  
  // Get replacement leaves
const fetchReplacementLeaves = async (params = {}) => {
  if (!checkAuth()) return null;
  
  try {
    setLoading(true);
    const response = await api.get('/replacement-leaves', { params });
    
    if (response.data.status === 'success') {
      setReplacementLeaves(response.data.data.data || []);
      return response.data.data;
    }
  } catch (err) {
    console.error('Failed to fetch replacement leaves:', err);
    setReplacementLeaves([]);
    return null;
  } finally {
    setLoading(false);
  }
};

// Create replacement leave
const createReplacementLeave = async (data) => {
  if (!checkAuth()) throw new Error('Not authenticated');
  
  try {
    setLoading(true);
    const response = await api.post('/replacement-leaves', data);
    
    if (response.data.status === 'success') {
      await fetchReplacementLeaves();
      await fetchMyBalance();
      return response.data;
    }
    throw new Error(response.data.message || 'Failed to submit replacement');
  } catch (err) {
    console.error('Failed to create replacement:', err);
    setError(err.response?.data?.message || 'Failed to submit replacement');
    throw err;
  } finally {
    setLoading(false);
  }
};

// Approve replacement leave (Admin/HR only)
const approveReplacement = async (id) => {
  if (!checkAuth()) throw new Error('Not authenticated');
  
  try {
    setLoading(true);
    const response = await api.put(`/replacement-leaves/${id}/approve`);
    
    if (response.data.status === 'success') {
      await fetchReplacementLeaves();
      await fetchAllBalances();
      return response.data;
    }
    throw new Error(response.data.message || 'Failed to approve replacement');
  } catch (err) {
    console.error('Failed to approve replacement:', err);
    setError(err.response?.data?.message || 'Failed to approve replacement');
    throw err;
  } finally {
    setLoading(false);
  }
};

// Reject replacement leave (Admin/HR only)
const rejectReplacement = async (id, reason) => {
  if (!checkAuth()) throw new Error('Not authenticated');
  
  try {
    setLoading(true);
    const response = await api.put(`/replacement-leaves/${id}/reject`, { reason });
    
    if (response.data.status === 'success') {
      await fetchReplacementLeaves();
      return response.data;
    }
    throw new Error(response.data.message || 'Failed to reject replacement');
  } catch (err) {
    console.error('Failed to reject replacement:', err);
    setError(err.response?.data?.message || 'Failed to reject replacement');
    throw err;
  } finally {
    setLoading(false);
  }
};

  // Auto initialize on mount
  useEffect(() => {
    initializeLeave();
  }, []);

  return (
    <LeaveContext.Provider value={{
      leaves,
      leaveBalances,
      leaveTypes,
      replacementLeaves,
      allBalances,
      loading,
      error,
      pagination,
      cancelLeave,
      fetchLeaveTypes,
      fetchMyBalance,
      fetchAllBalances,
      fetchLeaves,
      createLeave,
      approveLeave,
      rejectLeave,
      fetchReplacementLeaves,
      createReplacementLeave,
      approveReplacement,
      rejectReplacement,
      initializeLeave,
    }}>
      {children}
    </LeaveContext.Provider>
  );
};