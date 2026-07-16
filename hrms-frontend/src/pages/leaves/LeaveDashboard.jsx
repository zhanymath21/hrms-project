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
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    useTheme,
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
    CalendarToday,
    AccessTime,
    People,
    History as HistoryIcon,
} from '@mui/icons-material';
import { useLeave } from '../../contexts/LeaveContext';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../utils/dateFormat';

const LeaveDashboard = () => {
    const theme = useTheme();
    const navigate = useNavigate();
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

    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0,
        usedDays: 0,
        remainingDays: 0,
        totalEntitlement: 0,
    });
    const [recentActivities, setRecentActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setIsLoading(true);
        try {
            await Promise.all([
                fetchLeaveTypes(),
                fetchLeaves({ per_page: 100 }),
                fetchPendingLeaves(),
                fetchMyBalance(),
            ]);
        } catch (err) {
            console.error('Error loading dashboard:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (leaves?.data) {
            const allData = leaves.data || [];
            const approved = allData.filter(l => l.status === 'approved');
            const pending = allData.filter(l => l.status === 'pending');
            const rejected = allData.filter(l => l.status === 'rejected');
            const cancelled = allData.filter(l => l.status === 'cancelled');

            const total = allData.length || 0;
            const pendingCount = pending.length || 0;
            const approvedCount = approved.length || 0;
            const rejectedCount = rejected.length || 0;
            const cancelledCount = cancelled.length || 0;
            const usedDays = approved.reduce((sum, l) => sum + parseFloat(l.total_days || 0), 0);
            const remainingDays = balances?.reduce((sum, b) => sum + parseFloat(b.remaining_days || 0), 0) || 0;
            const totalEntitlement = balances?.reduce((sum, b) => sum + parseFloat(b.total_entitlement || 0), 0) || 0;

            setStats({
                total,
                pending: pendingCount,
                approved: approvedCount,
                rejected: rejectedCount,
                cancelled: cancelledCount,
                usedDays,
                remainingDays,
                totalEntitlement,
            });

            const recent = allData.slice(0, 5).map(leave => ({
                id: leave.id,
                employee: leave.employee?.first_name + ' ' + leave.employee?.last_name || 'Unknown',
                employeeId: leave.employee?.employee_id || '',
                leaveType: leave.leave_type?.name || 'Unknown',
                leaveCode: leave.leave_type?.code || '',
                days: leave.total_days || 0,
                status: leave.status,
                startDate: leave.start_date,
                endDate: leave.end_date,
                createdAt: leave.created_at,
            }));
            setRecentActivities(recent);
        }
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
                sx={{ height: 24, fontSize: '0.7rem' }}
            />
        );
    };

    const getLeaveTypeColor = (code) => {
        const colors = {
            AL: '#4CAF50',
            SL: '#2196F3',
            SPL: '#FF9800',
            ML: '#9C27B0',
            BL: '#F44336',
            CL: '#00BCD4',
        };
        return colors[code] || '#757575';
    };

    const pendingList = pendingLeaves?.data || [];

    if (isLoading || (loading && !leaves?.data?.length)) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
            {/* ===== HEADER ===== */}
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
                        <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b' }}>
                            📊 Leave Dashboard
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Overview of your leave activities and requests
                        </Typography>
                    </Box>
                    <Box display="flex" gap={1}>
                        <Tooltip title="Refresh">
                            <IconButton onClick={handleRefresh} disabled={loading} size="small">
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => navigate('/leaves/create')}
                            size="small"
                            sx={{ textTransform: 'none' }}
                        >
                            Request Leave
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* ===== ERROR ===== */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
                    {error}
                </Alert>
            )}

            {/* ===== STATS CARDS ===== */}
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

            {/* ===== BALANCE & QUICK STATS ===== */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={8}>
                    <Paper 
                        elevation={0}
                        sx={{ 
                            p: 2,
                            border: '1px solid #e5e7eb',
                            borderRadius: 2,
                            height: '100%'
                        }}
                    >
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                            💰 Leave Balance Summary
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={4}>
                                <Box>
                                    <Typography variant="caption" color="textSecondary">Remaining</Typography>
                                    <Typography variant="h6" color="success.main" fontWeight="bold">
                                        {stats.remainingDays.toFixed(1)} days
                                    </Typography>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={stats.totalEntitlement > 0 ? (stats.remainingDays / stats.totalEntitlement) * 100 : 0}
                                        sx={{ 
                                            height: 4, 
                                            borderRadius: 2, 
                                            mt: 0.5,
                                            bgcolor: '#e5e7eb',
                                            '& .MuiLinearProgress-bar': { bgcolor: '#10b981' }
                                        }}
                                    />
                                </Box>
                            </Grid>
                            <Grid item xs={4}>
                                <Box>
                                    <Typography variant="caption" color="textSecondary">Used</Typography>
                                    <Typography variant="h6" color="error.main" fontWeight="bold">
                                        {stats.usedDays.toFixed(1)} days
                                    </Typography>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={stats.totalEntitlement > 0 ? (stats.usedDays / stats.totalEntitlement) * 100 : 0}
                                        sx={{ 
                                            height: 4, 
                                            borderRadius: 2, 
                                            mt: 0.5,
                                            bgcolor: '#e5e7eb',
                                            '& .MuiLinearProgress-bar': { bgcolor: '#ef4444' }
                                        }}
                                    />
                                </Box>
                            </Grid>
                            <Grid item xs={4}>
                                <Box>
                                    <Typography variant="caption" color="textSecondary">Total</Typography>
                                    <Typography variant="h6" color="primary.main" fontWeight="bold">
                                        {stats.totalEntitlement.toFixed(1)} days
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Paper 
                        elevation={0}
                        sx={{ 
                            p: 2,
                            border: '1px solid #e5e7eb',
                            borderRadius: 2,
                            height: '100%'
                        }}
                    >
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                            📋 Leave Types
                        </Typography>
                        <Stack spacing={0.5}>
                            {leaveTypes && leaveTypes.slice(0, 4).map((type) => (
                                <Box key={type.id} display="flex" justifyContent="space-between" alignItems="center">
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                        <Avatar 
                                            sx={{ 
                                                width: 20, 
                                                height: 20, 
                                                bgcolor: getLeaveTypeColor(type.code) + '20',
                                                fontSize: 10,
                                                color: getLeaveTypeColor(type.code)
                                            }}
                                        >
                                            {type.code?.substring(0, 2)}
                                        </Avatar>
                                        <Typography variant="caption">{type.name}</Typography>
                                    </Box>
                                    <Chip 
                                        label={`${type.days_per_year} days`}
                                        size="small"
                                        sx={{ height: 18, fontSize: '0.6rem' }}
                                    />
                                </Box>
                            ))}
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>

            {/* ===== PENDING APPROVALS ===== */}
            <Paper 
                elevation={0}
                sx={{ 
                    p: 2,
                    border: '1px solid #e5e7eb',
                    borderRadius: 2,
                    mb: 3
                }}
            >
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle2" fontWeight="bold">
                            ⏳ Pending Approvals
                        </Typography>
                        {stats.pending > 0 && (
                            <Chip 
                                label={stats.pending}
                                size="small"
                                color="warning"
                                sx={{ fontWeight: 600 }}
                            />
                        )}
                    </Box>
                    {stats.pending > 0 && (
                        <Button 
                            size="small" 
                            endIcon={<ArrowForwardIcon />}
                            onClick={() => navigate('/leaves/approval')}
                            sx={{ textTransform: 'none' }}
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
                        {pendingList.slice(0, 3).map((approval) => {
                            const leave = approval.leave || approval;
                            return (
                                <React.Fragment key={leave.id || approval.id}>
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
                                                    {leave?.employee?.first_name} {leave?.employee?.last_name}
                                                </Typography>
                                            }
                                            secondary={
                                                <Box>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {leave?.leave_type?.name} • {leave?.total_days || 0} days • {formatDate(leave?.start_date)}
                                                    </Typography>
                                                    {approval.level && (
                                                        <Chip 
                                                            label={`Level ${approval.level}`}
                                                            size="small"
                                                            sx={{ height: 16, fontSize: '0.5rem', ml: 1 }}
                                                        />
                                                    )}
                                                </Box>
                                            }
                                        />
                                        <ListItemSecondaryAction>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => navigate(`/leaves/${leave?.id || approval.leave_id}`)}
                                                sx={{ textTransform: 'none', fontSize: '0.7rem' }}
                                            >
                                                Review
                                            </Button>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                    <Divider variant="inset" component="li" />
                                </React.Fragment>
                            );
                        })}
                        {pendingList.length > 3 && (
                            <Box textAlign="center" sx={{ mt: 1 }}>
                                <Typography variant="caption" color="textSecondary">
                                    +{pendingList.length - 3} more pending
                                </Typography>
                            </Box>
                        )}
                    </List>
                )}
            </Paper>

            {/* ===== RECENT ACTIVITIES ===== */}
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
                        📋 Recent Activities
                    </Typography>
                    {stats.total > 0 && (
                        <Button 
                            size="small" 
                            endIcon={<ArrowForwardIcon />}
                            onClick={() => navigate('/leaves/list')}
                            sx={{ textTransform: 'none' }}
                        >
                            View All
                        </Button>
                    )}
                </Box>

                {recentActivities.length === 0 ? (
                    <Typography variant="body2" color="textSecondary" sx={{ py: 2, textAlign: 'center' }}>
                        No activities yet
                    </Typography>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                    <TableCell>Employee</TableCell>
                                    <TableCell>Leave Type</TableCell>
                                    <TableCell align="center">Days</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell align="center">Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {recentActivities.map((activity) => (
                                    <TableRow key={activity.id} hover>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Avatar sx={{ width: 24, height: 24, bgcolor: '#6366f1', fontSize: 12 }}>
                                                    {getInitials(activity.employee)}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2">{activity.employee}</Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {activity.employeeId}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={activity.leaveType}
                                                size="small"
                                                sx={{ 
                                                    height: 20, 
                                                    fontSize: '0.65rem',
                                                    bgcolor: getLeaveTypeColor(activity.leaveCode) + '20',
                                                    color: getLeaveTypeColor(activity.leaveCode)
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" fontWeight="medium">
                                                {activity.days}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="textSecondary">
                                                {formatDate(activity.startDate)} - {formatDate(activity.endDate)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            {getStatusChip(activity.status)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* ===== QUICK ACTIONS ===== */}
            <Paper 
                elevation={0}
                sx={{ 
                    mt: 3,
                    p: 2,
                    border: '1px solid #e5e7eb',
                    borderRadius: 2,
                    bgcolor: '#f8fafc'
                }}
            >
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                    🔥 Quick Actions
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button 
                        size="small" 
                        variant="contained" 
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/leaves/create')}
                        sx={{ textTransform: 'none' }}
                    >
                        Request Leave
                    </Button>
                    <Button 
                        size="small" 
                        variant="outlined" 
                        startIcon={<BeachAccess />}
                        onClick={() => navigate('/leaves/balance')}
                        sx={{ textTransform: 'none' }}
                    >
                        Check Balance
                    </Button>
                    {stats.pending > 0 && (
                        <Button 
                            size="small" 
                            variant="contained" 
                            color="warning"
                            startIcon={<PendingIcon />}
                            onClick={() => navigate('/leaves/approval')}
                            sx={{ textTransform: 'none' }}
                        >
                            {stats.pending} Pending Approval{stats.pending > 1 ? 's' : ''}
                        </Button>
                    )}
                    <Button 
                        size="small" 
                        variant="outlined" 
                        startIcon={<HistoryIcon />}
                        onClick={() => navigate('/leaves/list')}
                        sx={{ textTransform: 'none' }}
                    >
                        View History
                    </Button>
                </Stack>
            </Paper>
        </Box>
    );
};

export default LeaveDashboard;