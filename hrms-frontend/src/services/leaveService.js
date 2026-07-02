// src/services/leaveService.js

import api from './axios';

const leaveService = {
    // ========== LEAVE TYPES ==========
    getLeaveTypes: async () => {
        const response = await api.get('/leave-types');
        return response.data.data;
    },

    // ========== LEAVE BALANCE ==========
    getMyBalance: async () => {
        const response = await api.get('/employees/my-leave-balance');
        return response.data.data;
    },

    getEmployeeBalance: async (employeeId) => {
        const response = await api.get(`/employees/${employeeId}/leave-balance`);
        return response.data.data;
    },

    // 🔥 PERBAIKI INI - Gunakan route yang benar
    getAllBalances: async (params = {}) => {
        const response = await api.get('/employees/leave-balances', { params });
        return response.data.data;
    },

    getBalanceDetail: async (id) => {
        const response = await api.get(`/employees/leave-balance/${id}`);
        return response.data.data;
    },

    updateBalance: async (id, data) => {
        const response = await api.put(`/employees/leave-balance/${id}`, data);
        return response.data;
    },

    getAdjustmentHistory: async (employeeId) => {
        const response = await api.get(`/employees/leave-balance/${employeeId}/history`);
        return response.data.data;
    },

    generateBalance: async (employeeId = null) => {
        const data = employeeId ? { employee_id: employeeId } : {};
        const response = await api.post('/employees/generate-balance', data);
        return response.data;
    },

    generateAllBalances: async () => {
        const response = await api.post('/employees/generate-all-balances');
        return response.data;
    },

    processCarryForward: async (year = null) => {
        const data = year ? { year } : {};
        const response = await api.post('/employees/process-carry-forward', data);
        return response.data;
    },

    getBalanceSummary: async (params = {}) => {
        const response = await api.get('/employees/leave-balance-summary', { params });
        return response.data.data;
    },

    // ========== LEAVE REQUESTS ==========
    getLeaves: async (params = {}) => {
        const response = await api.get('/leaves', { params });
        return response.data.data;
    },

    getPendingLeaves: async (params = {}) => {
        const response = await api.get('/leaves/pending', { params });
        return response.data.data;
    },

    getLeave: async (id) => {
        const response = await api.get(`/leaves/${id}`);
        return response.data.data;
    },

    createLeave: async (data) => {
        const response = await api.post('/leaves', data);
        return response.data.data;
    },

    approveLeave: async (id) => {
        const response = await api.put(`/leaves/${id}/approve`);
        return response.data;
    },

    rejectLeave: async (id, reason) => {
        const response = await api.put(`/leaves/${id}/reject`, { reason });
        return response.data;
    },

    cancelLeave: async (id) => {
        const response = await api.put(`/leaves/${id}/cancel`);
        return response.data;
    },

    // ========== REPLACEMENT LEAVES ==========
    getReplacements: async (params = {}) => {
        const response = await api.get('/replacement-leaves', { params });
        return response.data.data;
    },

    getPendingReplacements: async (params = {}) => {
        const response = await api.get('/replacement-leaves/pending', { params });
        return response.data.data;
    },

    createReplacement: async (data) => {
        const response = await api.post('/replacement-leaves', data);
        return response.data.data;
    },

    approveReplacement: async (id) => {
        const response = await api.put(`/replacement-leaves/${id}/approve`);
        return response.data;
    },

    rejectReplacement: async (id, reason) => {
        const response = await api.put(`/replacement-leaves/${id}/reject`, { reason });
        return response.data;
    },

    cancelReplacement: async (id, reason) => {
        const response = await api.put(`/replacement-leaves/${id}/cancel`, { reason });
        return response.data;
    },
};

export default leaveService;