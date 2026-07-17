// src/pages/leaves/LeaveCreate.jsx

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
    Chip,
    Avatar,
    Divider,
    Stepper,
    Step,
    StepLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    IconButton,
    Checkbox,
    ListItemText,
    OutlinedInput,
} from '@mui/material';
import {
    Send as SendIcon,
    Cancel as CancelIcon,
    AttachFile as AttachFileIcon,
    Close as CloseIcon,
    CalendarToday as CalendarIcon,
    Person as PersonIcon,
    CheckCircle as CheckCircleIcon,
    AccessTime as AccessTimeIcon,
    People as PeopleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLeave } from '../../contexts/LeaveContext';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, getWorkingDays } from '../../utils/dateFormat';
import api from '../../services/axios';

const LeaveCreate = () => {
    const navigate = useNavigate();
    const { createLeave, fetchLeaveTypes, leaveTypes, loading } = useLeave();
    const { user } = useAuth();
    
    // Form State
    const [formData, setFormData] = useState({
        leave_type_id: '',
        start_date: '',
        end_date: '',
        reason: '',
        attachment: null,
    });
    
    const [selectedApprovers, setSelectedApprovers] = useState([]);
    const [managers, setManagers] = useState([]);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [totalDays, setTotalDays] = useState(0);
    const [balance, setBalance] = useState(null);
    const [approvalFlow, setApprovalFlow] = useState([]);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [attachmentName, setAttachmentName] = useState('');

    // Load data on mount
    useEffect(() => {
        loadData();
        fetchManagers();
    }, []);

    const loadData = async () => {
        await fetchLeaveTypes();
        await fetchMyBalance();
    };

    const fetchManagers = async () => {
        try {
            // ✅ Gunakan endpoint yang sudah dibuat
            const response = await api.get('/employees/managers');
            setManagers(response.data.data || []);
            console.log('📊 Managers:', response.data.data);
        } catch (err) {
            console.error('Error fetching managers:', err);
            setManagers([]);
            setSnackbar({
                open: true,
                message: 'Unable to load managers list. Please refresh or contact HR.',
                severity: 'warning',
            });
        }
    };

    const fetchMyBalance = async () => {
        try {
            const response = await api.get('/my-leave-balance');
            const data = response.data.data;
            const balances = data?.balances || [];
            if (formData.leave_type_id) {
                const selectedBalance = balances.find(b => b.leave_type_id === parseInt(formData.leave_type_id));
                setBalance(selectedBalance || null);
            }
        } catch (err) {
            console.error('Error fetching balance:', err);
        }
    };

    // Calculate total days when dates change
    useEffect(() => {
        if (formData.start_date && formData.end_date) {
            const days = getWorkingDays(formData.start_date, formData.end_date);
            setTotalDays(days);
        } else {
            setTotalDays(0);
        }
    }, [formData.start_date, formData.end_date]);

    // Fetch balance when leave type changes
    useEffect(() => {
        if (formData.leave_type_id) {
            fetchMyBalance();
        }
    }, [formData.leave_type_id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const handleApproverChange = (event) => {
        const { value } = event.target;
        setSelectedApprovers(typeof value === 'string' ? value.split(',') : value);
        if (errors.selected_approvers) {
            setErrors({ ...errors, selected_approvers: '' });
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setSnackbar({
                    open: true,
                    message: 'File size cannot exceed 5MB',
                    severity: 'error',
                });
                return;
            }
            
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png|doc|docx)$/i)) {
                setSnackbar({
                    open: true,
                    message: 'File type not supported. Please upload PDF, JPG, PNG, DOC, or DOCX',
                    severity: 'error',
                });
                return;
            }
            
            setFormData({ ...formData, attachment: file });
            setAttachmentName(file.name);
        }
    };

    const removeAttachment = () => {
        setFormData({ ...formData, attachment: null });
        setAttachmentName('');
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.leave_type_id) {
            newErrors.leave_type_id = 'Please select a leave type';
        }
        
        if (!formData.start_date) {
            newErrors.start_date = 'Please select start date';
        }
        
        if (!formData.end_date) {
            newErrors.end_date = 'Please select end date';
        }
        
        if (formData.start_date && formData.end_date) {
            const start = new Date(formData.start_date);
            const end = new Date(formData.end_date);
            if (start > end) {
                newErrors.end_date = 'End date must be after start date';
            }
        }
        
        if (!formData.reason || formData.reason.length < 5) {
            newErrors.reason = 'Please provide a reason (minimum 5 characters)';
        }

        if (selectedApprovers.length === 0) {
            newErrors.selected_approvers = 'Please select at least one approver';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        console.log('📤 Form submitted');
        console.log('📊 Form data:', formData);
        console.log('📊 Selected approvers:', selectedApprovers);
        
        // Validate
        if (!validateForm()) {
            console.log('❌ Validation failed:', errors);
            return;
        }

        // Check balance
        if (balance && balance.remaining_days < totalDays) {
            setSnackbar({
                open: true,
                message: `Insufficient balance! Available: ${balance.remaining_days} days, Requested: ${totalDays} days`,
                severity: 'error',
            });
            return;
        }

        setSubmitting(true);
        
        try {
            // Create FormData
            const submitData = new FormData();
            submitData.append('leave_type_id', String(formData.leave_type_id));
            submitData.append('start_date', formData.start_date);
            submitData.append('end_date', formData.end_date);
            submitData.append('reason', formData.reason);
            
            // ✅ Add selected approvers
            selectedApprovers.forEach(id => {
                submitData.append('selected_approvers[]', id);
            });
            
            if (formData.attachment) {
                submitData.append('attachment', formData.attachment);
            }

            // Debug FormData
            console.log('📤 Submitting FormData:');
            for (let pair of submitData.entries()) {
                console.log(pair[0] + ': ' + (pair[1] instanceof File ? pair[1].name : pair[1]));
            }

            // ✅ Call API
            const response = await api.post('/leaves', submitData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            console.log('✅ Success:', response.data);
            
            setSuccess(true);
            setSnackbar({
                open: true,
                message: '✅ Leave request submitted successfully!',
                severity: 'success',
            });
            
            // Reset form
            setFormData({
                leave_type_id: '',
                start_date: '',
                end_date: '',
                reason: '',
                attachment: null,
            });
            setSelectedApprovers([]);
            setAttachmentName('');
            
            setTimeout(() => {
                navigate('/leaves/list');
            }, 2000);
            
        } catch (err) {
            console.error('❌ Error:', err);
            console.error('❌ Response:', err.response?.data);
            
            const errorResponse = err.response?.data;
            let errorMessage = 'Failed to submit leave request';
            
            if (errorResponse?.errors) {
                const errorMessages = [];
                Object.keys(errorResponse.errors).forEach(key => {
                    errorMessages.push(`${key}: ${errorResponse.errors[key].join(', ')}`);
                });
                errorMessage = errorMessages.join('\n');
                setErrors(errorResponse.errors);
            } else if (errorResponse?.message) {
                errorMessage = errorResponse.message;
            }
            
            setSnackbar({
                open: true,
                message: errorMessage,
                severity: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate('/leaves');
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

    if (loading && !leaveTypes.length) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }}>
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
                        <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b' }}>
                            📝 Request Leave
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Submit a new leave request for approval
                        </Typography>
                    </Box>
                    <Button
                        variant="outlined"
                        startIcon={<CancelIcon />}
                        onClick={handleCancel}
                        size="small"
                        sx={{ textTransform: 'none' }}
                    >
                        Cancel
                    </Button>
                </Box>
            </Paper>

            {/* Form */}
            <Paper 
                elevation={0}
                sx={{ 
                    p: 3,
                    border: '1px solid #e5e7eb',
                    borderRadius: 2
                }}
            >
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                        {/* Leave Type */}
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth error={!!errors.leave_type_id}>
                                <InputLabel>Leave Type *</InputLabel>
                                <Select
                                    name="leave_type_id"
                                    value={formData.leave_type_id}
                                    onChange={handleChange}
                                    label="Leave Type *"
                                >
                                    {leaveTypes.map((type) => (
                                        <MenuItem key={type.id} value={type.id}>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Avatar 
                                                    sx={{ 
                                                        width: 24, 
                                                        height: 24, 
                                                        bgcolor: getLeaveTypeColor(type.code) + '20',
                                                        fontSize: 12,
                                                        color: getLeaveTypeColor(type.code)
                                                    }}
                                                >
                                                    {type.code?.substring(0, 2)}
                                                </Avatar>
                                                {type.name} ({type.days_per_year} days)
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.leave_type_id && (
                                    <Typography variant="caption" color="error">{errors.leave_type_id}</Typography>
                                )}
                            </FormControl>
                        </Grid>

                        {/* Balance Info */}
                        <Grid item xs={12} md={6}>
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', height: '100%' }}>
                                <Typography variant="caption" color="textSecondary">
                                    Balance Information
                                </Typography>
                                {balance ? (
                                    <Box>
                                        <Typography variant="h6" color="success.main">
                                            {balance.remaining_days || 0} days remaining
                                        </Typography>
                                        <Box display="flex" gap={2} mt={0.5}>
                                            <Typography variant="caption" color="textSecondary">
                                                Total: {balance.total_entitlement || 0}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                Used: {balance.used_days || 0}
                                            </Typography>
                                            <Typography variant="caption" color="warning.main">
                                                Pending: {balance.pending_days || 0}
                                            </Typography>
                                        </Box>
                                    </Box>
                                ) : (
                                    <Typography variant="body2" color="textSecondary">
                                        Select a leave type to view balance
                                    </Typography>
                                )}
                            </Paper>
                        </Grid>

                        {/* Start Date */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Start Date *"
                                name="start_date"
                                value={formData.start_date}
                                onChange={handleChange}
                                error={!!errors.start_date}
                                helperText={errors.start_date}
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ min: new Date().toISOString().split('T')[0] }}
                            />
                        </Grid>

                        {/* End Date */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="End Date *"
                                name="end_date"
                                value={formData.end_date}
                                onChange={handleChange}
                                error={!!errors.end_date}
                                helperText={errors.end_date}
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ min: formData.start_date || new Date().toISOString().split('T')[0] }}
                            />
                        </Grid>

                        {/* Total Days */}
                        <Grid item xs={12}>
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc' }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <CalendarIcon color="action" />
                                        <Typography variant="body2">
                                            {formData.start_date && formData.end_date ? (
                                                <>
                                                    {formatDate(formData.start_date, 'dd/MM/yyyy')} → {formatDate(formData.end_date, 'dd/MM/yyyy')}
                                                </>
                                            ) : (
                                                'Select dates to see duration'
                                            )}
                                        </Typography>
                                    </Box>
                                    <Chip 
                                        label={`${totalDays} ${totalDays === 1 ? 'day' : 'days'}`}
                                        color="primary"
                                        variant="outlined"
                                    />
                                </Box>
                            </Paper>
                        </Grid>

                        {/* Reason */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="Reason *"
                                name="reason"
                                value={formData.reason}
                                onChange={handleChange}
                                error={!!errors.reason}
                                helperText={errors.reason}
                                placeholder="Please explain the reason for your leave request..."
                            />
                        </Grid>

                        {/* ✅ SELECT APPROVERS - NEW */}
                        <Grid item xs={12}>
                            <FormControl fullWidth error={!!errors.selected_approvers}>
                                <InputLabel>Select Approvers *</InputLabel>
                                <Select
                                    multiple
                                    value={selectedApprovers}
                                    onChange={handleApproverChange}
                                    input={<OutlinedInput label="Select Approvers *" />}
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {selected.map((id) => {
                                                const manager = managers.find(m => m.id === id);
                                                return manager ? (
                                                    <Chip 
                                                        key={id} 
                                                        label={`${manager.first_name} ${manager.last_name}`} 
                                                        size="small" 
                                                        color="primary"
                                                        avatar={<Avatar sx={{ width: 20, height: 20, fontSize: 10 }}>
                                                            {manager.first_name?.[0]}{manager.last_name?.[0]}
                                                        </Avatar>}
                                                    />
                                                ) : null;
                                            })}
                                        </Box>
                                    )}
                                >
                                    {managers.map((manager) => (
                                        <MenuItem key={manager.id} value={manager.id}>
                                            <Checkbox checked={selectedApprovers.indexOf(manager.id) > -1} />
                                            <Avatar sx={{ width: 24, height: 24, bgcolor: '#6366f1', fontSize: 12, mr: 1 }}>
                                                {manager.first_name?.[0]}{manager.last_name?.[0]}
                                            </Avatar>
                                            <ListItemText 
                                                primary={`${manager.first_name} ${manager.last_name}`}
                                                secondary={manager.position?.title || 'Manager'}
                                            />
                                            <Chip 
                                                label={manager.department?.name || 'N/A'} 
                                                size="small" 
                                                sx={{ ml: 1, height: 20, fontSize: '0.6rem' }}
                                            />
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.selected_approvers && (
                                    <Typography variant="caption" color="error">{errors.selected_approvers}</Typography>
                                )}
                            </FormControl>
                            {selectedApprovers.length > 0 && (
                                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                                    <PeopleIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                                    {selectedApprovers.length} manager{selectedApprovers.length > 1 ? 's' : ''} selected
                                </Typography>
                            )}
                        </Grid>

                        {/* Attachment */}
                        <Grid item xs={12}>
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    Attachment (Optional)
                                </Typography>
                                {attachmentName ? (
                                    <Paper variant="outlined" sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <AttachFileIcon color="primary" />
                                            <Typography variant="body2">{attachmentName}</Typography>
                                        </Box>
                                        <IconButton size="small" onClick={removeAttachment}>
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </Paper>
                                ) : (
                                    <Button
                                        variant="outlined"
                                        component="label"
                                        startIcon={<AttachFileIcon />}
                                        sx={{ textTransform: 'none' }}
                                    >
                                        Upload File (PDF, JPG, PNG, DOC, DOCX - max 5MB)
                                        <input
                                            type="file"
                                            hidden
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                            onChange={handleFileChange}
                                        />
                                    </Button>
                                )}
                            </Box>
                        </Grid>

                        {/* Approval Flow Preview */}
                        {selectedApprovers.length > 0 && (
                            <Grid item xs={12}>
                                <Divider sx={{ my: 1 }}>
                                    <Chip label="Approval Flow" size="small" />
                                </Divider>
                                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc' }}>
                                    <Stepper orientation="vertical" activeStep={0}>
                                        {selectedApprovers.map((id, index) => {
                                            const manager = managers.find(m => m.id === id);
                                            return (
                                                <Step key={id} active>
                                                    <StepLabel
                                                        StepIconComponent={() => (
                                                            index === 0 ? 
                                                            <CircularProgress size={20} /> :
                                                            <AccessTimeIcon sx={{ color: '#d1d5db', fontSize: 20 }} />
                                                        )}
                                                    >
                                                        <Box>
                                                            <Typography variant="body2" fontWeight="bold">
                                                                Level {index + 1}: {manager?.position?.title || 'Manager'} Approval
                                                            </Typography>
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <Avatar sx={{ width: 20, height: 20, bgcolor: '#6366f1', fontSize: 10 }}>
                                                                    <PersonIcon sx={{ fontSize: 12 }} />
                                                                </Avatar>
                                                                <Typography variant="caption" color="textSecondary">
                                                                    {manager ? `${manager.first_name} ${manager.last_name}` : 'Not Assigned'}
                                                                </Typography>
                                                                {manager?.department && (
                                                                    <Chip 
                                                                        label={manager.department.name}
                                                                        size="small"
                                                                        sx={{ height: 18, fontSize: '0.6rem' }}
                                                                    />
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    </StepLabel>
                                                </Step>
                                            );
                                        })}
                                    </Stepper>
                                    <Alert severity="info" sx={{ mt: 2 }}>
                                        <Typography variant="caption">
                                            💡 These managers will be able to approve or reject your leave request.
                                            You will be notified once they respond.
                                        </Typography>
                                    </Alert>
                                </Paper>
                            </Grid>
                        )}

                        {/* Actions */}
                        <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                            <Box display="flex" justifyContent="flex-end" gap={2}>
                                <Button
                                    variant="outlined"
                                    onClick={handleCancel}
                                    disabled={submitting}
                                    sx={{ textTransform: 'none' }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    startIcon={submitting ? <CircularProgress size={20} /> : <SendIcon />}
                                    disabled={submitting || !formData.leave_type_id || !formData.start_date || !formData.end_date || !formData.reason || selectedApprovers.length === 0}
                                    sx={{ textTransform: 'none' }}
                                >
                                    {submitting ? 'Submitting...' : 'Submit Request'}
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </form>
            </Paper>

            {/* Success Dialog */}
            <Dialog open={success} onClose={() => setSuccess(false)}>
                <DialogTitle sx={{ textAlign: 'center' }}>
                    <CheckCircleIcon sx={{ fontSize: 64, color: '#10b981', mb: 1 }} />
                    <Typography variant="h6">Request Submitted! 🎉</Typography>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="textSecondary" align="center">
                        Your leave request has been submitted successfully.<br />
                        Your selected approvers will be notified.
                    </Typography>
                    {selectedApprovers.length > 0 && (
                        <Box mt={2}>
                            <Typography variant="caption" color="textSecondary" display="block">
                                Approvers:
                            </Typography>
                            <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                                {selectedApprovers.map(id => {
                                    const manager = managers.find(m => m.id === id);
                                    return manager ? (
                                        <Chip 
                                            key={id}
                                            label={`${manager.first_name} ${manager.last_name}`}
                                            size="small"
                                            color="primary"
                                        />
                                    ) : null;
                                })}
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
                    <Button 
                        variant="contained" 
                        onClick={() => navigate('/leaves/list')}
                        sx={{ textTransform: 'none' }}
                    >
                        View My Requests
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default LeaveCreate;