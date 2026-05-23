// src/pages/locations/OfficeLocations.jsx
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
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  Tooltip,
  Switch,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as InactiveIcon,
} from '@mui/icons-material';
import api from '../../services/axios';

const OfficeLocations = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    latitude: '',
    longitude: '',
    radius_meters: 100,
    is_active: true,
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/office-locations/all');
      if (response.data.status === 'success') {
        setLocations(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch locations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (editingLocation) {
        await api.put(`/office-locations/${editingLocation.id}`, formData);
      } else {
        await api.post('/office-locations', formData);
      }
      await fetchLocations();
      setOpenDialog(false);
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save location');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this office location?')) {
      try {
        await api.delete(`/office-locations/${id}`);
        await fetchLocations();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete location');
      }
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await api.put(`/office-locations/${id}/toggle`);
      await fetchLocations();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      address: '',
      latitude: '',
      longitude: '',
      radius_meters: 100,
      is_active: true,
    });
    setEditingLocation(null);
  };

  const editLocation = (location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      code: location.code,
      address: location.address || '',
      latitude: location.latitude,
      longitude: location.longitude,
      radius_meters: location.radius_meters,
      is_active: location.is_active,
    });
    setOpenDialog(true);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          alert('Unable to get current location');
        }
      );
    } else {
      alert('Geolocation is not supported');
    }
  };

  if (loading && locations.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Office Locations
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            resetForm();
            setOpenDialog(true);
          }}
        >
          Add Office Location
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Locations Grid */}
      <Grid container spacing={3}>
        {locations.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="textSecondary">No office locations found</Typography>
            </Paper>
          </Grid>
        ) : (
          locations.map((location) => (
            <Grid item xs={12} md={6} lg={4} key={location.id}>
              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {location.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Code: {location.code}
                        </Typography>
                      </Box>
                      <Chip
                        icon={location.is_active ? <CheckCircleIcon /> : <InactiveIcon />}
                        label={location.is_active ? 'Active' : 'Inactive'}
                        color={location.is_active ? 'success' : 'default'}
                        size="small"
                        onClick={() => handleToggleActive(location.id, location.is_active)}
                      />
                    </Box>

                    <Box>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Address
                      </Typography>
                      <Typography variant="body2">{location.address || '-'}</Typography>
                    </Box>

                    <Box display="flex" gap={2}>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Latitude
                        </Typography>
                        <Typography variant="body2">{location.latitude}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Longitude
                        </Typography>
                        <Typography variant="body2">{location.longitude}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Radius
                        </Typography>
                        <Typography variant="body2">{location.radius_meters}m</Typography>
                      </Box>
                    </Box>

                    <Box display="flex" gap={1} justifyContent="flex-end">
                      <Tooltip title="Edit">
                        <IconButton size="small" color="primary" onClick={() => editLocation(location)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDelete(location.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingLocation ? 'Edit Office Location' : 'Add New Office Location'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Location Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                multiline
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Latitude"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Longitude"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Radius (meters)"
                value={formData.radius_meters}
                onChange={(e) => setFormData({ ...formData, radius_meters: parseInt(e.target.value) })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                startIcon={<LocationIcon />}
                onClick={getCurrentLocation}
                fullWidth
              >
                Use Current Location
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OfficeLocations;