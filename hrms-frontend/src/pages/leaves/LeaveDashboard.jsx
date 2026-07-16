// src/pages/leaves/LeaveDashboard.jsx

import React, { useEffect, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    Chip,
    Button,
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListItemSecondaryAction,
    Divider,
    LinearProgress,
    Stack,
    IconButton,
    Tooltip,
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Add as AddIcon,
    ArrowForward as ArrowForwardIcon,
    Pending as PendingIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Person as PersonIcon,
    BeachAccess,
    Sick,
    Celebration,
    TrendingUp,
    TrendingDown,
} from '@mui/icons-material';
import { useLeave } from '../../contexts/LeaveContext';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../utils/dateFormat';

// ✅ Helper function untuk format number
const formatNumber = (value) => {
    const num = parseFloat(value) || 0;
    return num.toFixed(1);
};

const LeaveDashboard = () => {
    const {
        leaveTypes,
        leaves,
        pendingLeaves,
        balances,
        fetchLeaveTypes,
        fetchLeaves,
        fetchPendingLeaves,
        fetchMyBalance,
        loading,
        error,
        clearError,
    } = useLeave();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0,
        usedDays: 0,
        remainingDays: 0,
    });

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        await Promise.all([
            fetchLeaveTypes(),
            fetchLeaves(),
            fetchPendingLeaves(),
            fetchMyBalance(),
        ]);
    };

    useEffect(() => {
        // ✅ AMAN: Gunakan optional chaining dan default value
        const allData = leaves?.data || [];
        const approved = allData.filter(l => l.status === 'approved');
        const pending = allData.filter(l => l.status === 'pending');
        const rejected = allData.filter(l => l.status === 'rejected');
        const cancelled = allData.filter(l => l.status === 'cancelled');

        // ✅ Pastikan semua nilai adalah number
        const total = allData.length || 0;
        const pendingCount = pending.length || 0;
        const approvedCount = approved.length || 0;
        const rejectedCount = rejected.length || 0;
        const cancelledCount = cancelled.length || 0;
        const usedDays = approved.reduce((sum, l) => sum + parseFloat(l.total_days || 0), 0);
        const remainingDays = balances?.reduce((sum, b) => sum + parseFloat(b.remaining_days || 0), 0) || 0;

        setStats({
            total: total,
            pending: pendingCount,
            approved: approvedCount,
            rejected: rejectedCount,
            cancelled: cancelledCount,
            usedDays: usedDays,
            remainingDays: remainingDays,
        });
    }, [leaves, balances]);

    const handleRefresh = () => {
        loadDashboardData();
    };

    const getInitials = (name) => {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
        }
        return name.substring(0, 2).toUpperCase();
    };

    const getStatusChip = (status) => {
        const configs = {
            pending: { color: 'warning', icon: <PendingIcon />, label: 'Pending' },
            approved: { color: 'success', icon: <CheckCircleIcon />, label: 'Approved' },
            rejected: { color: 'error', icon: <CancelIcon />, label: 'Rejected' },
            cancelled: { color: 'default', icon: <CancelIcon />, label: 'Cancelled' },
        };
        const config = configs[status] || configs.pending;
        return (
            <Chip
                size="small"
                label={config.label}
                color={config.color}
                icon={config.icon}
            />
        );
    };

    // ✅ AMAN: Ambil pending data dengan safe check
    const pendingList = pendingLeaves?.data || [];

    if (loading && !leaves?.data?.length) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
            {/* Header */}
            <Paper 
                elevation={0}
                sx={{ 
                    p: 3, 
                    mb: 3, 
                    bgcolor: '#f8fafc',
                    borderRadius: 2,
                    border: '1px solid #e5e7eb'
                }}
            >
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box>
                        <Typography variant="h5" fontWeight="bold">
                            📊 Leave Dashboard
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Overview of your leave activities
                        </Typography>
                    </Box>
                    <Box display="flex" gap={1}>
                        <Tooltip title="Refresh">
                            <IconButton onClick={handleRefresh} disabled={loading}>
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => navigate('/leaves/create')}
                            size="small"
                        >
                            Request Leave
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
                    {error}
                </Alert>
            )}

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                    <Card elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2 }}>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption" color="textSecondary">Total Requests</Typography>
                            <Typography variant="h5" fontWeight="bold">{stats.total}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Card elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, bgcolor: '#fef3c7' }}>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption" sx={{ color: '#f59e0b' }}>Pending</Typography>
                            <Typography variant="h5" fontWeight="bold" sx={{ color: '#f59e0b' }}>{stats.pending}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Card elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, bgcolor: '#d1fae5' }}>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption" sx={{ color: '#10b981' }}>Approved</Typography>
                            <Typography variant="h5" fontWeight="bold" sx={{ color: '#10b981' }}>{stats.approved}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Card elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, bgcolor: '#fee2e2' }}>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption" sx={{ color: '#ef4444' }}>Rejected</Typography>
                            <Typography variant="h5" fontWeight="bold" sx={{ color: '#ef4444' }}>{stats.rejected}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Balance Summary */}
            <Paper 
                elevation={0}
                sx={{ 
                    p: 2, 
                    mb: 3,
                    border: '1px solid #e5e7eb',
                    borderRadius: 2,
                    bgcolor: '#f8fafc'
                }}
            >
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                    💰 Leave Balance Summary
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={4}>
                        <Box>
                            <Typography variant="caption" color="textSecondary">Remaining</Typography>
                            <Typography variant="h6" color="success.main" fontWeight="bold">
                                {formatNumber(stats.remainingDays)} days
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={4}>
                        <Box>
                            <Typography variant="caption" color="textSecondary">Used</Typography>
                            <Typography variant="h6" color="error.main" fontWeight="bold">
                                {formatNumber(stats.usedDays)} days
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={4}>
                        <Box>
                            <Typography variant="caption" color="textSecondary">Total</Typography>
                            <Typography variant="h6" color="primary.main" fontWeight="bold">
                                {formatNumber(stats.remainingDays + stats.usedDays)} days
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Recent Pending */}
            <Paper 
                elevation={0}
                sx={{ 
                    p: 2,
                    border: '1px solid #e5e7eb',
                    borderRadius: 2
                }}
            >
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                        ⏳ Recent Pending Requests
                    </Typography>
                    {stats.pending > 0 && (
                        <Button 
                            size="small" 
                            endIcon={<ArrowForwardIcon />}
                            onClick={() => navigate('/leaves/approval')}
                        >
                            View All
                        </Button>
                    )}
                </Box>

                {pendingList.length === 0 ? (
                    <Typography variant="body2" color="textSecondary" sx={{ py: 2, textAlign: 'center' }}>
                        No pending requests 🎉
                    </Typography>
                ) : (
                    <List disablePadding>
                        {pendingList.slice(0, 5).map((leave) => (
                            <React.Fragment key={leave.id}>
                                <ListItem 
                                    sx={{ 
                                        px: 0, 
                                        py: 1,
                                        '&:hover': { bgcolor: '#f8fafc', borderRadius: 1 }
                                    }}
                                >
                                    <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: '#f59e0b', width: 32, height: 32 }}>
                                            <PendingIcon sx={{ fontSize: 16 }} />
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Typography variant="body2" fontWeight="medium">
                                                {leave.employee?.first_name} {leave.employee?.last_name}
                                            </Typography>
                                        }
                                        secondary={
                                            <Typography variant="caption" color="textSecondary">
                                                {leave.leave_type?.name} • {leave.total_days} days • {formatDate(leave.start_date)}
                                            </Typography>
                                        }
                                    />
                                    <ListItemSecondaryAction>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => navigate(`/leaves/${leave.id}`)}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            Review
                                        </Button>
                                    </ListItemSecondaryAction>
                                </ListItem>
                                <Divider variant="inset" component="li" />
                            </React.Fragment>
                        ))}
                    </List>
                )}
            </Paper>
        </Box>
    );
};

export default LeaveDashboard;