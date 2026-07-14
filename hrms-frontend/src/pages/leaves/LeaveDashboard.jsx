// src/pages/leaves/LeaveDashboard.jsx

import React, { useEffect, useState } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Button,
    Chip,
    LinearProgress,
    Avatar,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Divider,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Alert,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    BeachAccess,
    Sick,
    Celebration,
    TrendingUp,
    TrendingDown,
    Pending,
    CheckCircle,
    Cancel,
    Refresh,
    Add,
    Visibility,
    People,
    CalendarToday,
    EventNote,
} from '@mui/icons-material';
import { useLeave } from '../../contexts/LeaveContext';
import { useNavigate } from 'react-router-dom';

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
        totalLeaves: 0,
        approvedLeaves: 0,
        pendingLeaves: 0,
        rejectedLeaves: 0,
        cancelledLeaves: 0,
        totalDaysUsed: 0,
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
        if (leaves?.data) {
            const allLeaves = leaves.data || [];
            const approved = allLeaves.filter(l => l.status === 'approved');
            const pending = allLeaves.filter(l => l.status === 'pending');
            const rejected = allLeaves.filter(l => l.status === 'rejected');
            const cancelled = allLeaves.filter(l => l.status === 'cancelled');
            
            setStats({
                totalLeaves: allLeaves.length,
                approvedLeaves: approved.length,
                pendingLeaves: pending.length,
                rejectedLeaves: rejected.length,
                cancelledLeaves: cancelled.length,
                totalDaysUsed: approved.reduce((sum, l) => sum + (l.total_days || 0), 0),
            });
        }
    }, [leaves]);

    const handleRefresh = () => {
        loadDashboardData();
    };

    const getStatusChip = (status) => {
        const configs = {
            pending: { color: 'warning', icon: <Pending />, label: 'Pending' },
            approved: { color: 'success', icon: <CheckCircle />, label: 'Approved' },
            rejected: { color: 'error', icon: <Cancel />, label: 'Rejected' },
            cancelled: { color: 'default', icon: <Cancel />, label: 'Cancelled' },
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

    // ✅ FIX: Map through leaveTypes properly
    const renderLeaveTypes = () => {
        if (!leaveTypes || leaveTypes.length === 0) {
            return (
                <Typography color="textSecondary" align="center" sx={{ py: 3 }}>
                    No leave types available
                </Typography>
            );
        }

        return leaveTypes.map((type) => (
            <Grid item xs={12} sm={6} md={4} key={type.id}>
                <Card sx={{ 
                    height: '100%', 
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
                }}>
                    <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                                <Typography variant="h6" fontWeight="bold">
                                    {type.name}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                    {type.code}
                                </Typography>
                            </Box>
                            <Chip 
                                label={type.is_active ? 'Active' : 'Inactive'} 
                                color={type.is_active ? 'success' : 'default'}
                                size="small"
                            />
                        </Box>
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            {type.description || 'No description available'}
                        </Typography>
                        <Box display="flex" gap={1} mt={2}>
                            <Chip 
                                label={`${type.days_per_year} days/year`} 
                                size="small" 
                                variant="outlined"
                            />
                            {type.is_paid && (
                                <Chip 
                                    label="Paid" 
                                    size="small" 
                                    color="success" 
                                    variant="outlined"
                                />
                            )}
                            {type.allow_carry_forward && (
                                <Chip 
                                    label={`Carry Forward (${type.max_carry_forward_days} max)`} 
                                    size="small" 
                                    color="info" 
                                    variant="outlined"
                                />
                            )}
                        </Box>
                    </CardContent>
                </Card>
            </Grid>
        ));
    };

    if (loading && !leaveTypes.length && !leaves?.data?.length) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">
                        📊 Leave Dashboard
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Overview of leave requests and balances
                    </Typography>
                </Box>
                <Box display="flex" gap={1}>
                    <Tooltip title="Refresh Data">
                        <IconButton onClick={handleRefresh} disabled={loading}>
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => navigate('/leaves/create')}
                    >
                        Request Leave
                    </Button>
                </Box>
            </Box>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
                    {error}
                </Alert>
            )}

            {/* Stats Cards */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: '#e3f2fd', borderLeft: '4px solid #1976d2' }}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography color="textSecondary" variant="body2">
                                        Total Requests
                                    </Typography>
                                    <Typography variant="h4" fontWeight="bold">
                                        {stats.totalLeaves}
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: '#1976d2' }}>
                                    <EventNote />
                                </Avatar>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: '#e8f5e9', borderLeft: '4px solid #4caf50' }}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography color="textSecondary" variant="body2">
                                        Approved
                                    </Typography>
                                    <Typography variant="h4" fontWeight="bold" color="success.main">
                                        {stats.approvedLeaves}
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: '#4caf50' }}>
                                    <CheckCircle />
                                </Avatar>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: '#fff3e0', borderLeft: '4px solid #ff9800' }}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography color="textSecondary" variant="body2">
                                        Pending
                                    </Typography>
                                    <Typography variant="h4" fontWeight="bold" color="warning.main">
                                        {stats.pendingLeaves}
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: '#ff9800' }}>
                                    <Pending />
                                </Avatar>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: '#ffebee', borderLeft: '4px solid #f44336' }}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography color="textSecondary" variant="body2">
                                        Days Used
                                    </Typography>
                                    <Typography variant="h4" fontWeight="bold" color="error.main">
                                        {stats.totalDaysUsed.toFixed(1)}
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: '#f44336' }}>
                                    <TrendingUp />
                                </Avatar>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Leave Types */}
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Leave Types
            </Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
                {renderLeaveTypes()}
            </Grid>

            {/* Recent Pending Requests & Balance */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                            Recent Pending Requests
                        </Typography>
                        {pendingLeaves?.data && pendingLeaves.data.length > 0 ? (
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Employee</TableCell>
                                            <TableCell>Type</TableCell>
                                            <TableCell>Days</TableCell>
                                            <TableCell>Date</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell align="center">Action</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {pendingLeaves.data.slice(0, 5).map((leave) => (
                                            <TableRow key={leave.id} hover>
                                                <TableCell>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                                                            {leave.employee?.first_name?.[0] || 'U'}
                                                        </Avatar>
                                                        <Typography variant="body2">
                                                            {leave.employee?.first_name} {leave.employee?.last_name}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>{leave.leave_type?.name}</TableCell>
                                                <TableCell>{leave.total_days}</TableCell>
                                                <TableCell>
                                                    {new Date(leave.start_date).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusChip(leave.status)}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Tooltip title="View Details">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => navigate(`/leaves/${leave.id}`)}
                                                        >
                                                            <Visibility fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Typography color="textSecondary" align="center" sx={{ py: 3 }}>
                                No pending requests
                            </Typography>
                        )}
                        {pendingLeaves?.data?.length > 5 && (
                            <Box display="flex" justifyContent="flex-end" mt={1}>
                                <Button size="small" onClick={() => navigate('/leaves/approval')}>
                                    View All
                                </Button>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                            My Balance Summary
                        </Typography>
                        {balances && balances.length > 0 ? (
                            <List>
                                {balances.map((balance) => (
                                    <React.Fragment key={balance.id}>
                                        <ListItem>
                                            <ListItemAvatar>
                                                <Avatar sx={{ bgcolor: '#6366f1' }}>
                                                    {balance.leave_type?.code?.[0] || 'L'}
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={
                                                    <Typography variant="body2" fontWeight="medium">
                                                        {balance.leave_type?.name}
                                                    </Typography>
                                                }
                                                secondary={
                                                    <Box>
                                                        <Typography variant="caption" color="textSecondary">
                                                            Used: {balance.used_days || 0} / {balance.total_entitlement || 0} days
                                                        </Typography>
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={balance.total_entitlement > 0 
                                                                ? (balance.used_days / balance.total_entitlement) * 100 
                                                                : 0
                                                            }
                                                            sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                                                        />
                                                        <Typography variant="caption" color="success.main" fontWeight="bold">
                                                            Remaining: {balance.remaining_days || 0} days
                                                        </Typography>
                                                    </Box>
                                                }
                                            />
                                        </ListItem>
                                        <Divider variant="inset" component="li" />
                                    </React.Fragment>
                                ))}
                            </List>
                        ) : (
                            <Typography color="textSecondary" align="center" sx={{ py: 3 }}>
                                No balance data available
                            </Typography>
                        )}
                        <Box display="flex" justifyContent="flex-end" mt={1}>
                            <Button size="small" onClick={() => navigate('/leaves/balance')}>
                                View Full Balance
                            </Button>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default LeaveDashboard;