// src/services/leaveService.js
import api from './axios';

const leaveService = {
    // ==========================================
    // LEAVE BALANCE MANAGEMENT
    // ==========================================

    /**
     * Get all employees leave balances (Admin/HR only)
     * GET /api/employees/leave-balance
     */
    getAllBalances: async (params = {}) => {
        try {
            console.log('📡 Request: GET /employees/leave-balance');
            console.log('🔑 Token exists:', !!localStorage.getItem('token'));
            console.log('📡 Params:', params);
            
            const response = await api.get('/employees/leave-balance', { params });
            console.log('✅ Response:', response.status, '/employees/leave-balance');
            return response.data;
        } catch (error) {
            console.error('❌ Response error:', error);
            if (error.response) {
                console.error('❌ Status:', error.response.status);
                console.error('❌ Data:', error.response.data);
            }
            throw error;
        }
    },

    /**
     * Get my leave balance (Employee)
     * GET /api/employees/leave-balance/my
     */
    getMyBalance: async () => {
        try {
            console.log('📡 Request: GET /employees/leave-balance/my');
            const response = await api.get('/employees/leave-balance/my');
            console.log('✅ My balance fetched successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching my balance:', error);
            throw error;
        }
    },

    /**
     * Update leave balance (Admin/HR only)
     * PUT /api/employees/leave-balance/{id}
     */
    updateBalance: async (id, data) => {
        try {
            console.log(`📡 Request: PUT /employees/leave-balance/${id}`);
            console.log('📡 Data:', data);
            
            const response = await api.put(`/employees/leave-balance/${id}`, data);
            console.log('✅ Balance updated successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Error updating balance:', error);
            if (error.response) {
                console.error('❌ Status:', error.response.status);
                console.error('❌ Data:', error.response.data);
            }
            throw error;
        }
    },

    /**
     * Get balance detail (Admin/HR only)
     * GET /api/employees/leave-balance/{id}
     */
    getBalanceDetail: async (id) => {
        try {
            console.log(`📡 Request: GET /employees/leave-balance/${id}`);
            const response = await api.get(`/employees/leave-balance/${id}`);
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching balance detail:', error);
            throw error;
        }
    },

    /**
     * Get employee balance by ID (Admin/HR only)
     * GET /api/employees/{employeeId}/leave-balance
     */
    getEmployeeBalance: async (employeeId) => {
        try {
            console.log(`📡 Request: GET /employees/${employeeId}/leave-balance`);
            const response = await api.get(`/employees/${employeeId}/leave-balance`);
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching employee balance:', error);
            throw error;
        }
    },

    /**
     * Get adjustment history for employee
     * GET /api/employees/leave-balance/{employeeId}/history
     */
    getAdjustmentHistory: async (employeeId) => {
        try {
            console.log(`📡 Request: GET /employees/leave-balance/${employeeId}/history`);
            const response = await api.get(`/employees/leave-balance/${employeeId}/history`);
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching adjustment history:', error);
            throw error;
        }
    },

    /**
     * Generate balance for employee (Admin/HR only)
     * POST /api/employees/leave-balance/generate
     */
    generateBalance: async (data) => {
        try {
            console.log('📡 Request: POST /employees/leave-balance/generate');
            console.log('📡 Data:', data);
            
            const response = await api.post('/employees/leave-balance/generate', data);
            console.log('✅ Balance generated successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Error generating balance:', error);
            throw error;
        }
    },

    /**
     * Generate balances for all employees (Admin/HR only)
     * POST /api/employees/leave-balance/generate-all
     */
    generateAllBalances: async () => {
        try {
            console.log('📡 Request: POST /employees/leave-balance/generate-all');
            const response = await api.post('/employees/leave-balance/generate-all');
            console.log('✅ All balances generated successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Error generating all balances:', error);
            throw error;
        }
    },

    /**
     * Process carry forward (Admin/HR only)
     * POST /api/employees/leave-balance/carry-forward
     */
    processCarryForward: async (data = {}) => {
        try {
            console.log('📡 Request: POST /employees/leave-balance/carry-forward');
            console.log('📡 Data:', data);
            
            const response = await api.post('/employees/leave-balance/carry-forward', data);
            console.log('✅ Carry forward processed successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Error processing carry forward:', error);
            throw error;
        }
    },

    /**
     * Get balance summary for dashboard
     * GET /api/employees/leave-balance/summary
     */
    getBalanceSummary: async (params = {}) => {
        try {
            console.log('📡 Request: GET /employees/leave-balance/summary');
            console.log('📡 Params:', params);
            
            const response = await api.get('/employees/leave-balance/summary', { params });
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching balance summary:', error);
            throw error;
        }
    },

    // ==========================================
    // LEAVE TYPES
    // ==========================================

    /**
     * Get all leave types
     * GET /api/leave-types
     */
    getLeaveTypes: async () => {
        try {
            console.log('📡 Request: GET /leave-types');
            const response = await api.get('/leave-types');
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching leave types:', error);
            throw error;
        }
    },

    // ==========================================
    // LEAVE REQUESTS
    // ==========================================

    /**
     * Get all leave requests
     * GET /api/leaves
     */
    getLeaveRequests: async (params = {}) => {
        try {
            console.log('📡 Request: GET /leaves');
            console.log('📡 Params:', params);
            
            const response = await api.get('/leaves', { params });
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching leave requests:', error);
            throw error;
        }
    },

    /**
     * Get pending leave requests
     * GET /api/leaves/pending
     */
    getPendingRequests: async (params = {}) => {
        try {
            console.log('📡 Request: GET /leaves/pending');
            console.log('📡 Params:', params);
            
            const response = await api.get('/leaves/pending', { params });
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching pending requests:', error);
            throw error;
        }
    },

    /**
     * Get leave request by ID
     * GET /api/leaves/{id}
     */
    getLeaveRequest: async (id) => {
        try {
            console.log(`📡 Request: GET /leaves/${id}`);
            const response = await api.get(`/leaves/${id}`);
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching leave request:', error);
            throw error;
        }
    },

    /**
     * Create leave request
     * POST /api/leaves
     */
    createLeaveRequest: async (data) => {
        try {
            console.log('📡 Request: POST /leaves');
            console.log('📡 Data:', data);
            
            const response = await api.post('/leaves', data);
            console.log('✅ Leave request created successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Error creating leave request:', error);
            if (error.response) {
                console.error('❌ Status:', error.response.status);
                console.error('❌ Data:', error.response.data);
            }
            throw error;
        }
    },

    /**
     * Approve leave request
     * PUT /api/leaves/{id}/approve
     */
    approveLeave: async (id, data = {}) => {
        try {
            console.log(`📡 Request: PUT /leaves/${id}/approve`);
            console.log('📡 Data:', data);
            
            const response = await api.put(`/leaves/${id}/approve`, data);
            console.log('✅ Leave request approved successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Error approving leave:', error);
            throw error;
        }
    },

    /**
     * Reject leave request
     * PUT /api/leaves/{id}/reject
     */
    rejectLeave: async (id, data = {}) => {
        try {
            console.log(`📡 Request: PUT /leaves/${id}/reject`);
            console.log('📡 Data:', data);
            
            const response = await api.put(`/leaves/${id}/reject`, data);
            console.log('✅ Leave request rejected successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Error rejecting leave:', error);
            throw error;
        }
    },

    /**
     * Cancel leave request
     * PUT /api/leaves/{id}/cancel
     */
    cancelLeave: async (id) => {
        try {
            console.log(`📡 Request: PUT /leaves/${id}/cancel`);
            const response = await api.put(`/leaves/${id}/cancel`);
            console.log('✅ Leave request cancelled successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Error cancelling leave:', error);
            throw error;
        }
    },

    // ==========================================
    // REPLACEMENT LEAVES
    // ==========================================

    /**
     * Get replacement leaves list
     * GET /api/replacement-leaves
     */
    getReplacementLeaves: async (params = {}) => {
        try {
            console.log('📡 Request: GET /replacement-leaves');
            console.log('📡 Params:', params);
            
            const response = await api.get('/replacement-leaves', { params });
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching replacement leaves:', error);
            throw error;
        }
    },

    /**
     * Get pending replacement leaves
     * GET /api/replacement-leaves/pending
     */
    getPendingReplacements: async (params = {}) => {
        try {
            console.log('📡 Request: GET /replacement-leaves/pending');
            console.log('📡 Params:', params);
            
            const response = await api.get('/replacement-leaves/pending', { params });
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching pending replacements:', error);
            throw error;
        }
    },

    /**
     * Request replacement leave
     * POST /api/replacement-leaves
     */
    requestReplacement: async (data) => {
        try {
            console.log('📡 Request: POST /replacement-leaves');
            console.log('📡 Data:', data);
            
            const response = await api.post('/replacement-leaves', data);
            console.log('✅ Replacement request created successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Error requesting replacement:', error);
            throw error;
        }
    },

    /**
     * Approve replacement leave
     * PUT /api/replacement-leaves/{id}/approve
     */
    approveReplacement: async (id, data = {}) => {
        try {
            console.log(`📡 Request: PUT /replacement-leaves/${id}/approve`);
            console.log('📡 Data:', data);
            
            const response = await api.put(`/replacement-leaves/${id}/approve`, data);
            console.log('✅ Replacement approved successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Error approving replacement:', error);
            throw error;
        }
    },

    /**
     * Reject replacement leave
     * PUT /api/replacement-leaves/{id}/reject
     */
    rejectReplacement: async (id, data = {}) => {
        try {
            console.log(`📡 Request: PUT /replacement-leaves/${id}/reject`);
            console.log('📡 Data:', data);
            
            const response = await api.put(`/replacement-leaves/${id}/reject`, data);
            console.log('✅ Replacement rejected successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Error rejecting replacement:', error);
            throw error;
        }
    },

    /**
     * Cancel replacement leave
     * PUT /api/replacement-leaves/{id}/cancel
     */
    cancelReplacement: async (id) => {
        try {
            console.log(`📡 Request: PUT /replacement-leaves/${id}/cancel`);
            const response = await api.put(`/replacement-leaves/${id}/cancel`);
            console.log('✅ Replacement cancelled successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Error cancelling replacement:', error);
            throw error;
        }
    },

    // ==========================================
    // PUBLIC HOLIDAYS
    // ==========================================

    /**
     * Get public holidays
     * GET /api/public-holidays
     */
    getPublicHolidays: async (params = {}) => {
        try {
            console.log('📡 Request: GET /public-holidays');
            console.log('📡 Params:', params);
            
            const response = await api.get('/public-holidays', { params });
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching public holidays:', error);
            throw error;
        }
    },

    // ==========================================
    // LEAVE REPORTS
    // ==========================================

    /**
     * Get leave report
     * GET /api/reports/leaves
     */
    getLeaveReport: async (params = {}) => {
        try {
            console.log('📡 Request: GET /reports/leaves');
            console.log('📡 Params:', params);
            
            const response = await api.get('/reports/leaves', { params });
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching leave report:', error);
            throw error;
        }
    },

    /**
     * Get leave balance report
     * GET /api/reports/leave-balance
     */
    getLeaveBalanceReport: async (params = {}) => {
        try {
            console.log('📡 Request: GET /reports/leave-balance');
            console.log('📡 Params:', params);
            
            const response = await api.get('/reports/leave-balance', { params });
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching leave balance report:', error);
            throw error;
        }
    },

    // ==========================================
    // EXPORT FUNCTIONS
    // ==========================================

    /**
     * Export leaves to CSV
     * GET /api/export/leaves
     */
    exportLeaves: async (params = {}) => {
        try {
            console.log('📡 Request: GET /export/leaves');
            console.log('📡 Params:', params);
            
            const response = await api.get('/export/leaves', { 
                params,
                responseType: 'blob' // For file download
            });
            return response.data;
        } catch (error) {
            console.error('❌ Error exporting leaves:', error);
            throw error;
        }
    },

    /**
     * Export leave balances to CSV
     * GET /api/export/leave-balances
     */
    exportLeaveBalances: async (params = {}) => {
        try {
            console.log('📡 Request: GET /export/leave-balances');
            console.log('📡 Params:', params);
            
            const response = await api.get('/export/leave-balances', { 
                params,
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            console.error('❌ Error exporting leave balances:', error);
            throw error;
        }
    },

    // ==========================================
    // LEAVE STATISTICS
    // ==========================================

    /**
     * Get leave statistics
     * GET /api/leaves/stats
     */
    getLeaveStats: async (params = {}) => {
        try {
            console.log('📡 Request: GET /leaves/stats');
            console.log('📡 Params:', params);
            
            const response = await api.get('/leaves/stats', { params });
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching leave stats:', error);
            throw error;
        }
    },

    /**
     * Get leave calendar
     * GET /api/leaves/calendar
     */
    getLeaveCalendar: async (params = {}) => {
        try {
            console.log('📡 Request: GET /leaves/calendar');
            console.log('📡 Params:', params);
            
            const response = await api.get('/leaves/calendar', { params });
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching leave calendar:', error);
            throw error;
        }
    },

    // ==========================================
    // LEAVE POLICY
    // ==========================================

    /**
     * Get leave policy
     * GET /api/leave-policy
     */
    getLeavePolicy: async () => {
        try {
            console.log('📡 Request: GET /leave-policy');
            const response = await api.get('/leave-policy');
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching leave policy:', error);
            throw error;
        }
    },

    /**
     * Update leave policy (Admin/HR only)
     * PUT /api/leave-policy
     */
    updateLeavePolicy: async (data) => {
        try {
            console.log('📡 Request: PUT /leave-policy');
            console.log('📡 Data:', data);
            
            const response = await api.put('/leave-policy', data);
            console.log('✅ Leave policy updated successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Error updating leave policy:', error);
            throw error;
        }
    },

    // ==========================================
    // LEAVE ENTITLEMENT CALCULATION
    // ==========================================

    /**
     * Calculate leave entitlement for employee
     * POST /api/leaves/calculate-entitlement
     */
    calculateEntitlement: async (data) => {
        try {
            console.log('📡 Request: POST /leaves/calculate-entitlement');
            console.log('📡 Data:', data);
            
            const response = await api.post('/leaves/calculate-entitlement', data);
            return response.data;
        } catch (error) {
            console.error('❌ Error calculating entitlement:', error);
            throw error;
        }
    },

    /**
     * Get leave entitlement for employee
     * GET /api/employees/{employeeId}/leave-entitlement
     */
    getLeaveEntitlement: async (employeeId, params = {}) => {
        try {
            console.log(`📡 Request: GET /employees/${employeeId}/leave-entitlement`);
            console.log('📡 Params:', params);
            
            const response = await api.get(`/employees/${employeeId}/leave-entitlement`, { params });
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching leave entitlement:', error);
            throw error;
        }
    },

    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================

    /**
     * Download file from blob response
     */
    downloadFile: (blob, filename) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    /**
     * Get leave balance status
     */
    getBalanceStatus: (remaining, total) => {
        const percentage = total > 0 ? (remaining / total) * 100 : 0;
        if (percentage <= 20) return { color: 'error', label: 'Critical' };
        if (percentage <= 50) return { color: 'warning', label: 'Low' };
        return { color: 'success', label: 'Good' };
    },

    /**
     * Format leave days
     */
    formatDays: (days) => {
        return Number(days).toFixed(1);
    }
};

export default leaveService;