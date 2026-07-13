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
    // LEAVE BALANCE - USING CORRECT ROUTES
    // ==========================================
    
    // My balance (Employee) - ✅ FIXED: added 'employees/' prefix
    getMyBalance: async () => {
        try {
            const response = await api.get('/employees/my-leave-balance');
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching my balance:', error);
            throw error;
        }
    },

    // All balances (HR/Admin) - ✅ FIXED: added 'employees/' prefix
    getAllBalances: async (params = {}) => {
        try {
            const response = await api.get('/employees/leave-balances', { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching all balances:', error);
            throw error;
        }
    },

    // Employee balance by ID (HR/Admin)
    getEmployeeBalance: async (employeeId, params = {}) => {
        try {
            const response = await api.get(`/employees/${employeeId}/leave-balance`, { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching employee balance:', error);
            throw error;
        }
    },

    // Balance detail by ID (HR/Admin)
    getBalanceDetail: async (id) => {
        try {
            const response = await api.get(`/employees/leave-balance/${id}`);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching balance detail:', error);
            throw error;
        }
    },

    // Update balance (HR/Admin)
    updateBalance: async (id, data) => {
        try {
            const response = await api.put(`/employees/leave-balance/${id}`, data);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error updating balance:', error);
            throw error;
        }
    },

    // Balance summary (HR/Admin)
    getBalanceSummary: async (params = {}) => {
        try {
            const response = await api.get('/employees/leave-balance-summary', { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching balance summary:', error);
            throw error;
        }
    },

    // Generate balance for specific employee (HR/Admin)
    generateBalance: async (data) => {
        try {
            const response = await api.post('/employees/generate-balance', data);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error generating balance:', error);
            throw error;
        }
    },

    // Generate all balances (HR/Admin)
    generateAllBalances: async (data = {}) => {
        try {
            const response = await api.post('/employees/generate-all-balances', data);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error generating all balances:', error);
            throw error;
        }
    },

    // Process carry forward (HR/Admin)
    processCarryForward: async (data) => {
        try {
            const response = await api.post('/employees/process-carry-forward', data);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error processing carry forward:', error);
            throw error;
        }
    },

    // Adjustment history (HR/Admin)
    getAdjustmentHistory: async (employeeId, params = {}) => {
        try {
            const response = await api.get(`/employees/leave-balance/${employeeId}/history`, { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching adjustment history:', error);
            throw error;
        }
    },

    // Balance report (HR/Admin)
    getBalanceReport: async (params = {}) => {
        try {
            const response = await api.get('/reports/leave-balance', { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching balance report:', error);
            throw error;
        }
    },

    // ==========================================
    // LEAVE REQUESTS
    // ==========================================
    
    // Get all leaves
    getLeaves: async (params = {}) => {
        try {
            const response = await api.get('/leaves', { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching leaves:', error);
            throw error;
        }
    },

    // Get pending leaves (as approver)
    getPendingLeaves: async (params = {}) => {
        try {
            const response = await api.get('/leaves/pending', { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching pending leaves:', error);
            throw error;
        }
    },

    // Get single leave
    getLeave: async (id) => {
        try {
            const response = await api.get(`/leaves/${id}`);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching leave:', error);
            throw error;
        }
    },

    // Create leave
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

    // Approve leave
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

    // Reject leave
    rejectLeave: async (id, rejection_reason) => {
        try {
            const response = await api.put(`/leaves/${id}/reject`, { rejection_reason });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error rejecting leave:', error);
            throw error;
        }
    },

    // Cancel leave
    cancelLeave: async (id) => {
        try {
            const response = await api.put(`/leaves/${id}/cancel`);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error cancelling leave:', error);
            throw error;
        }
    },

    // Download leave attachment
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

    // Get leave statistics
    getLeaveStatistics: async (params = {}) => {
        try {
            const response = await api.get('/leaves/statistics', { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching statistics:', error);
            throw error;
        }
    },

    // Get my leave history
    getMyLeaveHistory: async (params = {}) => {
        try {
            const response = await api.get('/leaves/my-history', { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching my history:', error);
            throw error;
        }
    },

    // Get employee leaves (HR/Admin)
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
    
    // Get all replacement leaves
    getReplacements: async (params = {}) => {
        try {
            const response = await api.get('/replacement-leaves', { params });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching replacements:', error);
            throw error;
        }
    },

    // Get pending replacement approvals
    getPendingReplacementApprovals: async () => {
        try {
            const response = await api.get('/replacement-leaves/pending-approvals');
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching pending replacement approvals:', error);
            throw error;
        }
    },

    // Get single replacement
    getReplacement: async (id) => {
        try {
            const response = await api.get(`/replacement-leaves/${id}`);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching replacement:', error);
            throw error;
        }
    },

    // Create replacement leave
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

    // Approve replacement
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

    // Reject replacement
    rejectReplacement: async (id, rejection_reason) => {
        try {
            const response = await api.put(`/replacement-leaves/${id}/reject`, { rejection_reason });
            return response.data.data;
        } catch (error) {
            console.error('❌ Error rejecting replacement:', error);
            throw error;
        }
    },

    // Cancel replacement
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

    // Download replacement attachment
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