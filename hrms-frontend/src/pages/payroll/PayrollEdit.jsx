// src/pages/payroll/PayrollEdit.jsx
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
  Stack,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Person as PersonIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/axios';

const PayrollEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
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
    notes: '',
  });
  const [originalItems, setOriginalItems] = useState([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [payrollRes, employeesRes] = await Promise.all([
        api.get(`/payroll/${id}`),
        api.get('/employees', { params: { per_page: 100 } }),
      ]);

      if (payrollRes.data?.status === 'success') {
        const data = payrollRes.data.data;
        setFormData({
          name: data.name || '',
          start_date: data.start_date || '',
          end_date: data.end_date || '',
          payment_date: data.payment_date || '',
          notes: data.notes || '',
        });
        setSelectedEmployees(data.items?.map(item => item.employee_id) || []);
        setOriginalItems(data.items || []);
      } else {
        setError('Payroll not found');
      }

      let employeesData = [];
      if (employeesRes.data?.status === 'success') {
        if (employeesRes.data.data?.data && Array.isArray(employeesRes.data.data.data)) {
          employeesData = employeesRes.data.data.data;
        } else if (Array.isArray(employeesRes.data.data)) {
          employeesData = employeesRes.data.data;
        }
      }
      setEmployees(Array.isArray(employeesData) ? employeesData : []);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await api.put(`/payroll/${id}`, {
        ...formData,
        employee_ids: selectedEmployees,
      });

      if (response.data?.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          navigate(`/payroll/${id}`);
        }, 1500);
      } else {
        setError(response.data?.message || 'Failed to update payroll');
      }
    } catch (err) {
      console.error('Error updating payroll:', err);
      if (err.response?.data?.errors) {
        const errorMessages = Object.values(err.response.data.errors).flat().join(', ');
        setError(errorMessages);
      } else {
        setError(err.response?.data?.message || 'Failed to update payroll');
      }
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
      <Box display="flex" alignItems="center" mb={3} gap={2}>
        <IconButton onClick={() => navigate(`/payroll/${id}`)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Edit Payroll
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          ✅ Payroll updated successfully! Redirecting...
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
            Payroll Information
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Payroll Period Name *"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={saving}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Start Date *"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                required
                disabled={saving}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="End Date *"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                required
                disabled={saving}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Payment Date"
                name="payment_date"
                value={formData.payment_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                disabled={saving}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                multiline
                rows={2}
                value={formData.notes}
                onChange={handleChange}
                disabled={saving}
              />
            </Grid>

            {/* Employees Selection */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Select Employees ({selectedEmployees.length} selected)
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box display="flex" gap={1} mb={2}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleSelectAll}
                  disabled={saving}
                >
                  {selectedEmployees.length === employees.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Typography variant="caption" color="textSecondary" sx={{ ml: 2, alignSelf: 'center' }}>
                  {employees.length} employees available
                </Typography>
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
                        '&:hover': {
                          bgcolor: selectedEmployees.includes(emp.id) ? '#dcfce7' : '#f9fafb',
                        },
                      }}
                      onClick={() => handleToggleEmployee(emp.id)}
                    >
                      <CardContent sx={{ py: 1.5, px: 2 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <PersonIcon fontSize="small" color="action" />
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {emp.first_name} {emp.last_name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {emp.position?.title || 'No Position'}
                            </Typography>
                          </Box>
                          {selectedEmployees.includes(emp.id) && (
                            <CheckCircleIcon fontSize="small" color="success" sx={{ ml: 'auto' }} />
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
            <Button
              variant="outlined"
              onClick={() => navigate(`/payroll/${id}`)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving || selectedEmployees.length === 0}
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default PayrollEdit;