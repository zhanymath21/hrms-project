// src/pages/leaves/LeaveBalance.jsx

import React, { useEffect, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    CircularProgress,
    Alert,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Button,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    LinearProgress,
    Divider,
    Avatar,
    Stack,
    Tab,
    Tabs,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    ListItemSecondaryAction,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as ViewIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Pending as PendingIcon,
    CalendarToday as CalendarIcon,
    People as PeopleIcon,
    Receipt as ReceiptIcon,
    Download as DownloadIcon,
    Print as PrintIcon,
    Search as SearchIcon, // ✅ ADD THIS IMPORT
} from '@mui/icons-material';
import { useLeave } from '../../contexts/LeaveContext';
import { useAuth } from '../contexts/AuthContext';

// Tab Panel Component
function TabPanel({ children, value, index }) {
    return (
        <div hidden={value !== index}>
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
}

const LeaveBalance = () => {
    const {
        leaveTypes,
        balances,
        allBalances,
        loading,
        error,
        fetchLeaveTypes,
        fetchMyBalance,
        fetchAllBalances,
        updateBalance,
        fetchBalanceSummary,
        clearError,
    } = useLeave();

    const { user } = useAuth();
    const isAdmin = user?.position?.title === 'HR Manager' || user?.position?.title === 'Admin' || user?.position?.title === 'System Admin';

    // State
    const [tabValue, setTabValue] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedBalance, setSelectedBalance] = useState(null);
    const [formData, setFormData] = useState({
        total_entitlement: 0,
        adjustment_reason: '',
    });
    const [summary, setSummary] = useState(null);
    const [filter, setFilter] = useState({
        search: '',
        department_id: '',
        leave_type_id: '',
    });
    const [sortConfig, setSortConfig] = useState({
        key: 'name',
        direction: 'asc',
    });

    // Load data on mount
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        await fetchLeaveTypes();
        await fetchMyBalance();
        if (isAdmin) {
            await fetchAllBalances();
            const summaryData = await fetchBalanceSummary();
            setSummary(summaryData);
        }
    };

    const handleRefresh = () => {
        loadData();
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    // Handle edit balance
    const handleEditBalance = (balance) => {
        setSelectedBalance(balance);
        setFormData({
            total_entitlement: balance.total_entitlement || 0,
            adjustment_reason: '',
        });
        setOpenDialog(true);
    };

    const handleUpdateBalance = async () => {
        if (!formData.adjustment_reason) {
            alert('Please provide an adjustment reason');
            return;
        }

        try {
            await updateBalance(selectedBalance.id, formData);
            setOpenDialog(false);
            setSelectedBalance(null);
            await loadData();
        } catch (err) {
            console.error('Failed to update balance:', err);
        }
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedBalance(null);
        setFormData({
            total_entitlement: 0,
            adjustment_reason: '',
        });
    };

    // Filter and sort employees
    const filteredEmployees = allBalances?.data?.filter(emp => {
        if (!filter.search) return true;
        const searchLower = filter.search.toLowerCase();
        return (
            emp.name?.toLowerCase().includes(searchLower) ||
            emp.employee_id?.toLowerCase().includes(searchLower) ||
            emp.email?.toLowerCase().includes(searchLower) ||
            emp.department?.name?.toLowerCase().includes(searchLower)
        );
    }) || [];

    // Sort employees
    const sortedEmployees = [...filteredEmployees].sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        if (typeof aVal === 'string') {
            return sortConfig.direction === 'asc'
                ? aVal.localeCompare(bVal)
                : bVal.localeCompare(aVal);
        }
        return sortConfig.direction === 'asc'
            ? (aVal || 0) - (bVal || 0)
            : (bVal || 0) - (aVal || 0);
    });

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    // Get color for leave type
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

    // Get status chip
    const getStatusChip = (status) => {
        const statusMap = {
            active: { label: 'Active', color: 'success' },
            inactive: { label: 'Inactive', color: 'error' },
            pending: { label: 'Pending', color: 'warning' },
            approved: { label: 'Approved', color: 'success' },
            rejected: { label: 'Rejected', color: 'error' },
            cancelled: { label: 'Cancelled', color: 'default' },
        };
        return statusMap[status] || { label: status, color: 'default' };
    };

    // Loading state
    if (loading && !balances.length) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress size={60} />
                    <Typography sx={{ mt: 2, color: 'text.secondary' }}>
                        Loading leave balances...
                    </Typography>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        Leave Balance
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {isAdmin ? 'Manage all employee leave balances' : 'View your leave balance'}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Refresh">
                        <IconButton onClick={handleRefresh} sx={{ bgcolor: 'background.paper' }}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                    {isAdmin && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => {/* Navigate to generate balance */}}
                        >
                            Generate Balances
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Error Alert */}
            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 3 }}
                    onClose={clearError}
                >
                    {error}
                </Alert>
            )}

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', borderRadius: 2 }}>
                <Tabs value={tabValue} onChange={handleTabChange} sx={{ px: 2 }}>
                    <Tab label="My Balance" icon={<ReceiptIcon />} />
                    {isAdmin && (
                        <Tab label="All Employees" icon={<PeopleIcon />} />
                    )}
                    {isAdmin && (
                        <Tab label="Summary" icon={<TrendingUpIcon />} />
                    )}
                </Tabs>
            </Box>

            {/* My Balance Tab */}
            <TabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                    {/* Summary Cards */}
                    <Grid item xs={12} md={3}>
                        <Card sx={{ bgcolor: '#6366f1', color: 'white' }}>
                            <CardContent>
                                <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                                    Total Entitlement
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                    {balances.reduce((sum, b) => sum + (b.total_entitlement || 0), 0)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card sx={{ bgcolor: '#10b981', color: 'white' }}>
                            <CardContent>
                                <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                                    Used Days
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                    {balances.reduce((sum, b) => sum + (b.used_days || 0), 0)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card sx={{ bgcolor: '#f59e0b', color: 'white' }}>
                            <CardContent>
                                <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                                    Pending Days
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                    {balances.reduce((sum, b) => sum + (b.pending_days || 0), 0)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card sx={{ bgcolor: '#3b82f6', color: 'white' }}>
                            <CardContent>
                                <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                                    Remaining Days
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                    {balances.reduce((sum, b) => sum + (b.remaining_days || 0), 0)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Balance Details */}
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                                    Balance Details
                                </Typography>
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Leave Type</TableCell>
                                                <TableCell align="center">Entitlement</TableCell>
                                                <TableCell align="center">Used</TableCell>
                                                <TableCell align="center">Pending</TableCell>
                                                <TableCell align="center">Remaining</TableCell>
                                                <TableCell align="center">Progress</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {balances && balances.length > 0 ? (
                                                balances.map((balance) => {
                                                    const percentage = balance.total_entitlement > 0
                                                        ? (balance.used_days / balance.total_entitlement) * 100
                                                        : 0;
                                                    const color = percentage > 80 ? 'error' : percentage > 50 ? 'warning' : 'success';
                                                    
                                                    return (
                                                        <TableRow key={balance.id}>
                                                            <TableCell>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <Avatar
                                                                        sx={{
                                                                            width: 32,
                                                                            height: 32,
                                                                            bgcolor: getLeaveTypeColor(balance.leave_type?.code),
                                                                            fontSize: 14,
                                                                        }}
                                                                    >
                                                                        {balance.leave_type?.code?.substring(0, 2) || 'L'}
                                                                    </Avatar>
                                                                    <Box>
                                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                            {balance.leave_type?.name}
                                                                        </Typography>
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            {balance.leave_type?.code}
                                                                        </Typography>
                                                                    </Box>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                    {balance.total_entitlement || 0}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Typography variant="body2">
                                                                    {balance.used_days || 0}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                {balance.pending_days > 0 ? (
                                                                    <Chip
                                                                        label={balance.pending_days}
                                                                        size="small"
                                                                        color="warning"
                                                                        icon={<PendingIcon />}
                                                                    />
                                                                ) : (
                                                                    <Typography variant="body2">0</Typography>
                                                                )}
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Typography variant="body2" sx={{ fontWeight: 700, color: balance.remaining_days <= 0 ? 'error.main' : 'text.primary' }}>
                                                                    {balance.remaining_days || 0}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <LinearProgress
                                                                        variant="determinate"
                                                                        value={Math.min(percentage, 100)}
                                                                        sx={{
                                                                            width: 100,
                                                                            borderRadius: 2,
                                                                            bgcolor: 'grey.200',
                                                                            '& .MuiLinearProgress-bar': {
                                                                                bgcolor: color === 'success' ? '#10b981' : color === 'warning' ? '#f59e0b' : '#ef4444',
                                                                            }
                                                                        }}
                                                                    />
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {Math.round(percentage)}%
                                                                    </Typography>
                                                                </Box>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} align="center">
                                                        <Typography color="text.secondary">
                                                            No balance records found
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* All Employees Tab (Admin Only) */}
            {isAdmin && (
                <TabPanel value={tabValue} index={1}>
                    <Grid container spacing={3}>
                        {/* Filters */}
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Grid container spacing={2} alignItems="center">
                                        <Grid item xs={12} md={4}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                placeholder="Search employees..."
                                                value={filter.search}
                                                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                                                InputProps={{
                                                    startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
                                                }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={3}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Department</InputLabel>
                                                <Select
                                                    value={filter.department_id}
                                                    onChange={(e) => setFilter({ ...filter, department_id: e.target.value })}
                                                    label="Department"
                                                >
                                                    <MenuItem value="">All Departments</MenuItem>
                                                    {/* Add departments from your data */}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12} md={3}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Leave Type</InputLabel>
                                                <Select
                                                    value={filter.leave_type_id}
                                                    onChange={(e) => setFilter({ ...filter, leave_type_id: e.target.value })}
                                                    label="Leave Type"
                                                >
                                                    <MenuItem value="">All Types</MenuItem>
                                                    {leaveTypes.map((type) => (
                                                        <MenuItem key={type.id} value={type.id}>
                                                            {type.name}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12} md={2}>
                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                onClick={() => setFilter({ search: '', department_id: '', leave_type_id: '' })}
                                            >
                                                Clear Filters
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Employee List */}
                        <Grid item xs={12}>
                            <Card>
                                <CardContent sx={{ p: 0 }}>
                                    <TableContainer>
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell onClick={() => handleSort('employee_id')} sx={{ cursor: 'pointer' }}>
                                                        Employee ID
                                                        {sortConfig.key === 'employee_id' && (
                                                            <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell onClick={() => handleSort('name')} sx={{ cursor: 'pointer' }}>
                                                        Name
                                                        {sortConfig.key === 'name' && (
                                                            <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>Department</TableCell>
                                                    <TableCell align="center">Total</TableCell>
                                                    <TableCell align="center">Used</TableCell>
                                                    <TableCell align="center">Pending</TableCell>
                                                    <TableCell align="center">Remaining</TableCell>
                                                    <TableCell align="center">Action</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {sortedEmployees.length > 0 ? (
                                                    sortedEmployees.map((emp) => (
                                                        <TableRow key={emp.id} hover>
                                                            <TableCell>
                                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                                    {emp.employee_id}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#6366f1' }}>
                                                                        {emp.name?.charAt(0) || 'E'}
                                                                    </Avatar>
                                                                    <Box>
                                                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                                            {emp.name}
                                                                        </Typography>
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            {emp.email}
                                                                        </Typography>
                                                                    </Box>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    label={emp.department?.name || 'N/A'}
                                                                    size="small"
                                                                    variant="outlined"
                                                                />
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                    {emp.summary?.total_entitlement || 0}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Typography variant="body2">
                                                                    {emp.summary?.used_days || 0}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                {emp.summary?.pending_days > 0 ? (
                                                                    <Chip
                                                                        label={emp.summary?.pending_days || 0}
                                                                        size="small"
                                                                        color="warning"
                                                                    />
                                                                ) : (
                                                                    <Typography variant="body2">0</Typography>
                                                                )}
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{
                                                                        fontWeight: 700,
                                                                        color: (emp.summary?.remaining_days || 0) <= 0 ? 'error.main' : 'text.primary',
                                                                    }}
                                                                >
                                                                    {emp.summary?.remaining_days || 0}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Tooltip title="View/Edit Balance">
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => {
                                                                            // Navigate to employee balance detail
                                                                            // or open dialog to edit
                                                                        }}
                                                                    >
                                                                        <EditIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={8} align="center">
                                                            <Typography color="text.secondary" sx={{ py: 3 }}>
                                                                No employees found
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </TabPanel>
            )}

            {/* Summary Tab (Admin Only) */}
            {isAdmin && (
                <TabPanel value={tabValue} index={2}>
                    <Grid container spacing={3}>
                        {/* Summary Cards */}
                        <Grid item xs={12} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>
                                        Total Employees
                                    </Typography>
                                    <Typography variant="h4">
                                        {summary?.total_employees || 0}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>
                                        Total Entitlement
                                    </Typography>
                                    <Typography variant="h4">
                                        {summary?.total_entitlement || 0}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>
                                        Total Used
                                    </Typography>
                                    <Typography variant="h4">
                                        {summary?.total_used || 0}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>
                                        Total Remaining
                                    </Typography>
                                    <Typography variant="h4">
                                        {summary?.total_remaining || 0}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Summary by Leave Type */}
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                                        Summary by Leave Type
                                    </Typography>
                                    <TableContainer>
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Leave Type</TableCell>
                                                    <TableCell align="center">Entitlement</TableCell>
                                                    <TableCell align="center">Used</TableCell>
                                                    <TableCell align="center">Pending</TableCell>
                                                    <TableCell align="center">Remaining</TableCell>
                                                    <TableCell align="center">Usage %</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {summary?.by_leave_type?.map((item) => {
                                                    const percentage = item.total_entitlement > 0
                                                        ? (item.used_days / item.total_entitlement) * 100
                                                        : 0;
                                                    return (
                                                        <TableRow key={item.leave_type_id}>
                                                            <TableCell>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <Avatar
                                                                        sx={{
                                                                            width: 32,
                                                                            height: 32,
                                                                            bgcolor: getLeaveTypeColor(item.code),
                                                                            fontSize: 14,
                                                                        }}
                                                                    >
                                                                        {item.code?.substring(0, 2) || 'L'}
                                                                    </Avatar>
                                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                                        {item.leave_type}
                                                                    </Typography>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                {item.total_entitlement}
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                {item.used_days}
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                {item.pending_days > 0 ? (
                                                                    <Chip
                                                                        label={item.pending_days}
                                                                        size="small"
                                                                        color="warning"
                                                                    />
                                                                ) : (
                                                                    0
                                                                )}
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{
                                                                        fontWeight: 600,
                                                                        color: item.remaining_days <= 0 ? 'error.main' : 'text.primary',
                                                                    }}
                                                                >
                                                                    {item.remaining_days}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <LinearProgress
                                                                        variant="determinate"
                                                                        value={Math.min(percentage, 100)}
                                                                        sx={{
                                                                            width: 100,
                                                                            borderRadius: 2,
                                                                            bgcolor: 'grey.200',
                                                                            '& .MuiLinearProgress-bar': {
                                                                                bgcolor: percentage > 80 ? '#ef4444' : percentage > 50 ? '#f59e0b' : '#10b981',
                                                                            }
                                                                        }}
                                                                    />
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {Math.round(percentage)}%
                                                                    </Typography>
                                                                </Box>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </TabPanel>
            )}

            {/* Edit Balance Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Edit Leave Balance
                    {selectedBalance && (
                        <Typography variant="caption" display="block" color="text.secondary">
                            {selectedBalance.employee?.name} - {selectedBalance.leave_type?.name}
                        </Typography>
                    )}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Total Entitlement"
                                type="number"
                                value={formData.total_entitlement}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    total_entitlement: parseFloat(e.target.value) || 0,
                                })}
                                InputProps={{ inputProps: { min: 0 } }}
                                helperText="Current remaining will be recalculated automatically"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Adjustment Reason"
                                multiline
                                rows={3}
                                value={formData.adjustment_reason}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    adjustment_reason: e.target.value,
                                })}
                                placeholder="Please provide a reason for this adjustment..."
                                required
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleUpdateBalance}
                        disabled={!formData.adjustment_reason}
                    >
                        Update Balance
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default LeaveBalance;