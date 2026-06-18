// src/pages/recruitment/CandidateForm.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Upload as UploadIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/axios';

const STATUS_OPTIONS = [
  'new', 'screening', 'interview', 'technical_test',
  'hr_interview', 'offer', 'hired', 'rejected', 'withdrawn'
];

const CandidateForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [cvFile, setCvFile] = useState(null);
  const [cvPreview, setCvPreview] = useState(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position_applied: '',
    experience_years: '',
    current_salary: '',
    expected_salary: '',
    location: '',
    status: 'new',
    notes: '',
  });

  useEffect(() => {
    if (isEdit) {
      fetchCandidate();
    }
  }, [id]);

  const fetchCandidate = async () => {
    try {
      setFetching(true);
      const response = await api.get(`/candidates/${id}`);
      if (response.data?.status === 'success') {
        const data = response.data.data;
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          position_applied: data.position_applied || '',
          experience_years: data.experience_years || '',
          current_salary: data.current_salary || '',
          expected_salary: data.expected_salary || '',
          location: data.location || '',
          status: data.status || 'new',
          notes: data.notes || '',
        });
        setCvPreview(data.cv_url);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch candidate');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setCvFile(file);
      setCvPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrors({});

    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '') {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      if (cvFile) {
        formDataToSend.append('cv', cvFile);
      }

      if (isEdit) {
        formDataToSend.append('_method', 'PUT');
        await api.post(`/candidates/${id}`, formDataToSend);
      } else {
        await api.post('/candidates', formDataToSend);
      }

      navigate('/candidates');
    } catch (err) {
      console.error('Error saving candidate:', err);
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setError(err.response?.data?.message || 'Failed to save candidate');
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3} gap={2}>
        <IconButton onClick={() => navigate('/candidates')}><ArrowBackIcon /></IconButton>
        <Typography variant="h4" component="h1" fontWeight="bold">
          {isEdit ? 'Edit Candidate' : 'Add New Candidate'}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="First Name *" name="first_name" value={formData.first_name} onChange={handleChange} error={!!errors.first_name} helperText={errors.first_name} required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Last Name *" name="last_name" value={formData.last_name} onChange={handleChange} error={!!errors.last_name} helperText={errors.last_name} required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Email *" name="email" type="email" value={formData.email} onChange={handleChange} error={!!errors.email} helperText={errors.email} required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Phone *" name="phone" value={formData.phone} onChange={handleChange} error={!!errors.phone} helperText={errors.phone} required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Position Applied *" name="position_applied" value={formData.position_applied} onChange={handleChange} error={!!errors.position_applied} helperText={errors.position_applied} required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Location" name="location" value={formData.location} onChange={handleChange} error={!!errors.location} helperText={errors.location} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Years of Experience" name="experience_years" type="number" value={formData.experience_years} onChange={handleChange} error={!!errors.experience_years} helperText={errors.experience_years} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Current Salary (USD)" name="current_salary" type="number" value={formData.current_salary} onChange={handleChange} error={!!errors.current_salary} helperText={errors.current_salary} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Expected Salary (USD)" name="expected_salary" type="number" value={formData.expected_salary} onChange={handleChange} error={!!errors.expected_salary} helperText={errors.expected_salary} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select name="status" value={formData.status} onChange={handleChange} label="Status">
                  {STATUS_OPTIONS.map(status => (
                    <MenuItem key={status} value={status}>{status.replace('_', ' ').toUpperCase()}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Notes" name="notes" multiline rows={3} value={formData.notes} onChange={handleChange} error={!!errors.notes} helperText={errors.notes} />
            </Grid>

            {/* CV Upload */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>CV / Resume</Typography>
              <Box sx={{ border: '2px dashed #e0e0e0', borderRadius: 2, p: 3, textAlign: 'center', cursor: 'pointer', '&:hover': { borderColor: '#3b82f6', bgcolor: 'rgba(59, 130, 246, 0.04)' } }}>
                <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} style={{ display: 'none' }} id="cv-upload" />
                <label htmlFor="cv-upload" style={{ cursor: 'pointer' }}>
                  <Box display="flex" flexDirection="column" alignItems="center">
                    <DescriptionIcon sx={{ fontSize: 48, color: '#3b82f6' }} />
                    <Typography variant="body1" fontWeight="medium">{cvFile ? cvFile.name : 'Upload CV / Resume'}</Typography>
                    <Typography variant="caption" color="textSecondary">Supported: PDF, DOC, DOCX (Max 10MB)</Typography>
                    {cvFile && <Chip label={`${(cvFile.size / 1024).toFixed(1)} KB`} size="small" color="primary" sx={{ mt: 1 }} />}
                  </Box>
                </label>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
            <Button variant="outlined" onClick={() => navigate('/candidates')} disabled={loading}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}>
              {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default CandidateForm;