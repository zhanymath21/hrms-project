// src/pages/payroll/TaxSettings.jsx
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
  Divider,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip, 
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Save as SaveIcon, // ✅ Tambahkan ini
  Visibility as VisibilityIcon, // ✅ Tambahkan ini juga
} from '@mui/icons-material';
import api from '../../services/axios';

const TaxSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState([]);
  const [activeSetting, setActiveSetting] = useState(null);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    tax_brackets: [
      { threshold: 0, rate: 0, description: '0% - No tax' },
      { threshold: 1500000, rate: 5, description: '5% on first 1,500,000 KHR' },
      { threshold: 2000000, rate: 10, description: '10% on next 2,000,000 KHR' },
      { threshold: 8500000, rate: 15, description: '15% on next 8,500,000 KHR' },
      { threshold: 12500000, rate: 20, description: '20% on next 12,500,000 KHR' },
    ],
    personal_relief: 1500000,
    dependent_relief: 150000,
    nssf_employee_rate: 2.5,
    nssf_employer_rate: 2.5,
    social_security_brackets: { max_salary: 1200000 },
    minimum_wage: 1000000,
    is_active: false,
    notes: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tax-settings');
      if (response.data?.status === 'success') {
        setSettings(response.data.data.data || []);
        
        // Find active setting
        const active = response.data.data.data?.find(s => s.is_active);
        if (active) {
          setActiveSetting(active);
        }
      }
    } catch (err) {
      console.error('Error fetching tax settings:', err);
      setError('Failed to fetch tax settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBracketChange = (index, field, value) => {
    const newBrackets = [...formData.tax_brackets];
    newBrackets[index][field] = parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, tax_brackets: newBrackets }));
  };

  const addBracket = () => {
    setFormData(prev => ({
      ...prev,
      tax_brackets: [...prev.tax_brackets, { threshold: 0, rate: 0, description: '' }]
    }));
  };

  const removeBracket = (index) => {
    if (formData.tax_brackets.length <= 1) {
      alert('At least one tax bracket is required');
      return;
    }
    const newBrackets = formData.tax_brackets.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, tax_brackets: newBrackets }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await api.post('/tax-settings', formData);
      if (response.data?.status === 'success') {
        setSuccess(true);
        await fetchSettings();
        setTimeout(() => setSuccess(false), 3000);
        // Reset form
        setFormData({
          year: new Date().getFullYear(),
          tax_brackets: [
            { threshold: 0, rate: 0, description: '0% - No tax' },
            { threshold: 1500000, rate: 5, description: '5% on first 1,500,000 KHR' },
            { threshold: 2000000, rate: 10, description: '10% on next 2,000,000 KHR' },
            { threshold: 8500000, rate: 15, description: '15% on next 8,500,000 KHR' },
            { threshold: 12500000, rate: 20, description: '20% on next 12,500,000 KHR' },
          ],
          personal_relief: 1500000,
          dependent_relief: 150000,
          nssf_employee_rate: 2.5,
          nssf_employer_rate: 2.5,
          social_security_brackets: { max_salary: 1200000 },
          minimum_wage: 1000000,
          is_active: false,
          notes: '',
        });
      }
    } catch (err) {
      console.error('Error saving tax settings:', err);
      setError(err.response?.data?.message || 'Failed to save tax settings');
    } finally {
      setSaving(false);
    }
  };

  const activateSetting = async (id) => {
    if (!window.confirm('Activate this tax setting? This will deactivate all others.')) return;
    
    try {
      await api.post(`/tax-settings/${id}/activate`);
      await fetchSettings();
    } catch (err) {
      console.error('Error activating tax setting:', err);
      setError('Failed to activate tax setting');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('km-KH', {
      style: 'currency',
      currency: 'KHR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
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
            📊 Tax Settings
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Configure Cambodia tax brackets and NSSF settings
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchSettings}>
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          ✅ Tax settings saved successfully!
        </Alert>
      )}

      {/* Active Settings Info */}
      {activeSetting && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Active Settings:</strong> Year {activeSetting.year} 
          | Personal Relief: {formatCurrency(activeSetting.personal_relief)}
          | NSSF Employee Rate: {activeSetting.nssf_employee_rate}%
        </Alert>
      )}

      {/* Existing Settings Table */}
      {settings.length > 0 && (
        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Existing Tax Settings
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Year</TableCell>
                  <TableCell>Personal Relief</TableCell>
                  <TableCell>Dependent Relief</TableCell>
                  <TableCell>NSSF Employee</TableCell>
                  <TableCell>NSSF Employer</TableCell>
                  <TableCell>Min Wage</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {settings.map((setting) => (
                  <TableRow key={setting.id} hover>
                    <TableCell>{setting.year}</TableCell>
                    <TableCell>{formatCurrency(setting.personal_relief)}</TableCell>
                    <TableCell>{formatCurrency(setting.dependent_relief)}</TableCell>
                    <TableCell>{setting.nssf_employee_rate}%</TableCell>
                    <TableCell>{setting.nssf_employer_rate}%</TableCell>
                    <TableCell>{formatCurrency(setting.minimum_wage)}</TableCell>
                    <TableCell>
                      {setting.is_active ? (
                        <Chip label="Active" color="success" size="small" />
                      ) : (
                        <Chip label="Inactive" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {!setting.is_active && (
                        <Tooltip title="Activate">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => activateSetting(setting.id)}
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="View Details">
                        <IconButton size="small" color="info">
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Create New Tax Settings */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Create New Tax Settings
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Year *"
                name="year"
                value={formData.year}
                onChange={handleChange}
                required
                disabled={saving}
                InputProps={{ inputProps: { min: 2000, max: 2100 } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Personal Relief (KHR)"
                name="personal_relief"
                value={formData.personal_relief}
                onChange={handleChange}
                disabled={saving}
                helperText="Tax-free amount per individual"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Dependent Relief (KHR)"
                name="dependent_relief"
                value={formData.dependent_relief}
                onChange={handleChange}
                disabled={saving}
                helperText="Tax-free amount per dependent"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Minimum Wage (KHR)"
                name="minimum_wage"
                value={formData.minimum_wage}
                onChange={handleChange}
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="NSSF Employee Rate (%)"
                name="nssf_employee_rate"
                value={formData.nssf_employee_rate}
                onChange={handleChange}
                disabled={saving}
                helperText="Employee contribution to NSSF"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="NSSF Employer Rate (%)"
                name="nssf_employer_rate"
                value={formData.nssf_employer_rate}
                onChange={handleChange}
                disabled={saving}
                helperText="Employer contribution to NSSF"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="NSSF Max Salary (KHR)"
                name="social_security_brackets_max_salary"
                value={formData.social_security_brackets?.max_salary || 1200000}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  social_security_brackets: {
                    ...prev.social_security_brackets,
                    max_salary: parseFloat(e.target.value) || 0
                  }
                }))}
                disabled={saving}
                helperText="Maximum salary for NSSF calculation"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    disabled={saving}
                  />
                }
                label="Activate Immediately"
              />
            </Grid>

            {/* Tax Brackets */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Tax Brackets
              </Typography>
              <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                Define tax brackets for progressive tax calculation
              </Typography>
              
              <TableContainer sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Threshold (KHR)</TableCell>
                      <TableCell>Rate (%)</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.tax_brackets.map((bracket, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={bracket.threshold}
                            onChange={(e) => handleBracketChange(index, 'threshold', e.target.value)}
                            disabled={saving}
                            InputProps={{ inputProps: { min: 0 } }}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={bracket.rate}
                            onChange={(e) => handleBracketChange(index, 'rate', e.target.value)}
                            disabled={saving}
                            InputProps={{ inputProps: { min: 0, max: 100 } }}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={bracket.description || ''}
                            onChange={(e) => handleBracketChange(index, 'description', e.target.value)}
                            disabled={saving}
                            placeholder="Description"
                            fullWidth
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeBracket(index)}
                            disabled={saving || formData.tax_brackets.length <= 1}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={addBracket}
                disabled={saving}
                sx={{ mt: 2 }}
              >
                Add Tax Bracket
              </Button>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                multiline
                rows={2}
                value={formData.notes}
                onChange={handleChange}
                disabled={saving}
                placeholder="Additional notes..."
              />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              {saving ? 'Saving...' : 'Save Tax Settings'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default TaxSettings;