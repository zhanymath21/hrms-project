// src/pages/leaves/LeaveDetail.jsx

import React, { useState, useEffect, useRef } from 'react';
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
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    TableHead,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
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
    AttachFile as AttachFileIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useLeave } from '../../contexts/LeaveContext';
import leaveService from '../../services/leaveService';
import { formatDate } from '../../utils/dateFormat';
import { DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';

// ============================================
// SIGNATURE PAD COMPONENT
// ============================================
const SignaturePad = ({ label, onSign, onClear, signed, value = '' }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#1a237e';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            // If there's a saved signature value, draw it
            if (value) {
                // You can implement loading saved signature here
            }
        }
    }, [value]);

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d');
        const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
        const y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top;
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
        setHasSignature(true);
        onSign && onSign();
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d');
        const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
        const y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top;
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        onClear && onClear();
    };

    return (
        <Box>
            <Typography variant="caption" color="textSecondary" gutterBottom display="block" fontWeight="bold">
                {label}
            </Typography>
            <Box sx={{ position: 'relative' }}>
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={80}
                    style={{
                        width: '100%',
                        height: '80px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        background: '#fff',
                        cursor: 'crosshair',
                        touchAction: 'none',
                    }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
                {hasSignature && (
                    <Box sx={{ position: 'absolute', bottom: 4, right: 8 }}>
                        <Button
                            size="small"
                            variant="text"
                            color="error"
                            onClick={clearSignature}
                            sx={{ fontSize: '0.6rem', minWidth: 'auto', p: '2px 8px' }}
                        >
                            Clear
                        </Button>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

// ============================================
// LEAVE BALANCE TABLE
// ============================================
const LeaveBalanceTable = ({ balances, onBalanceChange }) => {
    const leaveTypes = [
        { key: 'annual', label: 'Annual' },
        { key: 'sick', label: 'Sick' },
        { key: 'special', label: 'Special' },
        { key: 'casual', label: 'Casual' },
    ];

    const rows = [
        { key: 'lastYear', label: 'Last Year Balance' },
        { key: 'entitlement', label: 'Entitlement' },
        { key: 'taken', label: 'Already Taken' },
        { key: 'balance', label: 'Current Balance' },
    ];

    const getValue = (rowKey, typeKey) => {
        return balances?.[rowKey]?.[typeKey] ?? 0;
    };

    const isBalanceRow = (rowKey) => rowKey === 'balance';

    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ bgcolor: '#1a237e' }}>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Description</TableCell>
                        {leaveTypes.map((type) => (
                            <TableCell key={type.key} align="center" sx={{ color: 'white', fontWeight: 'bold' }}>
                                {type.label}
                            </TableCell>
                        ))}
                        <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Total</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row) => {
                        let total = 0;
                        leaveTypes.forEach((type) => {
                            total += parseFloat(getValue(row.key, type.key)) || 0;
                        });

                        return (
                            <TableRow key={row.key}>
                                <TableCell sx={{ fontWeight: row.key === 'balance' ? 'bold' : 'normal' }}>
                                    {row.label}
                                </TableCell>
                                {leaveTypes.map((type) => (
                                    <TableCell key={type.key} align="center">
                                        {isBalanceRow(row.key) ? (
                                            <Typography
                                                variant="body2"
                                                fontWeight="bold"
                                                color={getValue(row.key, type.key) >= 0 ? 'success.main' : 'error.main'}
                                            >
                                                {getValue(row.key, type.key)}
                                            </Typography>
                                        ) : (
                                            <TextField
                                                type="number"
                                                size="small"
                                                value={getValue(row.key, type.key)}
                                                onChange={(e) => onBalanceChange(row.key, type.key, e.target.value)}
                                                inputProps={{
                                                    style: { 
                                                        width: '60px', 
                                                        textAlign: 'center',
                                                        padding: '4px',
                                                        fontSize: '13px',
                                                    }
                                                }}
                                                variant="outlined"
                                            />
                                        )}
                                    </TableCell>
                                ))}
                                <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#e8eaf6' }}>
                                    {total}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

// ============================================
// APPROVAL STATUS CARD
// ============================================
const ApprovalCard = ({ label, name, status, date, notes, isCurrentUser = false }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'approved': return 'success';
            case 'rejected': return 'error';
            case 'pending': return 'warning';
            default: return 'default';
        }
    };

    const getStatusLabel = () => {
        switch (status) {
            case 'approved': return 'Approved ✓';
            case 'rejected': return 'Rejected ✗';
            case 'pending': return 'Pending ⏳';
            default: return 'Waiting';
        }
    };

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 1.5,
                textAlign: 'center',
                bgcolor: isCurrentUser ? '#e3f2fd' : 
                         status === 'approved' ? '#e8f5e9' :
                         status === 'rejected' ? '#ffebee' :
                         status === 'pending' ? '#fff3e0' : '#fafafa',
                border: isCurrentUser ? '2px solid #1a237e' : '1px solid #e0e0e0',
                minHeight: '100px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <Typography variant="caption" color="textSecondary" fontWeight="bold">
                {label}
            </Typography>
            <Typography variant="body2" fontWeight="medium" sx={{ mt: 0.5 }}>
                {name || '—'}
            </Typography>
            <Chip
                label={getStatusLabel()}
                color={getStatusColor()}
                size="small"
                sx={{ mt: 0.5, fontSize: '0.6rem' }}
            />
            {date && (
                <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                    {formatDate(date)}
                </Typography>
            )}
            {notes && (
                <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                    {notes}
                </Typography>
            )}
            {isCurrentUser && (
                <Chip
                    label="You"
                    size="small"
                    color="primary"
                    sx={{ mt: 0.5, fontSize: '0.6rem' }}
                />
            )}
        </Paper>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================
const LeaveDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { approveLeave, rejectLeave, cancelLeave } = useLeave();
    
    const [leave, setLeave] = useState(null);
    const [approvalStatus, setApprovalStatus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [signature, setSignature] = useState(false);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Balance state
    const [balances, setBalances] = useState({
        lastYear: { annual: 0, sick: 0, special: 0, casual: 0 },
        entitlement: { annual: 12, sick: 14, special: 3, casual: 5 },
        taken: { annual: 0, sick: 0, special: 0, casual: 0 },
        balance: { annual: 12, sick: 14, special: 3, casual: 5 },
    });

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaveService.getLeave(id);
            setLeave(data?.leave || data);
            setApprovalStatus(data?.approval_status || []);
            
            // Update balance from data
            if (data?.leave) {
                // You can set balance from API data here
            }
        } catch (err) {
            setError('Failed to load leave details');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleBalanceChange = (rowKey, typeKey, value) => {
        setBalances(prev => {
            const newBalances = {
                ...prev,
                [rowKey]: {
                    ...prev[rowKey],
                    [typeKey]: parseFloat(value) || 0,
                }
            };
            
            // Auto-calculate balance
            if (rowKey !== 'balance') {
                const types = ['annual', 'sick', 'special', 'casual'];
                types.forEach((type) => {
                    const lastYear = newBalances.lastYear[type] || 0;
                    const entitlement = newBalances.entitlement[type] || 0;
                    const taken = newBalances.taken[type] || 0;
                    newBalances.balance[type] = entitlement + lastYear - taken;
                });
            }
            
            return newBalances;
        });
    };

    const handleApprove = async () => {
        if (!signature) {
            alert('Please provide your signature');
            return;
        }
        setIsSubmitting(true);
        try {
            await approveLeave(leave.id, notes);
            setSuccess('Leave approved successfully!');
            setShowApproveDialog(false);
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

    const handlePrint = () => {
        window.print();
    };

    const getInitials = (name) => {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
        }
        return name.substring(0, 2).toUpperCase();
    };

    const getApproverLevelLabel = (level) => {
        const labels = {
            1: 'Direct Manager',
            2: 'HR Manager',
            3: 'GM-Operation',
            4: 'GM-Administration',
        };
        return labels[level] || `Level ${level}`;
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
    const currentPendingApproval = approvalStatus.find(a => a.status === 'pending');

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
                                startIcon={<AttachFileIcon />}
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
                            onClick={handlePrint}
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

            {/* ============================================ */}
            {/* LEAVE APPLICATION FORM */}
            {/* ============================================ */}
            <Paper 
                sx={{ 
                    p: 4, 
                    mb: 3,
                    bgcolor: '#ffffff',
                    border: '1px solid #e0e0e0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                }} 
                id="leave-application"
            >
                {/* TITLE */}
                <Typography 
                    variant="h5" 
                    fontWeight="bold" 
                    textAlign="center" 
                    sx={{ 
                        mb: 3, 
                        pb: 2, 
                        borderBottom: '3px solid #1a237e',
                        letterSpacing: 2,
                        color: '#1a237e',
                    }}
                >
                    LEAVE APPLICATION
                </Typography>

                {/* EMPLOYEE INFO */}
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

                {/* LEAVE APPLIED */}
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

                {/* REASON */}
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

                {/* LEAVE BALANCE */}
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, color: '#1a237e' }}>
                    Leave Balance Summary
                </Typography>
                <LeaveBalanceTable 
                    balances={balances} 
                    onBalanceChange={handleBalanceChange} 
                />

                <Divider sx={{ my: 3 }} />

                {/* APPROVAL SECTION */}
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, color: '#1a237e' }}>
                    Approval
                </Typography>

                <Grid container spacing={2} mb={3}>
                    {/* Applicant */}
                    <Grid item xs={12} sm={6} md={2.4}>
                        <ApprovalCard
                            label="Applicant"
                            name={`${leave.employee?.first_name} ${leave.employee?.last_name}`}
                            status="approved"
                            date={leave.created_at}
                        />
                    </Grid>

                    {/* Approval Status per Level */}
                    {approvalStatus.length > 0 ? (
                        approvalStatus.map((item, index) => (
                            <Grid item xs={12} sm={6} md={2.4} key={index}>
                                <ApprovalCard
                                    label={getApproverLevelLabel(item.level)}
                                    name={item.approver || 'Waiting...'}
                                    status={item.status}
                                    date={item.approved_at}
                                    notes={item.notes}
                                    isCurrentUser={item.status === 'pending'}
                                />
                            </Grid>
                        ))
                    ) : (
                        <Grid item xs={12}>
                            <Alert severity="info">No approval records yet</Alert>
                        </Grid>
                    )}
                </Grid>

                <Divider sx={{ mb: 3 }} />

                {/* NOTE */}
                <Alert severity="warning" sx={{ mb: 3 }}>
                    <Typography variant="body2">
                        <strong>Note:</strong> If you take more leave than your entitlement, the company will deduct the salary at the end of that month.
                    </Typography>
                </Alert>

                {/* FOR OFFICIAL USE */}
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, color: '#1a237e' }}>
                    For Official Use
                </Typography>
                <Grid container spacing={2} mb={3}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Received"
                            variant="outlined"
                            placeholder="______"
                            InputProps={{ readOnly: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Checked by"
                            variant="outlined"
                            placeholder="______"
                            InputProps={{ readOnly: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Informed"
                            variant="outlined"
                            placeholder="______"
                            InputProps={{ readOnly: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Recorded"
                            variant="outlined"
                            placeholder="______"
                            InputProps={{ readOnly: true }}
                        />
                    </Grid>
                </Grid>

                {/* ============================================ */}
                {/* APPROVAL ACTIONS */}
                {/* ============================================ */}
                {isPending && currentPendingApproval && (
                    <Box sx={{ mt: 3, pt: 3, borderTop: '2px dashed #e0e0e0' }}>
                        <Typography variant="subtitle1" fontWeight="bold" color="primary.main" gutterBottom>
                            ✍️ Approval Action
                        </Typography>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            <Typography variant="body2">
                                You are the current approver for this request
                            </Typography>
                            <Typography variant="body2">
                                <strong>Level:</strong> {currentPendingApproval.level_label || getApproverLevelLabel(currentPendingApproval.level)}
                            </Typography>
                        </Alert>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={2}
                                    label="Notes (Optional)"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add any notes or comments..."
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <SignaturePad
                                    label="Digital Signature *"
                                    onSign={() => setSignature(true)}
                                    onClear={() => setSignature(false)}
                                    signed={signature}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Stack direction="row" spacing={2}>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        startIcon={<CheckIcon />}
                                        onClick={() => setShowApproveDialog(true)}
                                        disabled={!signature}
                                        size="large"
                                    >
                                        Approve
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="error"
                                        startIcon={<CloseIcon />}
                                        onClick={() => setShowRejectDialog(true)}
                                        size="large"
                                    >
                                        Reject
                                    </Button>
                                </Stack>
                            </Grid>
                        </Grid>
                    </Box>
                )}

                {/* Approve Dialog */}
                <Dialog open={showApproveDialog} onClose={() => setShowApproveDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>
                        <Box display="flex" alignItems="center" gap={1}>
                            <CheckCircleIcon color="success" />
                            <Typography variant="h6">Confirm Approval</Typography>
                        </Box>
                    </DialogTitle>
                    <DialogContent>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            <Typography variant="body2">
                                <strong>Employee:</strong> {leave.employee?.first_name} {leave.employee?.last_name}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Leave Type:</strong> {leave.leave_type?.name}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Duration:</strong> {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Total Days:</strong> {leave.total_days} days
                            </Typography>
                        </Alert>
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                                Signature Confirmation
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5', minHeight: 80 }}>
                                <Typography variant="body2" align="center" color="success.main">
                                    ✅ Signature captured
                                </Typography>
                            </Paper>
                        </Box>
                        {notes && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="body2" color="textSecondary">
                                    Notes:
                                </Typography>
                                <Typography variant="body2">{notes}</Typography>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setShowApproveDialog(false)}>Cancel</Button>
                        <Button
                            variant="contained"
                            color="success"
                            onClick={handleApprove}
                            disabled={isSubmitting}
                            startIcon={isSubmitting ? <CircularProgress size={20} /> : <CheckIcon />}
                        >
                            {isSubmitting ? 'Processing...' : 'Yes, Approve'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Reject Dialog */}
                <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>
                        <Box display="flex" alignItems="center" gap={1}>
                            <CancelIcon color="error" />
                            <Typography variant="h6">Reject Leave Request</Typography>
                        </Box>
                    </DialogTitle>
                    <DialogContent>
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
                            autoFocus
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setShowRejectDialog(false)}>Cancel</Button>
                        <Button
                            variant="contained"
                            color="error"
                            onClick={handleReject}
                            disabled={isSubmitting || !rejectReason.trim()}
                            startIcon={isSubmitting ? <CircularProgress size={20} /> : <CloseIcon />}
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
                        .no-print {
                            display: none !important;
                        }
                        .MuiButton-root, .MuiIconButton-root, .MuiAlert-root, .MuiDialog-root {
                            display: none !important;
                        }
                        body {
                            background: white !important;
                        }
                        .MuiTableHead-root .MuiTableCell-root {
                            background: #1a237e !important;
                            color: white !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                    }
                `}
            </style>
        </Box>
    );
};

export default LeaveDetail;