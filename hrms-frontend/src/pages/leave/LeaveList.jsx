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
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Add as AddIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    Block as BlockIcon,
} from '@mui/icons-material';
import { useLeave } from '../../contexts/LeaveContext';
import { useNavigate } from 'react-router-dom';
import LeaveStatusBadge from '../../components/leaves/LeaveStatusBadge';
import { formatDate } from '../../utils/dateFormat';

const LeaveList = () => {
    const navigate = useNavigate();
    const {
        leaves,
        pendingLeaves,
        loading,
        error,
        pagination,
        fetchLeaves,
        fetchPendingLeaves,
        approveLeave,
        rejectLeave,
        cancelLeave,
    } = useLeave();

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [statusFilter, setStatusFilter] = useState('');
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        loadData();
    }, [page, rowsPerPage, statusFilter]);

    const loadData = async () => {
        const params = {
            page: page + 1,
            per_page: rowsPerPage,
        };
        if (statusFilter) params.status = statusFilter;
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

            {/* Pending Requests Summary */}
            {pendingLeaves.length > 0 && (
                <Paper sx={{ p: 2, mb: 2, bgcolor: '#fff8e1' }}>
                    <Typography variant="subtitle2" color="warning.main">
                        ⚠️ You have {pendingLeaves.length} pending leave request{pendingLeaves.length > 1 ? 's' : ''}
                    </Typography>
                </Paper>
            )}

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Status"
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(0);
                                }}
                            >
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="pending">Pending</MenuItem>
                                <MenuItem value="approved">Approved</MenuItem>
                                <MenuItem value="rejected">Rejected</MenuItem>
                                <MenuItem value="cancelled">Cancelled</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell>Employee</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Duration</TableCell>
                            <TableCell>Total Days</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Requested</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {leaves.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                    No leave requests found
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
                                            {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
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
                                                </>
                                            )}
                                            {leave.status === 'pending' && (
                                                <Tooltip title="Cancel">
                                                    <IconButton
                                                        size="small"
                                                        color="warning"
                                                        onClick={() => handleCancel(leave.id)}
                                                    >
                                                        <BlockIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            <Tooltip title="View">
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
                    <Box mt={1}>
                        <Typography variant="body2" gutterBottom>
                            <strong>Employee:</strong> {selectedLeave?.employee?.first_name} {selectedLeave?.employee?.last_name}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                            <strong>Type:</strong> {selectedLeave?.leave_type?.name}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                            <strong>Duration:</strong> {formatDate(selectedLeave?.start_date)} - {formatDate(selectedLeave?.end_date)}
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Rejection Reason"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Please provide reason for rejection..."
                            sx={{ mt: 2 }}
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
        </Box>
    );
};

export default LeaveList;