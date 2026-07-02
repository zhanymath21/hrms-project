// src/pages/leaves/LeaveCreate.jsx

import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    TextField,
    Button,
    Typography,
    Grid,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Alert,
    CircularProgress,
    IconButton,
    Chip,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
    AttachFile as AttachFileIcon,
    Clear as ClearIcon,
} from '@mui/icons-material';
import { useLeave } from '../../contexts/LeaveContext';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';

const LeaveCreate = () => {
    const navigate = useNavigate();
    const { leaveTypes, createLeave, loading, fetchLeaveTypes } = useLeave();

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
        fetchLeaveTypes();
    }, []);

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
                alert('Please upload PDF, JPG, PNG, or DOC file');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB');
                return;
            }
            setFormData((prev) => ({ ...prev, attachment: file }));
            setAttachmentPreview(URL.createObjectURL(file));
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

    const handleSubmit = async (e) => {
        e.preventDefault();
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

            await createLeave(data);
            navigate('/leaves');
        } catch (err) {
            setSubmitError(err.message || 'Failed to create leave request');
        }
    };

    return (
        <Box>
            <Box display="flex" alignItems="center" mb={3} gap={2}>
                <IconButton onClick={() => navigate('/leaves')}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4" component="h1" fontWeight="bold">
                    Request Leave
                </Typography>
            </Box>

            {submitError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError('')}>
                    {submitError}
                </Alert>
            )}

            <Paper sx={{ p: 3 }}>
                <form onSubmit={handleSubmit}>
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

                    <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
                        <Button variant="outlined" onClick={() => navigate('/leaves')}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                            disabled={loading}
                        >
                            {loading ? 'Submitting...' : 'Submit Request'}
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Box>
    );
};

export default LeaveCreate;