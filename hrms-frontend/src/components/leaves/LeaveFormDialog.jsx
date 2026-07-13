// src/components/leaves/LeaveFormDialog.jsx

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    CircularProgress,
    IconButton,
    Box,
    Typography,
    Chip,
} from '@mui/material';
import { Close as CloseIcon, AttachFile as AttachFileIcon, Clear as ClearIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';

const LeaveFormDialog = ({
    open,
    onClose,
    onSubmit,
    leaveTypes = [],
    initialData = null,
    loading = false,
    title = 'Request Leave',
    submitLabel = 'Submit',
}) => {
    const [formData, setFormData] = useState({
        leave_type_id: '',
        start_date: null,
        end_date: null,
        reason: '',
        attachment: null,
    });
    const [errors, setErrors] = useState({});
    const [submitError, setSubmitError] = useState('');
    const [attachmentPreview, setAttachmentPreview] = useState(null);

    useEffect(() => {
        if (open) {
            if (initialData) {
                setFormData({
                    leave_type_id: initialData.leave_type_id || '',
                    start_date: initialData.start_date ? new Date(initialData.start_date) : null,
                    end_date: initialData.end_date ? new Date(initialData.end_date) : null,
                    reason: initialData.reason || '',
                    attachment: null,
                });
            } else {
                setFormData({
                    leave_type_id: '',
                    start_date: null,
                    end_date: null,
                    reason: '',
                    attachment: null,
                });
            }
            setErrors({});
            setSubmitError('');
            setAttachmentPreview(null);
        }
    }, [open, initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const handleDateChange = (name, date) => {
        setFormData((prev) => ({ ...prev, [name]: date }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!validTypes.includes(file.type)) {
                setSubmitError('Please upload PDF, JPG, PNG, or DOC file');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setSubmitError('File size must be less than 5MB');
                return;
            }
            setFormData((prev) => ({ ...prev, attachment: file }));
            setAttachmentPreview(URL.createObjectURL(file));
            setSubmitError('');
        }
    };

    const handleRemoveAttachment = () => {
        setFormData((prev) => ({ ...prev, attachment: null }));
        setAttachmentPreview(null);
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.leave_type_id) newErrors.leave_type_id = 'Leave type is required';
        if (!formData.start_date) newErrors.start_date = 'Start date is required';
        if (!formData.end_date) newErrors.end_date = 'End date is required';
        if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
            newErrors.end_date = 'End date must be after start date';
        }
        if (!formData.reason) newErrors.reason = 'Reason is required';
        if (formData.reason && formData.reason.length < 5) {
            newErrors.reason = 'Reason must be at least 5 characters';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        setSubmitError('');
        if (!validate()) return;

        try {
            const data = new FormData();
            data.append('leave_type_id', formData.leave_type_id);
            data.append('start_date', format(formData.start_date, 'yyyy-MM-dd'));
            data.append('end_date', format(formData.end_date, 'yyyy-MM-dd'));
            data.append('reason', formData.reason);
            if (formData.attachment) {
                data.append('attachment', formData.attachment);
            }

            await onSubmit(data);
            onClose();
        } catch (err) {
            setSubmitError(err.message || 'Failed to submit leave request');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">{title}</Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers>
                {submitError && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError('')}>
                        {submitError}
                    </Alert>
                )}

                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <FormControl fullWidth error={!!errors.leave_type_id}>
                            <InputLabel>Leave Type *</InputLabel>
                            <Select
                                name="leave_type_id"
                                value={formData.leave_type_id}
                                onChange={handleChange}
                                label="Leave Type *"
                            >
                                <MenuItem value="">Select Leave Type</MenuItem>
                                {leaveTypes.map((type) => (
                                    <MenuItem key={type.id} value={type.id}>
                                        {type.name} ({type.code}) - {type.days_per_year} days/year
                                        {type.require_attachment && ' 📎'}
                                    </MenuItem>
                                ))}
                            </Select>
                            {errors.leave_type_id && (
                                <Typography variant="caption" color="error">
                                    {errors.leave_type_id}
                                </Typography>
                            )}
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <DatePicker
                            label="Start Date *"
                            value={formData.start_date}
                            onChange={(date) => handleDateChange('start_date', date)}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    error: !!errors.start_date,
                                    helperText: errors.start_date,
                                    required: true,
                                },
                            }}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <DatePicker
                            label="End Date *"
                            value={formData.end_date}
                            onChange={(date) => handleDateChange('end_date', date)}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    error: !!errors.end_date,
                                    helperText: errors.end_date,
                                    required: true,
                                },
                            }}
                        />
                    </Grid>

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
                            placeholder="Please provide reason for leave..."
                            required
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Attachment (Optional)
                            </Typography>
                            <Box
                                sx={{
                                    border: '2px dashed #ccc',
                                    borderRadius: 2,
                                    p: 3,
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        bgcolor: 'rgba(99, 102, 241, 0.05)',
                                    },
                                }}
                            >
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                    id="attachment-upload"
                                />
                                <label htmlFor="attachment-upload" style={{ cursor: 'pointer' }}>
                                    {attachmentPreview ? (
                                        <Box>
                                            <Typography variant="body2" color="success.main">
                                                📎 {formData.attachment?.name || 'Attachment uploaded'}
                                            </Typography>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveAttachment();
                                                }}
                                                sx={{ mt: 1 }}
                                            >
                                                <ClearIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    ) : (
                                        <Box>
                                            <AttachFileIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
                                            <Typography variant="body2" color="textSecondary">
                                                Click to upload attachment (PDF, JPG, PNG, DOC - max 5MB)
                                            </Typography>
                                        </Box>
                                    )}
                                </label>
                            </Box>
                        </Box>
                    </Grid>
                </Grid>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                    {loading ? 'Submitting...' : submitLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default LeaveFormDialog;