// src/pages/payroll/EmployeeSalarySettings.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Divider,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
} from '@mui/material';
import {
  Save as SaveIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/axios';

// Format Currency Function
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }
  return '$' + Number(amount).toFixed(2);
};

const EmployeeSalarySettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [settings, setSettings] = useState({
    employee_id: '',
    basic_salary: '',
    housing_allowance: '',
    transport_allowance: '',
    meal_allowance: '',
    phone_allowance: '',
    other_allowance: '',
    dependents: 0,
    is_tax_exempt: false,
    payment_method: 'bank_transfer',
    bank_name: '',
    bank_account_number: '',
    bank_account_name: '',
    currency: 'USD',
    working_days_per_month: 22,
    working_days_type: 'standard',
    include_weekends: false,
  });
  const [historyDialog, setHistoryDialog] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      fetchSalarySettings(selectedEmployee);
    } else {
      resetForm();
    }
  }, [selectedEmployee]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.get('/employees', { params: { per_page: 100 } });
      let data = [];
      if (response.data?.status === 'success') {
        if (response.data.data?.data && Array.isArray(response.data.data.data)) {
          data = response.data.data.data;
        } else if (Array.isArray(response.data.data)) {
          data = response.data.data;
        }
      }
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchSalarySettings = async (employeeId) => {
    try {
      const response = await api.get(`/employee-salary-settings/${employeeId}`);
      if (response.data?.status === 'success') {
        const data = response.data.data;
        setSettings({
          employee_id: data.employee_id || employeeId,
          basic_salary: data.basic_salary || '',
          housing_allowance: data.housing_allowance || '',
          transport_allowance: data.transport_allowance || '',
          meal_allowance: data.meal_allowance || '',
          phone_allowance: data.phone_allowance || '',
          other_allowance: data.other_allowance || '',
          dependents: data.dependents || 0,
          is_tax_exempt: data.is_tax_exempt || false,
          payment_method: data.payment_method || 'bank_transfer',
          bank_name: data.bank_name || '',
          bank_account_number: data.bank_account_number || '',
          bank_account_name: data.bank_account_name || '',
          currency: data.currency || 'USD',
          working_days_per_month: data.working_days_per_month || 22,
          working_days_type: data.working_days_type || 'standard',
          include_weekends: data.include_weekends || false,
        });
      }
    } catch (err) {
      if (err.response?.status === 404) {
        // No settings found, use defaults
        resetForm(employeeId);
      } else {
        console.error('Error fetching salary settings:', err);
        setError('Failed to fetch salary settings');
      }
    }
  };

  const fetchHistory = async (employeeId) => {
    try {
      setLoadingHistory(true);
      const response = await api.get(`/payroll-adjustments/employee/${employeeId}/history`);
      if (response.data?.status === 'success') {
        setHistoryData(response.data.data || []);
        setHistoryDialog(true);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
      setError('Failed to fetch adjustment history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const resetForm = (employeeId = null) => {
    setSettings({
      employee_id: employeeId || '',
      basic_salary: '',
      housing_allowance: '',
      transport_allowance: '',
      meal_allowance: '',
      phone_allowance: '',
      other_allowance: '',
      dependents: 0,
      is_tax_exempt: false,
      payment_method: 'bank_transfer',
      bank_name: '',
      bank_account_number: '',
      bank_account_name: '',
      currency: 'USD',
      working_days_per_month: 22,
      working_days_type: 'standard',
      include_weekends: false,
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (e) => {
    const { name, checked } = e.target;
    setSettings(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const submitData = {
        ...settings,
        basic_salary: parseFloat(settings.basic_salary) || 0,
        housing_allowance: parseFloat(settings.housing_allowance) || 0,
        transport_allowance: parseFloat(settings.transport_allowance) || 0,
        meal_allowance: parseFloat(settings.meal_allowance) || 0,
        phone_allowance: parseFloat(settings.phone_allowance) || 0,
        other_allowance: parseFloat(settings.other_allowance) || 0,
        dependents: parseInt(settings.dependents) || 0,
        working_days_per_month: parseInt(settings.working_days_per_month) || 22,
      };

      const response = await api.post('/employee-salary-settings', submitData);
      
      if (response.data?.status === 'success') {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        // Refresh data
        await fetchSalarySettings(selectedEmployee);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    setSelectedEmployee(employeeId);
    setError(null);
    setSuccess(false);
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(e => e.id === parseInt(employeeId));
    return employee ? `${employee.first_name} ${employee.last_name}` : '';
  };

  const getEmployeePosition = (employeeId) => {
    const employee = employees.find(e => e.id === parseInt(employeeId));
    return employee?.position?.title || 'No Position';
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
            💰 Employee Salary Settings
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Configure salary components, allowances, and working days for each employee
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={() => selectedEmployee && fetchSalarySettings(selectedEmployee)}
            disabled={!selectedEmployee}
          >
            Refresh
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<HistoryIcon />} 
            onClick={() => selectedEmployee && fetchHistory(selectedEmployee)}
            disabled={!selectedEmployee}
          >
            History
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          ✅ Salary settings saved successfully!
        </Alert>
      )}

      {/* Employee Selection */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Select Employee
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <FormControl fullWidth>
              <InputLabel>Search Employee</InputLabel>
              <Select
                value={selectedEmployee}
                onChange={(e) => handleEmployeeSelect(e.target.value)}
                label="Search Employee"
              >
                <MenuItem value="">Select Employee</MenuItem>
                {employees.map(emp => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} - {emp.position?.title || 'No Position'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            {selectedEmployee && (
              <Box display="flex" alignItems="center" gap={1}>
                <Chip 
                  label="Selected" 
                  color="success" 
                  size="small"
                  icon={<CheckCircleIcon />}
                />
                <Typography variant="body2" color="textSecondary">
                  {getEmployeeName(selectedEmployee)}
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Salary Settings Form */}
      {selectedEmployee && (
        <Paper sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            {/* Employee Info */}
            <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: '#6366f1' }}>
                      {getEmployeeName(selectedEmployee).charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="medium">
                        {getEmployeeName(selectedEmployee)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {getEmployeePosition(selectedEmployee)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box textAlign="right">
                    <Typography variant="caption" color="textSecondary">Status</Typography>
                    <Chip 
                      label={settings.basic_salary ? 'Configured' : 'Not Configured'} 
                      color={settings.basic_salary ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                </Grid>
              </Grid>
            </Box>

            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Salary Components (USD)
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              {/* Basic Salary */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Basic Salary *"
                  name="basic_salary"
                  value={settings.basic_salary}
                  onChange={handleChange}
                  required
                  disabled={saving}
                  InputProps={{ 
                    inputProps: { min: 0, step: 0.01 },
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                  }}
                  helperText="Monthly basic salary in USD"
                />
              </Grid>

              {/* Housing Allowance */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Housing Allowance"
                  name="housing_allowance"
                  value={settings.housing_allowance}
                  onChange={handleChange}
                  disabled={saving}
                  InputProps={{ 
                    inputProps: { min: 0, step: 0.01 },
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                  }}
                  helperText="Monthly housing allowance"
                />
              </Grid>

              {/* Transport Allowance */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Transport Allowance"
                  name="transport_allowance"
                  value={settings.transport_allowance}
                  onChange={handleChange}
                  disabled={saving}
                  InputProps={{ 
                    inputProps: { min: 0, step: 0.01 },
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                  }}
                  helperText="Monthly transport allowance"
                />
              </Grid>

              {/* Meal Allowance */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Meal Allowance"
                  name="meal_allowance"
                  value={settings.meal_allowance}
                  onChange={handleChange}
                  disabled={saving}
                  InputProps={{ 
                    inputProps: { min: 0, step: 0.01 },
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                  }}
                  helperText="Monthly meal allowance"
                />
              </Grid>

              {/* Phone Allowance */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Phone Allowance"
                  name="phone_allowance"
                  value={settings.phone_allowance}
                  onChange={handleChange}
                  disabled={saving}
                  InputProps={{ 
                    inputProps: { min: 0, step: 0.01 },
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                  }}
                  helperText="Monthly phone allowance"
                />
              </Grid>

              {/* Other Allowance */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Other Allowance"
                  name="other_allowance"
                  value={settings.other_allowance}
                  onChange={handleChange}
                  disabled={saving}
                  InputProps={{ 
                    inputProps: { min: 0, step: 0.01 },
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                  }}
                  helperText="Any other allowances"
                />
              </Grid>
            </Grid>

            {/* Tax & Deduction Settings */}
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 4 }}>
              Tax & Deduction Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Number of Dependents"
                  name="dependents"
                  value={settings.dependents}
                  onChange={handleChange}
                  disabled={saving}
                  InputProps={{ inputProps: { min: 0, max: 20 } }}
                  helperText="Number of dependents for tax calculation"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      name="is_tax_exempt"
                      checked={settings.is_tax_exempt}
                      onChange={handleSwitchChange}
                      disabled={saving}
                    />
                  }
                  label="Tax Exempt"
                />
                <Typography variant="caption" color="textSecondary" display="block">
                  Check if employee is exempt from tax
                </Typography>
              </Grid>
            </Grid>

            {/* Working Days Settings */}
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 4 }}>
              Working Days Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Working Days per Month *"
                  name="working_days_per_month"
                  value={settings.working_days_per_month}
                  onChange={handleChange}
                  required
                  disabled={saving}
                  InputProps={{ inputProps: { min: 1, max: 31 } }}
                  helperText="e.g., 22 for office, 26 for shift workers"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Working Days Type</InputLabel>
                  <Select
                    name="working_days_type"
                    value={settings.working_days_type}
                    onChange={handleChange}
                    label="Working Days Type"
                    disabled={saving}
                  >
                    <MenuItem value="standard">Standard (Mon-Fri)</MenuItem>
                    <MenuItem value="shift">Shift Work</MenuItem>
                    <MenuItem value="flexible">Flexible</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      name="include_weekends"
                      checked={settings.include_weekends}
                      onChange={handleSwitchChange}
                      disabled={saving}
                    />
                  }
                  label="Include Weekends"
                />
                <Typography variant="caption" color="textSecondary" display="block">
                  Check if weekends are counted as working days
                </Typography>
              </Grid>
            </Grid>

            {/* Payment Settings */}
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 4 }}>
              Payment Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    name="payment_method"
                    value={settings.payment_method}
                    onChange={handleChange}
                    label="Payment Method"
                    disabled={saving}
                  >
                    <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="check">Check</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    name="currency"
                    value={settings.currency}
                    onChange={handleChange}
                    label="Currency"
                    disabled={saving}
                  >
                    <MenuItem value="USD">USD - Dollar</MenuItem>
                    <MenuItem value="KHR">KHR - Riel</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Bank Name"
                  name="bank_name"
                  value={settings.bank_name}
                  onChange={handleChange}
                  disabled={saving}
                  placeholder="e.g., ACLEDA Bank"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Bank Account Number"
                  name="bank_account_number"
                  value={settings.bank_account_number}
                  onChange={handleChange}
                  disabled={saving}
                  placeholder="Bank account number"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bank Account Name"
                  name="bank_account_name"
                  value={settings.bank_account_name}
                  onChange={handleChange}
                  disabled={saving}
                  placeholder="Account holder name"
                />
              </Grid>
            </Grid>

            {/* Salary Summary */}
            {settings.basic_salary && (
              <Box sx={{ mt: 4, p: 3, bgcolor: '#f0fdf4', borderRadius: 1, border: '1px solid #86efac' }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Salary Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="textSecondary">Basic Salary</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {formatCurrency(settings.basic_salary)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="textSecondary">Total Allowance</Typography>
                    <Typography variant="body1" fontWeight="bold" color="primary.main">
                      {formatCurrency(
                        (parseFloat(settings.housing_allowance) || 0) +
                        (parseFloat(settings.transport_allowance) || 0) +
                        (parseFloat(settings.meal_allowance) || 0) +
                        (parseFloat(settings.phone_allowance) || 0) +
                        (parseFloat(settings.other_allowance) || 0)
                      )}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="textSecondary">Total Salary</Typography>
                    <Typography variant="body1" fontWeight="bold" color="success.main">
                      {formatCurrency(
                        (parseFloat(settings.basic_salary) || 0) +
                        (parseFloat(settings.housing_allowance) || 0) +
                        (parseFloat(settings.transport_allowance) || 0) +
                        (parseFloat(settings.meal_allowance) || 0) +
                        (parseFloat(settings.phone_allowance) || 0) +
                        (parseFloat(settings.other_allowance) || 0)
                      )}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="textSecondary">Working Days</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {settings.working_days_per_month || 22} days/month
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
              <Button
                variant="outlined"
                onClick={() => resetForm(selectedEmployee)}
                disabled={saving}
              >
                Reset
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={saving || !settings.basic_salary}
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </Box>
          </form>
        </Paper>
      )}

      {/* History Dialog */}
      <Dialog open={historyDialog} onClose={() => setHistoryDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Adjustment History</Typography>
            <IconButton onClick={() => setHistoryDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {loadingHistory ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : historyData.length === 0 ? (
            <Box textAlign="center" py={3}>
              <Typography color="textSecondary">No adjustment history found</Typography>
            </Box>
          ) : (
            <Box>
              {historyData.map((item, index) => (
                <Card key={item.id || index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="caption" color="textSecondary">Payroll Period</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {item.payroll_period?.name || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="caption" color="textSecondary">Amount</Typography>
                        <Typography variant="body2" fontWeight="bold" color={item.manual_adjustment_amount >= 0 ? 'success.main' : 'error.main'}>
                          {formatCurrency(item.manual_adjustment_amount)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="textSecondary">Reason</Typography>
                        <Typography variant="body2">{item.manual_adjustment_reason || 'N/A'}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="textSecondary">Adjusted By</Typography>
                        <Typography variant="body2">
                          {item.manual_adjusted_by ? `${item.manual_adjusted_by.first_name} ${item.manual_adjusted_by.last_name}` : 'System'}
                          {item.manual_adjusted_at && ` at ${new Date(item.manual_adjusted_at).toLocaleString()}`}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeSalarySettings;