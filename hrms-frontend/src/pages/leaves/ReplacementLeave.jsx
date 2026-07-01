// src/pages/leaves/ReplacementLeave.jsx

import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    TextField,
    Button,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Alert,
    CircularProgress,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
    Refresh as RefreshIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Block as BlockIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import leaveService from '../../services/leaveService';
import LeaveStatusBadge from '../../components/leaves/LeaveStatusBadge';
import { formatDate } from '../../utils/dateFormat';

const ReplacementLeave = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [replacements, setReplacements] = useState([]);
    const [pendingReplacements, setPendingReplacements] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        work_date: null,
        work_day_type: 'weekend',
        hours_worked: 8,
        replacement_date: null,
        reason: '',
    });

    const [formErrors, setFormErrors] = useState({});
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [selectedReplacement, setSelectedReplacement] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [list, pending] = await Promise.all([
                leaveService.getReplacements(),
                leaveService.getPendingReplacements(),
            ]);
            setReplacements(list?.data || []);
            setPendingReplacements(pending?.data || []);
        } catch (err) {
            setError('Failed to load replacement data');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const handleDateChange = (name, date) => {
        setFormData((prev) => ({ ...prev, [name]: date }));
        if (formErrors[name]) {
            setFormErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const errors = {};
        if (!formData.work_date) errors.work_date = 'Work date is required';
        if (!formData.replacement_date) errors.replacement_date = 'Replacement date is required';
        if (!formData.hours_worked) errors.hours_worked = 'Hours worked is required';
        if (formData.work_date && formData.replacement_date && formData.replacement_date <= formData.work_date) {
            errors.replacement_date = 'Replacement date must be after work date';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!validate()) return;

        try {
            const data = {
                ...formData,
                work_date: format(formData.work_date, 'yyyy-MM-dd'),
                replacement_date: format(formData.replacement_date, 'yyyy-MM-dd'),
            };
            await leaveService.createReplacement(data);
            setSuccess('Replacement leave request submitted successfully!');
            setFormData({
                work_date: null,
                work_day_type: 'weekend',
                hours_worked: 8,
                replacement_date: null,
                reason: '',
            });
            loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit request');
        }
    };

    const handleApprove = async (id) => {
        if (window.confirm('Are you sure you want to approve this replacement request?')) {
            try {
                await leaveService.approveReplacement(id);
                loadData();
                setSuccess('Replacement request approved successfully!');
            } catch (err) {
                setError('Failed to approve replacement');
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
            setShowRejectDialog(false);
            setRejectReason('');
            setSelectedReplacement(null);
            loadData();
            setSuccess('Replacement request rejected');
        } catch (err) {
            setError('Failed to reject replacement');
        }
    };

    const handleCancel = async (id) => {
        if (window.confirm('Are you sure you want to cancel this replacement request?')) {
            try {
                await leaveService.cancelReplacement(id);
                loadData();
                setSuccess('Replacement request cancelled');
            } catch (err) {
                setError('Failed to cancel replacement');
            }
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box display="flex" alignItems="center" mb={3} gap={2}>
                <IconButton onClick={() => navigate('/leaves')}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4" component="h1" fontWeight="bold">
                    🔄 Replacement Leave
                </Typography>
                <Box flex={1} />
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={loadData}
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

            {/* Pending Requests Summary */}
            {pendingReplacements.length > 0 && (
                <Paper sx={{ p: 2, mb: 2, bgcolor: '#fff8e1' }}>
                    <Typography variant="subtitle2" color="warning.main">
                        ⚠️ You have {pendingReplacements.length} pending replacement request{pendingReplacements.length > 1 ? 's' : ''}
                    </Typography>
                </Paper>
            )}

            {/* Request Form */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                    Request Replacement Leave
                </Typography>
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <DatePicker
                                label="Work Date *"
                                value={formData.work_date}
                                onChange={(date) => handleDateChange('work_date', date)}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        error: !!formErrors.work_date,
                                        helperText: formErrors.work_date,
                                        required: true,
                                    },
                                }}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Work Day Type *</InputLabel>
                                <Select
                                    name="work_day_type"
                                    value={formData.work_day_type}
                                    onChange={handleChange}
                                    label="Work Day Type *"
                                >
                                    <MenuItem value="weekend">Weekend</MenuItem>
                                    <MenuItem value="public_holiday">Public Holiday</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Hours Worked *"
                                name="hours_worked"
                                value={formData.hours_worked}
                                onChange={handleChange}
                                error={!!formErrors.hours_worked}
                                helperText={formErrors.hours_worked}
                                inputProps={{ min: 1, max: 12 }}
                                required
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <DatePicker
                                label="Replacement Date *"
                                value={formData.replacement_date}
                                onChange={(date) => handleDateChange('replacement_date', date)}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        error: !!formErrors.replacement_date,
                                        helperText: formErrors.replacement_date,
                                        required: true,
                                    },
                                }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Reason"
                                name="reason"
                                value={formData.reason}
                                onChange={handleChange}
                                placeholder="Optional reason for replacement..."
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Button
                                type="submit"
                                variant="contained"
                                startIcon={<SaveIcon />}
                                disabled={loading}
                            >
                                {loading ? 'Submitting...' : 'Submit Request'}
                            </Button>
                        </Grid>
                    </Grid>
                </form>
            </Paper>

            {/* Replacement List */}
            <Typography variant="h6" gutterBottom fontWeight="bold">
                Replacement History
            </Typography>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell>Employee</TableCell>
                            <TableCell>Work Date</TableCell>
                            <TableCell>Hours</TableCell>
                            <TableCell>Replacement Date</TableCell>
                            <TableCell>Days Added</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {replacements.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                    No replacement requests found
                                </TableCell>
                            </TableRow>
                        ) : (
                            replacements.map((item) => (
                                <TableRow key={item.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="medium">
                                            {item.employee?.first_name} {item.employee?.last_name}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{formatDate(item.work_date)}</TableCell>
                                    <TableCell>{item.hours_worked}h</TableCell>
                                    <TableCell>{formatDate(item.replacement_date)}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={`+${item.days_to_add} day`}
                                            size="small"
                                            color="primary"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <LeaveStatusBadge status={item.status} />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={0.5} justifyContent="center">
                                            {item.status === 'pending' && (
                                                <>
                                                    <Tooltip title="Approve">
                                                        <IconButton
                                                            size="small"
                                                            color="success"
                                                            onClick={() => handleApprove(item.id)}
                                                        >
                                                            <CheckCircleIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Reject">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => {
                                                                setSelectedReplacement(item);
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
                                                            onClick={() => handleCancel(item.id)}
                                                        >
                                                            <BlockIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </>
                                            )}
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Reject Replacement Request</DialogTitle>
                <DialogContent>
                    <Box mt={1}>
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

export default ReplacementLeave;