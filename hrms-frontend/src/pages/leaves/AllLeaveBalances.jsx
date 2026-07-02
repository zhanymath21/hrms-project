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
} from '@mui/icons-material';
import { useLeave } from '../../contexts/LeaveContext';
import leaveService from '../../services/leaveService';

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
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);

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

            const response = await leaveService.getAllBalances(params);
            const data = response.data || response;
            
            setEmployees(data?.data || []);
            setPagination({
                current_page: data?.pagination?.current_page || 1,
                per_page: data?.pagination?.per_page || 20,
                total: data?.pagination?.total || 0,
                last_page: data?.pagination?.last_page || 1,
            });
        } catch (err) {
            setError('Failed to load leave balances: ' + err.message);
            console.error('Error loading balances:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => loadData();

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
                    📊 All Employee Leave Balances
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
                </Grid>
            </Paper>

            {/* Summary Cards */}
            {employees.length > 0 && (
                <Grid container spacing={2} mb={3}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" variant="body2">
                                    Total Employees
                                </Typography>
                                <Typography variant="h4">
                                    {pagination.total}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" variant="body2">
                                    Total Leave Entitlement
                                </Typography>
                                <Typography variant="h4" color="primary.main">
                                    {employees.reduce((sum, emp) => sum + (emp.summary?.total_entitlement || 0), 0)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" variant="body2">
                                    Total Used Days
                                </Typography>
                                <Typography variant="h4" color="error.main">
                                    {employees.reduce((sum, emp) => sum + (emp.summary?.used_days || 0), 0)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" variant="body2">
                                    Total Remaining
                                </Typography>
                                <Typography variant="h4" color="success.main">
                                    {employees.reduce((sum, emp) => sum + (emp.summary?.remaining_days || 0), 0)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Table */}
            <TableContainer component={Paper}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell>Employee</TableCell>
                            <TableCell>Department</TableCell>
                            <TableCell>Years of Service</TableCell>
                            <TableCell align="center">Leave Details</TableCell>
                            <TableCell align="center">Total</TableCell>
                            <TableCell align="center">Used</TableCell>
                            <TableCell align="center">Pending</TableCell>
                            <TableCell align="center">Remaining</TableCell>
                            <TableCell align="center">Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {employees.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                    <Typography color="textSecondary">
                                        {search || departmentFilter 
                                            ? 'No employees match your filters' 
                                            : 'No employees found'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            employees.map((employee) => {
                                const summary = employee.summary || {};
                                const remaining = summary.remaining_days || 0;
                                const total = summary.total_entitlement || 0;
                                const statusColor = getStatusColor(remaining, total);
                                const statusLabel = getStatusLabel(remaining, total);

                                return (
                                    <TableRow key={employee.id} hover>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <PersonIcon color="primary" fontSize="small" />
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
                                        <TableCell>
                                            {employee.years_of_service || 0} years
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                                {employee.leave_balances?.map((balance) => (
                                                    <Tooltip
                                                        key={balance.leave_type_id}
                                                        title={`${balance.leave_type}: ${balance.remaining_days} days remaining`}
                                                    >
                                                        <Chip
                                                            label={`${balance.leave_code}: ${balance.remaining_days}`}
                                                            size="small"
                                                            color={balance.remaining_days > 0 ? 'success' : 'error'}
                                                            variant="outlined"
                                                            sx={{ fontSize: '0.65rem' }}
                                                        />
                                                    </Tooltip>
                                                ))}
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" fontWeight="medium">
                                                {total}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" color="error.main">
                                                {summary.used_days || 0}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" color="warning.main">
                                                {summary.pending_days || 0}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" fontWeight="bold" color="success.main">
                                                {remaining}
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
        </Box>
    );
};

export default AllLeaveBalances;