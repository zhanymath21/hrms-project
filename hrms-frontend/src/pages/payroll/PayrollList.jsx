// src/pages/payroll/PayrollList.jsx
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
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Stack,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/axios';
import { formatDate } from '../../utils/dateFormat';

// Status Configuration
const STATUS_CONFIG = {
  draft: { label: 'Draft', bgColor: '#6b7280', textColor: '#ffffff' },
  processing: { label: 'Processing', bgColor: '#3b82f6', textColor: '#ffffff' },
  approved: { label: 'Approved', bgColor: '#10b981', textColor: '#ffffff' },
  paid: { label: 'Paid', bgColor: '#8b5cf6', textColor: '#ffffff' },
  cancelled: { label: 'Cancelled', bgColor: '#ef4444', textColor: '#ffffff' },
};

const ADMIN_ROLES = [
  'admin', 'hr', 'hr-manager', 'super_admin',
  'HR Manager', 'HR Officer', 'HR Assistant',
  'System Admin', 'IT Manager', 'Finance Manager',
  'Marketing Manager', 'Sales Manager', 'Operations Manager', 'Manager',
];

const PayrollList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [payrolls, setPayrolls] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, name: '' });

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = currentUser?.role || '';
  const isAdmin = ADMIN_ROLES.includes(userRole);

  useEffect(() => {
    fetchPayrolls();
    fetchStats();
  }, [filters]);

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.year) params.year = filters.year;
      if (filters.month) params.month = filters.month;
      if (filters.search) params.search = filters.search;
      
      const response = await api.get('/payroll', { params });
      
      let data = [];
      if (response.data?.status === 'success') {
        if (response.data.data?.data && Array.isArray(response.data.data.data)) {
          data = response.data.data.data;
        } else if (Array.isArray(response.data.data)) {
          data = response.data.data;
        }
      }
      
      setPayrolls(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.message || 'Failed to fetch payroll data');
      setPayrolls([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/payroll/stats');
      if (response.data?.status === 'success') {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/payroll/${deleteDialog.id}`);
      setDeleteDialog({ open: false, id: null, name: '' });
      await fetchPayrolls();
      await fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleStatusChange = async (id, status) => {
    if (!window.confirm(`Are you sure you want to change status to ${STATUS_CONFIG[status]?.label}?`)) return;
    
    try {
      await api.put(`/payroll/${id}/status`, { status });
      await fetchPayrolls();
      await fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('km-KH', {
      style: 'currency',
      currency: 'KHR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            💰 Payroll
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage employee payroll and salary processing
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/payroll/create')}
          >
            Create Payroll
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchPayrolls}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="textSecondary">Total Payroll</Typography>
                <Typography variant="h5" fontWeight="bold">{stats.total || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="textSecondary">Total Gross</Typography>
                <Typography variant="h5" fontWeight="bold" color="primary.main">
                  {formatCurrency(stats.total_gross || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="textSecondary">Total Net Pay</Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  {formatCurrency(stats.total_net || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="textSecondary">Total Tax</Typography>
                <Typography variant="h5" fontWeight="bold" color="error.main">
                  {formatCurrency(stats.total_tax || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="Search"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search payroll..."
              InputProps={{
                endAdornment: (
                  <IconButton size="small" onClick={fetchPayrolls}>
                    <SearchIcon />
                  </IconButton>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                label="Status"
              >
                <MenuItem value="">All Statuses</MenuItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <MenuItem key={key} value={key}>{config.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Year"
              name="year"
              value={filters.year}
              onChange={handleFilterChange}
              InputProps={{ inputProps: { min: 2000, max: 2100 } }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Month</InputLabel>
              <Select
                name="month"
                value={filters.month}
                onChange={handleFilterChange}
                label="Month"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <MenuItem key={month} value={month}>{getMonthName(month)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Error */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Period</TableCell>
              <TableCell>Employees</TableCell>
              <TableCell>Gross Pay</TableCell>
              <TableCell>Total Tax</TableCell>
              <TableCell>Net Pay</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Payment Date</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : payrolls.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="textSecondary">No payroll records found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              payrolls.map((payroll) => (
                <TableRow key={payroll.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {payroll.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {formatDate(payroll.start_date)} - {formatDate(payroll.end_date)}
                    </Typography>
                  </TableCell>
                  <TableCell>{payroll.total_employees || 0}</TableCell>
                  <TableCell>{formatCurrency(payroll.total_gross)}</TableCell>
                  <TableCell>{formatCurrency(payroll.total_tax)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                      {formatCurrency(payroll.total_net)}
                    </Typography>
                  </TableCell>
                  <TableCell>{renderStatusChip(payroll.status)}</TableCell>
                  <TableCell>
                    {payroll.payment_date ? formatDate(payroll.payment_date) : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => navigate(`/payroll/${payroll.id}`)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {payroll.status === 'draft' && (
                      <>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => navigate(`/payroll/${payroll.id}/edit`)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteDialog({ open: true, id: payroll.id, name: payroll.name })}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    {payroll.status === 'draft' && (
                      <Tooltip title="Process Payroll">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleStatusChange(payroll.id, 'processing')}
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {payroll.status === 'processing' && (
                      <Tooltip title="Approve Payroll">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleStatusChange(payroll.id, 'approved')}
                          disabled={!isAdmin}
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {payroll.status === 'approved' && (
                      <Tooltip title="Mark as Paid">
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={() => handleStatusChange(payroll.id, 'paid')}
                          disabled={!isAdmin}
                        >
                          <ReceiptIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {payroll.status === 'paid' && (
                      <Tooltip title="Print Report">
                        <IconButton size="small" color="info">
                          <PrintIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, name: '' })}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete payroll period "{deleteDialog.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null, name: '' })}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PayrollList;