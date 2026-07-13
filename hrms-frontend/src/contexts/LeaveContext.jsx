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
    // ===== STATES =====
    const [leaves, setLeaves] = useState([]);
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [balances, setBalances] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
    });

    // ===== 1. FETCH LEAVE TYPES =====
    const fetchLeaveTypes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaveService.getLeaveTypes();
            setLeaveTypes(data || []);
            return data;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to fetch leave types';
            setError(msg);
            console.error('❌ Fetch leave types error:', err);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    // ===== 2. FETCH LEAVES =====
    const fetchLeaves = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaveService.getLeaves(params);
            setLeaves(data?.data || []);
            setPagination({
                current_page: data?.current_page || 1,
                per_page: data?.per_page || 15,
                total: data?.total || 0,
                last_page: data?.last_page || 1,
            });
            return data;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to fetch leaves';
            setError(msg);
            console.error('❌ Fetch leaves error:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // ===== 3. FETCH PENDING LEAVES =====
    const fetchPendingLeaves = useCallback(async (params = {}) => {
        try {
            const data = await leaveService.getPendingLeaves(params);
            setPendingLeaves(data?.data || []);
            return data;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to fetch pending leaves';
            setError(msg);
            console.error('❌ Fetch pending leaves error:', err);
            return null;
        }
    }, []);

    // ===== 4. FETCH MY BALANCE =====
    const fetchMyBalance = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaveService.getMyBalance();
            setBalances(data?.balances || []);
            return data;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to fetch my balance';
            setError(msg);
            console.error('❌ Fetch my balance error:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // ===== 5. FETCH ALL BALANCES =====
    const fetchAllBalances = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaveService.getAllBalances(params);
            return data;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to fetch all balances';
            setError(msg);
            console.error('❌ Fetch all balances error:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // ===== 6. CREATE LEAVE =====
    const createLeave = useCallback(async (data) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.createLeave(data);
            await fetchLeaves();
            await fetchPendingLeaves();
            return result;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to create leave';
            setError(msg);
            console.error('❌ Create leave error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchLeaves, fetchPendingLeaves]);

    // ===== 7. APPROVE LEAVE =====
    const approveLeave = useCallback(async (id, notes) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.approveLeave(id, notes);
            await fetchLeaves();
            await fetchPendingLeaves();
            return result;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to approve leave';
            setError(msg);
            console.error('❌ Approve leave error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchLeaves, fetchPendingLeaves]);

    // ===== 8. REJECT LEAVE =====
    const rejectLeave = useCallback(async (id, reason) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.rejectLeave(id, reason);
            await fetchLeaves();
            await fetchPendingLeaves();
            return result;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to reject leave';
            setError(msg);
            console.error('❌ Reject leave error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchLeaves, fetchPendingLeaves]);

    // ===== 9. CANCEL LEAVE =====
    const cancelLeave = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.cancelLeave(id);
            await fetchLeaves();
            return result;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to cancel leave';
            setError(msg);
            console.error('❌ Cancel leave error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchLeaves]);

    // ===== 10. UPDATE BALANCE =====
    const updateBalance = useCallback(async (id, data) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.updateBalance(id, data);
            await fetchAllBalances();
            return result;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to update balance';
            setError(msg);
            console.error('❌ Update balance error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchAllBalances]);

    // ===== VALUE =====
    const value = {
        // States
        leaves,
        pendingLeaves,
        balances,
        leaveTypes,
        loading,
        error,
        pagination,

        // Fetch functions
        fetchLeaveTypes,
        fetchLeaves,
        fetchPendingLeaves,
        fetchMyBalance,
        fetchAllBalances,

        // Actions
        createLeave,
        approveLeave,
        rejectLeave,
        cancelLeave,
        updateBalance,
    };

    return (
        <LeaveContext.Provider value={value}>
            {children}
        </LeaveContext.Provider>
    );
};

export default LeaveContext;