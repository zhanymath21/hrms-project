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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/axios';

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
    currency: 'KHR',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      fetchSalarySettings(selectedEmployee);
    }
  }, [selectedEmployee]);

  const fetchEmployees = async () => {
    try {
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
          currency: data.currency || 'KHR',
        });
      }
    } catch (err) {
      if (err.response?.status === 404) {
        // No settings found, use defaults
        setSettings({
          employee_id: employeeId,
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
          currency: 'KHR',
        });
      } else {
        console.error('Error fetching salary settings:', err);
      }
    }
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
      const response = await api.post('/employee-salary-settings', settings);
      if (response.data?.status === 'success') {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
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
      <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
        💰 Employee Salary Settings
      </Typography>
      <Typography variant="body2" color="textSecondary" mb={3}>
        Configure salary components for each employee
      </Typography>

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

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Select Employee</InputLabel>
              <Select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                label="Select Employee"
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
        </Grid>
      </Paper>

      {selectedEmployee && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <form onSubmit={handleSubmit}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Salary Components (KHR - Riel)
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
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
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Housing Allowance"
                  name="housing_allowance"
                  value={settings.housing_allowance}
                  onChange={handleChange}
                  disabled={saving}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Transport Allowance"
                  name="transport_allowance"
                  value={settings.transport_allowance}
                  onChange={handleChange}
                  disabled={saving}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Meal Allowance"
                  name="meal_allowance"
                  value={settings.meal_allowance}
                  onChange={handleChange}
                  disabled={saving}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Phone Allowance"
                  name="phone_allowance"
                  value={settings.phone_allowance}
                  onChange={handleChange}
                  disabled={saving}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Other Allowance"
                  name="other_allowance"
                  value={settings.other_allowance}
                  onChange={handleChange}
                  disabled={saving}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
            </Grid>

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
                  InputProps={{ inputProps: { min: 0 } }}
                  helperText="Used for tax calculation"
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
              </Grid>
            </Grid>

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
                    <MenuItem value="KHR">KHR - Riel</MenuItem>
                    <MenuItem value="USD">USD - Dollar</MenuItem>
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
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={saving || !settings.basic_salary}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </Box>
          </form>
        </Paper>
      )}
    </Box>
  );
};

export default EmployeeSalarySettings;