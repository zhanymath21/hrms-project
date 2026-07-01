// src/pages/leaves/LeaveApproval.jsx

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Button,
    IconButton,
    Stack,
    Alert,
    CircularProgress,
    Tabs,
    Tab,
    Divider,
    Chip,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Avatar,
    Badge,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Visibility as VisibilityIcon,
    Person as PersonIcon,
    CalendarToday as CalendarIcon,
    Description as DescriptionIcon,
    Business as BusinessIcon,
    AccessTime as AccessTimeIcon,
    CheckCircleOutline as CheckCircleOutlineIcon,
    CancelOutlined as CancelOutlinedIcon,
    Pending as PendingIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLeave } from '../contexts/LeaveContext';
import LeaveStatusBadge from '../../components/leaves/LeaveStatusBadge';
import { formatDate } from '../../utils/dateFormat';
import leaveService from '../../services/leaveService';

const LeaveApproval = () => {
    const navigate = useNavigate();
    const { approveLeave, rejectLeave, loading } = useLeave();
    
    // States
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [allLeaves, setAllLeaves] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
    });
    const [tabValue, setTabValue] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [selectedLeaveDetail, setSelectedLeaveDetail] = useState(null);
    const [showDetailDialog, setShowDetailDialog] = useState(false);

    // Load data
    const loadData = useCallback(async () => {
        setLoadingData(true);
        setError(null);
        try {
            // Get pending leaves for approval
            const pendingResult = await leaveService.getPendingLeaves();
            setPendingLeaves(pendingResult?.data || []);
            
            // Get all leaves with pending filter
            const allResult = await leaveService.getLeaves({ status: 'pending', per_page: 100 });
            const allPending = allResult?.data || [];
            
            // Calculate stats
            const total = allPending.length;
            const pending = allPending.filter(l => l.status === 'pending').length;
            const approved = allPending.filter(l => l.status === 'approved').length;
            const rejected = allPending.filter(l => l.status === 'rejected').length;
            
            setStats({
                total,
                pending,
                approved,
                rejected,
            });
            
            setAllLeaves(allPending);
        } catch (err) {
            setError('Failed to load approval data: ' + err.message);
        } finally {
            setLoadingData(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRefresh = () => {
        loadData();
        setSuccess('Data refreshed!');
        setTimeout(() => setSuccess(null), 3000);
    };

    const handleApprove = async (id) => {
        if (window.confirm('Are you sure you want to approve this leave request?')) {
            try {
                await approveLeave(id);
                setSuccess('Leave request approved successfully!');
                loadData();
                setTimeout(() => setSuccess(null), 3000);
            } catch (err) {
                setError('Failed to approve: ' + err.message);
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
            setSuccess('Leave request rejected successfully!');
            setShowRejectDialog(false);
            setRejectReason('');
            setSelectedLeave(null);
            loadData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('Failed to reject: ' + err.message);
        }
    };

    const handleViewDetail = (leave) => {
        setSelectedLeaveDetail(leave);
        setShowDetailDialog(true);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'approved': return 'success';
            case 'rejected': return 'error';
            case 'cancelled': return 'default';
            default: return 'default';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <PendingIcon fontSize="small" />;
            case 'approved': return <CheckCircleIcon fontSize="small" />;
            case 'rejected': return <CancelIcon fontSize="small" />;
            default: return <AccessTimeIcon fontSize="small" />;
        }
    };

    const getTabData = () => {
        switch (tabValue) {
            case 0: return pendingLeaves;
            case 1: return allLeaves.filter(l => l.status === 'pending');
            case 2: return allLeaves.filter(l => l.status === 'approved');
            case 3: return allLeaves.filter(l => l.status === 'rejected');
            default: return pendingLeaves;
        }
    };

    const currentData = getTabData();
    const paginatedData = currentData.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    if (loadingData) {
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
                    ✅ Leave Approval
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
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2" gutterBottom>
                                Total Pending
                            </Typography>
                            <Typography variant="h4" color="warning.main">
                                {stats.pending}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2" gutterBottom>
                                Approved
                            </Typography>
                            <Typography variant="h4" color="success.main">
                                {stats.approved}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2" gutterBottom>
                                Rejected
                            </Typography>
                            <Typography variant="h4" color="error.main">
                                {stats.rejected}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2" gutterBottom>
                                Total Requests
                            </Typography>
                            <Typography variant="h4" color="primary.main">
                                {stats.total}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Tabs */}
            <Paper sx={{ mb: 2 }}>
                <Tabs
                    value={tabValue}
                    onChange={(e, newValue) => {
                        setTabValue(newValue);
                        setPage(0);
                    }}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label={`Pending (${pendingLeaves.length})`} />
                    <Tab label="All Pending" />
                    <Tab label="Approved" />
                    <Tab label="Rejected" />
                </Tabs>
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
                        {paginatedData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                    <Typography color="textSecondary">
                                        No leave requests found
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedData.map((leave) => (
                                <TableRow 
                                    key={leave.id} 
                                    hover
                                    sx={{ 
                                        bgcolor: leave.status === 'pending' 
                                            ? 'rgba(255, 243, 224, 0.5)' 
                                            : 'inherit'
                                    }}
                                >
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                                {leave.employee?.first_name?.[0]}
                                                {leave.employee?.last_name?.[0]}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {leave.employee?.first_name} {leave.employee?.last_name}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    {leave.employee?.employee_id}
                                                </Typography>
                                            </Box>
                                        </Box>
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
                                                            sx={{ 
                                                                bgcolor: 'success.light',
                                                                '&:hover': { bgcolor: 'success.main', color: 'white' }
                                                            }}
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
                                                            sx={{ 
                                                                bgcolor: 'error.light',
                                                                '&:hover': { bgcolor: 'error.main', color: 'white' }
                                                            }}
                                                        >
                                                            <CancelIcon fontSize="small" />
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
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[10, 25, 50]}
                    component="div"
                    count={currentData.length}
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

            {/* Detail Dialog */}
            <Dialog open={showDetailDialog} onClose={() => setShowDetailDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">Leave Request Details</Typography>
                        <IconButton onClick={() => setShowDetailDialog(false)} size="small">
                            <CancelIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    {selectedLeaveDetail && (
                        <Grid container spacing={3}>
                            {/* Employee Info */}
                            <Grid item xs={12} md={6}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                        Employee Information
                                    </Typography>
                                    <Box display="flex" alignItems="center" gap={2} mt={1}>
                                        <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
                                            {selectedLeaveDetail.employee?.first_name?.[0]}
                                            {selectedLeaveDetail.employee?.last_name?.[0]}
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body1" fontWeight="medium">
                                                {selectedLeaveDetail.employee?.first_name} {selectedLeaveDetail.employee?.last_name}
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary">
                                                {selectedLeaveDetail.employee?.employee_id}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                {selectedLeaveDetail.employee?.department?.name}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Paper>
                            </Grid>

                            {/* Leave Info */}
                            <Grid item xs={12} md={6}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                        Leave Information
                                    </Typography>
                                    <Box mt={1}>
                                        <Box display="flex" justifyContent="space-between" mb={1}>
                                            <Typography variant="body2" color="textSecondary">Type</Typography>
                                            <Typography variant="body2" fontWeight="medium">
                                                {selectedLeaveDetail.leave_type?.name}
                                            </Typography>
                                        </Box>
                                        <Box display="flex" justifyContent="space-between" mb={1}>
                                            <Typography variant="body2" color="textSecondary">Days</Typography>
                                            <Typography variant="body2" fontWeight="medium">
                                                {selectedLeaveDetail.total_days} days
                                            </Typography>
                                        </Box>
                                        <Box display="flex" justifyContent="space-between" mb={1}>
                                            <Typography variant="body2" color="textSecondary">Status</Typography>
                                            <LeaveStatusBadge status={selectedLeaveDetail.status} />
                                        </Box>
                                    </Box>
                                </Paper>
                            </Grid>

                            {/* Date Range */}
                            <Grid item xs={12}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                        Date Range
                                    </Typography>
                                    <Box display="flex" alignItems="center" gap={2} mt={1}>
                                        <Box>
                                            <Typography variant="caption" color="textSecondary">Start Date</Typography>
                                            <Typography variant="body2" fontWeight="medium">
                                                {formatDate(selectedLeaveDetail.start_date)}
                                            </Typography>
                                        </Box>
                                        <Box>→</Box>
                                        <Box>
                                            <Typography variant="caption" color="textSecondary">End Date</Typography>
                                            <Typography variant="body2" fontWeight="medium">
                                                {formatDate(selectedLeaveDetail.end_date)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Paper>
                            </Grid>

                            {/* Reason */}
                            <Grid item xs={12}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                        Reason
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                        {selectedLeaveDetail.reason || 'No reason provided'}
                                    </Typography>
                                </Paper>
                            </Grid>

                            {/* Timeline */}
                            <Grid item xs={12}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                        Timeline
                                    </Typography>
                                    <Stack spacing={1} mt={1}>
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <CheckCircleIcon fontSize="small" color="success" />
                                            <Box>
                                                <Typography variant="body2">Request Created</Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    {formatDate(selectedLeaveDetail.created_at)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        {selectedLeaveDetail.approved_at && (
                                            <Box display="flex" alignItems="center" gap={2}>
                                                <CheckCircleIcon fontSize="small" color="success" />
                                                <Box>
                                                    <Typography variant="body2">Approved</Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {formatDate(selectedLeaveDetail.approved_at)}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )}
                                        {selectedLeaveDetail.cancelled_at && (
                                            <Box display="flex" alignItems="center" gap={2}>
                                                <CancelIcon fontSize="small" color="warning" />
                                                <Box>
                                                    <Typography variant="body2">Cancelled</Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {formatDate(selectedLeaveDetail.cancelled_at)}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )}
                                    </Stack>
                                </Paper>
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    {selectedLeaveDetail?.status === 'pending' && (
                        <>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => {
                                    handleApprove(selectedLeaveDetail.id);
                                    setShowDetailDialog(false);
                                }}
                            >
                                Approve
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                startIcon={<CancelIcon />}
                                onClick={() => {
                                    setShowDetailDialog(false);
                                    setSelectedLeave(selectedLeaveDetail);
                                    setShowRejectDialog(true);
                                }}
                            >
                                Reject
                            </Button>
                        </>
                    )}
                    <Button onClick={() => setShowDetailDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default LeaveApproval;