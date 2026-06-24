// src/pages/payroll/PayrollCreate.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Card,
  CardContent,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/axios';

const PayrollCreate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    payment_date: '',
    payroll_type: 'semi_monthly',
    payroll_cycle: 'first',
    notes: '',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      generatePayrollName();
    }
  }, [formData.start_date, formData.end_date, formData.payroll_type, formData.payroll_cycle]);

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
    } finally {
      setLoading(false);
    }
  };

  const generatePayrollName = () => {
    const start = new Date(formData.start_date);
    const month = start.toLocaleString('default', { month: 'long' });
    const year = start.getFullYear();
    let cycleLabel = '';
    if (formData.payroll_type === 'semi_monthly') {
      const day = start.getDate();
      cycleLabel = day <= 15 ? ' (1st Half)' : ' (2nd Half)';
    }
    const name = `${month} ${year} Payroll${cycleLabel}`;
    setFormData(prev => ({ ...prev, name }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await api.post('/payroll', {
        ...formData,
        employee_ids: selectedEmployees,
      });

      if (response.data?.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          navigate('/payroll');
        }, 1500);
      } else {
        setError(response.data?.message || 'Failed to create payroll');
      }
    } catch (err) {
      console.error('Error creating payroll:', err);
      if (err.response?.data?.errors) {
        const errorMessages = Object.values(err.response.data.errors).flat().join(', ');
        setError(errorMessages);
      } else {
        setError(err.response?.data?.message || 'Failed to create payroll');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEmployee = (employeeId) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(e => e.id));
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
      <Box display="flex" alignItems="center" mb={3} gap={2}>
        <IconButton onClick={() => navigate('/payroll')}><ArrowBackIcon /></IconButton>
        <Typography variant="h4" component="h1" fontWeight="bold">Create Payroll (USD)</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>✅ Payroll created successfully! Redirecting...</Alert>}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">Payroll Information</Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField fullWidth label="Payroll Period Name *" name="name" value={formData.name} onChange={handleChange} required disabled={saving} helperText="Auto-generated based on dates and type" />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Payroll Type *</InputLabel>
                <Select name="payroll_type" value={formData.payroll_type} onChange={handleChange} label="Payroll Type *" required disabled={saving}>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="semi_monthly">Semi-Monthly (2x/month)</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Payroll Cycle *</InputLabel>
                <Select name="payroll_cycle" value={formData.payroll_cycle} onChange={handleChange} label="Payroll Cycle *" required disabled={saving}>
                  <MenuItem value="first">First Cycle</MenuItem>
                  <MenuItem value="second">Second Cycle</MenuItem>
                  <MenuItem value="third">Third Cycle</MenuItem>
                  <MenuItem value="fourth">Fourth Cycle</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField fullWidth type="date" label="Payment Date" name="payment_date" value={formData.payment_date} onChange={handleChange} InputLabelProps={{ shrink: true }} disabled={saving} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField fullWidth type="date" label="Start Date *" name="start_date" value={formData.start_date} onChange={handleChange} InputLabelProps={{ shrink: true }} required disabled={saving} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField fullWidth type="date" label="End Date *" name="end_date" value={formData.end_date} onChange={handleChange} InputLabelProps={{ shrink: true }} required disabled={saving} />
            </Grid>

            <Grid item xs={12}>
              <TextField fullWidth label="Notes" name="notes" multiline rows={2} value={formData.notes} onChange={handleChange} disabled={saving} placeholder="Additional notes..." />
            </Grid>

            {formData.payroll_type === 'semi_monthly' && (
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Semi-Monthly Payroll:</strong> This will process {formData.start_date && new Date(formData.start_date).getDate() <= 15 ? ' First Half' : ' Second Half'} of the month.
                    Prorated calculations will be applied for employees who joined or left mid-period.
                  </Typography>
                </Alert>
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Select Employees ({selectedEmployees.length} selected)</Typography>
              <Divider sx={{ mb: 2 }} />
              <Box display="flex" gap={1} mb={2}>
                <Button variant="outlined" size="small" onClick={handleSelectAll} disabled={saving}>
                  {selectedEmployees.length === employees.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Typography variant="caption" color="textSecondary" sx={{ ml: 2, alignSelf: 'center' }}>{employees.length} employees available</Typography>
              </Box>

              <Grid container spacing={1}>
                {employees.map(emp => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={emp.id}>
                    <Card
                      variant={selectedEmployees.includes(emp.id) ? 'elevation' : 'outlined'}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: selectedEmployees.includes(emp.id) ? '#f0fdf4' : 'transparent',
                        borderColor: selectedEmployees.includes(emp.id) ? '#86efac' : '#e5e7eb',
                        '&:hover': { bgcolor: selectedEmployees.includes(emp.id) ? '#dcfce7' : '#f9fafb' },
                      }}
                      onClick={() => handleToggleEmployee(emp.id)}
                    >
                      <CardContent sx={{ py: 1.5, px: 2 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <PersonIcon fontSize="small" color="action" />
                          <Box>
                            <Typography variant="body2" fontWeight="medium">{emp.first_name} {emp.last_name}</Typography>
                            <Typography variant="caption" color="textSecondary">{emp.position?.title || 'No Position'}</Typography>
                          </Box>
                          {selectedEmployees.includes(emp.id) && <CheckCircleIcon fontSize="small" color="success" sx={{ ml: 'auto' }} />}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
            <Button variant="outlined" onClick={() => navigate('/payroll')} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving || selectedEmployees.length === 0} startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}>
              {saving ? 'Creating...' : 'Create Payroll'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default PayrollCreate;