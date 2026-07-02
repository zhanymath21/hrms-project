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

    getAllBalances: async (params = {}) => {
        const response = await api.get('/employees/leave-balances', { params });
        return response.data.data;
    },

    updateBalance: async (id, data) => {
        const response = await api.put(`/employees/leave-balance/${id}`, data);
        return response.data;
    },

    getBalanceDetail: async (id) => {
        const response = await api.get(`/employees/leave-balance/${id}`);
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
        const response = await api.post('/leaves', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.data;
    },

    approveLeave: async (id, notes = null) => {
        const data = notes ? { notes } : {};
        const response = await api.put(`/leaves/${id}/approve`, data);
        return response.data.data;
    },

    rejectLeave: async (id, rejection_reason) => {
        const response = await api.put(`/leaves/${id}/reject`, { rejection_reason });
        return response.data.data;
    },

    cancelLeave: async (id) => {
        const response = await api.put(`/leaves/${id}/cancel`);
        return response.data;
    },

    downloadLeaveAttachment: async (id) => {
        const response = await api.get(`/leaves/${id}/download-attachment`, {
            responseType: 'blob',
        });
        return response;
    },

    // ========== REPLACEMENT LEAVE ==========
    getReplacements: async (params = {}) => {
        const response = await api.get('/replacement-leaves', { params });
        return response.data.data;
    },

    getPendingReplacementApprovals: async () => {
        const response = await api.get('/replacement-leaves/pending-approvals');
        return response.data.data;
    },

    getReplacement: async (id) => {
        const response = await api.get(`/replacement-leaves/${id}`);
        return response.data.data;
    },

    createReplacement: async (data) => {
        const response = await api.post('/replacement-leaves', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.data;
    },

    approveReplacement: async (id, notes = null) => {
        const data = notes ? { notes } : {};
        const response = await api.put(`/replacement-leaves/${id}/approve`, data);
        return response.data.data;
    },

    rejectReplacement: async (id, rejection_reason) => {
        const response = await api.put(`/replacement-leaves/${id}/reject`, { rejection_reason });
        return response.data.data;
    },

    cancelReplacement: async (id, reason = null) => {
        const data = reason ? { reason } : {};
        const response = await api.put(`/replacement-leaves/${id}/cancel`, data);
        return response.data;
    },

    downloadReplacementAttachment: async (id) => {
        const response = await api.get(`/replacement-leaves/${id}/download-attachment`, {
            responseType: 'blob',
        });
        return response;
    },
};

export default leaveService;