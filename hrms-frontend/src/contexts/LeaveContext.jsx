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
    // ==========================================
    // STATE
    // ==========================================
    const [leaves, setLeaves] = useState([]);
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [balances, setBalances] = useState([]);
    const [allBalances, setAllBalances] = useState([]);
    const [allBalancesData, setAllBalancesData] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
    });

    // ==========================================
    // 1. FETCH LEAVE TYPES
    // ==========================================
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

    // ==========================================
    // 2. FETCH LEAVES
    // ==========================================
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

    // ==========================================
    // 3. FETCH PENDING LEAVES
    // ==========================================
    const fetchPendingLeaves = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaveService.getPendingLeaves(params);
            setPendingLeaves(data?.data || []);
            return data;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to fetch pending leaves';
            setError(msg);
            console.error('❌ Fetch pending leaves error:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // ==========================================
    // 4. FETCH MY BALANCE
    // ==========================================
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

    // ==========================================
    // 5. FETCH ALL BALANCES (HR/Admin)
    // ==========================================
    const fetchAllBalances = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await leaveService.getAllBalances(params);
            const data = response?.data || [];
            const paginationData = response?.pagination || {
                current_page: 1,
                per_page: 20,
                total: 0,
                last_page: 1,
            };
            setAllBalances(data);
            setAllBalancesData(data);
            setPagination(paginationData);
            return { data, pagination: paginationData };
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to fetch all balances';
            setError(msg);
            console.error('❌ Fetch all balances error:', err);
            return { data: [], pagination: { current_page: 1, per_page: 20, total: 0, last_page: 1 } };
        } finally {
            setLoading(false);
        }
    }, []);

    // ==========================================
    // 6. FETCH EMPLOYEE BALANCE (HR/Admin)
    // ==========================================
    const fetchEmployeeBalance = useCallback(async (employeeId, params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaveService.getEmployeeBalance(employeeId, params);
            return data;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to fetch employee balance';
            setError(msg);
            console.error('❌ Fetch employee balance error:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // ==========================================
    // 7. CREATE LEAVE
    // ==========================================
    const createLeave = useCallback(async (data) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.createLeave(data);
            await fetchLeaves();
            await fetchPendingLeaves();
            await fetchMyBalance();
            return result;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to create leave';
            setError(msg);
            console.error('❌ Create leave error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchLeaves, fetchPendingLeaves, fetchMyBalance]);

    // ==========================================
    // 8. APPROVE LEAVE
    // ==========================================
    const approveLeave = useCallback(async (id, notes) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.approveLeave(id, notes);
            await fetchLeaves();
            await fetchPendingLeaves();
            await fetchMyBalance();
            return result;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to approve leave';
            setError(msg);
            console.error('❌ Approve leave error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchLeaves, fetchPendingLeaves, fetchMyBalance]);

    // ==========================================
    // 9. REJECT LEAVE
    // ==========================================
    const rejectLeave = useCallback(async (id, reason) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.rejectLeave(id, reason);
            await fetchLeaves();
            await fetchPendingLeaves();
            await fetchMyBalance();
            return result;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to reject leave';
            setError(msg);
            console.error('❌ Reject leave error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchLeaves, fetchPendingLeaves, fetchMyBalance]);

    // ==========================================
    // 10. CANCEL LEAVE
    // ==========================================
    const cancelLeave = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.cancelLeave(id);
            await fetchLeaves();
            await fetchMyBalance();
            return result;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to cancel leave';
            setError(msg);
            console.error('❌ Cancel leave error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchLeaves, fetchMyBalance]);

    // ==========================================
    // 11. UPDATE BALANCE (HR/Admin)
    // ==========================================
    const updateBalance = useCallback(async (id, data) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.updateBalance(id, data);
            await fetchAllBalances();
            await fetchMyBalance();
            return result;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to update balance';
            setError(msg);
            console.error('❌ Update balance error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchAllBalances, fetchMyBalance]);

    // ==========================================
    // 12. FETCH BALANCE SUMMARY (HR/Admin)
    // ==========================================
    const fetchBalanceSummary = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaveService.getBalanceSummary(params);
            return data;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to fetch balance summary';
            setError(msg);
            console.error('❌ Fetch balance summary error:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // ==========================================
    // 13. GENERATE BALANCE (HR/Admin)
    // ==========================================
    const generateBalance = useCallback(async (data) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.generateBalance(data);
            await fetchAllBalances();
            return result;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to generate balance';
            setError(msg);
            console.error('❌ Generate balance error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchAllBalances]);

    // ==========================================
    // 14. GENERATE ALL BALANCES (HR/Admin)
    // ==========================================
    const generateAllBalances = useCallback(async (data = {}) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.generateAllBalances(data);
            await fetchAllBalances();
            return result;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to generate all balances';
            setError(msg);
            console.error('❌ Generate all balances error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchAllBalances]);

    // ==========================================
    // 15. PROCESS CARRY FORWARD (HR/Admin)
    // ==========================================
    const processCarryForward = useCallback(async (data) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.processCarryForward(data);
            await fetchAllBalances();
            return result;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to process carry forward';
            setError(msg);
            console.error('❌ Process carry forward error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchAllBalances]);

    // ==========================================
    // 16. FETCH ADJUSTMENT HISTORY (HR/Admin)
    // ==========================================
    const fetchAdjustmentHistory = useCallback(async (employeeId, params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaveService.getAdjustmentHistory(employeeId, params);
            return data;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to fetch adjustment history';
            setError(msg);
            console.error('❌ Fetch adjustment history error:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // ==========================================
    // 17. FETCH LEAVE STATISTICS
    // ==========================================
    const fetchLeaveStatistics = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaveService.getLeaveStatistics(params);
            return data;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to fetch leave statistics';
            setError(msg);
            console.error('❌ Fetch leave statistics error:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // ==========================================
    // 18. FETCH MY LEAVE HISTORY
    // ==========================================
    const fetchMyLeaveHistory = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaveService.getMyLeaveHistory(params);
            return data;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to fetch my leave history';
            setError(msg);
            console.error('❌ Fetch my leave history error:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // ==========================================
    // 19. FETCH REPLACEMENT LEAVES
    // ==========================================
    const fetchReplacements = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaveService.getReplacements(params);
            return data;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to fetch replacements';
            setError(msg);
            console.error('❌ Fetch replacements error:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // ==========================================
    // 20. CREATE REPLACEMENT LEAVE
    // ==========================================
    const createReplacement = useCallback(async (data) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.createReplacement(data);
            await fetchReplacements();
            return result;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to create replacement';
            setError(msg);
            console.error('❌ Create replacement error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchReplacements]);

    // ==========================================
    // 21. APPROVE REPLACEMENT
    // ==========================================
    const approveReplacement = useCallback(async (id, notes) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.approveReplacement(id, notes);
            await fetchReplacements();
            return result;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to approve replacement';
            setError(msg);
            console.error('❌ Approve replacement error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchReplacements]);

    // ==========================================
    // 22. REJECT REPLACEMENT
    // ==========================================
    const rejectReplacement = useCallback(async (id, reason) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.rejectReplacement(id, reason);
            await fetchReplacements();
            return result;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to reject replacement';
            setError(msg);
            console.error('❌ Reject replacement error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchReplacements]);

    // ==========================================
    // 23. CANCEL REPLACEMENT
    // ==========================================
    const cancelReplacement = useCallback(async (id, reason) => {
        setLoading(true);
        setError(null);
        try {
            const result = await leaveService.cancelReplacement(id, reason);
            await fetchReplacements();
            return result;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to cancel replacement';
            setError(msg);
            console.error('❌ Cancel replacement error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchReplacements]);

    // ==========================================
    // 24. FETCH PUBLIC HOLIDAYS
    // ==========================================
    const fetchPublicHolidays = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaveService.getPublicHolidays(params);
            return data;
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to fetch public holidays';
            setError(msg);
            console.error('❌ Fetch public holidays error:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // ==========================================
    // 25. CLEAR ERROR
    // ==========================================
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // ==========================================
    // 26. RESET STATE
    // ==========================================
    const resetState = useCallback(() => {
        setLeaves([]);
        setPendingLeaves([]);
        setBalances([]);
        setAllBalances([]);
        setAllBalancesData([]);
        setLeaveTypes([]);
        setLoading(false);
        setError(null);
        setPagination({
            current_page: 1,
            per_page: 15,
            total: 0,
            last_page: 1,
        });
    }, []);

    // ==========================================
    // CONTEXT VALUE
    // ==========================================
    const value = {
        // State
        leaves,
        pendingLeaves,
        balances,
        allBalances,
        allBalancesData,
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
        fetchEmployeeBalance,
        fetchBalanceSummary,
        fetchAdjustmentHistory,
        fetchLeaveStatistics,
        fetchMyLeaveHistory,
        fetchReplacements,
        fetchPublicHolidays,

        // Create functions
        createLeave,
        createReplacement,

        // Action functions
        approveLeave,
        rejectLeave,
        cancelLeave,
        approveReplacement,
        rejectReplacement,
        cancelReplacement,

        // Balance management
        updateBalance,
        generateBalance,
        generateAllBalances,
        processCarryForward,

        // Utility functions
        clearError,
        resetState,

        // Leave type helper
        getLeaveTypeById: (id) => leaveTypes.find(type => type.id === id),
        getLeaveTypeByCode: (code) => leaveTypes.find(type => type.code === code),
    };

    return (
        <LeaveContext.Provider value={value}>
            {children}
        </LeaveContext.Provider>
    );
};

export default LeaveContext;