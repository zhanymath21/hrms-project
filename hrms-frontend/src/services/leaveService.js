import axios from 'axios';

// ✅ GUNAKAN URL LANGSUNG
const API_BASE_URL = 'http://192.168.0.13:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => {
    if (response.data?.status === 'success' && response.data?.data !== undefined) {
      response.data = response.data.data;
    }
    return response;
  },
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const leaveService = {
  getBalances: async () => {
    const res = await api.get('/leaves/balance');
    const d = res.data || {};
    return {
      data: {
        annual: { 
          total: Number(d.annual?.total || 0), 
          used: Number(d.annual?.used || 0), 
          remaining: Number(d.annual?.remaining || 0) 
        },
        sick: { 
          total: Number(d.sick?.total || 0), 
          used: Number(d.sick?.used || 0), 
          remaining: Number(d.sick?.remaining || 0) 
        },
        special: { 
          total: Number(d.special?.total || 0), 
          used: Number(d.special?.used || 0), 
          remaining: Number(d.special?.remaining || 0) 
        },
      }
    };
  },

  getLeaveTypes: async () => {
    try {
      const res = await api.get('/leave-types');
      return { data: res.data || [] };
    } catch {
      return {
        data: [
          { id: 1, code: 'AL', name: 'Annual Leave' },
          { id: 2, code: 'SL', name: 'Sick Leave' },
          { id: 3, code: 'SPL', name: 'Special Leave' },
        ]
      };
    }
  },

  getLeaveRequests: async () => {
    const res = await api.get('/leaves');
    return { data: Array.isArray(res.data) ? res.data : (res.data?.data || []) };
  },

  submitLeave: async (data) => {
    return api.post('/leaves', {
      leave_type_id: data.leaveTypeId,
      start_date: data.startDate,
      end_date: data.endDate,
      reason: data.reason,
      total_days: data.totalDays,
    });
  },

  submitReplacement: async (data) => {
    return api.post('/replacement-leaves', {
      work_date: data.workDate,
      work_day_type: data.workDayType,
      hours_worked: data.hoursWorked,
      replacement_date: data.replacementDate,
      reason: data.reason,
    });
  },

  approveLeave: async (id) => {
    return api.put(`/leaves/${id}/approve`);
  },

  rejectLeave: async (id, reason) => {
    return api.put(`/leaves/${id}/reject`, { rejection_reason: reason });
  },
};

export default leaveService;