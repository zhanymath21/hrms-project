// src/pages/recruitment/VacancyForm.jsx
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
} from '@mui/material';
import { Save as SaveIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/axios';

const VacancyForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    department_id: '',
    description: '',
    requirements: '',
    status: 'open',
    location: '',
    salary_min: '',
    salary_max: '',
  });

  useEffect(() => {
    fetchDepartments();
    if (isEdit) fetchVacancy();
  }, [id]);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      let data = [];
      if (response.data?.status === 'success') {
        data = Array.isArray(response.data.data) ? response.data.data : [];
      } else if (Array.isArray(response.data)) {
        data = response.data;
      }
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchVacancy = async () => {
    try {
      const response = await api.get(`/vacancies/${id}`);
      if (response.data?.status === 'success') {
        const data = response.data.data;
        setFormData({
          title: data.title || '',
          department_id: data.department_id || '',
          description: data.description || '',
          requirements: data.requirements || '',
          status: data.status || 'open',
          location: data.location || '',
          salary_min: data.salary_min || '',
          salary_max: data.salary_max || '',
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch vacancy');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEdit) {
        await api.put(`/vacancies/${id}`, formData);
      } else {
        await api.post('/vacancies', formData);
      }
      navigate('/vacancies');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save vacancy');
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
        <IconButton onClick={() => navigate('/vacancies')}><ArrowBackIcon /></IconButton>
        <Typography variant="h4" component="h1" fontWeight="bold">
          {isEdit ? 'Edit Vacancy' : 'Add New Vacancy'}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField fullWidth label="Job Title *" name="title" value={formData.title} onChange={handleChange} required />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Department *</InputLabel>
                <Select name="department_id" value={formData.department_id} onChange={handleChange} label="Department *" required>
                  <MenuItem value="">Select Department</MenuItem>
                  {departments.map(dept => (
                    <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select name="status" value={formData.status} onChange={handleChange} label="Status">
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                  <MenuItem value="on_hold">On Hold</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Location" name="location" value={formData.location} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Salary Min" name="salary_min" type="number" value={formData.salary_min} onChange={handleChange} InputProps={{ startAdornment: '$' }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Salary Max" name="salary_max" type="number" value={formData.salary_max} onChange={handleChange} InputProps={{ startAdornment: '$' }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Description" name="description" multiline rows={4} value={formData.description} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Requirements" name="requirements" multiline rows={4} value={formData.requirements} onChange={handleChange} placeholder="List requirements separated by new line" />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
            <Button variant="outlined" onClick={() => navigate('/vacancies')} disabled={loading}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading} startIcon={<SaveIcon />}>
              {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default VacancyForm;