// src/pages/contexts/AttendanceContext.jsx
import React, { createContext, useState, useContext } from 'react'; // ✅ Pastikan import React
import api from '../../services/axios';

const AttendanceContext = createContext();

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};

export const AttendanceProvider = ({ children }) => {
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [activeSchedule, setActiveSchedule] = useState(null);
  const [officeLocations, setOfficeLocations] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [attendancePagination, setAttendancePagination] = useState({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get today's attendance status
  const getTodayAttendance = async () => {
    try {
      setLoading(true);
      const response = await api.get('/attendance/today');
      
      if (response.data.status === 'success') {
        setTodayAttendance(response.data.data);
        return response.data.data;
      }
    } catch (err) {
      console.error('Today attendance error:', err);
      setError(err.response?.data?.message || 'Failed to fetch attendance');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch all attendances (for admin report)
  const fetchAttendances = async (params = {}) => {
    try {
      setLoading(true);
      const queryParams = {
        page: params.page || 1,
        per_page: params.per_page || 15,
        search: params.search || '',
        status: params.status || '',
        department_id: params.department_id || '',
        employee_id: params.employee_id || '',
        start_date: params.start_date || '',
        end_date: params.end_date || '',
      };
      
      const response = await api.get('/attendance/history', { params: queryParams });
      
      if (response.data.status === 'success') {
        const data = response.data.data;
        setAttendances(data.data || []);
        setAttendancePagination({
          current_page: data.current_page || 1,
          per_page: data.per_page || 15,
          total: data.total || 0,
          last_page: data.last_page || 1
        });
        return response.data;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch attendances');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Check-in
  const checkIn = async (data) => {
    try {
      setLoading(true);
      const response = await api.post('/attendance/check-in', data);
      
      if (response.data.status === 'success') {
        await getTodayAttendance();
        return response.data.data;
      }
      throw new Error(response.data.message || 'Check-in failed');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to check-in';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Check-out
  const checkOut = async (data) => {
    try {
      setLoading(true);
      const response = await api.post('/attendance/check-out', data);
      
      if (response.data.status === 'success') {
        await getTodayAttendance();
        return response.data.data;
      }
      throw new Error(response.data.message || 'Check-out failed');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to check-out';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Get active schedule
  const getActiveSchedule = async () => {
    try {
      const response = await api.get('/current-schedule');
      
      if (response.data.status === 'success') {
        setActiveSchedule(response.data.data);
        return response.data.data;
      }
      return null;
    } catch (err) {
      console.error('Active schedule error:', err);
      setActiveSchedule(null);
      return null;
    }
  };

  // Get office locations
  const getOfficeLocations = async () => {
    try {
      const response = await api.get('/office-locations');
      
      if (response.data.status === 'success') {
        setOfficeLocations(response.data.data);
        return response.data.data;
      }
      return [];
    } catch (err) {
      console.error('Office locations error:', err);
      return [];
    }
  };

  // Check if employee can perform attendance
  const canPerformAttendance = async () => {
    const schedule = await getActiveSchedule();
    const offices = await getOfficeLocations();
    
    if (!schedule) {
      throw new Error('Anda belum memiliki jadwal kerja aktif. Silakan hubungi HR untuk mendapatkan shift.');
    }
    
    if (!offices || offices.length === 0) {
      throw new Error('Tidak ada lokasi kantor yang terdaftar. Silakan hubungi administrator.');
    }
    
    return { schedule, offices };
  };

  // Get monthly report
  const getMonthlyReport = async (month = null, year = null, employeeId = null) => {
    try {
      setLoading(true);
      const params = {};
      if (month) params.month = month;
      if (year) params.year = year;
      if (employeeId) params.employee_id = employeeId;
      
      const response = await api.get('/attendance/report', { params });
      
      if (response.data.status === 'success') {
        setMonthlyReport(response.data.data);
        return response.data.data;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch report');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AttendanceContext.Provider value={{
      todayAttendance,
      monthlyReport,
      activeSchedule,
      officeLocations,
      attendances,
      attendancePagination,
      loading,
      error,
      getActiveSchedule,
      getOfficeLocations,
      getTodayAttendance,
      fetchAttendances,
      checkIn,
      checkOut,
      getMonthlyReport,
      canPerformAttendance,
    }}>
      {children}
    </AttendanceContext.Provider>
  );
};