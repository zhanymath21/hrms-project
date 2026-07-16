// src/services/leaveService.js

import api from './axios';

const leaveService = {
    // ==========================================
    // LEAVE TYPES
    // ==========================================
    getLeaveTypes: async () => {
        try {
            const response = await api.get('/leaves/types');
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching leave types:', error);
            throw error;
        }
    },

    // ==========================================
    // LEAVE REQUESTS
    // ==========================================
    getLeaves: async (params = {}) => {
        try {
            const response = await api.get('/leaves', { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching leaves:', error);
            throw error;
        }
    },

    // ✅ TAMBAHKAN METHOD INI
    getPendingLeaves: async (params = {}) => {
        try {
            const response = await api.get('/leaves/pending', { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching pending leaves:', error);
            throw error;
        }
    },

    getLeave: async (id) => {
        try {
            const response = await api.get(`/leaves/${id}`);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching leave:', error);
            throw error;
        }
    },

    createLeave: async (data) => {
        try {
            const formData = new FormData();
            Object.keys(data).forEach(key => {
                if (data[key] !== null && data[key] !== undefined) {
                    formData.append(key, data[key]);
                }
            });

            const response = await api.post('/leaves', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error creating leave:', error);
            throw error;
        }
    },

    approveLeave: async (id, notes = null) => {
        try {
            const data = notes ? { notes } : {};
            const response = await api.put(`/leaves/${id}/approve`, data);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error approving leave:', error);
            throw error;
        }
    },

    rejectLeave: async (id, rejection_reason) => {
        try {
            const response = await api.put(`/leaves/${id}/reject`, { rejection_reason });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error rejecting leave:', error);
            throw error;
        }
    },

    cancelLeave: async (id) => {
        try {
            const response = await api.put(`/leaves/${id}/cancel`);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error cancelling leave:', error);
            throw error;
        }
    },

    getPendingApprovals: async () => {
        try {
            const response = await api.get('/leaves/pending-approvals');
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching pending approvals:', error);
            throw error;
        }
    },

    getLeaveStatistics: async (params = {}) => {
        try {
            const response = await api.get('/leaves/statistics', { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching statistics:', error);
            throw error;
        }
    },

    getMyLeaveHistory: async (params = {}) => {
        try {
            const response = await api.get('/leaves/my-history', { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching my history:', error);
            throw error;
        }
    },

    getAuditLogs: async (id) => {
        try {
            const response = await api.get(`/leaves/${id}/audit-logs`);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching audit logs:', error);
            throw error;
        }
    },

    downloadAttachment: async (id) => {
        try {
            const response = await api.get(`/leaves/${id}/download-attachment`, {
                responseType: 'blob',
            });
            return response;
        } catch (error) {
            console.error('❌ Error downloading attachment:', error);
            throw error;
        }
    },

    // ==========================================
    // LEAVE BALANCE
    // ==========================================
    getMyBalance: async () => {
        try {
            const response = await api.get('/my-leave-balance');
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching my balance:', error);
            throw error;
        }
    },

    getAllBalances: async (params = {}) => {
        try {
            const response = await api.get('/leave-balances', { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching all balances:', error);
            throw error;
        }
    },

    updateBalance: async (id, data) => {
        try {
            const response = await api.put(`/leave-balance/${id}`, data);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error updating balance:', error);
            throw error;
        }
    },

    updateCarryForward: async (id, data) => {
        try {
            const response = await api.put(`/leave-balance/${id}/carry-forward`, data);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error updating carry forward:', error);
            throw error;
        }
    },

    getBalanceSummary: async (params = {}) => {
        try {
            const response = await api.get('/leave-balance-summary', { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching balance summary:', error);
            throw error;
        }
    },

    // ==========================================
    // APPROVAL FLOW
    // ==========================================
    getApprovalFlow: async () => {
        try {
            const response = await api.get('/approval-flow');
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching approval flow:', error);
            throw error;
        }
    },

    updateApprovalFlow: async (data) => {
        try {
            const response = await api.post('/approval-flow', data);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error updating approval flow:', error);
            throw error;
        }
    },

    getEmployeeApprovalFlow: async (employeeId) => {
        try {
            const response = await api.get(`/approval-flow/employee/${employeeId}`);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching employee approval flow:', error);
            throw error;
        }
    },

    // ==========================================
    // REPLACEMENT LEAVE
    // ==========================================
    getReplacements: async (params = {}) => {
        try {
            const response = await api.get('/replacement-leaves', { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching replacements:', error);
            throw error;
        }
    },

    createReplacement: async (data) => {
        try {
            const formData = new FormData();
            Object.keys(data).forEach(key => {
                if (data[key] !== null && data[key] !== undefined) {
                    formData.append(key, data[key]);
                }
            });

            const response = await api.post('/replacement-leaves', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error creating replacement:', error);
            throw error;
        }
    },

    approveReplacement: async (id, notes = null) => {
        try {
            const data = notes ? { notes } : {};
            const response = await api.put(`/replacement-leaves/${id}/approve`, data);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error approving replacement:', error);
            throw error;
        }
    },

    rejectReplacement: async (id, rejection_reason) => {
        try {
            const response = await api.put(`/replacement-leaves/${id}/reject`, { rejection_reason });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error rejecting replacement:', error);
            throw error;
        }
    },

    cancelReplacement: async (id) => {
        try {
            const response = await api.put(`/replacement-leaves/${id}/cancel`);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error cancelling replacement:', error);
            throw error;
        }
    },
};

export default leaveService;