// src/pages/leaves/AllLeaveBalances.jsx

import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Chip,
    IconButton,
    Button,
    Stack,
    Alert,
    CircularProgress,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Card,
    CardContent,
    Tooltip,
    Avatar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    LinearProgress,
    Snackbar,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Close as CloseIcon,
    Person as PersonIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    ArrowForward as ArrowForwardIcon,
    History as HistoryIcon,
} from '@mui/icons-material';
import { useLeave } from '../../contexts/LeaveContext';
import api from '../../services/axios';

// Define color constants
const COLORS = {
    primary: {
        main: '#6366f1',
        light: '#818cf8',
        dark: '#4f46e5',
    },
    secondary: {
        main: '#9c27b0',
        light: '#ab47bc',
        dark: '#7b1fa2',
    },
    success: {
        main: '#4caf50',
        light: '#66bb6a',
        dark: '#388e3c',
    },
    error: {
        main: '#f44336',
        light: '#ef5350',
        dark: '#d32f2f',
    },
    warning: {
        main: '#ff9800',
        light: '#ffa726',
        dark: '#f57c00',
    },
    info: {
        main: '#2196f3',
        light: '#42a5f5',
        dark: '#1976d2',
    },
};

const AllLeaveBalances = () => {
    const { fetchAllBalances, loading, error, updateBalance } = useLeave();
    const [employees, setEmployees] = useState([]);
    const [pagination, setPagination] = useState({
        current_page: 1,
        per_page: 20,
        total: 0,
        last_page: 1,
    });
    const [search, setSearch] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [departments, setDepartments] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [showCarryForward, setShowCarryForward] = useState(false);
    const [stats, setStats] = useState({
        totalEmployees: 0,
        totalAnnualLeave: 0,
        totalSickLeave: 0,
        totalSpecialLeave: 0,
        totalRemaining: 0,
        totalUsed: 0,
        totalPending: 0,
        totalCarryForward: 0,
    });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Edit Dialog
    const [editDialog, setEditDialog] = useState({
        open: false,
        balanceId: null,
        employeeName: '',
        employeeId: '',
        leaveType: '',
        leaveCode: '',
        currentRemaining: 0,
        currentTotal: 0,
        usedDays: 0,
        pendingDays: 0,
        carryForward: 0,
        newTotal: 0,
        adjustmentReason: '',
        isLoading: false,
    });

    useEffect(() => {
        loadData();
        fetchDepartments();
    }, [page, rowsPerPage, search, departmentFilter]);

    const fetchDepartments = async () => {
        try {
            const response = await api.get('/departments');
            setDepartments(response.data.data || []);
        } catch (err) {
            console.error('Error fetching departments:', err);
        }
    };

    const loadData = async () => {
        try {
            const params = {
                page: page + 1,
                per_page: rowsPerPage,
            };
            if (search) params.search = search;
            if (departmentFilter) params.department_id = departmentFilter;

            const response = await fetchAllBalances(params);
            const employeesData = response?.data || [];
            
            setEmployees(employeesData);
            setPagination({
                current_page: response?.pagination?.current_page || 1,
                per_page: response?.pagination?.per_page || 20,
                total: response?.pagination?.total || 0,
                last_page: response?.pagination?.last_page || 1,
            });

            // Calculate stats
            let totalAL = 0, totalSL = 0, totalSPL = 0, totalRemaining = 0;
            let totalUsed = 0, totalPending = 0, totalCarryForward = 0;
            
            employeesData.forEach(emp => {
                // Get balances from leave_balances array
                const alBalance = emp.leave_balances?.find(b => 
                    b.leave_code === 'AL' || b.leave_type?.code === 'AL'
                );
                const slBalance = emp.leave_balances?.find(b => 
                    b.leave_code === 'SL' || b.leave_type?.code === 'SL'
                );
                const splBalance = emp.leave_balances?.find(b => 
                    b.leave_code === 'SPL' || b.leave_type?.code === 'SPL'
                );
                
                totalAL += alBalance?.remaining_days || 0;
                totalSL += slBalance?.remaining_days || 0;
                totalSPL += splBalance?.remaining_days || 0;
                totalRemaining += emp.summary?.remaining_days || 0;
                totalUsed += emp.summary?.used_days || 0;
                totalPending += emp.summary?.pending_days || 0;
                
                // Calculate carry forward from all balances
                emp.leave_balances?.forEach(balance => {
                    totalCarryForward += balance.carry_forward || 0;
                });
            });

            setStats({
                totalEmployees: pagination.total || employeesData.length,
                totalAnnualLeave: totalAL,
                totalSickLeave: totalSL,
                totalSpecialLeave: totalSPL,
                totalRemaining: totalRemaining,
                totalUsed: totalUsed,
                totalPending: totalPending,
                totalCarryForward: totalCarryForward,
            });

        } catch (err) {
            console.error('Error loading data:', err);
            setSnackbar({
                open: true,
                message: 'Failed to load data: ' + err.message,
                severity: 'error',
            });
        }
    };

    const handleRefresh = () => {
        loadData();
        setSnackbar({
            open: true,
            message: 'Data refreshed successfully!',
            severity: 'success',
        });
    };

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setPage(0);
    };

    const handleDepartmentChange = (e) => {
        setDepartmentFilter(e.target.value);
        setPage(0);
    };

    const handleClearFilters = () => {
        setSearch('');
        setDepartmentFilter('');
        setPage(0);
    };

    const handleOpenEdit = (employee, balance) => {
        if (!balance || !balance.id) {
            setSnackbar({
                open: true,
                message: 'Balance not found for this employee',
                severity: 'error',
            });
            return;
        }

        setEditDialog({
            open: true,
            balanceId: balance.id,
            employeeName: employee.name,
            employeeId: employee.employee_id,
            leaveType: balance.leave_type || balance.leaveType?.name || 'Unknown',
            leaveCode: balance.leave_code || balance.leaveType?.code || 'N/A',
            currentRemaining: balance.remaining_days || 0,
            currentTotal: balance.total_entitlement || 0,
            usedDays: balance.used_days || 0,
            pendingDays: balance.pending_days || 0,
            carryForward: balance.carry_forward || 0,
            newTotal: balance.total_entitlement || 0,
            adjustmentReason: '',
            isLoading: false,
        });
    };

    const handleCloseEdit = () => {
        setEditDialog({
            open: false,
            balanceId: null,
            employeeName: '',
            employeeId: '',
            leaveType: '',
            leaveCode: '',
            currentRemaining: 0,
            currentTotal: 0,
            usedDays: 0,
            pendingDays: 0,
            carryForward: 0,
            newTotal: 0,
            adjustmentReason: '',
            isLoading: false,
        });
    };

    const handleSaveEdit = async () => {
        if (!editDialog.adjustmentReason) {
            setSnackbar({
                open: true,
                message: 'Please provide a reason for adjustment',
                severity: 'error',
            });
            return;
        }

        if (editDialog.newTotal < 0) {
            setSnackbar({
                open: true,
                message: 'Total entitlement cannot be negative',
                severity: 'error',
            });
            return;
        }

        setEditDialog({ ...editDialog, isLoading: true });

        try {
            await updateBalance(editDialog.balanceId, {
                total_entitlement: editDialog.newTotal,
                adjustment_reason: editDialog.adjustmentReason,
            });

            setSnackbar({
                open: true,
                message: `✅ ${editDialog.employeeName}'s ${editDialog.leaveType} balance updated successfully!`,
                severity: 'success',
            });
            
            handleCloseEdit();
            loadData();
        } catch (err) {
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to update balance',
                severity: 'error',
            });
        } finally {
            setEditDialog({ ...editDialog, isLoading: false });
        }
    };

    const getStatusColor = (remaining, total) => {
        const percentage = total > 0 ? (remaining / total) * 100 : 0;
        if (percentage <= 20) return 'error';
        if (percentage <= 50) return 'warning';
        return 'success';
    };

    const getStatusLabel = (remaining, total) => {
        const percentage = total > 0 ? (remaining / total) * 100 : 0;
        if (percentage <= 20) return 'Critical';
        if (percentage <= 50) return 'Low';
        return 'Good';
    };

    const getInitials = (name) => {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
        }
        return name.substring(0, 2).toUpperCase();
    };

    // Helper to get balance by leave code
    const getBalanceByCode = (employee, code) => {
        if (!employee?.leave_balances) return {};
        const balance = employee.leave_balances.find(b => 
            b.leave_code === code || b.leave_type?.code === code
        );
        return balance || {};
    };

    if (loading && employees.length === 0) {
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
                        📊 Employee Leave Balances
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Manage and monitor all employee leave balances including carry forward
                    </Typography>
                </Box>
                <Box display="flex" gap={1}>
                    <Button
                        variant="outlined"
                        startIcon={<HistoryIcon />}
                        onClick={() => setShowCarryForward(!showCarryForward)}
                        color={showCarryForward ? 'primary' : 'inherit'}
                    >
                        {showCarryForward ? 'Hide' : 'Show'} Carry Forward
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={handleRefresh}
                        disabled={loading}
                    >
                        Refresh
                    </Button>
                </Box>
            </Box>

            {/* Stats Cards - Using direct colors instead of theme */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{ bgcolor: '#e3f2fd', borderLeft: '4px solid #1976d2' }}>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2">Total Employees</Typography>
                            <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                                {stats.totalEmployees}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{ bgcolor: '#e8f5e9', borderLeft: '4px solid #4caf50' }}>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2">AL Remaining</Typography>
                            <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                                {stats.totalAnnualLeave.toFixed(1)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{ bgcolor: '#ffebee', borderLeft: '4px solid #f44336' }}>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2">SL Remaining</Typography>
                            <Typography variant="h4" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                                {stats.totalSickLeave.toFixed(1)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{ bgcolor: '#fff3e0', borderLeft: '4px solid #ff9800' }}>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2">SPL Remaining</Typography>
                            <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                                {stats.totalSpecialLeave.toFixed(1)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                {showCarryForward && (
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card sx={{ bgcolor: '#f3e5f5', borderLeft: '4px solid #9c27b0' }}>
                            <CardContent>
                                <Typography color="textSecondary" variant="body2">Total Carry Forward</Typography>
                                <Typography variant="h4" sx={{ color: '#9c27b0', fontWeight: 'bold' }}>
                                    {stats.totalCarryForward.toFixed(1)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                )}
            </Grid>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={5}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search by name or employee ID..."
                            value={search}
                            onChange={handleSearch}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                                endAdornment: search && (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setSearch('')}>
                                            <ClearIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Department</InputLabel>
                            <Select value={departmentFilter} label="Department" onChange={handleDepartmentChange}>
                                <MenuItem value="">All Departments</MenuItem>
                                {departments.map((dept) => (
                                    <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <Button
                            fullWidth
                            variant="outlined"
                            color="error"
                            onClick={handleClearFilters}
                            disabled={!search && !departmentFilter}
                            startIcon={<ClearIcon />}
                        >
                            Clear
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell sx={{ minWidth: 200 }}>Employee</TableCell>
                            <TableCell sx={{ minWidth: 120 }}>Department</TableCell>
                            <TableCell align="center" sx={{ minWidth: 80 }}>
                                <Tooltip title="Annual Leave">
                                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                        🏖️ <Typography variant="caption">AL</Typography>
                                    </Box>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 80 }}>
                                <Tooltip title="Sick Leave">
                                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                        🏥 <Typography variant="caption">SL</Typography>
                                    </Box>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 80 }}>
                                <Tooltip title="Special Leave">
                                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                        🎉 <Typography variant="caption">SPL</Typography>
                                    </Box>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 80 }}>
                                <Tooltip title="Total Entitlement">
                                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                        📋 <Typography variant="caption">Total</Typography>
                                    </Box>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 80 }}>
                                <Tooltip title="Used Days">
                                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                        📈 <Typography variant="caption">Used</Typography>
                                    </Box>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 80 }}>
                                <Tooltip title="Pending Days">
                                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                        ⏳ <Typography variant="caption">Pending</Typography>
                                    </Box>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 80 }}>
                                <Tooltip title="Total Remaining">
                                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                        💚 <Typography variant="caption">Remaining</Typography>
                                    </Box>
                                </Tooltip>
                            </TableCell>
                            {showCarryForward && (
                                <TableCell align="center" sx={{ minWidth: 100 }}>
                                    <Tooltip title="Carry Forward (Max 6 days)">
                                        <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                            🔄 <Typography variant="caption">Carry Forward</Typography>
                                        </Box>
                                    </Tooltip>
                                </TableCell>
                            )}
                            <TableCell align="center" sx={{ minWidth: 100 }}>Status</TableCell>
                            <TableCell align="center" sx={{ minWidth: 80 }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {employees.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={showCarryForward ? 13 : 12} align="center" sx={{ py: 4 }}>
                                    <Typography color="textSecondary">No employees found</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            employees.map((employee) => {
                                // Get balances from leave_balances array
                                const al = getBalanceByCode(employee, 'AL');
                                const sl = getBalanceByCode(employee, 'SL');
                                const spl = getBalanceByCode(employee, 'SPL');
                                
                                const summary = employee.summary || {};
                                const remaining = summary.remaining_days || 0;
                                const total = summary.total_entitlement || 0;
                                const statusColor = getStatusColor(remaining, total);
                                const statusLabel = getStatusLabel(remaining, total);

                                // Calculate total carry forward for this employee
                                const totalCarryForward = employee.leave_balances?.reduce((sum, b) => 
                                    sum + (b.carry_forward || 0), 0
                                ) || 0;

                                return (
                                    <TableRow key={employee.id} hover>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Avatar sx={{ width: 36, height: 36, bgcolor: '#6366f1', fontSize: 14 }}>
                                                    {getInitials(employee.name)}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight="medium">
                                                        {employee.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {employee.employee_id}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={employee.department?.name || 'N/A'} 
                                                size="small" 
                                                variant="outlined"
                                                sx={{ fontWeight: 500 }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography 
                                                variant="body2" 
                                                fontWeight="bold" 
                                                sx={{ color: (al.remaining_days || 0) > 0 ? '#4caf50' : '#f44336' }}
                                            >
                                                {(al.remaining_days || 0).toFixed(1)}
                                            </Typography>
                                            {showCarryForward && al.carry_forward > 0 && (
                                                <Typography variant="caption" display="block" color="textSecondary">
                                                    CF: {al.carry_forward.toFixed(1)}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography 
                                                variant="body2" 
                                                fontWeight="bold" 
                                                sx={{ color: (sl.remaining_days || 0) > 0 ? '#4caf50' : '#f44336' }}
                                            >
                                                {(sl.remaining_days || 0).toFixed(1)}
                                            </Typography>
                                            {showCarryForward && sl.carry_forward > 0 && (
                                                <Typography variant="caption" display="block" color="textSecondary">
                                                    CF: {sl.carry_forward.toFixed(1)}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography 
                                                variant="body2" 
                                                fontWeight="bold" 
                                                sx={{ color: (spl.remaining_days || 0) > 0 ? '#4caf50' : '#f44336' }}
                                            >
                                                {(spl.remaining_days || 0).toFixed(1)}
                                            </Typography>
                                            {showCarryForward && spl.carry_forward > 0 && (
                                                <Typography variant="caption" display="block" color="textSecondary">
                                                    CF: {spl.carry_forward.toFixed(1)}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" fontWeight="medium">
                                                {total.toFixed(1)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" sx={{ color: '#f44336' }}>
                                                {(summary.used_days || 0).toFixed(1)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" sx={{ color: '#ff9800' }}>
                                                {(summary.pending_days || 0).toFixed(1)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography 
                                                variant="body2" 
                                                fontWeight="bold" 
                                                sx={{ color: remaining > 0 ? '#4caf50' : '#f44336' }}
                                            >
                                                {remaining.toFixed(1)}
                                            </Typography>
                                        </TableCell>
                                        {showCarryForward && (
                                            <TableCell align="center">
                                                {totalCarryForward > 0 ? (
                                                    <Tooltip title="Carry forward from previous year">
                                                        <Chip
                                                            label={`${totalCarryForward.toFixed(1)} days`}
                                                            size="small"
                                                            color="secondary"
                                                            icon={<ArrowForwardIcon />}
                                                            sx={{ fontWeight: 600 }}
                                                        />
                                                    </Tooltip>
                                                ) : (
                                                    <Chip
                                                        label="0"
                                                        size="small"
                                                        variant="outlined"
                                                        color="default"
                                                    />
                                                )}
                                            </TableCell>
                                        )}
                                        <TableCell align="center">
                                            <Tooltip title={`${statusLabel} (${remaining.toFixed(1)} days remaining)`}>
                                                <Chip 
                                                    label={statusLabel} 
                                                    color={statusColor} 
                                                    size="small" 
                                                    icon={
                                                        statusColor === 'error' ? <ErrorIcon /> :
                                                        statusColor === 'warning' ? <WarningIcon /> :
                                                        <CheckCircleIcon />
                                                    }
                                                />
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Edit Balance">
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => {
                                                        const balanceToEdit = employee.leave_balances?.[0];
                                                        if (balanceToEdit) {
                                                            handleOpenEdit(employee, balanceToEdit);
                                                        }
                                                    }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[20, 50, 100]}
                    component="div"
                    count={pagination.total || 0}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                />
            </TableContainer>

            {/* Carry Forward Info */}
            {showCarryForward && (
                <Paper sx={{ p: 2, mt: 2, bgcolor: '#f8fafc' }}>
                    <Box display="flex" alignItems="center" gap={2}>
                        <HistoryIcon sx={{ color: '#6366f1' }} />
                        <Box>
                            <Typography variant="subtitle2" fontWeight="600">
                                Carry Forward Information
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                • Annual Leave (AL) allows carry forward up to 6 days
                                • Sick Leave (SL) and Special Leave (SPL) do not allow carry forward
                                • Carry forward will be applied automatically at the end of the year
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            )}

            {/* Edit Dialog */}
            <Dialog open={editDialog.open} onClose={handleCloseEdit} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">✏️ Edit {editDialog.leaveType} Balance</Typography>
                        <IconButton onClick={handleCloseEdit} size="small"><CloseIcon /></IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box mt={2}>
                        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa' }}>
                            <Grid container spacing={1}>
                                <Grid item xs={12}>
                                    <Typography variant="body2">
                                        <strong>Employee:</strong> {editDialog.employeeName}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2">
                                        <strong>Leave Type:</strong> {editDialog.leaveType} ({editDialog.leaveCode})
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2" sx={{ color: '#4caf50' }}>
                                        <strong>Current Remaining:</strong> {editDialog.currentRemaining.toFixed(1)} days
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2" sx={{ color: '#f44336' }}>
                                        <strong>Used:</strong> {editDialog.usedDays.toFixed(1)} days
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2" sx={{ color: '#ff9800' }}>
                                        <strong>Pending:</strong> {editDialog.pendingDays.toFixed(1)} days
                                    </Typography>
                                </Grid>
                                {editDialog.carryForward > 0 && (
                                    <Grid item xs={12}>
                                        <Typography variant="body2" sx={{ color: '#9c27b0' }}>
                                            <strong>Carry Forward:</strong> {editDialog.carryForward.toFixed(1)} days
                                        </Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </Paper>

                        <TextField
                            fullWidth
                            type="number"
                            label="New Total Entitlement *"
                            value={editDialog.newTotal}
                            onChange={(e) => setEditDialog({ ...editDialog, newTotal: parseFloat(e.target.value) || 0 })}
                            InputProps={{ inputProps: { min: 0, step: 0.5 } }}
                            sx={{ mb: 2 }}
                            helperText={`New remaining: ${(editDialog.newTotal - editDialog.usedDays - editDialog.pendingDays + editDialog.carryForward).toFixed(1)} days (including carry forward)`}
                        />

                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Adjustment Reason *"
                            value={editDialog.adjustmentReason}
                            onChange={(e) => setEditDialog({ ...editDialog, adjustmentReason: e.target.value })}
                            placeholder="Please explain why this balance is being adjusted..."
                            required
                        />

                        {editDialog.isLoading && <LinearProgress sx={{ mt: 2 }} />}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseEdit} disabled={editDialog.isLoading}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSaveEdit}
                        disabled={editDialog.isLoading || !editDialog.adjustmentReason}
                        startIcon={<SaveIcon />}
                    >
                        {editDialog.isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default AllLeaveBalances;