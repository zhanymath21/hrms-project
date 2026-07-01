// src/services/leaveService.js

import api from './axios';

const leaveService = {
    // ========== LEAVE TYPES ==========
    getLeaveTypes: async () => {
        try {
            console.log('📡 Fetching leave types...');
            const response = await api.get('/leave-types');
            console.log('✅ Leave types fetched:', response.data);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching leave types:', error);
            throw error;
        }
    },

    // ========== LEAVE BALANCE ==========
    getBalance: async (employeeId = null) => {
        try {
            const params = employeeId ? { employee_id: employeeId } : {};
            console.log('📡 Fetching balance with params:', params);
            const response = await api.get('/leaves/balance', { params });
            console.log('✅ Balance fetched:', response.data);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching balance:', error);
            throw error;
        }
    },

    // ========== LEAVE REQUESTS ==========
    getLeaves: async (params = {}) => {
        try {
            console.log('📡 Fetching leaves with params:', params);
            const response = await api.get('/leaves', { params });
            console.log('✅ Leaves fetched:', response.data);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching leaves:', error);
            throw error;
        }
    },

    getPendingLeaves: async (params = {}) => {
        try {
            console.log('📡 Fetching pending leaves with params:', params);
            console.log('🔗 URL:', `/leaves/pending`);
            
            const response = await api.get('/leaves/pending', { params });
            console.log('✅ Pending leaves fetched:', response.data);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching pending leaves:', error);
            console.error('❌ Error details:', {
                message: error.message,
                response: error.response,
                config: error.config,
            });
            throw error;
        }
    },

    getLeave: async (id) => {
        try {
            console.log('📡 Fetching leave:', id);
            const response = await api.get(`/leaves/${id}`);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching leave:', error);
            throw error;
        }
    },

    createLeave: async (data) => {
        try {
            console.log('📡 Creating leave with data:', data);
            const response = await api.post('/leaves', data);
            console.log('✅ Leave created:', response.data);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error creating leave:', error);
            throw error;
        }
    },

    approveLeave: async (id) => {
        try {
            console.log('📡 Approving leave:', id);
            const response = await api.put(`/leaves/${id}/approve`);
            console.log('✅ Leave approved:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Error approving leave:', error);
            throw error;
        }
    },

    rejectLeave: async (id, reason) => {
        try {
            console.log('📡 Rejecting leave:', id);
            const response = await api.put(`/leaves/${id}/reject`, { reason });
            console.log('✅ Leave rejected:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Error rejecting leave:', error);
            throw error;
        }
    },

    cancelLeave: async (id) => {
        try {
            console.log('📡 Cancelling leave:', id);
            const response = await api.put(`/leaves/${id}/cancel`);
            console.log('✅ Leave cancelled:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Error cancelling leave:', error);
            throw error;
        }
    },

    // ========== REPLACEMENT LEAVES ==========
    getReplacements: async (params = {}) => {
        try {
            console.log('📡 Fetching replacements with params:', params);
            const response = await api.get('/replacement-leaves', { params });
            console.log('✅ Replacements fetched:', response.data);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching replacements:', error);
            throw error;
        }
    },

    getPendingReplacements: async (params = {}) => {
        try {
            console.log('📡 Fetching pending replacements with params:', params);
            const response = await api.get('/replacement-leaves/pending', { params });
            console.log('✅ Pending replacements fetched:', response.data);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error fetching pending replacements:', error);
            throw error;
        }
    },

    createReplacement: async (data) => {
        try {
            console.log('📡 Creating replacement with data:', data);
            const response = await api.post('/replacement-leaves', data);
            console.log('✅ Replacement created:', response.data);
            return response.data.data;
        } catch (error) {
            console.error('❌ Error creating replacement:', error);
            throw error;
        }
    },

    approveReplacement: async (id) => {
        try {
            console.log('📡 Approving replacement:', id);
            const response = await api.put(`/replacement-leaves/${id}/approve`);
            console.log('✅ Replacement approved:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Error approving replacement:', error);
            throw error;
        }
    },

    rejectReplacement: async (id, reason) => {
        try {
            console.log('📡 Rejecting replacement:', id);
            const response = await api.put(`/replacement-leaves/${id}/reject`, { reason });
            console.log('✅ Replacement rejected:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Error rejecting replacement:', error);
            throw error;
        }
    },

    cancelReplacement: async (id, reason) => {
        try {
            console.log('📡 Cancelling replacement:', id);
            const response = await api.put(`/replacement-leaves/${id}/cancel`, { reason });
            console.log('✅ Replacement cancelled:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Error cancelling replacement:', error);
            throw error;
        }
    },
};

export default leaveService;