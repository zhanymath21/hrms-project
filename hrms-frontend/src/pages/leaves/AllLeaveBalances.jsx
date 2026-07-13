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
} from '@mui/icons-material';
import { useLeave } from '../../contexts/LeaveContext';
import api from '../../services/axios';

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
    const [stats, setStats] = useState({
        totalEmployees: 0,
        totalAnnualLeave: 0,
        totalSickLeave: 0,
        totalSpecialLeave: 0,
        totalRemaining: 0,
    });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Edit Dialog
    const [editDialog, setEditDialog] = useState({
        open: false,
        balanceId: null,
        employeeName: '',
        leaveType: '',
        leaveCode: '',
        currentRemaining: 0,
        currentTotal: 0,
        usedDays: 0,
        pendingDays: 0,
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
            employeesData.forEach(emp => {
                totalAL += emp.annual_leave?.remaining_days || 0;
                totalSL += emp.sick_leave?.remaining_days || 0;
                totalSPL += emp.special_leave?.remaining_days || 0;
                totalRemaining += emp.summary?.remaining_days || 0;
            });

            setStats({
                totalEmployees: pagination.total || employeesData.length,
                totalAnnualLeave: totalAL,
                totalSickLeave: totalSL,
                totalSpecialLeave: totalSPL,
                totalRemaining: totalRemaining,
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

    const handleOpenEdit = (employee, leaveType, balance) => {
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
            leaveType: leaveType.leave_type || leaveType.name,
            leaveCode: leaveType.leave_code || leaveType.code,
            currentRemaining: balance.remaining_days || 0,
            currentTotal: balance.total_entitlement || 0,
            usedDays: balance.used_days || 0,
            pendingDays: balance.pending_days || 0,
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

    if (loading && employees.length === 0) {
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
                    📊 Employee Leave Balances
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

            {/* Stats */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2">Total Employees</Typography>
                            <Typography variant="h4" color="primary.main">{stats.totalEmployees}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{ borderLeft: '4px solid #4caf50' }}>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2">AL Remaining</Typography>
                            <Typography variant="h4" color="success.main">{stats.totalAnnualLeave.toFixed(1)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{ borderLeft: '4px solid #f44336' }}>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2">SL Remaining</Typography>
                            <Typography variant="h4" color="error.main">{stats.totalSickLeave.toFixed(1)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{ borderLeft: '4px solid #ff9800' }}>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2">SPL Remaining</Typography>
                            <Typography variant="h4" color="warning.main">{stats.totalSpecialLeave.toFixed(1)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{ borderLeft: '4px solid #2196f3' }}>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2">Total Remaining</Typography>
                            <Typography variant="h4" color="info.main">{stats.totalRemaining.toFixed(1)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
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
                            <TableCell>Employee</TableCell>
                            <TableCell>Department</TableCell>
                            <TableCell align="center">🏖️ AL</TableCell>
                            <TableCell align="center">🏥 SL</TableCell>
                            <TableCell align="center">🎉 SPL</TableCell>
                            <TableCell align="center">Total</TableCell>
                            <TableCell align="center">Used</TableCell>
                            <TableCell align="center">Pending</TableCell>
                            <TableCell align="center">Remaining</TableCell>
                            <TableCell align="center">Status</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {employees.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                                    <Typography color="textSecondary">No employees found</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            employees.map((employee) => {
                                const al = employee.annual_leave || {};
                                const sl = employee.sick_leave || {};
                                const spl = employee.special_leave || {};
                                const summary = employee.summary || {};
                                const remaining = summary.remaining_days || 0;
                                const total = summary.total_entitlement || 0;
                                const statusColor = getStatusColor(remaining, total);
                                const statusLabel = getStatusLabel(remaining, total);

                                return (
                                    <TableRow key={employee.id} hover>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
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
                                            <Chip label={employee.department?.name || 'N/A'} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title={`Annual Leave: ${al.remaining_days || 0} days remaining`}>
                                                <Typography variant="body2" fontWeight="bold" color="success.main">
                                                    {al.remaining_days?.toFixed(1) || 0}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title={`Sick Leave: ${sl.remaining_days || 0} days remaining`}>
                                                <Typography variant="body2" fontWeight="bold" color="error.main">
                                                    {sl.remaining_days?.toFixed(1) || 0}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title={`Special Leave: ${spl.remaining_days || 0} days remaining`}>
                                                <Typography variant="body2" fontWeight="bold" color="warning.main">
                                                    {spl.remaining_days?.toFixed(1) || 0}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" fontWeight="medium">{total.toFixed(1)}</Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" color="error.main">{summary.used_days?.toFixed(1) || 0}</Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" color="warning.main">{summary.pending_days?.toFixed(1) || 0}</Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" fontWeight="bold" color="success.main">{remaining.toFixed(1)}</Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip label={statusLabel} color={statusColor} size="small" />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Edit Balance">
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => {
                                                        const firstBalance = employee.leave_balances?.[0];
                                                        if (firstBalance) {
                                                            handleOpenEdit(employee, firstBalance, firstBalance);
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
                                    <Typography variant="body2" color="success.main">
                                        <strong>Current Remaining:</strong> {editDialog.currentRemaining.toFixed(1)} days
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2" color="error.main">
                                        <strong>Used:</strong> {editDialog.usedDays.toFixed(1)} days
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2" color="warning.main">
                                        <strong>Pending:</strong> {editDialog.pendingDays.toFixed(1)} days
                                    </Typography>
                                </Grid>
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
                            helperText={`New remaining: ${(editDialog.newTotal - editDialog.usedDays - editDialog.pendingDays).toFixed(1)} days`}
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