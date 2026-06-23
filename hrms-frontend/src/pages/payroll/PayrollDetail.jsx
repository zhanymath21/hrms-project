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

const formatCurrency = (amount, currency = 'KHR') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return currency === 'USD' ? '$0.00' : '៛0';
  }
  
  const symbols = {
    USD: '$',
    KHR: '៛',
  };
  
  const decimals = {
    USD: 2,
    KHR: 0,
  };
  
  const symbol = symbols[currency] || currency;
  const decimal = decimals[currency] || 0;
  
  return symbol + Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: decimal,
    maximumFractionDigits: decimal,
  });
};

const PayrollDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payroll, setPayroll] = useState(null);
  const [items, setItems] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);

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

  const getCurrency = () => {
    return payroll?.currency || 'KHR';
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
  const currency = getCurrency();

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
          <Chip 
            label={currency === 'USD' ? 'USD' : 'KHR'} 
            size="small"
            color={currency === 'USD' ? 'primary' : 'default'}
          />
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
                {formatCurrency(payroll.total_gross, currency)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="textSecondary">Total Deductions</Typography>
              <Typography variant="h5" fontWeight="bold" color="error.main">
                {formatCurrency(payroll.total_deductions, currency)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="textSecondary">Total Net Pay</Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {formatCurrency(payroll.total_net, currency)}
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
            <Typography variant="caption" color="textSecondary">Currency</Typography>
            <Typography variant="body1">
              {currency === 'USD' ? 'USD ($)' : 'KHR (៛)'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary">Created By</Typography>
            <Typography variant="body1">
              {payroll.created_by?.first_name} {payroll.created_by?.last_name}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary">Created At</Typography>
            <Typography variant="body1">
              {formatDate(payroll.created_at, 'dd/MM/yyyy HH:mm')}
            </Typography>
          </Grid>
          {payroll.approved_by && (
            <>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">Approved By</Typography>
                <Typography variant="body1">
                  {payroll.approved_by?.first_name} {payroll.approved_by?.last_name}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">Approved At</Typography>
                <Typography variant="body1">
                  {formatDate(payroll.approved_at, 'dd/MM/yyyy HH:mm')}
                </Typography>
              </Grid>
            </>
          )}
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
                <TableCell align="right">Basic Salary</TableCell>
                <TableCell align="right">Allowance</TableCell>
                <TableCell align="right">Total Earnings</TableCell>
                <TableCell align="right">Tax</TableCell>
                <TableCell align="right">NSSF</TableCell>
                <TableCell align="right">Total Deductions</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Net Pay</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
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
                    <TableCell align="right">{formatCurrency(item.basic_salary, currency)}</TableCell>
                    <TableCell align="right">{formatCurrency(item.allowance, currency)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'medium' }}>
                      {formatCurrency(item.total_earnings, currency)}
                    </TableCell>
                    <TableCell align="right">{formatCurrency(item.tax, currency)}</TableCell>
                    <TableCell align="right">{formatCurrency(item.social_security, currency)}</TableCell>
                    <TableCell align="right">{formatCurrency(item.total_deductions, currency)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {formatCurrency(item.net_pay, currency)}
                    </TableCell>
                  </TableRow>
                ))
              )}
              {items.length > 0 && (
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>
                    Total
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(calculateTotal('total_earnings'), currency)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(calculateTotal('tax'), currency)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(calculateTotal('social_security'), currency)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(calculateTotal('total_deductions'), currency)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                    {formatCurrency(calculateTotal('net_pay'), currency)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default PayrollDetail;