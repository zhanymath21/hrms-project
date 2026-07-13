// src/services/leaveService.js

import api from './axios';

const leaveService = {
    // ========== LEAVE TYPES ==========
    getLeaveTypes: async () => {
        // 🔥 Gunakan route /leaves/types (sudah ada)
        const response = await api.get('/leaves/types');
        return response.data.data;
    },

    // ========== LEAVE BALANCE ==========
    getMyBalance: async () => {
        // 🔥 Gunakan route /leave-balances/my
        const response = await api.get('/leave-balances/my');
        return response.data.data;
    },

    getAllBalances: async (params = {}) => {
        // 🔥 Gunakan route /leave-balances
        const response = await api.get('/leave-balances', { params });
        return response.data.data;
    },

    updateBalance: async (id, data) => {
        // 🔥 Gunakan route /leave-balances/{id}
        const response = await api.put(`/leave-balances/${id}`, data);
        return response.data;
    },

    getBalanceDetail: async (id) => {
        // 🔥 Gunakan route /leave-balances/{id}
        const response = await api.get(`/leave-balances/${id}`);
        return response.data.data;
    },

    getBalanceHistory: async (employeeId) => {
        // 🔥 Gunakan route /leave-balances/{employeeId}/history
        const response = await api.get(`/leave-balances/${employeeId}/history`);
        return response.data.data;
    },

    getBalanceSummary: async () => {
        // 🔥 Gunakan route /leave-balances/summary
        const response = await api.get('/leave-balances/summary');
        return response.data.data;
    },

    generateBalance: async (employeeId = null) => {
        // 🔥 Gunakan route /leave-balances/generate
        const data = employeeId ? { employee_id: employeeId } : {};
        const response = await api.post('/leave-balances/generate', data);
        return response.data;
    },

    generateAllBalances: async () => {
        // 🔥 Gunakan route /leave-balances/generate-all
        const response = await api.post('/leave-balances/generate-all');
        return response.data;
    },

    processCarryForward: async (year = null) => {
        // 🔥 Gunakan route /leave-balances/carry-forward
        const data = year ? { year } : {};
        const response = await api.post('/leave-balances/carry-forward', data);
        return response.data;
    },

    // ========== LEAVE REQUESTS ==========
    getLeaves: async (params = {}) => {
        // 🔥 Gunakan route /leaves
        const response = await api.get('/leaves', { params });
        return response.data.data;
    },

    getPendingLeaves: async (params = {}) => {
        // 🔥 Gunakan route /leaves/pending
        const response = await api.get('/leaves/pending', { params });
        return response.data.data;
    },

    getLeave: async (id) => {
        // 🔥 Gunakan route /leaves/{id}
        const response = await api.get(`/leaves/${id}`);
        return response.data.data;
    },

    createLeave: async (data) => {
        // 🔥 Gunakan route /leaves
        const response = await api.post('/leaves', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.data;
    },

    approveLeave: async (id, notes = null) => {
        // 🔥 Gunakan route /leaves/{id}/approve
        const data = notes ? { notes } : {};
        const response = await api.put(`/leaves/${id}/approve`, data);
        return response.data.data;
    },

    rejectLeave: async (id, rejection_reason) => {
        // 🔥 Gunakan route /leaves/{id}/reject
        const response = await api.put(`/leaves/${id}/reject`, { rejection_reason });
        return response.data.data;
    },

    cancelLeave: async (id) => {
        // 🔥 Gunakan route /leaves/{id}/cancel
        const response = await api.put(`/leaves/${id}/cancel`);
        return response.data;
    },

    downloadLeaveAttachment: async (id) => {
        // 🔥 Gunakan route /leaves/{id}/download-attachment
        const response = await api.get(`/leaves/${id}/download-attachment`, {
            responseType: 'blob',
        });
        return response;
    },

    // ========== REPLACEMENT LEAVE ==========
    getReplacements: async (params = {}) => {
        // 🔥 Gunakan route /replacement-leaves
        const response = await api.get('/replacement-leaves', { params });
        return response.data.data;
    },

    getPendingReplacementApprovals: async () => {
        // 🔥 Gunakan route /replacement-leaves/pending-approvals
        const response = await api.get('/replacement-leaves/pending-approvals');
        return response.data.data;
    },

    getReplacement: async (id) => {
        // 🔥 Gunakan route /replacement-leaves/{id}
        const response = await api.get(`/replacement-leaves/${id}`);
        return response.data.data;
    },

    createReplacement: async (data) => {
        // 🔥 Gunakan route /replacement-leaves
        const response = await api.post('/replacement-leaves', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.data;
    },

    approveReplacement: async (id, notes = null) => {
        // 🔥 Gunakan route /replacement-leaves/{id}/approve
        const data = notes ? { notes } : {};
        const response = await api.put(`/replacement-leaves/${id}/approve`, data);
        return response.data.data;
    },

    rejectReplacement: async (id, rejection_reason) => {
        // 🔥 Gunakan route /replacement-leaves/{id}/reject
        const response = await api.put(`/replacement-leaves/${id}/reject`, { rejection_reason });
        return response.data.data;
    },

    cancelReplacement: async (id, reason = null) => {
        // 🔥 Gunakan route /replacement-leaves/{id}/cancel
        const data = reason ? { reason } : {};
        const response = await api.put(`/replacement-leaves/${id}/cancel`, data);
        return response.data;
    },

    downloadReplacementAttachment: async (id) => {
        // 🔥 Gunakan route /replacement-leaves/{id}/download-attachment
        const response = await api.get(`/replacement-leaves/${id}/download-attachment`, {
            responseType: 'blob',
        });
        return response;
    },
};

export default leaveService;