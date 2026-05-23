// src/pages/leave/components/EditBalanceDialog.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  Divider,
  Box,
  Chip,
} from '@mui/material';
import api from '../../../services/axios';

const EditBalanceDialog = ({ open, onClose, balance, onSuccess }) => {
  const [formData, setFormData] = useState({
    base_entitlement: 0,
    manual_adjustment: 0,
    adjustment_reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (balance) {
      setFormData({
        base_entitlement: balance.base_entitlement || 0,
        manual_adjustment: 0,
        adjustment_reason: '',
      });
    }
  }, [balance]);

  const getLeaveTypeInfo = () => {
    const code = balance?.leave_type?.code;
    const info = {
      AL: { 
        name: 'Annual Leave', 
        color: '#10b981', 
        defaultDays: 18,
        description: 'Cuti tahunan untuk liburan atau istirahat'
      },
      SL: { 
        name: 'Sick Leave', 
        color: '#3b82f6', 
        defaultDays: 12,
        description: 'Cuti sakit dengan surat dokter'
      },
      SPL: { 
        name: 'Special Leave', 
        color: '#f59e0b', 
        defaultDays: 7,
        description: 'Cuti khusus untuk keperluan penting (nikah, dll)'
      },
    };
    return info[code] || { 
      name: balance?.leave_type?.name || 'Leave', 
      color: '#6b7280', 
      defaultDays: 0,
      description: ''
    };
  };

  const leaveInfo = getLeaveTypeInfo();

  const handleSubmit = async () => {
    // Validasi: jika ada perubahan (base atau manual) harus ada alasan
    const hasChanges = formData.base_entitlement !== balance?.base_entitlement || formData.manual_adjustment !== 0;
    
    if (hasChanges && !formData.adjustment_reason) {
      setError('Please provide a reason for the adjustment');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {};
      
      // Kirim base_entitlement jika berubah
      if (formData.base_entitlement !== balance?.base_entitlement) {
        payload.base_entitlement = formData.base_entitlement;
      }
      
      // Kirim manual_adjustment jika tidak nol
      if (formData.manual_adjustment !== 0) {
        payload.manual_adjustment = formData.manual_adjustment;
      }
      
      // Kirim alasan jika ada perubahan
      if (hasChanges) {
        payload.adjustment_reason = formData.adjustment_reason;
      }

      // Jika tidak ada perubahan, tutup dialog
      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }

      console.log('Sending payload:', payload); // Debug

      const response = await api.put(`/leaves/balance/${balance.id}`, payload);

      if (response.data.status === 'success') {
        onSuccess?.();
        onClose();
      } else {
        setError(response.data.message || 'Failed to update balance');
      }
    } catch (err) {
      console.error('Update error:', err);
      setError(err.response?.data?.message || 'Failed to update balance');
    } finally {
      setLoading(false);
    }
  };

  const calculateNewTotal = () => {
    if (!balance) return 0;
    // Total saat ini dikurangi manual adjustment sebelumnya
    const currentTotalWithoutManual = balance.total_entitlement - (balance.manual_adjustment || 0);
    const newBase = formData.base_entitlement;
    const newTotal = currentTotalWithoutManual + newBase + formData.manual_adjustment;
    return newTotal;
  };

  const calculateNewRemaining = () => {
    if (!balance) return 0;
    const usedAndPending = (balance.used_days || 0) + (balance.pending_days || 0);
    return calculateNewTotal() - usedAndPending;
  };

  if (!balance) return null;

  const hasChanges = formData.base_entitlement !== balance.base_entitlement || formData.manual_adjustment !== 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6">Edit Leave Balance</Typography>
          <Chip 
            label={balance.leave_type?.name}
            size="small"
            sx={{ bgcolor: leaveInfo.color, color: 'white', fontWeight: 'bold' }}
          />
        </Stack>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          {balance.employee?.first_name} {balance.employee?.last_name} - {balance.employee?.employee_id}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {leaveInfo.description}
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Current Balance Info */}
          <Alert severity="info" icon={<Typography>📊</Typography>}>
            <Typography variant="subtitle2" fontWeight="bold">Current Balance Details:</Typography>
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2">
                • Base Entitlement: <strong>{balance.base_entitlement}</strong> days/year
              </Typography>
              {balance.seniority_bonus > 0 && (
                <Typography variant="body2" color="success.main">
                  • Seniority Bonus: <strong>+{balance.seniority_bonus}</strong> days
                </Typography>
              )}
              {balance.carry_forward > 0 && (
                <Typography variant="body2" color="info.main">
                  • Carry Forward: <strong>+{balance.carry_forward}</strong> days
                </Typography>
              )}
              {balance.replacement_days > 0 && (
                <Typography variant="body2" color="warning.main">
                  • Replacement Days: <strong>+{balance.replacement_days}</strong> days
                </Typography>
              )}
              {balance.manual_adjustment !== 0 && (
                <Typography variant="body2" color="error.main">
                  • Previous Manual Adjustment: <strong>{balance.manual_adjustment > 0 ? '+' : ''}{balance.manual_adjustment}</strong> days
                </Typography>
              )}
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" fontWeight="bold">
                Total Entitlement: <strong>{balance.total_entitlement}</strong> days
              </Typography>
              <Typography variant="body2">
                Used: <strong>{balance.used_days}</strong> days | 
                Pending: <strong>{balance.pending_days}</strong> days
              </Typography>
              <Typography variant="body2" fontWeight="bold" color="success.main">
                Remaining: <strong>{balance.remaining_days}</strong> days
              </Typography>
            </Box>
          </Alert>

          {/* Edit Base Entitlement - Available for ALL leave types */}
          <TextField
            fullWidth
            type="number"
            label={`Base Entitlement (days per year) - ${leaveInfo.name}`}
            value={formData.base_entitlement}
            onChange={(e) => setFormData({ ...formData, base_entitlement: parseFloat(e.target.value) || 0 })}
            helperText={`Default: ${leaveInfo.defaultDays} days/year. Edit this to change the base entitlement.`}
            InputProps={{ 
              inputProps: { min: 0, step: 0.5 },
              sx: { bgcolor: '#f5f5f5' }
            }}
          />

          {/* Manual Adjustment */}
          <TextField
            fullWidth
            type="number"
            label="Manual Adjustment (+/- days)"
            value={formData.manual_adjustment}
            onChange={(e) => setFormData({ ...formData, manual_adjustment: parseFloat(e.target.value) || 0 })}
            helperText="Positive value adds days, negative value subtracts days. Use for corrections or special approvals."
            InputProps={{ 
              inputProps: { step: 0.5 },
              sx: { bgcolor: '#f5f5f5' }
            }}
          />

          {/* Adjustment Reason - Required if any change */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Adjustment Reason"
            value={formData.adjustment_reason}
            onChange={(e) => setFormData({ ...formData, adjustment_reason: e.target.value })}
            placeholder="Please explain why this adjustment is needed..."
            required={hasChanges}
            error={hasChanges && !formData.adjustment_reason}
            helperText={hasChanges && !formData.adjustment_reason ? "Reason is required when making changes" : ""}
          />

          {/* Preview New Balance */}
          {hasChanges && (
            <Alert severity="warning">
              <Typography variant="subtitle2" fontWeight="bold">Preview New Balance:</Typography>
              <Stack direction="row" spacing={3} sx={{ mt: 1 }} flexWrap="wrap">
                <Box>
                  <Typography variant="caption" color="textSecondary">New Total Entitlement</Typography>
                  <Typography variant="h6" color="primary">{calculateNewTotal()} days</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">New Remaining Balance</Typography>
                  <Typography variant="h6" color="success.main">{calculateNewRemaining()} days</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">Change</Typography>
                  <Typography variant="h6" color={calculateNewRemaining() > balance.remaining_days ? 'success.main' : 'error.main'}>
                    {calculateNewRemaining() > balance.remaining_days ? '+' : ''}
                    {(calculateNewRemaining() - balance.remaining_days).toFixed(1)} days
                  </Typography>
                </Box>
              </Stack>
            </Alert>
          )}
        </Stack>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading || (hasChanges && !formData.adjustment_reason)}
          sx={{ bgcolor: leaveInfo.color, '&:hover': { bgcolor: leaveInfo.color, opacity: 0.8 } }}
        >
          {loading ? <CircularProgress size={24} /> : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditBalanceDialog;