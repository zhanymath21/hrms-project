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
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  LocationOn as LocationOnIcon,
  CalendarToday as CalendarIcon,
  Category as CategoryIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
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

const STATUS_OPTIONS = [
  { value: 'reported', label: 'Reported' },
  { value: 'under_investigation', label: 'Under Investigation' },
  { value: 'in_review', label: 'In Review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
];

const IncidentEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
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
    status: '',
    assigned_to: '',
    resolution_notes: '',
    resolved_date: '',
    witnesses: [],
    file: null,
    existing_file_path: null,
    existing_file_name: null,
  });
  const [witnessName, setWitnessName] = useState('');
  const [witnessContact, setWitnessContact] = useState('');
  const [removeFile, setRemoveFile] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch incident data and employees in parallel
      const [incidentRes, employeesRes] = await Promise.all([
        api.get(`/incident-reports/${id}`),
        api.get('/employees', { params: { per_page: 100 } }),
      ]);

      // Set incident data
      if (incidentRes.data?.status === 'success') {
        const data = incidentRes.data.data;
        setFormData({
          title: data.title || '',
          description: data.description || '',
          location: data.location || '',
          incident_date: data.incident_date || '',
          incident_time: data.incident_time ? data.incident_time.substring(0, 5) : '',
          category: data.category || '',
          severity: data.severity || '',
          status: data.status || '',
          assigned_to: data.assigned_to?.id || '',
          resolution_notes: data.resolution_notes || '',
          resolved_date: data.resolved_date || '',
          witnesses: data.witnesses || [],
          file: null,
          existing_file_path: data.file_path || null,
          existing_file_name: data.file_name || null,
        });
      } else {
        setError('Incident not found');
      }

      // Set employees
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

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, file: e.target.files[0] }));
      setRemoveFile(false);
    }
  };

  const handleRemoveFile = () => {
    setRemoveFile(true);
    setFormData(prev => ({ ...prev, file: null }));
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
        } else if (key !== 'existing_file_path' && key !== 'existing_file_name') {
          submitData.append(key, formData[key] || '');
        }
      });

      // Handle file removal
      if (removeFile) {
        submitData.append('remove_file', 'true');
      }

      // Add _method for PUT
      submitData.append('_method', 'PUT');

      const response = await api.post(`/incident-reports/${id}`, submitData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data?.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          navigate(`/incident-reports/${id}`);
        }, 1500);
      } else {
        setError(response.data?.message || 'Failed to update incident report');
      }
    } catch (err) {
      console.error('Error updating incident:', err);
      if (err.response?.data?.errors) {
        const errorMessages = Object.values(err.response.data.errors).flat().join(', ');
        setError(errorMessages);
      } else {
        setError(err.response?.data?.message || 'Failed to update incident report');
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
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3} gap={2}>
        <IconButton onClick={() => navigate(`/incident-reports/${id}`)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Edit Incident #{id}
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
          ✅ Incident report updated successfully! Redirecting...
        </Alert>
      )}

      {/* Form */}
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
            Incident Information
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
                InputProps={{
                  startAdornment: <LocationOnIcon color="action" sx={{ mr: 1 }} />,
                }}
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

            {/* Status */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  label="Status"
                  disabled={saving}
                >
                  {STATUS_OPTIONS.map(option => (
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

            {/* Resolved Date */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Resolved Date"
                name="resolved_date"
                value={formData.resolved_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                disabled={saving}
              />
            </Grid>

            {/* Resolution Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Resolution Notes"
                name="resolution_notes"
                multiline
                rows={3}
                value={formData.resolution_notes}
                onChange={handleChange}
                disabled={saving}
                placeholder="Add resolution notes if the incident is resolved..."
              />
            </Grid>

            {/* File Upload */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Attachments
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {formData.existing_file_path && !removeFile && (
                <Box sx={{ mb: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 1 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2">
                      Current file: <strong>{formData.existing_file_name || 'Attachment'}</strong>
                    </Typography>
                    <Button
                      size="small"
                      color="error"
                      onClick={handleRemoveFile}
                      disabled={saving}
                    >
                      Remove File
                    </Button>
                  </Box>
                </Box>
              )}

              {(!formData.existing_file_path || removeFile) && (
                <Button
                  variant="outlined"
                  component="label"
                  disabled={saving}
                  sx={{ mr: 2 }}
                >
                  Upload New File
                  <input
                    type="file"
                    hidden
                    onChange={handleFileChange}
                  />
                </Button>
              )}

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
                    disabled={saving}
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
                    disabled={saving}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleAddWitness}
                    disabled={!witnessName.trim() || saving}
                  >
                    Add
                  </Button>
                </Grid>
              </Grid>

              {formData.witnesses.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    {formData.witnesses.length} witness(es) added
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {formData.witnesses.map((witness, index) => (
                      <Chip
                        key={index}
                        label={`${witness.name}${witness.contact ? ` (${witness.contact})` : ''}`}
                        onDelete={() => handleRemoveWitness(index)}
                        sx={{ mr: 1, mb: 1 }}
                        disabled={saving}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Grid>
          </Grid>

          {/* Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
            <Button
              variant="outlined"
              onClick={() => navigate(`/incident-reports/${id}`)}
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
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default IncidentEdit;