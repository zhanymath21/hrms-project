// src/pages/leaves/LeaveDetail.jsx

import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Divider,
    Chip,
    Button,
    IconButton,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    Stack,
    Avatar,
    Tooltip,
    Badge,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    TableHead,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Download as DownloadIcon,
    Print as PrintIcon,
    Person as PersonIcon,
    CalendarToday as CalendarIcon,
    Business as BusinessIcon,
    Badge as BadgeIcon,
    Schedule as ScheduleIcon,
    Check as CheckIcon,
    Close as CloseIcon,
    GetApp as GetAppIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useLeave } from '../../contexts/LeaveContext';
import leaveService from '../../services/leaveService';
import { formatDate } from '../../utils/dateFormat';

const LeaveDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { approveLeave, rejectLeave, cancelLeave } = useLeave();

    const [leave, setLeave] = useState(null);
    const [approvalStatus, setApprovalStatus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await leaveService.getLeave(id);
            setLeave(data?.leave || data);
            setApprovalStatus(data?.approval_status || []);
        } catch (err) {
            setError('Failed to load leave details');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        setIsSubmitting(true);
        try {
            await approveLeave(leave.id);
            setSuccess('Leave approved successfully!');
            loadData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('Failed to approve: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            alert('Please provide a rejection reason');
            return;
        }
        setIsSubmitting(true);
        try {
            await rejectLeave(leave.id, rejectReason);
            setSuccess('Leave rejected successfully!');
            setShowRejectDialog(false);
            setRejectReason('');
            loadData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('Failed to reject: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = async () => {
        if (window.confirm('Are you sure you want to cancel this leave request?')) {
            try {
                await cancelLeave(leave.id);
                setSuccess('Leave cancelled successfully!');
                loadData();
                setTimeout(() => setSuccess(null), 3000);
            } catch (err) {
                setError('Failed to cancel: ' + err.message);
            }
        }
    };

    const handleDownload = () => {
        window.print();
    };

    const handleDownloadAttachment = async () => {
        try {
            const response = await leaveService.downloadLeaveAttachment(leave.id);
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

    const getInitials = (name) => {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
        }
        return name.substring(0, 2).toUpperCase();
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
            <Box p={3}>
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

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <IconButton onClick={() => navigate('/leaves')}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h5" fontWeight="bold">
                        📋 Leave Application
                    </Typography>
                    <Chip
                        label={leave.status.toUpperCase()}
                        color={isPending ? 'warning' : isApproved ? 'success' : isRejected ? 'error' : 'default'}
                        size="medium"
                    />
                </Box>
                <Stack direction="row" spacing={1}>
                    {leave.attachment && (
                        <Tooltip title="Download Attachment">
                            <Button
                                variant="outlined"
                                startIcon={<GetAppIcon />}
                                onClick={handleDownloadAttachment}
                                size="small"
                            >
                                Attachment
                            </Button>
                        </Tooltip>
                    )}
                    <Tooltip title="Print">
                        <Button
                            variant="outlined"
                            startIcon={<PrintIcon />}
                            onClick={handleDownload}
                            size="small"
                        >
                            Print
                        </Button>
                    </Tooltip>
                </Stack>
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

            <Paper sx={{ p: 4, mb: 3 }} id="leave-application">
                {/* Title */}
                <Typography variant="h5" fontWeight="bold" textAlign="center" sx={{ mb: 3, pb: 2, borderBottom: '3px solid #1a237e', color: '#1a237e' }}>
                    LEAVE APPLICATION
                </Typography>

                {/* Employee Info */}
                <Grid container spacing={1} mb={3}>
                    <Grid item xs={12} sm={3}>
                        <Typography variant="body2" color="textSecondary" fontWeight="bold">Name:</Typography>
                    </Grid>
                    <Grid item xs={12} sm={9}>
                        <Typography variant="body2" fontWeight="bold">
                            {leave.employee?.first_name} {leave.employee?.last_name}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <Typography variant="body2" color="textSecondary" fontWeight="bold">Department:</Typography>
                    </Grid>
                    <Grid item xs={12} sm={9}>
                        <Typography variant="body2" fontWeight="bold">
                            {leave.employee?.department?.name || '-'}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <Typography variant="body2" color="textSecondary" fontWeight="bold">Position:</Typography>
                    </Grid>
                    <Grid item xs={12} sm={9}>
                        <Typography variant="body2" fontWeight="bold">
                            {leave.employee?.position?.title || '-'}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <Typography variant="body2" color="textSecondary" fontWeight="bold">Date:</Typography>
                    </Grid>
                    <Grid item xs={12} sm={9}>
                        <Typography variant="body2" fontWeight="bold">
                            {formatDate(leave.created_at)}
                        </Typography>
                    </Grid>
                </Grid>

                <Divider sx={{ mb: 3 }} />

                {/* Leave Applied */}
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, color: '#1a237e' }}>
                    Leave Applied
                </Typography>
                <Grid container spacing={2} mb={3}>
                    <Grid item xs={12} sm={3}>
                        <Box sx={{ bgcolor: '#f5f5f5', p: 1.5, borderRadius: 1 }}>
                            <Typography variant="caption" color="textSecondary">Leave Type</Typography>
                            <Typography variant="body2" fontWeight="bold">
                                {leave.leave_type?.name || '-'} ({leave.leave_type?.code || '-'})
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <Box sx={{ bgcolor: '#f5f5f5', p: 1.5, borderRadius: 1 }}>
                            <Typography variant="caption" color="textSecondary">From</Typography>
                            <Typography variant="body2" fontWeight="bold">
                                {formatDate(leave.start_date)}
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <Box sx={{ bgcolor: '#f5f5f5', p: 1.5, borderRadius: 1 }}>
                            <Typography variant="caption" color="textSecondary">To</Typography>
                            <Typography variant="body2" fontWeight="bold">
                                {formatDate(leave.end_date)}
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <Box sx={{ bgcolor: '#e3f2fd', p: 1.5, borderRadius: 1, border: '2px solid #1a237e' }}>
                            <Typography variant="caption" color="textSecondary">Total Days</Typography>
                            <Typography variant="body2" fontWeight="bold" color="#1a237e">
                                {leave.total_days} days
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>

                {/* Reason */}
                <Grid container spacing={2} mb={3}>
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, color: '#1a237e' }}>
                            Reason for Leave
                        </Typography>
                        <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fafafa' }}>
                            <Typography variant="body1">
                                {leave.reason || 'No reason provided'}
                            </Typography>
                        </Paper>
                    </Grid>
                </Grid>

                <Divider sx={{ mb: 3 }} />

                {/* Approval Status */}
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, color: '#1a237e' }}>
                    Approval Status
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                <TableCell>Approver</TableCell>
                                <TableCell align="center">Status</TableCell>
                                <TableCell align="center">Date</TableCell>
                                <TableCell>Notes</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow>
                                <TableCell>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main', fontSize: 12 }}>
                                            {getInitials(leave.employee?.first_name + ' ' + leave.employee?.last_name)}
                                        </Avatar>
                                        <Typography variant="body2">
                                            {leave.employee?.first_name} {leave.employee?.last_name}
                                        </Typography>
                                    </Box>
                                    <Typography variant="caption" color="textSecondary" display="block">
                                        Applicant
                                    </Typography>
                                </TableCell>
                                <TableCell align="center">
                                    <Chip label="Submitted" color="success" size="small" />
                                </TableCell>
                                <TableCell align="center">
                                    <Typography variant="caption">{formatDate(leave.created_at)}</Typography>
                                </TableCell>
                                <TableCell>-</TableCell>
                            </TableRow>

                            {approvalStatus.length > 0 ? (
                                approvalStatus.map((level, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Avatar sx={{ width: 24, height: 24, bgcolor: 'grey.400', fontSize: 12 }}>
                                                    {level.approver?.charAt(0) || '?'}
                                                </Avatar>
                                                <Typography variant="body2">
                                                    {level.approver || 'Waiting...'}
                                                </Typography>
                                            </Box>
                                            <Typography variant="caption" color="textSecondary" display="block">
                                                {level.level_label || `Level ${level.level}`}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            {level.status === 'pending' ? (
                                                <Chip label="Pending" color="warning" size="small" />
                                            ) : level.status === 'approved' ? (
                                                <Chip label="Approved" color="success" size="small" />
                                            ) : level.status === 'rejected' ? (
                                                <Chip label="Rejected" color="error" size="small" />
                                            ) : (
                                                <Chip label="Waiting" color="default" size="small" />
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="caption">
                                                {level.approved_at ? formatDate(level.approved_at) : '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="textSecondary">
                                                {level.notes || '-'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} align="center">
                                        <Typography color="textSecondary">No approval records yet</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Actions */}
                {isPending && (
                    <Box sx={{ mt: 3, pt: 3, borderTop: '2px dashed #e0e0e0' }}>
                        <Typography variant="subtitle1" fontWeight="bold" color="primary.main" gutterBottom>
                            ✍️ Approval Action
                        </Typography>
                        <Stack direction="row" spacing={2}>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<CheckIcon />}
                                onClick={handleApprove}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Processing...' : 'Approve'}
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                startIcon={<CloseIcon />}
                                onClick={() => setShowRejectDialog(true)}
                                disabled={isSubmitting}
                            >
                                Reject
                            </Button>
                            <Button
                                variant="outlined"
                                color="warning"
                                onClick={handleCancel}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                        </Stack>
                    </Box>
                )}

                {/* Reject Dialog */}
                <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Reject Leave Request</DialogTitle>
                    <DialogContent>
                        <Box mt={2}>
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                <Typography variant="body2">
                                    <strong>Employee:</strong> {leave.employee?.first_name} {leave.employee?.last_name}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Leave Type:</strong> {leave.leave_type?.name}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Duration:</strong> {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                                </Typography>
                            </Alert>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="Rejection Reason *"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Please provide a detailed reason for rejection..."
                                required
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setShowRejectDialog(false)}>Cancel</Button>
                        <Button
                            variant="contained"
                            color="error"
                            onClick={handleReject}
                            disabled={isSubmitting || !rejectReason.trim()}
                        >
                            {isSubmitting ? 'Processing...' : 'Reject'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Paper>

            {/* Print Styles */}
            <style>
                {`
                    @media print {
                        #leave-application {
                            padding: 20px !important;
                            margin: 0 !important;
                        }
                        .MuiPaper-root {
                            box-shadow: none !important;
                            border: 1px solid #e0e0e0 !important;
                        }
                        .MuiButton-root, .MuiIconButton-root, .MuiAlert-root {
                            display: none !important;
                        }
                        body {
                            background: white !important;
                        }
                    }
                `}
            </style>
        </Box>
    );
};

export default LeaveDetail;