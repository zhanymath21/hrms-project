// src/pages/leaves/LeaveBalance.jsx

import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Grid, CircularProgress, Alert,
    Button, Card, CardContent, Paper
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { useLeave } from '../../contexts/LeaveContext';
import LeaveBalanceCard from '../../components/leaves/LeaveBalanceCard';

const LeaveBalance = () => {
    const { balances, loading, error, fetchBalances } = useLeave();
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchBalances();
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchBalances();
        setRefreshing(false);
    };

    if (loading && !refreshing) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold">
                    📊 Leave Balance
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
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
                    {error}
                </Alert>
            )}

            {/* Summary Card */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" variant="body2">
                                    Total Entitlement
                                </Typography>
                                <Typography variant="h4">
                                    {balances.reduce((sum, b) => sum + (b.total_entitlement || 0), 0)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" variant="body2">
                                    Used
                                </Typography>
                                <Typography variant="h4" color="error.main">
                                    {balances.reduce((sum, b) => sum + (b.used_days || 0), 0)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" variant="body2">
                                    Pending
                                </Typography>
                                <Typography variant="h4" color="warning.main">
                                    {balances.reduce((sum, b) => sum + (b.pending_days || 0), 0)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" variant="body2">
                                    Remaining
                                </Typography>
                                <Typography variant="h4" color="success.main">
                                    {balances.reduce((sum, b) => sum + (b.remaining_days || 0), 0)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Paper>

            {/* Balance Cards */}
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