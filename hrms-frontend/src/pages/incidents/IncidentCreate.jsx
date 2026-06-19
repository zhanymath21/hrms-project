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
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/axios';

const CATEGORY_OPTIONS = [
  { value: 'safety', label: 'Safety' },
  { value: 'security', label: 'Security' },
  { value: 'health', label: 'Health' },
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'discrimination', label: 'Discrimination' },
  { value: 'fraud', label: 'Fraud' },
  { value: 'theft', label: 'Theft' },
  { value: 'data_breach', label: 'Data Breach' },
  { value: 'policy_violation', label: 'Policy Violation' },
  { value: 'workplace_violence', label: 'Workplace Violence' },
  { value: 'accident', label: 'Accident' },
  { value: 'near_miss', label: 'Near Miss' },
  { value: 'other', label: 'Other' },
];

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const IncidentCreate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    incident_date: '',
    incident_time: '',
    category: '',
    severity: '',
    assigned_to: '',
    witnesses: [],
    file: null,
  });
  const [witnessName, setWitnessName] = useState('');
  const [witnessContact, setWitnessContact] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

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
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, file: e.target.files[0] }));
    }
  };

  const handleAddWitness = () => {
    if (!witnessName.trim()) {
      alert('Please enter witness name');
      return;
    }
    setFormData(prev => ({
      ...prev,
      witnesses: [...prev.witnesses, { name: witnessName.trim(), contact: witnessContact.trim() }]
    }));
    setWitnessName('');
    setWitnessContact('');
  };

  const handleRemoveWitness = (index) => {
    setFormData(prev => ({
      ...prev,
      witnesses: prev.witnesses.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const submitData = new FormData();
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        if (key === 'file') {
          if (formData.file) {
            submitData.append('file', formData.file);
          }
        } else if (key === 'witnesses') {
          // Ensure witnesses is always an array
          const witnessesArray = Array.isArray(formData.witnesses) ? formData.witnesses : [];
          submitData.append('witnesses', JSON.stringify(witnessesArray));
        } else {
          submitData.append(key, formData[key] || '');
        }
      });

      const response = await api.post('/incident-reports', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data?.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          navigate('/incident-reports');
        }, 1500);
      } else {
        setError(response.data?.message || 'Failed to create incident report');
      }
    } catch (err) {
      console.error('Error creating incident:', err);
      if (err.response?.data?.errors) {
        const errorMessages = Object.values(err.response.data.errors).flat().join(', ');
        setError(errorMessages);
      } else {
        setError(err.response?.data?.message || 'Failed to create incident report');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3} gap={2}>
        <IconButton onClick={() => navigate('/incident-reports')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Report Incident
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          ✅ Incident report created successfully! Redirecting...
        </Alert>
      )}

      {/* Form */}
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
            Incident Details
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            {/* Title */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Incident Title *"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                disabled={saving}
                placeholder="Brief title of the incident"
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description *"
                name="description"
                multiline
                rows={4}
                value={formData.description}
                onChange={handleChange}
                required
                disabled={saving}
                placeholder="Detailed description of the incident..."
              />
            </Grid>

            {/* Location */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                disabled={saving}
                placeholder="Where did the incident occur?"
              />
            </Grid>

            {/* Category */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category *</InputLabel>
                <Select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  label="Category *"
                  required
                  disabled={saving}
                >
                  <MenuItem value="">Select Category</MenuItem>
                  {CATEGORY_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Incident Date */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Incident Date *"
                name="incident_date"
                value={formData.incident_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                required
                disabled={saving}
              />
            </Grid>

            {/* Incident Time */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="time"
                label="Incident Time"
                name="incident_time"
                value={formData.incident_time}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                disabled={saving}
              />
            </Grid>

            {/* Severity */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Severity *</InputLabel>
                <Select
                  name="severity"
                  value={formData.severity}
                  onChange={handleChange}
                  label="Severity *"
                  required
                  disabled={saving}
                >
                  <MenuItem value="">Select Severity</MenuItem>
                  {SEVERITY_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Assigned To */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Assign To</InputLabel>
                <Select
                  name="assigned_to"
                  value={formData.assigned_to}
                  onChange={handleChange}
                  label="Assign To"
                  disabled={saving}
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {employees.map(emp => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* File Upload */}
            <Grid item xs={12}>
              <Button
                variant="outlined"
                component="label"
                disabled={saving}
              >
                Upload Attachment
                <input
                  type="file"
                  hidden
                  onChange={handleFileChange}
                />
              </Button>
              {formData.file && (
                <Typography variant="caption" sx={{ ml: 2 }}>
                  Selected: {formData.file.name}
                </Typography>
              )}
            </Grid>

            {/* Witnesses */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Witnesses
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Witness Name"
                    value={witnessName}
                    onChange={(e) => setWitnessName(e.target.value)}
                    placeholder="Enter witness name"
                  />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Contact (Optional)"
                    value={witnessContact}
                    onChange={(e) => setWitnessContact(e.target.value)}
                    placeholder="Email or phone number"
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleAddWitness}
                    disabled={!witnessName.trim()}
                  >
                    Add
                  </Button>
                </Grid>
              </Grid>

              {formData.witnesses.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  {formData.witnesses.map((witness, index) => (
                    <Chip
                      key={index}
                      label={`${witness.name}${witness.contact ? ` (${witness.contact})` : ''}`}
                      onDelete={() => handleRemoveWitness(index)}
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
              )}
            </Grid>
          </Grid>

          {/* Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/incident-reports')}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              {saving ? 'Creating...' : 'Create Report'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default IncidentCreate;