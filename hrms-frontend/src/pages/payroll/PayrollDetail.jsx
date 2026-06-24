// src/pages/payroll/PayrollDetail.jsx
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Receipt as ReceiptIcon,
  Adjust as AdjustIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/axios';
import { formatDate } from '../../utils/dateFormat';

const STATUS_CONFIG = {
  draft: { label: 'Draft', bgColor: '#6b7280', textColor: '#ffffff', icon: <PendingIcon /> },
  processing: { label: 'Processing', bgColor: '#3b82f6', textColor: '#ffffff', icon: <PendingIcon /> },
  approved: { label: 'Approved', bgColor: '#10b981', textColor: '#ffffff', icon: <CheckCircleIcon /> },
  paid: { label: 'Paid', bgColor: '#8b5cf6', textColor: '#ffffff', icon: <CheckCircleIcon /> },
  cancelled: { label: 'Cancelled', bgColor: '#ef4444', textColor: '#ffffff', icon: <CancelIcon /> },
};

const ADMIN_ROLES = [
  'admin', 'hr', 'hr-manager', 'super_admin',
  'HR Manager', 'HR Officer', 'HR Assistant',
  'System Admin', 'IT Manager', 'Finance Manager',
  'Marketing Manager', 'Sales Manager', 'Operations Manager', 'Manager',
];

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }
  return '$' + Number(amount).toFixed(2);
};

const PayrollDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payroll, setPayroll] = useState(null);
  const [items, setItems] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [adjustmentModal, setAdjustmentModal] = useState({ open: false, item: null });

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = currentUser?.role || '';
  const isAdmin = ADMIN_ROLES.includes(userRole);

  useEffect(() => {
    fetchPayroll();
  }, [id]);

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/payroll/${id}`);

      if (response.data?.status === 'success') {
        const data = response.data.data;
        setPayroll(data);
        setItems(data.items || []);
      } else {
        setError('Payroll not found');
      }
    } catch (err) {
      console.error('Error fetching payroll:', err);
      setError(err.response?.data?.message || 'Failed to fetch payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this payroll?')) return;
    
    try {
      await api.delete(`/payroll/${id}`);
      navigate('/payroll');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleStatusChange = async (status) => {
    if (!window.confirm(`Are you sure you want to change status to ${STATUS_CONFIG[status]?.label}?`)) return;
    
    try {
      setUpdating(true);
      await api.put(`/payroll/${id}/status`, { status });
      await fetchPayroll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenAdjustment = (item) => {
    setAdjustmentModal({ open: true, item });
  };

  const handleCloseAdjustment = () => {
    setAdjustmentModal({ open: false, item: null });
  };

  const handleApplyAdjustment = async (data) => {
    try {
      setUpdating(true);
      await api.post(`/payroll-adjustments/${adjustmentModal.item.id}/adjust`, data);
      await fetchPayroll();
      handleCloseAdjustment();
    } catch (err) {
      console.error('Error applying adjustment:', err);
      alert(err.response?.data?.message || 'Failed to apply adjustment');
    } finally {
      setUpdating(false);
    }
  };

  const handleClearAdjustment = async () => {
    if (!window.confirm('Clear all manual adjustments? This will revert to original values.')) return;
    
    try {
      setUpdating(true);
      await api.post(`/payroll-adjustments/${adjustmentModal.item.id}/clear`);
      await fetchPayroll();
      handleCloseAdjustment();
    } catch (err) {
      console.error('Error clearing adjustment:', err);
      alert(err.response?.data?.message || 'Failed to clear adjustment');
    } finally {
      setUpdating(false);
    }
  };

  const calculateTotal = (field) => {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, item) => sum + (parseFloat(item[field]) || 0), 0);
  };

  const renderStatusChip = (status) => {
    const config = STATUS_CONFIG[status];
    if (!config) return <Chip label={status || 'Unknown'} size="medium" />;
    return (
      <Chip
        label={config.label}
        size="medium"
        icon={config.icon}
        sx={{
          backgroundColor: config.bgColor,
          color: config.textColor,
          fontWeight: 600,
          '& .MuiChip-icon': { color: config.textColor },
        }}
      />
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !payroll) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Payroll not found'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/payroll')}>
          Back to Payroll
        </Button>
      </Box>
    );
  }

  const isFinalStatus = ['approved', 'paid', 'cancelled'].includes(payroll.status);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <IconButton onClick={() => navigate('/payroll')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" fontWeight="bold">
            {payroll.name}
          </Typography>
          {renderStatusChip(payroll.status)}
          <Chip label="USD" size="small" color="primary" />
        </Box>

        <Box display="flex" gap={1} flexWrap="wrap">
          <Button
            variant="contained"
            color="info"
            startIcon={<ReceiptIcon />}
            onClick={() => navigate(`/payslips/${payroll.id}`)}
          >
            Payslips
          </Button>
          {payroll.status === 'draft' && (
            <>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/payroll/${id}/edit`)}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
              >
                Delete
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<CheckCircleIcon />}
                onClick={() => handleStatusChange('processing')}
                disabled={updating}
              >
                Process
              </Button>
            </>
          )}
          {payroll.status === 'processing' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={() => handleStatusChange('approved')}
              disabled={!isAdmin || updating}
            >
              Approve
            </Button>
          )}
          {payroll.status === 'approved' && (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<ReceiptIcon />}
              onClick={() => handleStatusChange('paid')}
              disabled={!isAdmin || updating}
            >
              Mark as Paid
            </Button>
          )}
          {(payroll.status === 'paid' || payroll.status === 'approved') && (
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
            >
              Export
            </Button>
          )}
          {payroll.status === 'paid' && (
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
            >
              Print Report
            </Button>
          )}
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="textSecondary">Total Employees</Typography>
              <Typography variant="h5" fontWeight="bold">{payroll.total_employees || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="textSecondary">Total Gross</Typography>
              <Typography variant="h5" fontWeight="bold" color="primary.main">
                {formatCurrency(payroll.total_gross)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="textSecondary">Total Deductions</Typography>
              <Typography variant="h5" fontWeight="bold" color="error.main">
                {formatCurrency(payroll.total_deductions)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="textSecondary">Total Net Pay</Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {formatCurrency(payroll.total_net)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Payroll Details
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary">Period</Typography>
            <Typography variant="body1">
              {formatDate(payroll.start_date)} - {formatDate(payroll.end_date)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary">Payment Date</Typography>
            <Typography variant="body1">
              {payroll.payment_date ? formatDate(payroll.payment_date) : 'Not set'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary">Payroll Type</Typography>
            <Typography variant="body1">
              {payroll.payroll_type === 'semi_monthly' ? 'Semi-Monthly' : 
               payroll.payroll_type === 'monthly' ? 'Monthly' : 'Weekly'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary">Created By</Typography>
            <Typography variant="body1">
              {payroll.created_by?.first_name} {payroll.created_by?.last_name}
            </Typography>
          </Grid>
          {payroll.notes && (
            <Grid item xs={12}>
              <Typography variant="caption" color="textSecondary">Notes</Typography>
              <Typography variant="body2">{payroll.notes}</Typography>
            </Grid>
          )}
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="bold">
            Employee Payroll ({items.length})
          </Typography>
          {payroll.status === 'draft' && (
            <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/payroll/${id}/edit`)}>
              Edit Items
            </Button>
          )}
        </Box>
        <Divider sx={{ mb: 2 }} />

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell align="center">Days</TableCell>
                <TableCell align="center">Present</TableCell>
                <TableCell align="center">Absent</TableCell>
                <TableCell align="center">Leave</TableCell>
                <TableCell align="right">Basic Salary</TableCell>
                <TableCell align="right">Allowance</TableCell>
                <TableCell align="right">Total Earnings</TableCell>
                <TableCell align="right">Tax</TableCell>
                <TableCell align="right">NSSF</TableCell>
                <TableCell align="right">Net Pay</TableCell>
                <TableCell align="center">Adjustment</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} align="center">
                    <Typography color="textSecondary">No payroll items found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: '#6366f1', fontSize: 12 }}>
                          {item.employee?.first_name?.[0]}{item.employee?.last_name?.[0]}
                        </Avatar>
                        <Typography variant="body2">
                          {item.employee?.first_name} {item.employee?.last_name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">{item.working_days || 0}</TableCell>
                    <TableCell align="center">
                      <Typography color="success.main">{item.effective_present_days || 0}</Typography>
                      {item.override_present_days !== null && (
                        <Tooltip title="Overridden">
                          <Chip label="Adj" size="small" color="warning" sx={{ ml: 0.5, height: 16, fontSize: '0.6rem' }} />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Typography color="error.main">{item.effective_absent_days || 0}</Typography>
                      {item.override_absent_days !== null && (
                        <Tooltip title="Overridden">
                          <Chip label="Adj" size="small" color="warning" sx={{ ml: 0.5, height: 16, fontSize: '0.6rem' }} />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Typography color="warning.main">{item.effective_leave_days || 0}</Typography>
                      {item.override_leave_days !== null && (
                        <Tooltip title="Overridden">
                          <Chip label="Adj" size="small" color="warning" sx={{ ml: 0.5, height: 16, fontSize: '0.6rem' }} />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell align="right">{formatCurrency(item.basic_salary)}</TableCell>
                    <TableCell align="right">{formatCurrency(item.allowance)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'medium' }}>
                      {formatCurrency(item.total_earnings)}
                    </TableCell>
                    <TableCell align="right">{formatCurrency(item.tax)}</TableCell>
                    <TableCell align="right">{formatCurrency(item.social_security)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {formatCurrency(item.net_pay)}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Manual Adjustment">
                        <span>
                          <IconButton
                            size="small"
                            color={item.is_manual_adjusted ? 'warning' : 'default'}
                            onClick={() => handleOpenAdjustment(item)}
                            disabled={payroll.status === 'paid' || payroll.status === 'cancelled'}
                          >
                            <AdjustIcon fontSize="small" />
                          </IconButton>
                          {item.is_manual_adjusted && (
                            <Chip label="Adj" size="small" color="warning" sx={{ ml: 0.5, height: 16, fontSize: '0.6rem' }} />
                          )}
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {items.length > 0 && (
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell colSpan={6} align="right" sx={{ fontWeight: 'bold' }}>
                    Total
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(calculateTotal('total_earnings'))}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(calculateTotal('tax'))}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(calculateTotal('social_security'))}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                    {formatCurrency(calculateTotal('net_pay'))}
                  </TableCell>
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Adjustment Modal */}
      <Dialog open={adjustmentModal.open} onClose={handleCloseAdjustment} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Manual Payroll Adjustment</Typography>
            <IconButton onClick={handleCloseAdjustment}>
              <CancelIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {adjustmentModal.item && (
            <AdjustmentForm
              item={adjustmentModal.item}
              onSubmit={handleApplyAdjustment}
              onClear={handleClearAdjustment}
              onCancel={handleCloseAdjustment}
              saving={updating}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

// Adjustment Form Component
const AdjustmentForm = ({ item, onSubmit, onClear, onCancel, saving }) => {
  const [formData, setFormData] = useState({
    manual_adjustment_amount: item.manual_adjustment_amount || 0,
    manual_adjustment_reason: item.manual_adjustment_reason || '',
    override_present_days: item.override_present_days ?? item.present_days,
    override_absent_days: item.override_absent_days ?? item.absent_days,
    override_leave_days: item.override_leave_days ?? item.leave_days,
    override_notes: item.override_notes || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : parseFloat(value) || 0,
    }));
  };

  const handleTextChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!formData.manual_adjustment_reason || formData.manual_adjustment_reason.length < 5) {
      alert('Please provide a reason (minimum 5 characters)');
      return;
    }
    onSubmit(formData);
  };

  return (
    <Box>
      <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 1 }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="caption" color="textSecondary">Employee</Typography>
            <Typography variant="body1" fontWeight="medium">
              {item.employee?.first_name} {item.employee?.last_name}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="textSecondary">Current Net Pay</Typography>
            <Typography variant="body1" fontWeight="bold" color="success.main">
              {formatCurrency(item.net_pay)}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="textSecondary">Present</Typography>
            <Typography variant="body2">{item.present_days || 0} days</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="textSecondary">Absent</Typography>
            <Typography variant="body2">{item.absent_days || 0} days</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="textSecondary">Leave</Typography>
            <Typography variant="body2">{item.leave_days || 0} days</Typography>
          </Grid>
        </Grid>
      </Box>

      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
        Attendance Override
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4}>
          <TextField
            fullWidth
            type="number"
            label="Present Days"
            name="override_present_days"
            value={formData.override_present_days ?? ''}
            onChange={handleChange}
            InputProps={{ inputProps: { min: 0 } }}
            helperText={`Original: ${item.present_days || 0}`}
          />
        </Grid>
        <Grid item xs={4}>
          <TextField
            fullWidth
            type="number"
            label="Absent Days"
            name="override_absent_days"
            value={formData.override_absent_days ?? ''}
            onChange={handleChange}
            InputProps={{ inputProps: { min: 0 } }}
            helperText={`Original: ${item.absent_days || 0}`}
          />
        </Grid>
        <Grid item xs={4}>
          <TextField
            fullWidth
            type="number"
            label="Leave Days"
            name="override_leave_days"
            value={formData.override_leave_days ?? ''}
            onChange={handleChange}
            InputProps={{ inputProps: { min: 0 } }}
            helperText={`Original: ${item.leave_days || 0}`}
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
        Salary Adjustment
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            type="number"
            label="Adjustment Amount (USD)"
            name="manual_adjustment_amount"
            value={formData.manual_adjustment_amount}
            onChange={handleChange}
            InputProps={{ 
              inputProps: { step: 0.01 },
              startAdornment: <Typography>$</Typography>,
            }}
            helperText="Positive for bonus/extra, negative for deduction"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Reason for Adjustment *"
            name="manual_adjustment_reason"
            value={formData.manual_adjustment_reason}
            onChange={handleTextChange}
            required
            multiline
            rows={2}
            placeholder="Explain why this adjustment is needed..."
            helperText="Minimum 5 characters"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Additional Notes"
            name="override_notes"
            value={formData.override_notes}
            onChange={handleTextChange}
            multiline
            rows={2}
            placeholder="Any additional notes..."
          />
        </Grid>
      </Grid>

      {item.is_manual_adjusted && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Previously Adjusted:</strong> {formatCurrency(item.manual_adjustment_amount)} 
            ({item.manual_adjustment_reason})
          </Typography>
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        <Button onClick={onCancel} disabled={saving}>Cancel</Button>
        {item.is_manual_adjusted && (
          <Button onClick={onClear} color="error" disabled={saving}>
            Clear Adjustment
          </Button>
        )}
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !formData.manual_adjustment_reason}
        >
          {saving ? 'Saving...' : 'Apply Adjustment'}
        </Button>
      </Box>
    </Box>
  );
};

export default PayrollDetail;