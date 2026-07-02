// src/pages/leaves/LeaveBalance.jsx

import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    Paper,
    Button,
    CircularProgress,
    Alert,
    Card,
    CardContent,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { useLeave } from '../../contexts/LeaveContext';
import LeaveBalanceCard from '../../components/leaves/LeaveBalanceCard';

const LeaveBalance = () => {
    const { balances, loading, error, fetchMyBalance } = useLeave();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        await fetchMyBalance();
    };

    const handleRefresh = () => loadData();

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold">
                    📊 My Leave Balance
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={handleRefresh}
                    disabled={loading}
                >
                    Refresh
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {balances.length === 0 ? (
                    <Grid item xs={12}>
                        <Alert severity="info">No leave balances found.</Alert>
                    </Grid>
                ) : (
                    balances.map((balance) => (
                        <Grid item xs={12} sm={6} md={4} key={balance.id}>
                            <LeaveBalanceCard balance={balance} />
                        </Grid>
                    ))
                )}
            </Grid>
        </Box>
    );
};

export default LeaveBalance;