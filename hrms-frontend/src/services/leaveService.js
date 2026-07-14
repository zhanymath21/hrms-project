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
    // LEAVE BALANCE - UPDATED ROUTES
    // ==========================================
    
    // My balance (Employee)
    getMyBalance: async () => {
        try {
            const response = await api.get('/my-leave-balance'); // ✅ No 'employees/' prefix
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching my balance:', error);
            throw error;
        }
    },

    // All balances (Admin/HR)
    getAllBalances: async (params = {}) => {
        try {
            const response = await api.get('/leave-balances', { params }); // ✅ No 'employees/' prefix
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching all balances:', error);
            throw error;
        }
    },

    // Employee balance by ID (Admin/HR)
    getEmployeeBalance: async (employeeId, params = {}) => {
        try {
            const response = await api.get(`/employee-balance/${employeeId}`, { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching employee balance:', error);
            throw error;
        }
    },

    // Balance detail by ID (Admin/HR)
    getBalanceDetail: async (id) => {
        try {
            const response = await api.get(`/leave-balance/${id}`);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching balance detail:', error);
            throw error;
        }
    },

    // Update balance (Admin/HR)
    updateBalance: async (id, data) => {
        try {
            const response = await api.put(`/leave-balance/${id}`, data);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error updating balance:', error);
            throw error;
        }
    },

    // Balance summary (Admin/HR)
    getBalanceSummary: async (params = {}) => {
        try {
            const response = await api.get('/leave-balance-summary', { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching balance summary:', error);
            throw error;
        }
    },

    // Generate balance for specific employee (Admin/HR)
    generateBalance: async (data) => {
        try {
            const response = await api.post('/generate-balance', data);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error generating balance:', error);
            throw error;
        }
    },

    // Generate all balances (Admin/HR)
    generateAllBalances: async (data = {}) => {
        try {
            const response = await api.post('/generate-all-balances', data);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error generating all balances:', error);
            throw error;
        }
    },

    // Process carry forward (Admin/HR)
    processCarryForward: async (data) => {
        try {
            const response = await api.post('/process-carry-forward', data);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error processing carry forward:', error);
            throw error;
        }
    },

    // Adjustment history (Admin/HR)
    getAdjustmentHistory: async (employeeId, params = {}) => {
        try {
            const response = await api.get(`/leave-balance-history/${employeeId}`, { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching adjustment history:', error);
            throw error;
        }
    },

    // Balance report (Admin/HR)
    getBalanceReport: async (params = {}) => {
        try {
            const response = await api.get('/leave-balance-report', { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching balance report:', error);
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

    downloadLeaveAttachment: async (id) => {
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

    getEmployeeLeaves: async (employeeId, params = {}) => {
        try {
            const response = await api.get(`/leaves/employee/${employeeId}`, { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching employee leaves:', error);
            throw error;
        }
    },

    // ==========================================
    // REPLACEMENT LEAVES
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

    getPendingReplacementApprovals: async () => {
        try {
            const response = await api.get('/replacement-leaves/pending-approvals');
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching pending replacement approvals:', error);
            throw error;
        }
    },

    getReplacement: async (id) => {
        try {
            const response = await api.get(`/replacement-leaves/${id}`);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching replacement:', error);
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

    cancelReplacement: async (id, reason = null) => {
        try {
            const data = reason ? { reason } : {};
            const response = await api.put(`/replacement-leaves/${id}/cancel`, data);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error cancelling replacement:', error);
            throw error;
        }
    },

    downloadReplacementAttachment: async (id) => {
        try {
            const response = await api.get(`/replacement-leaves/${id}/download-attachment`, {
                responseType: 'blob',
            });
            return response;
        } catch (error) {
            console.error('❌ Error downloading replacement attachment:', error);
            throw error;
        }
    },

    // ==========================================
    // PUBLIC HOLIDAYS
    // ==========================================
    getPublicHolidays: async (params = {}) => {
        try {
            const response = await api.get('/public-holidays', { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching public holidays:', error);
            throw error;
        }
    },

    // ==========================================
    // APPROVAL FLOW
    // ==========================================
    getApprovalFlow: async (params = {}) => {
        try {
            const response = await api.get('/approval-flow', { params });
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
};

export default leaveService;