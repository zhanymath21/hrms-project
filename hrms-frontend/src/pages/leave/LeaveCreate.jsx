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
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from '@mui/icons-material';
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
    });

    const [errors, setErrors] = useState({});
    const [submitError, setSubmitError] = useState('');

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
            const data = {
                ...formData,
                start_date: format(formData.start_date, 'yyyy-MM-dd'),
                end_date: format(formData.end_date, 'yyyy-MM-dd'),
            };
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