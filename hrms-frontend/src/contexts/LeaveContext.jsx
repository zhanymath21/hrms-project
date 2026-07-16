// src/contexts/LeaveContext.jsx

import React, { createContext, useState, useContext, useCallback } from 'react';
import leaveService from '../services/leaveService';

const LeaveContext = createContext(null);

export const useLeave = () => {
    const context = useContext(LeaveContext);
    if (!context) {
        throw new Error('useLeave must be used within a LeaveProvider');
    }
    return context;
};

export const LeaveProvider = ({ children }) => {
    // State
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [balances, setBalances] = useState([]);
    const [allBalances, setAllBalances] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
    });

    // ==========================================
    // LEAVE TYPES
    // ==========================================
    const fetchLeaveTypes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaveService.getLeaveTypes();
            setLeaveTypes(data || []);
            return data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch leave types');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    // ==========================================
    // LEAVES
    // ==========================================
    const fetchLeaves = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaveService.getLeaves(params);
            setLeaves(data?.data || []);
            if (data?.pagination) {
                setPagination(data.pagination);
            }
            return data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch leaves');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // ✅ PERBAIKI: fetchPendingLeaves menggunakan getPendingLeaves
    const fetchPendingLeaves = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaveService.getPendingLeaves(params);
            setPendingLeaves(data || []);
            return data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch pending leaves');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const createLeave = useCallback(async (data) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.createLeave(data);
            await fetchLeaves();
            await fetchPendingLeaves();
            return result;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create leave');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchLeaves, fetchPendingLeaves]);

    const approveLeave = useCallback(async (id, notes) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.approveLeave(id, notes);
            await fetchLeaves();
            await fetchPendingLeaves();
            return result;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to approve leave');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchLeaves, fetchPendingLeaves]);

    const rejectLeave = useCallback(async (id, reason) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.rejectLeave(id, reason);
            await fetchLeaves();
            await fetchPendingLeaves();
            return result;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reject leave');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchLeaves, fetchPendingLeaves]);

    const cancelLeave = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.cancelLeave(id);
            await fetchLeaves();
            await fetchPendingLeaves();
            return result;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to cancel leave');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchLeaves, fetchPendingLeaves]);

    // ==========================================
    // BALANCE
    // ==========================================
    const fetchMyBalance = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaveService.getMyBalance();
            setBalances(data?.balances || []);
            return data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch my balance');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAllBalances = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaveService.getAllBalances(params);
            setAllBalances(data?.data || []);
            return data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch all balances');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateBalance = useCallback(async (id, data) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.updateBalance(id, data);
            await fetchAllBalances();
            await fetchMyBalance();
            return result;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update balance');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchAllBalances, fetchMyBalance]);

    const updateCarryForward = useCallback(async (id, data) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.updateCarryForward(id, data);
            await fetchAllBalances();
            await fetchMyBalance();
            return result;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update carry forward');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchAllBalances, fetchMyBalance]);

    // ==========================================
    // APPROVAL FLOW
    // ==========================================
    const fetchApprovalFlow = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaveService.getApprovalFlow();
            return data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch approval flow');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateApprovalFlow = useCallback(async (data) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.updateApprovalFlow(data);
            return result;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update approval flow');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const value = {
        // State
        leaveTypes,
        leaves,
        pendingLeaves,
        balances,
        allBalances,
        loading,
        error,
        pagination,

        // Leave Types
        fetchLeaveTypes,

        // Leaves
        fetchLeaves,
        fetchPendingLeaves,
        createLeave,
        approveLeave,
        rejectLeave,
        cancelLeave,

        // Balance
        fetchMyBalance,
        fetchAllBalances,
        updateBalance,
        updateCarryForward,

        // Approval Flow
        fetchApprovalFlow,
        updateApprovalFlow,

        // Utils
        clearError: () => setError(null),
        resetState: () => {
            setLeaves([]);
            setPendingLeaves([]);
            setBalances([]);
            setAllBalances([]);
            setError(null);
            setLoading(false);
        },
    };

    return (
        <LeaveContext.Provider value={value}>
            {children}
        </LeaveContext.Provider>
    );
};

export default LeaveContext;