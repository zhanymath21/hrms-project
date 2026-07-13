// src/pages/leaves/LeaveDashboard.jsx

import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Button,
    Stack,
    Chip,
    Avatar,
    LinearProgress,
    Paper,
    Divider,
    IconButton,
    Tooltip,
    Badge,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import {
    CalendarToday as CalendarIcon,
    Add as AddIcon,
    CheckCircle as CheckCircleIcon,
    Pending as PendingIcon,
    Cancel as CancelIcon,
    History as HistoryIcon,
    BeachAccess as BeachIcon,
    LocalHospital as SickIcon,
    Celebration as SpecialIcon,
    ArrowForward as ArrowForwardIcon,
    Refresh as RefreshIcon,
    People as PeopleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLeave } from '../../contexts/LeaveContext';
import { formatDate } from '../../utils/dateFormat';

const LeaveDashboard = () => {
    const navigate = useNavigate();
    const {
        leaves,
        pendingLeaves,
        balances,
        allBalances, // 🔥 AMBIL DARI CONTEXT
        loading,
        fetchLeaves,
        fetchPendingLeaves,
        fetchMyBalance,
        fetchAllBalances, // 🔥 AMBIL DARI CONTEXT
    } = useLeave();

    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
    });

    const [isHR, setIsHR] = useState(false);

    useEffect(() => {
        loadData();
        checkUserRole();
    }, []);

    const loadData = async () => {
        await Promise.all([
            fetchLeaves(),
            fetchPendingLeaves(),
            fetchMyBalance(),
        ]);
        
        // Jika HR, load all balances
        if (isHR) {
            await fetchAllBalances();
        }
    };

    const checkUserRole = () => {
        // Cek role dari user context
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const hrRoles = ['HR Manager', 'HR Officer', 'HR Assistant', 'Admin'];
        setIsHR(hrRoles.some(role => user.position?.title?.includes(role)));
    };

    useEffect(() => {
        if (leaves.length > 0) {
            setStats({
                total: leaves.length,
                pending: leaves.filter(l => l.status === 'pending').length,
                approved: leaves.filter(l => l.status === 'approved').length,
                rejected: leaves.filter(l => l.status === 'rejected').length,
            });
        }
    }, [leaves]);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <PendingIcon sx={{ color: '#ff9800' }} />;
            case 'approved': return <CheckCircleIcon sx={{ color: '#4caf50' }} />;
            case 'rejected': return <CancelIcon sx={{ color: '#f44336' }} />;
            default: return <HistoryIcon sx={{ color: '#9e9e9e' }} />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'approved': return 'success';
            case 'rejected': return 'error';
            default: return 'default';
        }
    };

    const QuickActionCard = ({ icon, title, subtitle, color, onClick, badge }) => (
        <Card 
            sx={{ 
                cursor: 'pointer', 
                transition: 'all 0.3s',
                '&:hover': { 
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                },
                height: '100%',
                borderLeft: `4px solid ${color}`,
            }}
            onClick={onClick}
        >
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography variant="caption" color="textSecondary">
                            {subtitle}
                        </Typography>
                        <Typography variant="h6" fontWeight="bold">
                            {title}
                        </Typography>
                    </Box>
                    <Badge badgeContent={badge} color="error">
                        <Avatar sx={{ bgcolor: `${color}20`, color: color }}>
                            {icon}
                        </Avatar>
                    </Badge>
                </Box>
                <Box display="flex" alignItems="center" mt={1}>
                    <Typography variant="caption" color="primary">
                        Click to view
                    </Typography>
                    <ArrowForwardIcon fontSize="small" color="primary" sx={{ ml: 0.5 }} />
                </Box>
            </CardContent>
        </Card>
    );

    const BalanceCard = ({ icon, title, value, color, subtitle }) => (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: `${color}20`, color: color }}>
                        {icon}
                    </Avatar>
                    <Box flex={1}>
                        <Typography variant="body2" color="textSecondary">
                            {title}
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" color={color}>
                            {value}
                        </Typography>
                    </Box>
                </Box>
                {subtitle && (
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                        {subtitle}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold">
                    🏖️ Leave Management
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadData}
                        disabled={loading}
                        size="small"
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/leaves/create')}
                    >
                        Request Leave
                    </Button>
                </Stack>
            </Box>

            {/* Stats */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={6} sm={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" color="textSecondary">Total</Typography>
                            <Typography variant="h4" fontWeight="bold" color="primary.main">
                                {stats.total}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Card sx={{ borderTop: '3px solid #ff9800' }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" color="textSecondary">Pending</Typography>
                            <Typography variant="h4" fontWeight="bold" color="warning.main">
                                {stats.pending}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Card sx={{ borderTop: '3px solid #4caf50' }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" color="textSecondary">Approved</Typography>
                            <Typography variant="h4" fontWeight="bold" color="success.main">
                                {stats.approved}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Card sx={{ borderTop: '3px solid #f44336' }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" color="textSecondary">Rejected</Typography>
                            <Typography variant="h4" fontWeight="bold" color="error.main">
                                {stats.rejected}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Quick Actions */}
            <Typography variant="h6" fontWeight="bold" mb={2}>
                Quick Actions
            </Typography>
            <Grid container spacing={2} mb={4}>
                <Grid item xs={12} sm={6} md={3}>
                    <QuickActionCard
                        icon={<AddIcon />}
                        title="Request Leave"
                        subtitle="Apply for leave"
                        color="#1976d2"
                        onClick={() => navigate('/leaves/create')}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <QuickActionCard
                        icon={<PendingIcon />}
                        title="My Requests"
                        subtitle="View all requests"
                        color="#ff9800"
                        badge={stats.pending}
                        onClick={() => navigate('/leaves')}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <QuickActionCard
                        icon={<CheckCircleIcon />}
                        title="My Balance"
                        subtitle="Check remaining leave"
                        color="#4caf50"
                        onClick={() => navigate('/leaves/balance')}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <QuickActionCard
                        icon={<PeopleIcon />}
                        title={isHR ? "All Balances" : "History"}
                        subtitle={isHR ? "View all employees" : "View history"}
                        color="#9e9e9e"
                        onClick={() => navigate(isHR ? '/leaves/all-balances' : '/leaves?status=approved,rejected')}
                    />
                </Grid>
            </Grid>

            {/* Leave Balance */}
            <Typography variant="h6" fontWeight="bold" mb={2}>
                📊 My Leave Balance
            </Typography>
            <Grid container spacing={2} mb={4}>
                {balances.length > 0 ? (
                    balances.map((balance) => {
                        const iconsMap = {
                            'Annual Leave': <BeachIcon />,
                            'Sick Leave': <SickIcon />,
                            'Special Leave': <SpecialIcon />,
                        };
                        const colorsMap = {
                            'Annual Leave': '#1976d2',
                            'Sick Leave': '#f44336',
                            'Special Leave': '#ff9800',
                        };

                        const icon = iconsMap[balance.leave_type] || <BeachIcon />;
                        const color = colorsMap[balance.leave_type] || '#1976d2';

                        return (
                            <Grid item xs={12} sm={6} md={4} key={balance.id}>
                                <BalanceCard
                                    icon={icon}
                                    title={balance.leave_type}
                                    value={balance.remaining_days || 0}
                                    color={color}
                                    subtitle={`Total: ${balance.total_entitlement || 0} days`}
                                />
                            </Grid>
                        );
                    })
                ) : (
                    <Grid item xs={12}>
                        <Alert severity="info">
                            No leave balance found. Contact HR for assistance.
                        </Alert>
                    </Grid>
                )}
            </Grid>

            {/* All Balances (HR only) */}
            {isHR && allBalances.length > 0 && (
                <>
                    <Typography variant="h6" fontWeight="bold" mb={2}>
                        👥 All Employees Leave Balance
                    </Typography>
                    <TableContainer component={Paper} sx={{ mb: 4 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                    <TableCell>Employee</TableCell>
                                    <TableCell>Department</TableCell>
                                    <TableCell align="center">Annual</TableCell>
                                    <TableCell align="center">Sick</TableCell>
                                    <TableCell align="center">Special</TableCell>
                                    <TableCell align="center">Total</TableCell>
                                    <TableCell align="center">Used</TableCell>
                                    <TableCell align="center">Remaining</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {allBalances.slice(0, 5).map((emp) => {
                                    const al = emp.leave_balances?.find(b => b.leave_code === 'AL');
                                    const sl = emp.leave_balances?.find(b => b.leave_code === 'SL');
                                    const spl = emp.leave_balances?.find(b => b.leave_code === 'SPL');
                                    
                                    return (
                                        <TableRow key={emp.id} hover>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {emp.name}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    {emp.employee_id}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{emp.department?.name || '-'}</TableCell>
                                            <TableCell align="center">
                                                <Typography fontWeight="bold" color="primary.main">
                                                    {al?.remaining_days || 0}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography fontWeight="bold" color="error.main">
                                                    {sl?.remaining_days || 0}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography fontWeight="bold" color="warning.main">
                                                    {spl?.remaining_days || 0}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                {emp.summary?.total_entitlement || 0}
                                            </TableCell>
                                            <TableCell align="center" color="error.main">
                                                {emp.summary?.used_days || 0}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography fontWeight="bold" color="success.main">
                                                    {emp.summary?.remaining_days || 0}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        {allBalances.length > 5 && (
                            <Box p={2} textAlign="center">
                                <Button onClick={() => navigate('/leaves/all-balances')} size="small">
                                    View All Employees →
                                </Button>
                            </Box>
                        )}
                    </TableContainer>
                </>
            )}

            {/* Recent Leaves */}
            <Typography variant="h6" fontWeight="bold" mb={2}>
                📋 Recent Requests
            </Typography>
            <Paper>
                {leaves.length === 0 ? (
                    <Box p={4} textAlign="center">
                        <Typography color="textSecondary">
                            No leave requests yet. Click "Request Leave" to apply.
                        </Typography>
                    </Box>
                ) : (
                    leaves.slice(0, 5).map((leave) => (
                        <Box
                            key={leave.id}
                            sx={{
                                p: 2,
                                borderBottom: '1px solid #f0f0f0',
                                '&:last-child': { borderBottom: 'none' },
                                cursor: 'pointer',
                                '&:hover': { bgcolor: '#f8f9fa' },
                            }}
                            onClick={() => navigate(`/leaves/${leave.id}`)}
                        >
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box display="flex" alignItems="center" gap={2}>
                                    <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                                        {leave.leave_type?.code?.charAt(0) || 'L'}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="body2" fontWeight="medium">
                                            {leave.leave_type?.name || 'Leave'}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box display="flex" alignItems="center" gap={2}>
                                    <Chip
                                        label={leave.status}
                                        color={getStatusColor(leave.status)}
                                        size="small"
                                    />
                                    <Typography variant="caption" color="textSecondary">
                                        {leave.total_days} days
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    ))
                )}
                {leaves.length > 5 && (
                    <Box p={2} textAlign="center">
                        <Button onClick={() => navigate('/leaves')} size="small">
                            View All Requests →
                        </Button>
                    </Box>
                )}
            </Paper>
        </Box>
    );
};

export default LeaveDashboard;