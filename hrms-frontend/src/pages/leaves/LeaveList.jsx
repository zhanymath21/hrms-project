// src/pages/leaves/LeaveList.jsx

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
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Grid,
    Card,
    CardContent,
    InputAdornment,
    Collapse,
    Divider,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Add as AddIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    Block as BlockIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    FilterList as FilterListIcon,
    DateRange as DateRangeIcon,
} from '@mui/icons-material';
import { useLeave } from '../../contexts/LeaveContext';
import { useNavigate } from 'react-router-dom';
import LeaveStatusBadge from '../../components/leaves/LeaveStatusBadge';
import { formatDate } from '../../utils/dateFormat';
import { DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';

const LeaveList = () => {
    const navigate = useNavigate();
    const {
        leaves,
        pendingLeaves,
        loading,
        error,
        pagination,
        leaveTypes,
        fetchLeaves,
        fetchPendingLeaves,
        fetchLeaveTypes,
        approveLeave,
        rejectLeave,
        cancelLeave,
    } = useLeave();

    // ========== FILTER STATE ==========
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        leave_type_id: '',
        start_date: '',
        end_date: '',
        date_preset: '',
    });
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    // ========== DATE PRESETS ==========
    const datePresets = [
        { value: 'today', label: 'Today' },
        { value: 'yesterday', label: 'Yesterday' },
        { value: 'this_week', label: 'This Week' },
        { value: 'last_week', label: 'Last Week' },
        { value: 'this_month', label: 'This Month' },
        { value: 'last_month', label: 'Last Month' },
        { value: 'this_year', label: 'This Year' },
    ];

    // ========== LOAD DATA ==========
    useEffect(() => {
        fetchLeaveTypes();
    }, []);

    useEffect(() => {
        loadData();
    }, [page, rowsPerPage, filters]);

    const loadData = async () => {
        const params = {
            page: page + 1,
            per_page: rowsPerPage,
        };

        // Add filters
        if (filters.search) params.search = filters.search;
        if (filters.status) params.status = filters.status;
        if (filters.leave_type_id) params.leave_type_id = filters.leave_type_id;
        if (filters.start_date) params.start_date = filters.start_date;
        if (filters.end_date) params.end_date = filters.end_date;

        await fetchLeaves(params);
        await fetchPendingLeaves();
    };

    // ========== HANDLE DATE PRESET ==========
    const handleDatePreset = (value) => {
        if (!value) {
            setFilters({ ...filters, start_date: '', end_date: '', date_preset: '' });
            setPage(0);
            return;
        }

        const now = new Date();
        let start = '';
        let end = '';

        switch (value) {
            case 'today':
                start = format(new Date(), 'yyyy-MM-dd');
                end = format(new Date(), 'yyyy-MM-dd');
                break;
            case 'yesterday':
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                start = format(yesterday, 'yyyy-MM-dd');
                end = format(yesterday, 'yyyy-MM-dd');
                break;
            case 'this_week':
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay() + 1);
                start = format(startOfWeek, 'yyyy-MM-dd');
                end = format(new Date(), 'yyyy-MM-dd');
                break;
            case 'last_week':
                const startLastWeek = new Date(now);
                startLastWeek.setDate(now.getDate() - now.getDay() - 6);
                const endLastWeek = new Date(now);
                endLastWeek.setDate(now.getDate() - now.getDay());
                start = format(startLastWeek, 'yyyy-MM-dd');
                end = format(endLastWeek, 'yyyy-MM-dd');
                break;
            case 'this_month':
                start = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
                end = format(new Date(), 'yyyy-MM-dd');
                break;
            case 'last_month':
                start = format(new Date(now.getFullYear(), now.getMonth() - 1, 1), 'yyyy-MM-dd');
                end = format(new Date(now.getFullYear(), now.getMonth(), 0), 'yyyy-MM-dd');
                break;
            case 'this_year':
                start = format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd');
                end = format(new Date(), 'yyyy-MM-dd');
                break;
            default:
                start = '';
                end = '';
        }

        setFilters({
            ...filters,
            start_date: start,
            end_date: end,
            date_preset: value,
        });
        setPage(0);
    };

    // ========== HANDLE FILTER CHANGE ==========
    const handleFilterChange = (field, value) => {
        setFilters({ ...filters, [field]: value });
        setPage(0);
    };

    const handleClearFilters = () => {
        setFilters({
            search: '',
            status: '',
            leave_type_id: '',
            start_date: '',
            end_date: '',
            date_preset: '',
        });
        setPage(0);
        setShowAdvanced(false);
    };

    const hasActiveFilters = () => {
        return Object.values(filters).some(v => v && v !== '');
    };

    const activeFilterCount = () => {
        return Object.values(filters).filter(v => v && v !== '').length;
    };

    // ========== LEAVE ACTIONS ==========
    const handleApprove = async (id) => {
        if (window.confirm('Are you sure you want to approve this leave request?')) {
            try {
                await approveLeave(id);
                loadData();
            } catch (err) {
                alert('Failed to approve leave: ' + err.message);
            }
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            alert('Please provide a rejection reason');
            return;
        }
        try {
            await rejectLeave(selectedLeave.id, rejectReason);
            setShowRejectDialog(false);
            setRejectReason('');
            setSelectedLeave(null);
            loadData();
        } catch (err) {
            alert('Failed to reject leave: ' + err.message);
        }
    };

    const handleCancel = async (id) => {
        if (window.confirm('Are you sure you want to cancel this leave request?')) {
            try {
                await cancelLeave(id);
                loadData();
            } catch (err) {
                alert('Failed to cancel leave: ' + err.message);
            }
        }
    };

    const handleRefresh = () => loadData();

    if (loading && leaves.length === 0) {
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
                    📋 Leave Requests
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={handleRefresh}
                        disabled={loading}
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

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
                    {error}
                </Alert>
            )}

            {/* Pending Summary */}
            {pendingLeaves.length > 0 && (
                <Paper sx={{ p: 2, mb: 2, bgcolor: '#fff8e1' }}>
                    <Typography variant="subtitle2" color="warning.main">
                        ⚠️ You have {pendingLeaves.length} pending leave request{pendingLeaves.length > 1 ? 's' : ''}
                    </Typography>
                </Paper>
            )}

            {/* ========== FILTER BAR ========== */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    {/* Search */}
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search by employee name or ID..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                                endAdornment: filters.search && (
                                    <InputAdornment position="end">
                                        <IconButton
                                            size="small"
                                            onClick={() => handleFilterChange('search', '')}
                                        >
                                            <ClearIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>

                    {/* Status Filter */}
                    <Grid item xs={12} sm={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={filters.status}
                                label="Status"
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                            >
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="pending">Pending</MenuItem>
                                <MenuItem value="approved">Approved</MenuItem>
                                <MenuItem value="rejected">Rejected</MenuItem>
                                <MenuItem value="cancelled">Cancelled</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Leave Type Filter */}
                    <Grid item xs={12} sm={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Leave Type</InputLabel>
                            <Select
                                value={filters.leave_type_id}
                                label="Leave Type"
                                onChange={(e) => handleFilterChange('leave_type_id', e.target.value)}
                            >
                                <MenuItem value="">All Types</MenuItem>
                                {leaveTypes.map((type) => (
                                    <MenuItem key={type.id} value={type.id}>
                                        {type.name} ({type.code})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Advanced Filter Button */}
                    <Grid item xs={12} sm={6} md={2}>
                        <Button
                            fullWidth
                            variant="outlined"
                            size="medium"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            startIcon={<FilterListIcon />}
                            color={hasActiveFilters() ? 'primary' : 'inherit'}
                        >
                            {showAdvanced ? 'Hide Filters' : 'More Filters'}
                            {activeFilterCount() > 0 && (
                                <Chip
                                    label={activeFilterCount()}
                                    size="small"
                                    color="primary"
                                    sx={{ ml: 0.5 }}
                                />
                            )}
                        </Button>
                    </Grid>

                    {/* Clear Filters */}
                    <Grid item xs={12} sm={6} md={2}>
                        <Button
                            fullWidth
                            variant="outlined"
                            color="error"
                            size="medium"
                            onClick={handleClearFilters}
                            disabled={!hasActiveFilters()}
                            startIcon={<ClearIcon />}
                        >
                            Clear All
                        </Button>
                    </Grid>
                </Grid>

                {/* ========== ADVANCED FILTERS ========== */}
                <Collapse in={showAdvanced}>
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                        <Grid container spacing={2}>
                            {/* Date Preset */}
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Quick Date</InputLabel>
                                    <Select
                                        value={filters.date_preset}
                                        label="Quick Date"
                                        onChange={(e) => handleDatePreset(e.target.value)}
                                    >
                                        <MenuItem value="">Custom Range</MenuItem>
                                        {datePresets.map((preset) => (
                                            <MenuItem key={preset.value} value={preset.value}>
                                                {preset.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            {/* Start Date */}
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="date"
                                    label="Start Date"
                                    size="small"
                                    value={filters.start_date}
                                    onChange={(e) => {
                                        handleFilterChange('start_date', e.target.value);
                                        if (e.target.value) handleFilterChange('date_preset', '');
                                    }}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>

                            {/* End Date */}
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="date"
                                    label="End Date"
                                    size="small"
                                    value={filters.end_date}
                                    onChange={(e) => {
                                        handleFilterChange('end_date', e.target.value);
                                        if (e.target.value) handleFilterChange('date_preset', '');
                                    }}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </Collapse>

                {/* Active Filters Chips */}
                {hasActiveFilters() && (
                    <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #f0f0f0' }}>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {filters.search && (
                                <Chip
                                    label={`Search: ${filters.search}`}
                                    size="small"
                                    onDelete={() => handleFilterChange('search', '')}
                                />
                            )}
                            {filters.status && (
                                <Chip
                                    label={`Status: ${filters.status}`}
                                    size="small"
                                    onDelete={() => handleFilterChange('status', '')}
                                />
                            )}
                            {filters.leave_type_id && (
                                <Chip
                                    label={`Type: ${leaveTypes.find(t => t.id === Number(filters.leave_type_id))?.name}`}
                                    size="small"
                                    onDelete={() => handleFilterChange('leave_type_id', '')}
                                />
                            )}
                            {filters.start_date && (
                                <Chip
                                    label={`From: ${new Date(filters.start_date).toLocaleDateString()}`}
                                    size="small"
                                    onDelete={() => {
                                        handleFilterChange('start_date', '');
                                        handleFilterChange('date_preset', '');
                                    }}
                                />
                            )}
                            {filters.end_date && (
                                <Chip
                                    label={`To: ${new Date(filters.end_date).toLocaleDateString()}`}
                                    size="small"
                                    onDelete={() => {
                                        handleFilterChange('end_date', '');
                                        handleFilterChange('date_preset', '');
                                    }}
                                />
                            )}
                            <Chip
                                label={`Total: ${activeFilterCount()} filters`}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        </Stack>
                    </Box>
                )}
            </Paper>

            {/* ========== TABLE ========== */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell>Employee</TableCell>
                            <TableCell>Leave Type</TableCell>
                            <TableCell>Duration</TableCell>
                            <TableCell>Days</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Requested</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {leaves.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                    <Typography color="textSecondary">
                                        {hasActiveFilters()
                                            ? 'No leave requests match your filters'
                                            : 'No leave requests found'}
                                    </Typography>
                                    {hasActiveFilters() && (
                                        <Button
                                            size="small"
                                            onClick={handleClearFilters}
                                            sx={{ mt: 1 }}
                                        >
                                            Clear filters
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : (
                            leaves.map((leave) => (
                                <TableRow key={leave.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="medium">
                                            {leave.employee?.first_name} {leave.employee?.last_name}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {leave.employee?.employee_id}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={leave.leave_type?.name}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {formatDate(leave.start_date)}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            → {formatDate(leave.end_date)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="medium">
                                            {leave.total_days} day{leave.total_days > 1 ? 's' : ''}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <LeaveStatusBadge status={leave.status} />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" color="textSecondary">
                                            {formatDate(leave.created_at)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={0.5} justifyContent="center">
                                            {leave.status === 'pending' && (
                                                <>
                                                    <Tooltip title="Approve">
                                                        <IconButton
                                                            size="small"
                                                            color="success"
                                                            onClick={() => handleApprove(leave.id)}
                                                        >
                                                            <CheckCircleIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Reject">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => {
                                                                setSelectedLeave(leave);
                                                                setShowRejectDialog(true);
                                                            }}
                                                        >
                                                            <CancelIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Cancel">
                                                        <IconButton
                                                            size="small"
                                                            color="warning"
                                                            onClick={() => handleCancel(leave.id)}
                                                        >
                                                            <BlockIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </>
                                            )}
                                            <Tooltip title="View Details">
                                                <IconButton
                                                    size="small"
                                                    color="info"
                                                    onClick={() => navigate(`/leaves/${leave.id}`)}
                                                >
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[15, 25, 50, 100]}
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

            {/* ========== REJECT DIALOG ========== */}
            <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ bgcolor: 'error.light', color: 'error.main' }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <CancelIcon />
                        Reject Leave Request
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box mt={2}>
                        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa' }}>
                            <Grid container spacing={1}>
                                <Grid item xs={12}>
                                    <Typography variant="body2">
                                        <strong>Employee:</strong> {selectedLeave?.employee?.first_name} {selectedLeave?.employee?.last_name}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2">
                                        <strong>Type:</strong> {selectedLeave?.leave_type?.name}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2">
                                        <strong>Duration:</strong> {formatDate(selectedLeave?.start_date)} - {formatDate(selectedLeave?.end_date)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2">
                                        <strong>Days:</strong> {selectedLeave?.total_days} days
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2">
                                        <strong>Reason:</strong> {selectedLeave?.reason}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Paper>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Rejection Reason *"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Please provide a detailed reason for rejection..."
                            required
                            sx={{ mt: 1 }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setShowRejectDialog(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleReject}
                        startIcon={<CancelIcon />}
                    >
                        Reject Request
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default LeaveList;