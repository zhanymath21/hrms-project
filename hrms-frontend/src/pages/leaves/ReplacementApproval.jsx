// src/pages/leaves/ReplacementApproval.jsx

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
    Avatar,
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Visibility as VisibilityIcon,
    Download as DownloadIcon,
    Person as PersonIcon,
    CalendarToday as CalendarIcon,
    AccessTime as AccessTimeIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import leaveService from '../../services/leaveService';
import LeaveStatusBadge from '../../components/leaves/LeaveStatusBadge';
import { formatDate } from '../../utils/dateFormat';

const ReplacementApproval = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [selectedReplacement, setSelectedReplacement] = useState(null);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState(null);

    useEffect(() => {
        loadPendingApprovals();
    }, []);

    const loadPendingApprovals = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaveService.getPendingReplacementApprovals();
            setPendingApprovals(data || []);
        } catch (err) {
            setError('Failed to load pending approvals: ' + err.message);
            console.error('Error loading pending approvals:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        loadPendingApprovals();
        setSuccess('Data refreshed!');
        setTimeout(() => setSuccess(null), 3000);
    };

    const handleApprove = async (id) => {
        if (window.confirm('Are you sure you want to approve this replacement request?')) {
            try {
                await leaveService.approveReplacement(id);
                setSuccess('✅ Replacement approved successfully!');
                loadPendingApprovals();
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
            await leaveService.rejectReplacement(selectedReplacement.id, rejectReason);
            setSuccess('✅ Replacement rejected successfully!');
            setShowRejectDialog(false);
            setRejectReason('');
            setSelectedReplacement(null);
            loadPendingApprovals();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('Failed to reject: ' + err.message);
        }
    };

    const handleViewDetail = (replacement) => {
        setSelectedDetail(replacement);
        setShowDetailDialog(true);
    };

    const handleDownloadAttachment = async (id) => {
        try {
            const response = await leaveService.downloadReplacementAttachment(id);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = 'replacement_attachment.pdf';
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

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold">
                    ✅ Replacement Leave Approvals
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
                <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography color="textSecondary" variant="body2">
                            Total Pending
                        </Typography>
                        <Typography variant="h4" color="warning.main">
                            {pendingApprovals.length}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography color="textSecondary" variant="body2">
                            Your Level
                        </Typography>
                        <Typography variant="h4" color="primary.main">
                            {pendingApprovals[0]?.level || 0}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography color="textSecondary" variant="body2">
                            Total Approval Levels
                        </Typography>
                        <Typography variant="h4" color="success.main">
                            {pendingApprovals[0]?.replacement_leave?.total_approval_levels || 0}
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Table */}
            {pendingApprovals.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="textSecondary">
                        No pending replacement approvals at this time.
                    </Typography>
                </Paper>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                <TableCell>Employee</TableCell>
                                <TableCell>Work Date</TableCell>
                                <TableCell>Replacement Date</TableCell>
                                <TableCell>Hours</TableCell>
                                <TableCell>Days Added</TableCell>
                                <TableCell>Progress</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pendingApprovals.map((approval) => {
                                const replacement = approval.replacement_leave;
                                const totalLevels = replacement?.total_approval_levels || 1;
                                const currentLevel = approval.level || 0;

                                return (
                                    <TableRow key={approval.id} hover>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                                                    {getInitials(replacement?.employee?.first_name + ' ' + replacement?.employee?.last_name)}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight="medium">
                                                        {replacement?.employee?.first_name} {replacement?.employee?.last_name}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {replacement?.employee?.employee_id}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <CalendarIcon fontSize="small" color="action" />
                                                <Typography variant="body2">
                                                    {formatDate(replacement?.work_date)}
                                                </Typography>
                                                <Chip
                                                    label={replacement?.work_day_type}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ fontSize: '0.6rem' }}
                                                />
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <CalendarIcon fontSize="small" color="success" />
                                                <Typography variant="body2">
                                                    {formatDate(replacement?.replacement_date)}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${replacement?.hours_worked}h`}
                                                size="small"
                                                color="info"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`+${replacement?.days_to_add} day`}
                                                size="small"
                                                color="primary"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Typography variant="caption">
                                                    {currentLevel}/{totalLevels}
                                                </Typography>
                                                <Stepper
                                                    activeStep={currentLevel}
                                                    alternativeLabel
                                                    sx={{ width: 120 }}
                                                >
                                                    {[...Array(totalLevels)].map((_, i) => (
                                                        <Step key={i}>
                                                            <StepLabel />
                                                        </Step>
                                                    ))}
                                                </Stepper>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label="Pending"
                                                color="warning"
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={0.5} justifyContent="center">
                                                <Tooltip title="Approve">
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color="success"
                                                        startIcon={<CheckCircleIcon />}
                                                        onClick={() => handleApprove(approval.replacement_leave_id)}
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
                                                            setSelectedReplacement(replacement);
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
                                                        onClick={() => handleViewDetail(replacement)}
                                                    >
                                                        <VisibilityIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                {replacement?.attachment && (
                                                    <Tooltip title="Download Attachment">
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            onClick={() => handleDownloadAttachment(replacement.id)}
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
                <DialogTitle sx={{ bgcolor: 'error.light', color: 'error.main' }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <CancelIcon />
                        Reject Replacement Request
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box mt={2}>
                        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa' }}>
                            <Grid container spacing={1}>
                                <Grid item xs={12}>
                                    <Typography variant="body2">
                                        <strong>Employee:</strong> {selectedReplacement?.employee?.first_name} {selectedReplacement?.employee?.last_name}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2">
                                        <strong>Work Date:</strong> {formatDate(selectedReplacement?.work_date)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2">
                                        <strong>Replacement Date:</strong> {formatDate(selectedReplacement?.replacement_date)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2">
                                        <strong>Hours Worked:</strong> {selectedReplacement?.hours_worked}h
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
                        <Typography variant="h6">Replacement Request Details</Typography>
                        {selectedDetail?.attachment && (
                            <Button
                                size="small"
                                startIcon={<DownloadIcon />}
                                onClick={() => handleDownloadAttachment(selectedDetail.id)}
                            >
                                Download Attachment
                            </Button>
                        )}
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2}>
                        {/* Employee Info */}
                        <Grid item xs={12} sm={6}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                    Employee
                                </Typography>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                                        {getInitials(selectedDetail?.employee?.first_name + ' ' + selectedDetail?.employee?.last_name)}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="body1" fontWeight="medium">
                                            {selectedDetail?.employee?.first_name} {selectedDetail?.employee?.last_name}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {selectedDetail?.employee?.employee_id}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>
                        </Grid>

                        {/* Status */}
                        <Grid item xs={12} sm={6}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                    Status
                                </Typography>
                                <LeaveStatusBadge status={selectedDetail?.status} size="medium" />
                                {selectedDetail?.rejection_reason && (
                                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                                        Reason: {selectedDetail.rejection_reason}
                                    </Typography>
                                )}
                            </Paper>
                        </Grid>

                        {/* Work Details */}
                        <Grid item xs={12} sm={6}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                    Work Details
                                </Typography>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <CalendarIcon fontSize="small" color="action" />
                                    <Typography variant="body1">
                                        {formatDate(selectedDetail?.work_date)}
                                    </Typography>
                                </Box>
                                <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                                    <AccessTimeIcon fontSize="small" color="action" />
                                    <Typography variant="body2">
                                        {selectedDetail?.work_day_type} · {selectedDetail?.hours_worked} hours worked
                                    </Typography>
                                </Box>
                            </Paper>
                        </Grid>

                        {/* Replacement Details */}
                        <Grid item xs={12} sm={6}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                    Replacement Details
                                </Typography>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <CalendarIcon fontSize="small" color="success" />
                                    <Typography variant="body1">
                                        {formatDate(selectedDetail?.replacement_date)}
                                    </Typography>
                                </Box>
                                <Chip
                                    label={`+${selectedDetail?.days_to_add} days added to Annual Leave`}
                                    size="small"
                                    color="primary"
                                    sx={{ mt: 0.5 }}
                                />
                            </Paper>
                        </Grid>

                        {/* Reason */}
                        {selectedDetail?.reason && (
                            <Grid item xs={12}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                        Reason
                                    </Typography>
                                    <Typography variant="body1">{selectedDetail.reason}</Typography>
                                </Paper>
                            </Grid>
                        )}

                        {/* Approval Progress */}
                        <Grid item xs={12}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                    Approval Progress
                                </Typography>
                                <Stepper activeStep={selectedDetail?.approval_level || 0} alternativeLabel>
                                    {[...Array(selectedDetail?.total_approval_levels || 1)].map((_, i) => (
                                        <Step key={i}>
                                            <StepLabel>
                                                Level {i + 1}
                                                {selectedDetail?.approvals?.[i] && (
                                                    <Typography variant="caption" display="block">
                                                        {selectedDetail.approvals[i].approver?.first_name} {selectedDetail.approvals[i].approver?.last_name}
                                                        <br />
                                                        <Chip
                                                            label={selectedDetail.approvals[i].status}
                                                            size="small"
                                                            color={selectedDetail.approvals[i].status === 'approved' ? 'success' : 'warning'}
                                                            sx={{ fontSize: '0.6rem', mt: 0.5 }}
                                                        />
                                                    </Typography>
                                                )}
                                            </StepLabel>
                                        </Step>
                                    ))}
                                </Stepper>
                            </Paper>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    {selectedDetail?.status === 'pending' && (
                        <>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => {
                                    handleApprove(selectedDetail.id);
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
                                    setSelectedReplacement(selectedDetail);
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

export default ReplacementApproval;