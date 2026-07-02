// src/pages/leaves/LeaveDetail.jsx

import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Chip,
    Button,
    IconButton,
    Divider,
    Alert,
    CircularProgress,
    Card,
    CardContent,
    Stack,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Block as BlockIcon,
    Person as PersonIcon,
    CalendarToday as CalendarIcon,
    Description as DescriptionIcon,
    Business as BusinessIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useLeave } from '../../contexts/LeaveContext';
import LeaveStatusBadge from '../../components/leaves/LeaveStatusBadge';
import { formatDate } from '../../utils/dateFormat';
import leaveService from '../../services/leaveService';

const LeaveDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { approveLeave, rejectLeave, cancelLeave } = useLeave();
    const [leave, setLeave] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        fetchLeave();
    }, [id]);

    const fetchLeave = async () => {
        setLoading(true);
        try {
            const data = await leaveService.getLeave(id);
            setLeave(data);
        } catch (err) {
            setError('Failed to load leave details');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (window.confirm('Are you sure you want to approve this leave request?')) {
            try {
                await approveLeave(leave.id);
                fetchLeave();
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
            await rejectLeave(leave.id, rejectReason);
            setShowRejectDialog(false);
            setRejectReason('');
            fetchLeave();
        } catch (err) {
            alert('Failed to reject leave: ' + err.message);
        }
    };

    const handleCancel = async () => {
        if (window.confirm('Are you sure you want to cancel this leave request?')) {
            try {
                await cancelLeave(leave.id);
                fetchLeave();
            } catch (err) {
                alert('Failed to cancel leave: ' + err.message);
            }
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error || !leave) {
        return (
            <Box>
                <Alert severity="error">{error || 'Leave not found'}</Alert>
                <Button onClick={() => navigate('/leaves')} sx={{ mt: 2 }}>
                    Back to Leaves
                </Button>
            </Box>
        );
    }

    const isPending = leave.status === 'pending';
    const isApproved = leave.status === 'approved';
    const isRejected = leave.status === 'rejected';
    const isCancelled = leave.status === 'cancelled';

    return (
        <Box>
            {/* Header */}
            <Box display="flex" alignItems="center" mb={3} gap={2}>
                <IconButton onClick={() => navigate('/leaves')}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4" component="h1" fontWeight="bold">
                    Leave Request Details
                </Typography>
                <Box flex={1} />
                <LeaveStatusBadge status={leave.status} size="medium" />
            </Box>

            {/* Action Buttons */}
            {isPending && (
                <Box display="flex" gap={2} mb={3}>
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircleIcon />}
                        onClick={handleApprove}
                    >
                        Approve
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={() => setShowRejectDialog(true)}
                    >
                        Reject
                    </Button>
                    <Button
                        variant="outlined"
                        color="warning"
                        startIcon={<BlockIcon />}
                        onClick={handleCancel}
                    >
                        Cancel
                    </Button>
                </Box>
            )}

            {isPending && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    This leave request is pending approval.
                </Alert>
            )}

            {isApproved && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    This leave request has been approved.
                    {leave.approved_by && (
                        <span> Approved by: {leave.approved_by?.first_name} {leave.approved_by?.last_name}</span>
                    )}
                </Alert>
            )}

            {isRejected && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    This leave request has been rejected.
                    {leave.rejection_reason && (
                        <div style={{ marginTop: 8 }}>
                            <strong>Reason:</strong> {leave.rejection_reason}
                        </div>
                    )}
                </Alert>
            )}

            {isCancelled && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    This leave request has been cancelled.
                </Alert>
            )}

            {/* Main Content */}
            <Grid container spacing={3}>
                {/* Left Column - Leave Info */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom fontWeight="bold">
                            Leave Information
                        </Typography>
                        <Divider sx={{ mb: 3 }} />

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="textSecondary">
                                    Leave Type
                                </Typography>
                                <Typography variant="body1" fontWeight="medium">
                                    {leave.leave_type?.name} ({leave.leave_type?.code})
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="textSecondary">
                                    Total Days
                                </Typography>
                                <Typography variant="body1" fontWeight="medium">
                                    {leave.total_days} day{leave.total_days > 1 ? 's' : ''}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="textSecondary">
                                    Start Date
                                </Typography>
                                <Typography variant="body1">
                                    {formatDate(leave.start_date)}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="textSecondary">
                                    End Date
                                </Typography>
                                <Typography variant="body1">
                                    {formatDate(leave.end_date)}
                                </Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="body2" color="textSecondary">
                                    Reason
                                </Typography>
                                <Paper variant="outlined" sx={{ p: 2, mt: 0.5, bgcolor: '#f8f9fa' }}>
                                    <Typography variant="body1">
                                        {leave.reason || 'No reason provided'}
                                    </Typography>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>

                {/* Right Column - Employee Info */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom fontWeight="bold">
                            Employee Information
                        </Typography>
                        <Divider sx={{ mb: 3 }} />

                        <Box display="flex" alignItems="center" gap={2} mb={2}>
                            <PersonIcon color="primary" sx={{ fontSize: 40 }} />
                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold">
                                    {leave.employee?.first_name} {leave.employee?.last_name}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {leave.employee?.employee_id}
                                </Typography>
                            </Box>
                        </Box>

                        <Card variant="outlined" sx={{ mb: 2 }}>
                            <CardContent>
                                <Stack spacing={1}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <BusinessIcon fontSize="small" color="action" />
                                        <Typography variant="body2">
                                            <strong>Department:</strong> {leave.employee?.department?.name || '-'}
                                        </Typography>
                                    </Box>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <CalendarIcon fontSize="small" color="action" />
                                        <Typography variant="body2">
                                            <strong>Hire Date:</strong> {formatDate(leave.employee?.hire_date)}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>

                        {leave.approved_by && (
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="body2" color="textSecondary" gutterBottom>
                                        Approved By
                                    </Typography>
                                    <Typography variant="body1" fontWeight="medium">
                                        {leave.approved_by?.first_name} {leave.approved_by?.last_name}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        {formatDate(leave.approved_at)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        )}
                    </Paper>
                </Grid>

                {/* Timeline */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom fontWeight="bold">
                            Timeline
                        </Typography>
                        <Divider sx={{ mb: 3 }} />

                        <Stack spacing={2}>
                            <Box display="flex" alignItems="center" gap={2}>
                                <Box
                                    sx={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        bgcolor: 'success.main',
                                    }}
                                />
                                <Box>
                                    <Typography variant="body2" fontWeight="medium">
                                        Request Created
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        {formatDate(leave.created_at)}
                                    </Typography>
                                </Box>
                            </Box>

                            {leave.approved_at && (
                                <Box display="flex" alignItems="center" gap={2}>
                                    <Box
                                        sx={{
                                            width: 12,
                                            height: 12,
                                            borderRadius: '50%',
                                            bgcolor: 'success.main',
                                        }}
                                    />
                                    <Box>
                                        <Typography variant="body2" fontWeight="medium">
                                            Approved
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {formatDate(leave.approved_at)}
                                        </Typography>
                                    </Box>
                                </Box>
                            )}

                            {leave.cancelled_at && (
                                <Box display="flex" alignItems="center" gap={2}>
                                    <Box
                                        sx={{
                                            width: 12,
                                            height: 12,
                                            borderRadius: '50%',
                                            bgcolor: 'warning.main',
                                        }}
                                    />
                                    <Box>
                                        <Typography variant="body2" fontWeight="medium">
                                            Cancelled
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {formatDate(leave.cancelled_at)}
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Reject Leave Request</DialogTitle>
                <DialogContent>
                    <Box mt={1}>
                        <Typography variant="body2" gutterBottom>
                            <strong>Employee:</strong> {leave.employee?.first_name} {leave.employee?.last_name}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                            <strong>Type:</strong> {leave.leave_type?.name}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                            <strong>Duration:</strong> {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Rejection Reason *"
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

export default LeaveDetail;