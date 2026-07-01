// src/contexts/LeaveContext.jsx

import React, { createContext, useState, useContext, useCallback } from 'react';
import leaveService from '../../services/leaveService';

const LeaveContext = createContext();

export const useLeave = () => {
    const context = useContext(LeaveContext);
    if (!context) {
        throw new Error('useLeave must be used within LeaveProvider');
    }
    return context;
};

export const LeaveProvider = ({ children }) => {
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

    // Fetch leave types
    const fetchLeaveTypes = useCallback(async () => {
        setLoading(true);
        try {
            const data = await leaveService.getLeaveTypes();
            setLeaveTypes(data);
            return data;
        } catch (err) {
            setError(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch balances
    const fetchBalances = useCallback(async (employeeId = null) => {
        setLoading(true);
        try {
            const data = await leaveService.getBalance(employeeId);
            setBalances(data?.balances || []);
            return data;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch leaves
    const fetchLeaves = useCallback(async (params = {}) => {
        setLoading(true);
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
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch pending leaves
    const fetchPendingLeaves = useCallback(async (params = {}) => {
        setLoading(true);
        try {
            const data = await leaveService.getPendingLeaves(params);
            setPendingLeaves(data?.data || []);
            return data;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // Create leave
    const createLeave = useCallback(async (data) => {
        setLoading(true);
        try {
            const result = await leaveService.createLeave(data);
            await fetchLeaves();
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchLeaves]);

    // Approve leave
    const approveLeave = useCallback(async (id) => {
        setLoading(true);
        try {
            const result = await leaveService.approveLeave(id);
            await fetchLeaves();
            await fetchPendingLeaves();
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchLeaves, fetchPendingLeaves]);

    // Reject leave
    const rejectLeave = useCallback(async (id, reason) => {
        setLoading(true);
        try {
            const result = await leaveService.rejectLeave(id, reason);
            await fetchLeaves();
            await fetchPendingLeaves();
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchLeaves, fetchPendingLeaves]);

    // Cancel leave
    const cancelLeave = useCallback(async (id) => {
        setLoading(true);
        try {
            const result = await leaveService.cancelLeave(id);
            await fetchLeaves();
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchLeaves]);

    return (
        <LeaveContext.Provider
            value={{
                leaves,
                pendingLeaves,
                balances,
                leaveTypes,
                loading,
                error,
                pagination,
                fetchLeaveTypes,
                fetchBalances,
                fetchLeaves,
                fetchPendingLeaves,
                createLeave,
                approveLeave,
                rejectLeave,
                cancelLeave,
            }}
        >
            {children}
        </LeaveContext.Provider>
    );
};