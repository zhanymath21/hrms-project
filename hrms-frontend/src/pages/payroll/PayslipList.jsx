// src/pages/payroll/PayslipList.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/axios';
import { formatDate } from '../../utils/dateFormat';

const STATUS_CONFIG = {
  draft: { label: 'Draft', bgColor: '#6b7280', textColor: '#ffffff' },
  generated: { label: 'Generated', bgColor: '#3b82f6', textColor: '#ffffff' },
  sent: { label: 'Sent', bgColor: '#10b981', textColor: '#ffffff' },
  printed: { label: 'Printed', bgColor: '#8b5cf6', textColor: '#ffffff' },
};

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }
  return '$' + Number(amount).toFixed(2);
};

const PayslipList = () => {
  const { payrollId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [payroll, setPayroll] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [detailDialog, setDetailDialog] = useState(false);

  useEffect(() => {
    if (payrollId) {
      fetchPayroll();
      fetchPayslips();
    }
  }, [payrollId]);

  const fetchPayroll = async () => {
    try {
      const response = await api.get(`/payroll/${payrollId}`);
      if (response.data?.status === 'success') {
        setPayroll(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching payroll:', err);
    }
  };

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/payslips?payroll_period_id=${payrollId}`);
      if (response.data?.status === 'success') {
        setPayslips(response.data.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching payslips:', err);
      setError('Failed to fetch payslips');
    } finally {
      setLoading(false);
    }
  };

  const generatePayslips = async () => {
    if (!window.confirm('Generate payslips for this payroll period?')) return;
    
    try {
      setGenerating(true);
      const response = await api.post(`/payslips/generate/${payrollId}`);
      if (response.data?.status === 'success') {
        await fetchPayslips();
        alert(`✅ ${response.data.data.total} payslips generated successfully!`);
      }
    } catch (err) {
      console.error('Error generating payslips:', err);
      setError(err.response?.data?.message || 'Failed to generate payslips');
    } finally {
      setGenerating(false);
    }
  };

  const viewPayslip = async (id) => {
    try {
      const response = await api.get(`/payslips/${id}`);
      if (response.data?.status === 'success') {
        setSelectedPayslip(response.data.data);
        setDetailDialog(true);
      }
    } catch (err) {
      console.error('Error fetching payslip:', err);
      alert('Failed to fetch payslip details');
    }
  };

  const deletePayslip = async (id) => {
    if (!window.confirm('Delete this payslip?')) return;
    
    try {
      await api.delete(`/payslips/${id}`);
      await fetchPayslips();
    } catch (err) {
      console.error('Error deleting payslip:', err);
      alert('Failed to delete payslip');
    }
  };

  const renderStatusChip = (status) => {
    const config = STATUS_CONFIG[status];
    if (!config) return <Chip label={status || 'Unknown'} size="small" />;
    return (
      <Chip
        label={config.label}
        size="small"
        sx={{
          backgroundColor: config.bgColor,
          color: config.textColor,
          fontWeight: 600,
        }}
      />
    );
  };

  const calculateTotalAllowances = (payslip) => {
    return (payslip.housing_allowance || 0) +
           (payslip.transport_allowance || 0) +
           (payslip.meal_allowance || 0) +
           (payslip.phone_allowance || 0) +
           (payslip.other_allowance || 0);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            📄 Payslips (USD)
          </Typography>
          {payroll && (
            <Typography variant="body2" color="textSecondary">
              {payroll.name} - {formatDate(payroll.start_date)} to {formatDate(payroll.end_date)}
            </Typography>
          )}
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            startIcon={<ReceiptIcon />}
            onClick={generatePayslips}
            disabled={generating || payslips.length > 0}
          >
            {generating ? 'Generating...' : 'Generate Payslips'}
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchPayslips}>
            Refresh
          </Button>
          <Button variant="outlined" onClick={() => navigate('/payroll')}>
            Back to Payroll
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {payslips.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <Typography variant="caption" color="textSecondary">Total Payslips</Typography>
              <Typography variant="h6">{payslips.length}</Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="caption" color="textSecondary">Total Net Pay</Typography>
              <Typography variant="h6" color="success.main">
                {formatCurrency(payslips.reduce((sum, p) => sum + (p.net_pay || 0), 0))}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="caption" color="textSecondary">Total Tax</Typography>
              <Typography variant="h6" color="error.main">
                {formatCurrency(payslips.reduce((sum, p) => sum + (p.tax || 0), 0))}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="caption" color="textSecondary">Status</Typography>
              <Typography variant="h6">
                {payslips.filter(p => p.status === 'generated').length} Generated
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Position</TableCell>
              <TableCell>Period</TableCell>
              <TableCell align="right">Basic Salary</TableCell>
              <TableCell align="right">Allowances</TableCell>
              <TableCell align="right">Tax</TableCell>
              <TableCell align="right">Net Pay</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payslips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography color="textSecondary">
                    No payslips generated yet. Click "Generate Payslips" to create.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              payslips.map((payslip) => (
                <TableRow key={payslip.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {payslip.employee_name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {payslip.employee_code || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>{payslip.position || '-'}</TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {formatDate(payslip.period_start)}
                    </Typography>
                    <Typography variant="caption" display="block" color="textSecondary">
                      to {formatDate(payslip.period_end)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{formatCurrency(payslip.basic_salary)}</TableCell>
                  <TableCell align="right">{formatCurrency(calculateTotalAllowances(payslip))}</TableCell>
                  <TableCell align="right">{formatCurrency(payslip.tax)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                    {formatCurrency(payslip.net_pay)}
                  </TableCell>
                  <TableCell>{renderStatusChip(payslip.status)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => viewPayslip(payslip.id)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => deletePayslip(payslip.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Payslip Detail Dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Payslip - {selectedPayslip?.employee_name}
          <IconButton
            sx={{ position: 'absolute', right: 8, top: 8 }}
            onClick={() => setDetailDialog(false)}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedPayslip && (
            <Box>
              <Grid container spacing={2} mb={3}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">Employee</Typography>
                  <Typography variant="body1" fontWeight="medium">{selectedPayslip.employee_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">Position</Typography>
                  <Typography variant="body1">{selectedPayslip.position || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">Department</Typography>
                  <Typography variant="body1">{selectedPayslip.department || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">Period</Typography>
                  <Typography variant="body1">
                    {formatDate(selectedPayslip.period_start)} - {formatDate(selectedPayslip.period_end)}
                  </Typography>
                </Grid>
              </Grid>

              <Typography variant="h6" fontWeight="bold" gutterBottom>Earnings</Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>Basic Salary</TableCell>
                    <TableCell align="right">{formatCurrency(selectedPayslip.basic_salary)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Housing Allowance</TableCell>
                    <TableCell align="right">{formatCurrency(selectedPayslip.housing_allowance)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Transport Allowance</TableCell>
                    <TableCell align="right">{formatCurrency(selectedPayslip.transport_allowance)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Meal Allowance</TableCell>
                    <TableCell align="right">{formatCurrency(selectedPayslip.meal_allowance)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Phone Allowance</TableCell>
                    <TableCell align="right">{formatCurrency(selectedPayslip.phone_allowance)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Other Allowance</TableCell>
                    <TableCell align="right">{formatCurrency(selectedPayslip.other_allowance)}</TableCell>
                  </TableRow>
                  <TableRow sx={{ fontWeight: 'bold' }}>
                    <TableCell>Total Earnings</TableCell>
                    <TableCell align="right">{formatCurrency(selectedPayslip.total_earnings)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 3 }}>Deductions</Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>Tax</TableCell>
                    <TableCell align="right">{formatCurrency(selectedPayslip.tax)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Social Security (NSSF)</TableCell>
                    <TableCell align="right">{formatCurrency(selectedPayslip.social_security)}</TableCell>
                  </TableRow>
                  <TableRow sx={{ fontWeight: 'bold' }}>
                    <TableCell>Total Deductions</TableCell>
                    <TableCell align="right">{formatCurrency(selectedPayslip.total_deductions)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Box sx={{ mt: 3, p: 2, bgcolor: '#f0fdf4', borderRadius: 1, border: '1px solid #86efac' }}>
                <Grid container justifyContent="space-between">
                  <Typography variant="h6" fontWeight="bold">Net Pay</Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    {formatCurrency(selectedPayslip.net_pay)}
                  </Typography>
                </Grid>
              </Box>

              <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 2 }}>
                Working Days: {selectedPayslip.working_days || 0} | 
                Present: {selectedPayslip.present_days || 0} | 
                Absent: {selectedPayslip.absent_days || 0} | 
                Leave: {selectedPayslip.leave_days || 0}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>Close</Button>
          <Button variant="outlined" startIcon={<PrintIcon />}>Print</Button>
          <Button variant="contained" startIcon={<DownloadIcon />}>Download PDF</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PayslipList;