// src/pages/leave/components/LeaveRequestForm.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Stack,
  CircularProgress,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { useLeave } from '../../contexts/LeaveContext';
import { formatDate } from '../../../utils/dateFormat';

const LeaveRequestForm = ({ open, onClose, leaveBalances }) => {
  const { leaveTypes, createLeave, loading } = useLeave();
  const [formData, setFormData] = useState({
    leave_type_id: '',
    start_date: null,
    end_date: null,
    reason: '',
  });
  const [errors, setErrors] = useState({});
  const [calculatedDays, setCalculatedDays] = useState(0);
  const [selectedBalance, setSelectedBalance] = useState(null);

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      calculateDays();
    }
  }, [formData.start_date, formData.end_date]);

  useEffect(() => {
    if (formData.leave_type_id && leaveBalances) {
      const balance = leaveBalances.find(b => b.leave_type_id === parseInt(formData.leave_type_id));
      setSelectedBalance(balance);
    }
  }, [formData.leave_type_id, leaveBalances]);

  const calculateDays = () => {
    if (!formData.start_date || !formData.end_date) return;
    
    let days = 0;
    let current = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    setCalculatedDays(Math.max(1, days));
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.leave_type_id) newErrors.leave_type_id = 'Leave type is required';
    if (!formData.start_date) newErrors.start_date = 'Start date is required';
    if (!formData.end_date) newErrors.end_date = 'End date is required';
    if (!formData.reason) newErrors.reason = 'Reason is required';
    if (formData.reason && formData.reason.length < 5) newErrors.reason = 'Reason must be at least 5 characters';
    
    if (selectedBalance && calculatedDays > selectedBalance.remaining_days) {
      newErrors.days = `Insufficient balance! Requested: ${calculatedDays}, Available: ${selectedBalance.remaining_days}`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    try {
      await createLeave({
        leave_type_id: formData.leave_type_id,
        start_date: formatDate(formData.start_date, 'yyyy-MM-dd'),
        end_date: formatDate(formData.end_date, 'yyyy-MM-dd'),
        reason: formData.reason,
      });
      
      handleClose();
    } catch (err) {
      console.error('Submit error:', err);
    }
  };

  const handleClose = () => {
    setFormData({
      leave_type_id: '',
      start_date: null,
      end_date: null,
      reason: '',
    });
    setErrors({});
    setCalculatedDays(0);
    setSelectedBalance(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Request New Leave</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Leave Type</InputLabel>
            <Select
              value={formData.leave_type_id}
              label="Leave Type"
              onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
            >
              {leaveTypes.map((type) => (
                <MenuItem key={type.id} value={type.id}>
                  {type.name} - {type.days_per_year} days/year
                </MenuItem>
              ))}
            </Select>
            {errors.leave_type_id && (
              <Typography variant="caption" color="error">{errors.leave_type_id}</Typography>
            )}
          </FormControl>

          {selectedBalance && (
            <Alert severity="info">
              Available balance: {selectedBalance.remaining_days} days
              {selectedBalance.seniority_bonus > 0 && ` (includes ${selectedBalance.seniority_bonus} seniority bonus)`}
              {selectedBalance.carry_forward_days > 0 && ` (includes ${selectedBalance.carry_forward_days} carry forward)`}
            </Alert>
          )}

          <DatePicker
            label="Start Date"
            value={formData.start_date}
            onChange={(date) => setFormData({ ...formData, start_date: date })}
            slotProps={{ textField: { fullWidth: true, error: !!errors.start_date } }}
          />

          <DatePicker
            label="End Date"
            value={formData.end_date}
            onChange={(date) => setFormData({ ...formData, end_date: date })}
            slotProps={{ textField: { fullWidth: true, error: !!errors.end_date } }}
          />

          {calculatedDays > 0 && (
            <Alert severity={calculatedDays > (selectedBalance?.remaining_days || 0) ? 'error' : 'success'}>
              Total days requested: {calculatedDays} working day(s)
            </Alert>
          )}

          {errors.days && (
            <Alert severity="error">{errors.days}</Alert>
          )}

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Reason"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            error={!!errors.reason}
            helperText={errors.reason}
            placeholder="Please explain why you need this leave..."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Submit Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeaveRequestForm;