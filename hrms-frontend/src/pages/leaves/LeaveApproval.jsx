// src/pages/leaves/LeaveApproval.jsx

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
    Avatar,
    Stack,
    Alert,
    CircularProgress,
    Card,
    CardContent,
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    DialogActions,
    Tooltip,
    LinearProgress,
    Badge,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListItemSecondaryAction,
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Pending as PendingIcon,
    Refresh as RefreshIcon,
    Person as PersonIcon,
    CalendarToday as CalendarIcon,
    AccessTime as AccessTimeIcon,
    Comment as CommentIcon,
    AttachFile as AttachFileIcon,
    Download as DownloadIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    History as HistoryIcon,
} from '@mui/icons-material';
import { useLeave } from '../../contexts/LeaveContext';
import { formatDate } from '../../utils/dateFormat';
import leaveService from '../../services/leaveService';
import { useNavigate } from 'react-router-dom';

// ============ CONFIG ============
const STATUS_CONFIG = {
    pending: { 
        label: 'Pending', 
        color: '#f59e0b', 
        bgColor: '#fef3c7',
        icon: <PendingIcon /> 
    },
    approved: { 
        label: 'Approved', 
        color: '#10b981', 
        bgColor: '#d1fae5',
        icon: <CheckCircleIcon /> 
    },
    rejected: { 
        label: 'Rejected', 
        color: '#ef4444', 
        bgColor: '#fee2e2',
        icon: <CancelIcon /> 
    },
    cancelled: { 
        label: 'Cancelled', 
        color: '#6b7280', 
        bgColor: '#f3f4f6',
        icon: <CancelIcon /> 
    },
};

const LeaveApproval = () => {
    const { approveLeave, rejectLeave, fetchLeaves, loading, error, clearError } = useLeave();
    const navigate = useNavigate();
    const [approvals, setApprovals] = useState([]);
    const [localLoading, setLocalLoading] = useState(true);
    const [localError, setLocalError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [expandedItems, setExpandedItems] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLocalLoading(true);
        setLocalError(null);
        try {
            // ✅ Gunakan fetchLeaves dengan filter status pending
            const response = await fetchLeaves({ 
                status: 'pending',
                per_page: 100 
            });
            
            // Response dari fetchLeaves mengembalikan { data, current_page, total, ... }
            const data = response?.data || [];
            setApprovals(data);
            
            console.log('📊 Pending approvals loaded:', data.length);
        } catch (err) {
            console.error('❌ Error loading approvals:', err);
            setLocalError('Failed to load pending approvals: ' + (err.response?.data?.message || err.message));
        } finally {
            setLocalLoading(false);
        }
    };

    const handleRefresh = () => {
        loadData();
    };

    const handleApprove = async (id) => {
        setSubmitting(true);
        setLocalError(null);
        try {
            await approveLeave(id);
            setSuccess('✅ Leave approved successfully!');
            loadData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setLocalError('Failed to approve: ' + (err.response?.data?.message || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenReject = (leave) => {
        setSelectedLeave(leave);
        setShowRejectDialog(true);
        setRejectReason('');
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            setLocalError('Please provide a rejection reason');
            return;
        }

        setSubmitting(true);
        setLocalError(null);
        try {
            await rejectLeave(selectedLeave.id, rejectReason);
            setSuccess('❌ Leave rejected successfully!');
            setShowRejectDialog(false);
            setSelectedLeave(null);
            setRejectReason('');
            loadData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setLocalError('Failed to reject: ' + (err.response?.data?.message || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    const toggleExpand = (id) => {
        setExpandedItems(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const getStatusConfig = (status) => {
        return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    };

    const getInitials = (name) => {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
        }
        return name.substring(0, 2).toUpperCase();
    };

    const getLeaveTypeColor = (code) => {
        const colors = {
            AL: '#4CAF50',
            SL: '#2196F3',
            SPL: '#FF9800',
            ML: '#9C27B0',
            BL: '#F44336',
            CL: '#00BCD4',
        };
        return colors[code] || '#757575';
    };

    // ✅ Hitung ulang pending count dari approvals
    const pendingCount = approvals.length;

    if (localLoading || loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
            {/* Header */}
            <Paper 
                elevation={0}
                sx={{ 
                    p: 3, 
                    mb: 3, 
                    bgcolor: '#f8fafc',
                    borderRadius: 2,
                    border: '1px solid #e5e7eb'
                }}
            >
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box>
                        <Box display="flex" alignItems="center" gap={2}>
                            <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b' }}>
                                ✅ Leave Approvals
                            </Typography>
                            {pendingCount > 0 && (
                                <Chip 
                                    label={`${pendingCount} pending`}
                                    color="warning"
                                    size="medium"
                                    icon={<PendingIcon />}
                                />
                            )}
                        </Box>
                        <Typography variant="body2" color="textSecondary">
                            {pendingCount === 0 
                                ? 'No pending requests waiting for your approval' 
                                : `${pendingCount} request${pendingCount > 1 ? 's' : ''} waiting for your review`
                            }
                        </Typography>
                    </Box>
                    <Box display="flex" gap={1}>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={handleRefresh}
                            disabled={localLoading}
                            size="small"
                        >
                            Refresh
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<HistoryIcon />}
                            onClick={() => navigate('/leaves/list')}
                            size="small"
                        >
                            All Requests
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* Messages */}
            {localError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLocalError(null)}>
                    {localError}
                </Alert>
            )}
            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            )}

            {/* Empty State */}
            {approvals.length === 0 ? (
                <Paper 
                    elevation={0}
                    sx={{ 
                        p: 6, 
                        textAlign: 'center',
                        border: '1px solid #e5e7eb',
                        borderRadius: 2,
                        bgcolor: '#fafafa'
                    }}
                >
                    <CheckCircleIcon sx={{ fontSize: 64, color: '#10b981', mb: 2 }} />
                    <Typography variant="h6" fontWeight="bold">All Clear! 🎉</Typography>
                    <Typography color="textSecondary">
                        No pending leave requests awaiting your approval.
                    </Typography>
                    <Button 
                        variant="text" 
                        startIcon={<RefreshIcon />}
                        onClick={handleRefresh}
                        sx={{ mt: 2 }}
                    >
                        Check Again
                    </Button>
                </Paper>
            ) : (
                /* Approval Cards */
                <Grid container spacing={2}>
                    {approvals.map((leave) => {
                        const status = getStatusConfig(leave?.status || 'pending');
                        const isExpanded = expandedItems[leave?.id];
                        const currentLevel = leave?.approval_level || 0;
                        const totalLevels = leave?.total_approval_levels || 1;
                        const progress = totalLevels > 0 ? (currentLevel / totalLevels) * 100 : 0;

                        return (
                            <Grid item xs={12} key={leave.id}>
                                <Card 
                                    elevation={0}
                                    sx={{ 
                                        border: `1px solid ${status.color}40`,
                                        borderLeft: `4px solid ${status.color}`,
                                        borderRadius: 2,
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        {/* Header Row */}
                                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
                                            <Box display="flex" alignItems="center" gap={2}>
                                                <Avatar 
                                                    sx={{ 
                                                        width: 48, 
                                                        height: 48, 
                                                        bgcolor: '#6366f1',
                                                        fontWeight: 'bold',
                                                        fontSize: 18
                                                    }}
                                                >
                                                    {getInitials(leave?.employee?.first_name + ' ' + leave?.employee?.last_name)}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="subtitle1" fontWeight="bold">
                                                        {leave?.employee?.first_name} {leave?.employee?.last_name}
                                                    </Typography>
                                                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                                        <Typography variant="caption" color="textSecondary">
                                                            {leave?.employee?.employee_id}
                                                        </Typography>
                                                        <Chip 
                                                            label={leave?.leave_type?.name}
                                                            size="small"
                                                            sx={{ 
                                                                bgcolor: getLeaveTypeColor(leave?.leave_type?.code) + '20',
                                                                color: getLeaveTypeColor(leave?.leave_type?.code),
                                                                fontWeight: 500,
                                                                fontSize: '0.7rem'
                                                            }}
                                                        />
                                                        <Chip 
                                                            label={`${leave?.total_days} days`}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{ fontSize: '0.7rem' }}
                                                        />
                                                    </Box>
                                                </Box>
                                            </Box>

                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Chip
                                                    label={status.label}
                                                    icon={status.icon}
                                                    sx={{
                                                        bgcolor: status.bgColor,
                                                        color: status.color,
                                                        fontWeight: 600,
                                                        '& .MuiChip-icon': { color: status.color }
                                                    }}
                                                />
                                                <Tooltip title="Expand Details">
                                                    <IconButton 
                                                        size="small"
                                                        onClick={() => toggleExpand(leave?.id)}
                                                    >
                                                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </Box>

                                        {/* Date Info */}
                                        <Box display="flex" alignItems="center" gap={3} sx={{ mt: 2 }} flexWrap="wrap">
                                            <Box display="flex" alignItems="center" gap={0.5}>
                                                <CalendarIcon fontSize="small" color="action" />
                                                <Typography variant="caption" color="textSecondary">
                                                    {formatDate(leave?.start_date)} → {formatDate(leave?.end_date)}
                                                </Typography>
                                            </Box>
                                            <Box display="flex" alignItems="center" gap={0.5}>
                                                <AccessTimeIcon fontSize="small" color="action" />
                                                <Typography variant="caption" color="textSecondary">
                                                    Requested {formatDate(leave?.created_at, 'dd/MM/yyyy HH:mm')}
                                                </Typography>
                                            </Box>
                                            {leave?.attachment && (
                                                <Box display="flex" alignItems="center" gap={0.5}>
                                                    <AttachFileIcon fontSize="small" color="action" />
                                                    <Button 
                                                        size="small" 
                                                        startIcon={<DownloadIcon />}
                                                        onClick={() => leaveService.downloadLeaveAttachment(leave.id)}
                                                        sx={{ textTransform: 'none', fontSize: '0.7rem' }}
                                                    >
                                                        Attachment
                                                    </Button>
                                                </Box>
                                            )}
                                        </Box>

                                        {/* Reason */}
                                        {leave?.reason && (
                                            <Box sx={{ mt: 1 }}>
                                                <Typography variant="caption" color="textSecondary">
                                                    💬 {leave.reason}
                                                </Typography>
                                            </Box>
                                        )}

                                        {/* Expanded Details */}
                                        {isExpanded && (
                                            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #e5e7eb' }}>
                                                <Grid container spacing={2}>
                                                    <Grid item xs={12}>
                                                        <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fafafa' }}>
                                                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                                                Request Details
                                                            </Typography>
                                                            <Grid container spacing={1}>
                                                                <Grid item xs={12} sm={6}>
                                                                    <Typography variant="caption" color="textSecondary">Leave Type</Typography>
                                                                    <Typography variant="body2">{leave?.leave_type?.name}</Typography>
                                                                </Grid>
                                                                <Grid item xs={12} sm={6}>
                                                                    <Typography variant="caption" color="textSecondary">Total Days</Typography>
                                                                    <Typography variant="body2">{leave?.total_days} days</Typography>
                                                                </Grid>
                                                                <Grid item xs={12}>
                                                                    <Typography variant="caption" color="textSecondary">Reason</Typography>
                                                                    <Typography variant="body2">{leave?.reason || 'No reason provided'}</Typography>
                                                                </Grid>
                                                            </Grid>
                                                            
                                                            {leave?.approvals?.length > 0 && (
                                                                <Box sx={{ mt: 2 }}>
                                                                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                                                        Approval History
                                                                    </Typography>
                                                                    <List dense disablePadding>
                                                                        {leave.approvals.map((app, idx) => (
                                                                            <ListItem key={idx} sx={{ px: 0 }}>
                                                                                <ListItemAvatar>
                                                                                    <Avatar sx={{ width: 28, height: 28, bgcolor: '#e5e7eb', fontSize: 12 }}>
                                                                                        {getInitials(app.approver?.first_name + ' ' + app.approver?.last_name)}
                                                                                    </Avatar>
                                                                                </ListItemAvatar>
                                                                                <ListItemText
                                                                                    primary={
                                                                                        <Typography variant="body2">
                                                                                            {app.approver?.first_name} {app.approver?.last_name}
                                                                                        </Typography>
                                                                                    }
                                                                                    secondary={
                                                                                        <Typography variant="caption" color="textSecondary">
                                                                                            {app.status === 'approved' ? '✅ Approved' : 
                                                                                             app.status === 'rejected' ? '❌ Rejected' : 
                                                                                             '⏳ Pending'}
                                                                                            {app.approved_at && ` at ${formatDate(app.approved_at, 'dd/MM/yyyy HH:mm')}`}
                                                                                        </Typography>
                                                                                    }
                                                                                />
                                                                                {app.notes && (
                                                                                    <Typography variant="caption" color="textSecondary" sx={{ ml: 2 }}>
                                                                                        💬 {app.notes}
                                                                                    </Typography>
                                                                                )}
                                                                            </ListItem>
                                                                        ))}
                                                                    </List>
                                                                </Box>
                                                            )}
                                                        </Paper>
                                                    </Grid>

                                                    <Grid item xs={12}>
                                                        <Stack direction="row" spacing={1}>
                                                            <Button
                                                                variant="contained"
                                                                color="success"
                                                                startIcon={<CheckCircleIcon />}
                                                                onClick={() => handleApprove(leave.id)}
                                                                disabled={submitting || leave.status !== 'pending'}
                                                                sx={{ textTransform: 'none' }}
                                                            >
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                variant="outlined"
                                                                color="error"
                                                                startIcon={<CancelIcon />}
                                                                onClick={() => handleOpenReject(leave)}
                                                                disabled={submitting || leave.status !== 'pending'}
                                                                sx={{ textTransform: 'none' }}
                                                            >
                                                                Reject
                                                            </Button>
                                                            <Button
                                                                variant="outlined"
                                                                onClick={() => navigate(`/leaves/${leave.id}`)}
                                                                sx={{ textTransform: 'none' }}
                                                            >
                                                                View Details
                                                            </Button>
                                                        </Stack>
                                                    </Grid>
                                                </Grid>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ borderBottom: '1px solid #e5e7eb' }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <CancelIcon color="error" />
                        <Typography variant="h6" fontWeight="bold">Reject Leave Request</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        Rejecting request from <strong>{selectedLeave?.employee?.first_name} {selectedLeave?.employee?.last_name}</strong>
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Rejection Reason *"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Please provide a clear reason for rejection..."
                        required
                        autoFocus
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid #e5e7eb' }}>
                    <Button onClick={() => setShowRejectDialog(false)}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        color="error" 
                        onClick={handleReject}
                        disabled={!rejectReason.trim() || submitting}
                        startIcon={<CancelIcon />}
                    >
                        {submitting ? 'Rejecting...' : 'Reject'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default LeaveApproval;