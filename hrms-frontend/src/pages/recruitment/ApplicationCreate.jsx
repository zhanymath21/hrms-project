// src/pages/recruitment/ApplicationCreate.jsx
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
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { Save as SaveIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/axios';

const ApplicationCreate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [formData, setFormData] = useState({
    candidate_id: '',
    vacancy_id: '',
    notes: '',
    interview_date: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [candidatesRes, vacanciesRes] = await Promise.all([
        api.get('/candidates'),
        api.get('/vacancies'),
      ]);

      let candidatesData = [];
      let vacanciesData = [];

      if (candidatesRes.data?.status === 'success') {
        candidatesData = candidatesRes.data.data?.data || candidatesRes.data.data || [];
      }
      if (vacanciesRes.data?.status === 'success') {
        vacanciesData = vacanciesRes.data.data?.data || vacanciesRes.data.data || [];
      }

      setCandidates(Array.isArray(candidatesData) ? candidatesData : []);
      setVacancies(Array.isArray(vacanciesData) ? vacanciesData : []);
    } catch (err) {
      setError('Failed to load data');
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
      await api.post('/applications', formData);
      navigate('/applications');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3} gap={2}>
        <IconButton onClick={() => navigate('/applications')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Create Application
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Candidate *</InputLabel>
                <Select
                  name="candidate_id"
                  value={formData.candidate_id}
                  onChange={handleChange}
                  label="Candidate *"
                  required
                >
                  <MenuItem value="">Select Candidate</MenuItem>
                  {candidates.map(c => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} - {c.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Vacancy *</InputLabel>
                <Select
                  name="vacancy_id"
                  value={formData.vacancy_id}
                  onChange={handleChange}
                  label="Vacancy *"
                  required
                >
                  <MenuItem value="">Select Vacancy</MenuItem>
                  {vacancies.map(v => (
                    <MenuItem key={v.id} value={v.id}>
                      {v.title} - {v.department?.name || 'No Dept'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Interview Date"
                name="interview_date"
                value={formData.interview_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
            <Button variant="outlined" onClick={() => navigate('/applications')}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={loading} startIcon={<SaveIcon />}>
              {loading ? 'Saving...' : 'Create Application'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default ApplicationCreate;