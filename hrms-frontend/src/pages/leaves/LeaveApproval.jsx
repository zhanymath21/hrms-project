// src/pages/leaves/LeaveApproval.jsx

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
    Chip,
    Button,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    CircularProgress,
    Tooltip,
    Stack,
    Grid,
    Stepper,
    Step,
    StepLabel,
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Visibility as VisibilityIcon,
    Download as DownloadIcon,
} from '@mui/icons-material';
import { useLeave } from '../../contexts/LeaveContext';
import leaveService from '../../services/leaveService';
import LeaveStatusBadge from '../../components/leaves/LeaveStatusBadge';
import { formatDate } from '../../utils/dateFormat';

const LeaveApproval = () => {
    const { approveLeave, rejectLeave } = useLeave();
    const [loading, setLoading] = useState(true);
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    const [selectedLeaveDetail, setSelectedLeaveDetail] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await leaveService.getPendingApprovals();
            setPendingApprovals(data || []);
        } catch (err) {
            setError('Failed to load pending approvals');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        if (window.confirm('Are you sure you want to approve this leave request?')) {
            try {
                await approveLeave(id);
                setSuccess('Leave approved successfully!');
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
            setSuccess('Leave rejected successfully!');
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

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold">
                    ✅ Leave Approvals
                </Typography>
                <Button variant="outlined" onClick={loadData} disabled={loading}>
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

            {pendingApprovals.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="textSecondary">No pending approvals at this time.</Typography>
                </Paper>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                <TableCell>Employee</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Duration</TableCell>
                                <TableCell>Days</TableCell>
                                <TableCell>Progress</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pendingApprovals.map((approval) => {
                                const leave = approval.leave;
                                const totalLevels = leave?.total_approval_levels || 1;
                                const currentLevel = approval.level || 0;

                                return (
                                    <TableRow key={approval.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="medium">
                                                {leave?.employee?.first_name} {leave?.employee?.last_name}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                {leave?.employee?.employee_id}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={leave?.leave_type?.name} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {formatDate(leave?.start_date)}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                → {formatDate(leave?.end_date)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="medium">
                                                {leave?.total_days} days
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Typography variant="caption">
                                                    {currentLevel}/{totalLevels}
                                                </Typography>
                                                <Stepper activeStep={currentLevel} alternativeLabel sx={{ width: 120 }}>
                                                    {[...Array(totalLevels)].map((_, i) => (
                                                        <Step key={i}>
                                                            <StepLabel />
                                                        </Step>
                                                    ))}
                                                </Stepper>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label="Pending" color="warning" size="small" />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={0.5} justifyContent="center">
                                                <Tooltip title="Approve">
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color="success"
                                                        startIcon={<CheckCircleIcon />}
                                                        onClick={() => handleApprove(approval.leave_id)}
                                                    >
                                                        Approve
                                                    </Button>
                                                </Tooltip>
                                                <Tooltip title="Reject">
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="error"
                                                        startIcon={<CancelIcon />}
                                                        onClick={() => {
                                                            setSelectedLeave(leave);
                                                            setShowRejectDialog(true);
                                                        }}
                                                    >
                                                        Reject
                                                    </Button>
                                                </Tooltip>
                                                <Tooltip title="View Details">
                                                    <IconButton
                                                        size="small"
                                                        color="info"
                                                        onClick={() => handleViewDetail(leave)}
                                                    >
                                                        <VisibilityIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                {leave?.attachment && (
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
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Reject Leave Request</DialogTitle>
                <DialogContent>
                    <Box mt={2}>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
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
                        <Typography variant="h6">Leave Details</Typography>
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
                            </Paper>
                        </Grid>
                        <Grid item xs={12}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="textSecondary">Reason</Typography>
                                <Typography variant="body1">{selectedLeaveDetail?.reason}</Typography>
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

export default LeaveApproval;