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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import api from '../../services/axios';
import { formatDate } from '../../utils/dateFormat';

const ExchangeRateSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [rates, setRates] = useState([]);
  const [activeRates, setActiveRates] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [formData, setFormData] = useState({
    from_currency: 'USD',
    to_currency: 'KHR',
    rate: 4100,
    effective_date: new Date().toISOString().split('T')[0],
    is_active: true,
    notes: '',
  });

  useEffect(() => {
    fetchRates();
    fetchActiveRates();
  }, []);

  const fetchRates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/exchange-rates');
      if (response.data?.status === 'success') {
        setRates(response.data.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching exchange rates:', err);
      setError('Failed to fetch exchange rates');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveRates = async () => {
    try {
      const response = await api.get('/exchange-rates/active');
      if (response.data?.status === 'success') {
        setActiveRates(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching active rates:', err);
    }
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
      const response = editingRate
        ? await api.put(`/exchange-rates/${editingRate.id}`, formData)
        : await api.post('/exchange-rates', formData);

      if (response.data?.status === 'success') {
        setSuccess(true);
        setDialogOpen(false);
        await fetchRates();
        await fetchActiveRates();
        setTimeout(() => setSuccess(false), 3000);
        resetForm();
      }
    } catch (err) {
      console.error('Error saving exchange rate:', err);
      setError(err.response?.data?.message || 'Failed to save exchange rate');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      from_currency: 'USD',
      to_currency: 'KHR',
      rate: 4100,
      effective_date: new Date().toISOString().split('T')[0],
      is_active: true,
      notes: '',
    });
    setEditingRate(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (rate) => {
    setEditingRate(rate);
    setFormData({
      from_currency: rate.from_currency,
      to_currency: rate.to_currency,
      rate: rate.rate,
      effective_date: rate.effective_date,
      is_active: rate.is_active,
      notes: rate.notes || '',
    });
    setDialogOpen(true);
  };

  const deleteRate = async (id) => {
    if (!window.confirm('Delete this exchange rate?')) return;
    
    try {
      await api.delete(`/exchange-rates/${id}`);
      await fetchRates();
      await fetchActiveRates();
    } catch (err) {
      console.error('Error deleting exchange rate:', err);
      setError('Failed to delete exchange rate');
    }
  };

  const formatCurrency = (amount, currency = 'KHR') => {
    if (amount === null || amount === undefined || isNaN(amount)) return 0;
    
    if (currency === 'USD') {
      return '$' + parseFloat(amount).toFixed(2);
    }
    return '៛' + parseFloat(amount).toFixed(0);
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
            💱 Exchange Rates
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage currency exchange rates (USD ↔ KHR)
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            Add Exchange Rate
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchRates}>
            Refresh
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
          ✅ Exchange rate saved successfully!
        </Alert>
      )}

      {/* Active Rates */}
      {activeRates && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Active Exchange Rates
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="textSecondary">USD → KHR</Typography>
                  <Typography variant="h4" fontWeight="bold" color="primary.main">
                    1 USD = {activeRates.usd_to_khr?.rate || 'N/A'} KHR
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Effective: {activeRates.usd_to_khr ? formatDate(activeRates.usd_to_khr.effective_date) : 'N/A'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="textSecondary">KHR → USD</Typography>
                  <Typography variant="h4" fontWeight="bold" color="secondary.main">
                    1 KHR = {activeRates.khr_to_usd ? (1 / activeRates.khr_to_usd.rate).toFixed(6) : 'N/A'} USD
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Effective: {activeRates.khr_to_usd ? formatDate(activeRates.khr_to_usd.effective_date) : 'N/A'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Exchange Rates Table */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          All Exchange Rates
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>From</TableCell>
                <TableCell>To</TableCell>
                <TableCell align="right">Rate</TableCell>
                <TableCell>Effective Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="textSecondary">No exchange rates found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rates.map((rate) => (
                  <TableRow key={rate.id} hover>
                    <TableCell>
                      <Chip label={rate.from_currency} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={rate.to_currency} size="small" />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      {parseFloat(rate.rate).toFixed(4)}
                    </TableCell>
                    <TableCell>{formatDate(rate.effective_date)}</TableCell>
                    <TableCell>
                      {rate.is_active ? (
                        <Chip label="Active" color="success" size="small" />
                      ) : (
                        <Chip label="Inactive" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEditDialog(rate)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => deleteRate(rate.id)}>
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
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRate ? 'Edit Exchange Rate' : 'Add Exchange Rate'}
          <IconButton sx={{ position: 'absolute', right: 8, top: 8 }} onClick={() => setDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>From Currency</InputLabel>
                  <Select
                    name="from_currency"
                    value={formData.from_currency}
                    onChange={handleChange}
                    label="From Currency"
                    disabled={!!editingRate}
                  >
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="KHR">KHR</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>To Currency</InputLabel>
                  <Select
                    name="to_currency"
                    value={formData.to_currency}
                    onChange={handleChange}
                    label="To Currency"
                    disabled={!!editingRate}
                  >
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="KHR">KHR</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Exchange Rate"
                  name="rate"
                  value={formData.rate}
                  onChange={handleChange}
                  required
                  InputProps={{ inputProps: { min: 0, step: 0.0001 } }}
                  helperText={`1 ${formData.from_currency} = ${formData.rate} ${formData.to_currency}`}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="date"
                  label="Effective Date"
                  name="effective_date"
                  value={formData.effective_date}
                  onChange={handleChange}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    />
                  }
                  label="Active"
                />
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
                  placeholder="Additional notes..."
                />
              </Grid>
            </Grid>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : editingRate ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExchangeRateSettings;