// src/contexts/LeaveContext.jsx

import React, { createContext, useState, useContext, useCallback } from 'react';
import leaveService from '../services/leaveService';

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

    // Fetch pending leaves
    const fetchPendingLeaves = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            console.log('📡 Context: Fetching pending leaves...');
            const data = await leaveService.getPendingLeaves(params);
            console.log('📊 Context: Pending leaves data:', data);
            setPendingLeaves(data?.data || []);
            return data;
        } catch (err) {
            console.error('❌ Context: Error fetching pending leaves:', err);
            setError(err.message || 'Failed to fetch pending leaves');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch leaves
    const fetchLeaves = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            console.log('📡 Context: Fetching leaves with params:', params);
            const data = await leaveService.getLeaves(params);
            console.log('📊 Context: Leaves data:', data);
            setLeaves(data?.data || []);
            setPagination({
                current_page: data?.current_page || 1,
                per_page: data?.per_page || 15,
                total: data?.total || 0,
                last_page: data?.last_page || 1,
            });
            return data;
        } catch (err) {
            console.error('❌ Context: Error fetching leaves:', err);
            setError(err.message || 'Failed to fetch leaves');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch balances
    const fetchBalances = useCallback(async (employeeId = null) => {
        setLoading(true);
        setError(null);
        try {
            console.log('📡 Context: Fetching balances...');
            const data = await leaveService.getBalance(employeeId);
            console.log('📊 Context: Balances data:', data);
            setBalances(data?.balances || []);
            return data;
        } catch (err) {
            console.error('❌ Context: Error fetching balances:', err);
            setError(err.message || 'Failed to fetch balances');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch leave types
    const fetchLeaveTypes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('📡 Context: Fetching leave types...');
            const data = await leaveService.getLeaveTypes();
            console.log('📊 Context: Leave types data:', data);
            setLeaveTypes(data || []);
            return data;
        } catch (err) {
            console.error('❌ Context: Error fetching leave types:', err);
            setError(err.message || 'Failed to fetch leave types');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    // Create leave
    const createLeave = useCallback(async (data) => {
        setLoading(true);
        setError(null);
        try {
            console.log('📡 Context: Creating leave...');
            const result = await leaveService.createLeave(data);
            console.log('✅ Context: Leave created:', result);
            await fetchLeaves();
            await fetchPendingLeaves();
            return result;
        } catch (err) {
            console.error('❌ Context: Error creating leave:', err);
            setError(err.message || 'Failed to create leave');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchLeaves, fetchPendingLeaves]);

    // Approve leave
    const approveLeave = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            console.log('📡 Context: Approving leave:', id);
            const result = await leaveService.approveLeave(id);
            console.log('✅ Context: Leave approved:', result);
            await fetchLeaves();
            await fetchPendingLeaves();
            return result;
        } catch (err) {
            console.error('❌ Context: Error approving leave:', err);
            setError(err.message || 'Failed to approve leave');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchLeaves, fetchPendingLeaves]);

    // Reject leave
    const rejectLeave = useCallback(async (id, reason) => {
        setLoading(true);
        setError(null);
        try {
            console.log('📡 Context: Rejecting leave:', id);
            const result = await leaveService.rejectLeave(id, reason);
            console.log('✅ Context: Leave rejected:', result);
            await fetchLeaves();
            await fetchPendingLeaves();
            return result;
        } catch (err) {
            console.error('❌ Context: Error rejecting leave:', err);
            setError(err.message || 'Failed to reject leave');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchLeaves, fetchPendingLeaves]);

    // Cancel leave
    const cancelLeave = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            console.log('📡 Context: Cancelling leave:', id);
            const result = await leaveService.cancelLeave(id);
            console.log('✅ Context: Leave cancelled:', result);
            await fetchLeaves();
            return result;
        } catch (err) {
            console.error('❌ Context: Error cancelling leave:', err);
            setError(err.message || 'Failed to cancel leave');
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