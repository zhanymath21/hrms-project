// src/pages/leave/components/ReplacementLeave.jsx
import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Box,
  Snackbar,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { useLeave } from '../../contexts/LeaveContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../../utils/dateFormat';
import { 
  Add as AddIcon, 
  CheckCircle as CheckCircleIcon, 
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

const ReplacementLeave = () => {
  const { user } = useAuth();
  const { 
    replacementLeaves, 
    fetchReplacementLeaves, 
    createReplacementLeave, 
    approveReplacement, 
    rejectReplacement,
    loading 
  } = useLeave();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedReplacement, setSelectedReplacement] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    work_date: null,
    work_day_type: 'weekend',
    hours_worked: 8,
    replacement_date: null,
    reason: '',
  });

  const isAdmin = user?.position?.title?.includes('HR') || 
                  user?.position?.title?.includes('Admin') ||
                  user?.position?.title?.includes('Manager');

  useEffect(() => {
    loadReplacementLeaves();
  }, []);

  const loadReplacementLeaves = async () => {
    try {
      await fetchReplacementLeaves();
    } catch (err) {
      console.error('Error loading replacement leaves:', err);
    }
  };

  const handleSubmit = async () => {
    try {
      await createReplacementLeave({
        work_date: formatDate(formData.work_date, 'yyyy-MM-dd'),
        work_day_type: formData.work_day_type,
        hours_worked: formData.hours_worked,
        replacement_date: formatDate(formData.replacement_date, 'yyyy-MM-dd'),
        reason: formData.reason,
      });
      
      setDialogOpen(false);
      setFormData({
        work_date: null,
        work_day_type: 'weekend',
        hours_worked: 8,
        replacement_date: null,
        reason: '',
      });
      
      setSnackbar({
        open: true,
        message: 'Replacement leave request submitted successfully!',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to submit request',
        severity: 'error'
      });
    }
  };

  const handleApprove = async (replacement) => {
    if (window.confirm(`Approve replacement leave for ${replacement.employee?.first_name}?`)) {
      try {
        await approveReplacement(replacement.id);
        setSnackbar({
          open: true,
          message: 'Replacement leave approved successfully!',
          severity: 'success'
        });
      } catch (err) {
        setSnackbar({
          open: true,
          message: err.message || 'Failed to approve',
          severity: 'error'
        });
      }
    }
  };

  const handleReject = async () => {
    if (selectedReplacement && rejectReason) {
      try {
        await rejectReplacement(selectedReplacement.id, rejectReason);
        setRejectDialogOpen(false);
        setRejectReason('');
        setSelectedReplacement(null);
        setSnackbar({
          open: true,
          message: 'Replacement leave rejected',
          severity: 'info'
        });
      } catch (err) {
        setSnackbar({
          open: true,
          message: err.message || 'Failed to reject',
          severity: 'error'
        });
      }
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getDaysToAdd = (hours) => {
    return hours >= 8 ? 1 : 0.5;
  };

  if (loading && replacementLeaves.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Request Button */}
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setDialogOpen(true)}
        sx={{ mb: 3 }}
      >
        Request Replacement Leave
      </Button>

      {/* Info Box */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Replacement Leave Policy:</strong>
        <ul style={{ margin: '8px 0 0 20px' }}>
          <li>For working on weekends or public holidays</li>
          <li>4-7 hours = 0.5 day replacement</li>
          <li>8+ hours = 1 full day replacement</li>
          <li>Replacement day must be taken within 3 months</li>
          <li>Approval required from line manager</li>
        </ul>
      </Alert>

      {/* Replacement Requests Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Request Date</TableCell>
              {isAdmin && <TableCell>Employee</TableCell>}
              <TableCell>Work Date</TableCell>
              <TableCell>Day Type</TableCell>
              <TableCell>Hours Worked</TableCell>
              <TableCell>Days to Add</TableCell>
              <TableCell>Replacement Date</TableCell>
              <TableCell>Status</TableCell>
              {isAdmin && <TableCell align="center">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {replacementLeaves.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 9 : 8} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">No replacement leave requests found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              replacementLeaves.map((replacement) => (
                <TableRow key={replacement.id} hover>
                  <TableCell>{formatDate(replacement.created_at)}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      {replacement.employee?.first_name} {replacement.employee?.last_name}
                    </TableCell>
                  )}
                  <TableCell>{formatDate(replacement.work_date)}</TableCell>
                  <TableCell>
                    <Chip
                      label={replacement.work_day_type === 'weekend' ? 'Weekend' : 'Public Holiday'}
                      size="small"
                      color={replacement.work_day_type === 'weekend' ? 'info' : 'warning'}
                    />
                  </TableCell>
                  <TableCell>{replacement.hours_worked} hours</TableCell>
                  <TableCell>
                    <Chip 
                      label={`+${getDaysToAdd(replacement.hours_worked)} day`}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{formatDate(replacement.replacement_date)}</TableCell>
                  <TableCell>
                    <Chip
                      label={replacement.status?.toUpperCase()}
                      color={getStatusColor(replacement.status)}
                      size="small"
                    />
                  </TableCell>
                  {isAdmin && (
                    <TableCell align="center">
                      {replacement.status === 'pending' && (
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="Approve">
                            <IconButton 
                              size="small" 
                              color="success" 
                              onClick={() => handleApprove(replacement)}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton 
                              size="small" 
                              color="error" 
                              onClick={() => {
                                setSelectedReplacement(replacement);
                                setRejectDialogOpen(true);
                              }}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Request Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Request Replacement Leave</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <DatePicker
              label="Work Date (Weekend or Holiday)"
              value={formData.work_date}
              onChange={(date) => setFormData({ ...formData, work_date: date })}
              slotProps={{ textField: { fullWidth: true, required: true } }}
            />

            <FormControl fullWidth>
              <InputLabel>Day Type</InputLabel>
              <Select
                value={formData.work_day_type}
                label="Day Type"
                onChange={(e) => setFormData({ ...formData, work_day_type: e.target.value })}
              >
                <MenuItem value="weekend">Weekend (Saturday/Sunday)</MenuItem>
                <MenuItem value="public_holiday">Public Holiday</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              type="number"
              label="Hours Worked"
              value={formData.hours_worked}
              onChange={(e) => setFormData({ ...formData, hours_worked: parseInt(e.target.value) })}
              helperText="4-7 hours = 0.5 day, 8+ hours = 1 full day"
            />

            <Alert severity="info">
              You will receive: <strong>{getDaysToAdd(formData.hours_worked)}</strong> replacement day(s)
            </Alert>

            <DatePicker
              label="Preferred Replacement Date"
              value={formData.replacement_date}
              onChange={(date) => setFormData({ ...formData, replacement_date: date })}
              slotProps={{ textField: { fullWidth: true, required: true } }}
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Explain why you worked on this day..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Replacement Request</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Rejection Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            required
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleReject} variant="contained" color="error" disabled={!rejectReason}>
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ReplacementLeave;