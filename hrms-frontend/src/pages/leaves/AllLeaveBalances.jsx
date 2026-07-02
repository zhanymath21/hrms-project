// src/pages/leaves/AllLeaveBalances.jsx

import React, { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    Person as PersonIcon,
    Business as BusinessIcon,
    CalendarToday as CalendarIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    Print as PrintIcon,
    FileDownload as FileDownloadIcon,
    Visibility as VisibilityIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { useLeave } from '../../contexts/LeaveContext';
import leaveService from '../../services/leaveService';
import api from '../../services/axios';

const AllLeaveBalances = () => {
    const [loading, setLoading] = useState(true);
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
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [stats, setStats] = useState({
        totalEmployees: 0,
        totalAnnualLeave: 0,
        totalSickLeave: 0,
        totalSpecialLeave: 0,
        totalRemaining: 0,
    });

    // Edit Dialog State
    const [editDialog, setEditDialog] = useState({
        open: false,
        balanceId: null,
        employeeName: '',
        leaveType: '',
        leaveCode: '',
        currentRemaining: 0,
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
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: page + 1,
                per_page: rowsPerPage,
            };
            if (search) params.search = search;
            if (departmentFilter) params.department_id = departmentFilter;

            // 🔥 PAKAI getAllBalances DARI leaveService
            const response = await leaveService.getAllBalances(params);
            
            // Response sudah berbentuk { data: [], pagination: {} }
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
                totalAL += emp.annual_leave?.remaining || 0;
                totalSL += emp.sick_leave?.remaining || 0;
                totalSPL += emp.special_leave?.remaining || 0;
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
            setError('Failed to load leave balances: ' + err.message);
            console.error('Error loading balances:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        loadData();
        setSuccess('Data refreshed successfully!');
        setTimeout(() => setSuccess(null), 3000);
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

    // ========== EDIT BALANCE ==========
    const handleOpenEdit = (employee, leaveType, balance) => {
        if (!balance || !balance.id) {
            alert('Balance not found for this employee');
            return;
        }

        setEditDialog({
            open: true,
            balanceId: balance.id,
            employeeName: employee.name,
            leaveType: leaveType.name,
            leaveCode: leaveType.code,
            currentRemaining: balance.remaining || 0,
            newTotal: balance.total || 0,
            adjustmentReason: '',
            isLoading: false,
        });
    };

    const handleCloseEdit = () => {
        setEditDialog({
            open: false,
            balanceId: null,
            employeeName: '',
            leaveType: '',
            leaveCode: '',
            currentRemaining: 0,
            newTotal: 0,
            adjustmentReason: '',
            isLoading: false,
        });
    };

    const handleSaveEdit = async () => {
        if (!editDialog.adjustmentReason) {
            alert('Please provide a reason for adjustment');
            return;
        }

        if (editDialog.newTotal < 0) {
            alert('Total entitlement cannot be negative');
            return;
        }

        setEditDialog({ ...editDialog, isLoading: true });
        setError(null);

        try {
            await leaveService.updateBalance(editDialog.balanceId, {
                total_entitlement: editDialog.newTotal,
                adjustment_reason: editDialog.adjustmentReason,
            });

            setSuccess(`✅ ${editDialog.employeeName}'s ${editDialog.leaveType} balance updated successfully!`);
            setTimeout(() => setSuccess(null), 5000);
            
            handleCloseEdit();
            loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update balance');
        } finally {
            setEditDialog({ ...editDialog, isLoading: false });
        }
    };

    // ========== HELPER FUNCTIONS ==========
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

    // ========== RENDER ==========
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

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            )}

            {/* Stats Cards */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2">
                                Total Employees
                            </Typography>
                            <Typography variant="h4" color="primary.main">
                                {stats.totalEmployees}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{ borderLeft: '4px solid #4caf50' }}>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2">
                                Annual Leave Remaining
                            </Typography>
                            <Typography variant="h4" color="success.main">
                                {stats.totalAnnualLeave.toFixed(1)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{ borderLeft: '4px solid #f44336' }}>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2">
                                Sick Leave Remaining
                            </Typography>
                            <Typography variant="h4" color="error.main">
                                {stats.totalSickLeave.toFixed(1)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{ borderLeft: '4px solid #ff9800' }}>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2">
                                Special Leave Remaining
                            </Typography>
                            <Typography variant="h4" color="warning.main">
                                {stats.totalSpecialLeave.toFixed(1)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{ borderLeft: '4px solid #2196f3' }}>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2">
                                Total Remaining
                            </Typography>
                            <Typography variant="h4" color="info.main">
                                {stats.totalRemaining.toFixed(1)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={5}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search by name or employee ID..."
                            value={search}
                            onChange={handleSearch}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
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
                            <Select
                                value={departmentFilter}
                                label="Department"
                                onChange={handleDepartmentChange}
                            >
                                <MenuItem value="">All Departments</MenuItem>
                                {departments.map((dept) => (
                                    <MenuItem key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </MenuItem>
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
                    <Grid item xs={12} sm={6} md={2}>
                        <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            startIcon={<FileDownloadIcon />}
                            disabled={employees.length === 0}
                        >
                            Export
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
                            <TableCell align="center">
                                <Tooltip title="Annual Leave">
                                    <span>🏖️ AL</span>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center">
                                <Tooltip title="Sick Leave">
                                    <span>🏥 SL</span>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center">
                                <Tooltip title="Special Leave">
                                    <span>🎉 SPL</span>
                                </Tooltip>
                            </TableCell>
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
                                    <Typography color="textSecondary">
                                        {search || departmentFilter 
                                            ? 'No employees match your filters' 
                                            : 'No employees found'}
                                    </Typography>
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
                                            <Chip
                                                label={employee.department?.name || 'N/A'}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography 
                                                variant="body2" 
                                                fontWeight="bold"
                                                color={al.remaining > 0 ? 'success.main' : 'error.main'}
                                            >
                                                {al.remaining?.toFixed(1) || 0}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                / {al.total?.toFixed(1) || 0}
                                            </Typography>
                                            <Tooltip title="Edit Annual Leave">
                                                <IconButton 
                                                    size="small" 
                                                    color="primary"
                                                    onClick={() => handleOpenEdit(employee, { name: 'Annual Leave', code: 'AL' }, al)}
                                                    sx={{ ml: 0.5 }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography 
                                                variant="body2" 
                                                fontWeight="bold"
                                                color={sl.remaining > 0 ? 'success.main' : 'error.main'}
                                            >
                                                {sl.remaining?.toFixed(1) || 0}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                / {sl.total?.toFixed(1) || 0}
                                            </Typography>
                                            <Tooltip title="Edit Sick Leave">
                                                <IconButton 
                                                    size="small" 
                                                    color="primary"
                                                    onClick={() => handleOpenEdit(employee, { name: 'Sick Leave', code: 'SL' }, sl)}
                                                    sx={{ ml: 0.5 }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography 
                                                variant="body2" 
                                                fontWeight="bold"
                                                color={spl.remaining > 0 ? 'success.main' : 'error.main'}
                                            >
                                                {spl.remaining?.toFixed(1) || 0}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                / {spl.total?.toFixed(1) || 0}
                                            </Typography>
                                            <Tooltip title="Edit Special Leave">
                                                <IconButton 
                                                    size="small" 
                                                    color="primary"
                                                    onClick={() => handleOpenEdit(employee, { name: 'Special Leave', code: 'SPL' }, spl)}
                                                    sx={{ ml: 0.5 }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" fontWeight="medium">
                                                {total.toFixed(1)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" color="error.main">
                                                {summary.used_days?.toFixed(1) || 0}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" color="warning.main">
                                                {summary.pending_days?.toFixed(1) || 0}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" fontWeight="bold" color="success.main">
                                                {remaining.toFixed(1)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
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
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="View Details">
                                                <IconButton size="small" color="info">
                                                    <VisibilityIcon fontSize="small" />
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

            {/* ========== EDIT DIALOG ========== */}
            <Dialog open={editDialog.open} onClose={handleCloseEdit} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">
                            ✏️ Edit {editDialog.leaveType} Balance
                        </Typography>
                        <IconButton onClick={handleCloseEdit} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box mt={2}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            <Typography variant="body2">
                                <strong>Employee:</strong> {editDialog.employeeName}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Leave Type:</strong> {editDialog.leaveType} ({editDialog.leaveCode})
                            </Typography>
                            <Typography variant="body2">
                                <strong>Current Remaining:</strong> {editDialog.currentRemaining.toFixed(1)} days
                            </Typography>
                        </Alert>

                        <TextField
                            fullWidth
                            type="number"
                            label="New Total Entitlement"
                            value={editDialog.newTotal}
                            onChange={(e) => setEditDialog({ ...editDialog, newTotal: parseFloat(e.target.value) || 0 })}
                            InputProps={{
                                inputProps: { min: 0, step: 0.5 }
                            }}
                            sx={{ mb: 2 }}
                            helperText="Enter the new total entitlement for this leave type"
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
                            helperText="This reason will be logged for audit purposes"
                        />

                        {editDialog.isLoading && (
                            <LinearProgress sx={{ mt: 2 }} />
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseEdit} disabled={editDialog.isLoading}>
                        Cancel
                    </Button>
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
        </Box>
    );
};

export default AllLeaveBalances;