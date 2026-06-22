// src/pages/safety/LostTimeInjuryCreate.jsx
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
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/axios';

const BODY_PART_OPTIONS = [
  { value: 'head', label: 'Head' },
  { value: 'neck', label: 'Neck' },
  { value: 'shoulder', label: 'Shoulder' },
  { value: 'arm', label: 'Arm' },
  { value: 'elbow', label: 'Elbow' },
  { value: 'wrist', label: 'Wrist' },
  { value: 'hand', label: 'Hand' },
  { value: 'finger', label: 'Finger' },
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'spine', label: 'Spine' },
  { value: 'hip', label: 'Hip' },
  { value: 'leg', label: 'Leg' },
  { value: 'knee', label: 'Knee' },
  { value: 'ankle', label: 'Ankle' },
  { value: 'foot', label: 'Foot' },
  { value: 'toe', label: 'Toe' },
  { value: 'multiple', label: 'Multiple' },
];

const INJURY_TYPE_OPTIONS = [
  { value: 'fracture', label: 'Fracture' },
  { value: 'sprain', label: 'Sprain' },
  { value: 'strain', label: 'Strain' },
  { value: 'cut', label: 'Cut/Laceration' },
  { value: 'burn', label: 'Burn' },
  { value: 'bruise', label: 'Bruise/Contusion' },
  { value: 'amputation', label: 'Amputation' },
  { value: 'crush', label: 'Crush Injury' },
  { value: 'concussion', label: 'Concussion' },
  { value: 'other', label: 'Other' },
];

const SEVERITY_OPTIONS = [
  { value: 'minor', label: 'Minor' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
  { value: 'critical', label: 'Critical' },
];

const LostTimeInjuryCreate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    employee_id: '',
    title: '',
    description: '',
    location: '',
    injury_date: '',
    injury_time: '',
    body_part: '',
    injury_type: '',
    severity: '',
    medical_treatment: false,
    return_to_work_date: '',
    days_lost: 0,
    medical_notes: '',
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
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
      
      Object.keys(formData).forEach(key => {
        if (key === 'file') {
          if (formData.file) {
            submitData.append('file', formData.file);
          }
        } else if (key === 'witnesses') {
          submitData.append('witnesses', JSON.stringify(formData.witnesses));
        } else if (key === 'medical_treatment') {
          submitData.append(key, formData[key] ? '1' : '0');
        } else {
          submitData.append(key, formData[key] || '');
        }
      });

      const response = await api.post('/lost-time-injuries', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data?.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          navigate('/lost-time-injuries');
        }, 1500);
      } else {
        setError(response.data?.message || 'Failed to create record');
      }
    } catch (err) {
      console.error('Error creating:', err);
      if (err.response?.data?.errors) {
        const errorMessages = Object.values(err.response.data.errors).flat().join(', ');
        setError(errorMessages);
      } else {
        setError(err.response?.data?.message || 'Failed to create record');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3} gap={2}>
        <IconButton onClick={() => navigate('/lost-time-injuries')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Report Lost Time Injury
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
          ✅ Record created successfully! Redirecting...
        </Alert>
      )}

      {/* Form */}
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
            Injury Information
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            {/* Employee */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Employee *</InputLabel>
                <Select
                  name="employee_id"
                  value={formData.employee_id}
                  onChange={handleChange}
                  label="Employee *"
                  required
                  disabled={saving}
                >
                  <MenuItem value="">Select Employee</MenuItem>
                  {employees.map(emp => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Title */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Injury Title *"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                disabled={saving}
                placeholder="Brief title of the injury"
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
                placeholder="Detailed description of the injury and how it happened..."
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
                placeholder="Where did the injury occur?"
              />
            </Grid>

            {/* Injury Date */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Injury Date *"
                name="injury_date"
                value={formData.injury_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                required
                disabled={saving}
              />
            </Grid>

            {/* Injury Time */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="time"
                label="Injury Time"
                name="injury_time"
                value={formData.injury_time}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                disabled={saving}
              />
            </Grid>

            {/* Body Part */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Body Part Affected</InputLabel>
                <Select
                  name="body_part"
                  value={formData.body_part}
                  onChange={handleChange}
                  label="Body Part Affected"
                  disabled={saving}
                >
                  <MenuItem value="">Select Body Part</MenuItem>
                  {BODY_PART_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Injury Type */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Injury Type</InputLabel>
                <Select
                  name="injury_type"
                  value={formData.injury_type}
                  onChange={handleChange}
                  label="Injury Type"
                  disabled={saving}
                >
                  <MenuItem value="">Select Injury Type</MenuItem>
                  {INJURY_TYPE_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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

            {/* Days Lost */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Days Lost"
                name="days_lost"
                value={formData.days_lost}
                onChange={handleChange}
                InputProps={{ inputProps: { min: 0 } }}
                disabled={saving}
                helperText="Number of working days lost due to injury"
              />
            </Grid>

            {/* Medical Treatment */}
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    name="medical_treatment"
                    checked={formData.medical_treatment}
                    onChange={handleChange}
                    disabled={saving}
                  />
                }
                label="Received Medical Treatment"
              />
            </Grid>

            {/* Return to Work Date */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Return to Work Date"
                name="return_to_work_date"
                value={formData.return_to_work_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                disabled={saving}
              />
            </Grid>

            {/* Medical Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Medical Notes"
                name="medical_notes"
                multiline
                rows={3}
                value={formData.medical_notes}
                onChange={handleChange}
                disabled={saving}
                placeholder="Additional medical information..."
              />
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
              onClick={() => navigate('/lost-time-injuries')}
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
              {saving ? 'Creating...' : 'Create Record'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default LostTimeInjuryCreate;