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
    InputAdornment,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Add as AddIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Visibility as VisibilityIcon,
    Block as BlockIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    FilterList as FilterListIcon,
    DateRange as DateRangeIcon,
    Download as DownloadIcon,
} from '@mui/icons-material';
import { useLeave } from '../../contexts/LeaveContext';
import { useNavigate } from 'react-router-dom';
import LeaveStatusBadge from '../../components/leaves/LeaveStatusBadge';
import { formatDate } from '../../utils/dateFormat';
import leaveService from '../../services/leaveService';

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

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        leave_type_id: '',
        start_date: '',
        end_date: '',
    });
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    const [selectedLeaveDetail, setSelectedLeaveDetail] = useState(null);

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
            ...filters,
        };
        Object.keys(params).forEach(key => {
            if (!params[key]) delete params[key];
        });
        await fetchLeaves(params);
        await fetchPendingLeaves();
    };

    const handleRefresh = () => loadData();

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

    const handleViewDetail = (leave) => {
        setSelectedLeaveDetail(leave);
        setShowDetailDialog(true);
    };

    const handleDownloadAttachment = async (id) => {
        try {
            const response = await leaveService.downloadLeaveAttachment(id);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = 'leave_attachment.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Failed to download attachment: ' + err.message);
        }
    };

    const hasActiveFilters = Object.values(filters).some(v => v && v !== '');

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

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search by employee name..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                                endAdornment: filters.search && (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setFilters({ ...filters, search: '' })}>
                                            <ClearIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={filters.status}
                                label="Status"
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            >
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="pending">Pending</MenuItem>
                                <MenuItem value="approved">Approved</MenuItem>
                                <MenuItem value="rejected">Rejected</MenuItem>
                                <MenuItem value="cancelled">Cancelled</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Leave Type</InputLabel>
                            <Select
                                value={filters.leave_type_id}
                                label="Leave Type"
                                onChange={(e) => setFilters({ ...filters, leave_type_id: e.target.value })}
                            >
                                <MenuItem value="">All</MenuItem>
                                {leaveTypes.map((type) => (
                                    <MenuItem key={type.id} value={type.id}>
                                        {type.name}
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
                            onClick={() => {
                                setFilters({ search: '', status: '', leave_type_id: '', start_date: '', end_date: '' });
                                setPage(0);
                            }}
                            disabled={!hasActiveFilters}
                            startIcon={<ClearIcon />}
                        >
                            Clear
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Table */}
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
                                        {hasActiveFilters ? 'No leave requests match your filters' : 'No leave requests found'}
                                    </Typography>
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
                                        <Chip label={leave.leave_type?.name} size="small" variant="outlined" />
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
                                                    onClick={() => handleViewDetail(leave)}
                                                >
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {leave.attachment && (
                                                <Tooltip title="Download Attachment">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => handleDownloadAttachment(leave.id)}
                                                    >
                                                        <DownloadIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[15, 25, 50]}
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

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Reject Leave Request</DialogTitle>
                <DialogContent>
                    <Box mt={2}>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Rejection Reason *"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Please provide reason for rejection..."
                            required
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowRejectDialog(false)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleReject}>
                        Reject
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Detail Dialog */}
            <Dialog open={showDetailDialog} onClose={() => setShowDetailDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">Leave Request Details</Typography>
                        {selectedLeaveDetail?.attachment && (
                            <Button
                                size="small"
                                startIcon={<DownloadIcon />}
                                onClick={() => handleDownloadAttachment(selectedLeaveDetail.id)}
                            >
                                Download Attachment
                            </Button>
                        )}
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="textSecondary">Employee</Typography>
                                <Typography variant="body1">
                                    {selectedLeaveDetail?.employee?.first_name} {selectedLeaveDetail?.employee?.last_name}
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="textSecondary">Leave Type</Typography>
                                <Typography variant="body1">{selectedLeaveDetail?.leave_type?.name}</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="textSecondary">Duration</Typography>
                                <Typography variant="body1">
                                    {formatDate(selectedLeaveDetail?.start_date)} - {formatDate(selectedLeaveDetail?.end_date)}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                    {selectedLeaveDetail?.total_days} days
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="textSecondary">Reason</Typography>
                                <Typography variant="body1">{selectedLeaveDetail?.reason}</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                                <LeaveStatusBadge status={selectedLeaveDetail?.status} size="medium" />
                            </Paper>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowDetailDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default LeaveList;