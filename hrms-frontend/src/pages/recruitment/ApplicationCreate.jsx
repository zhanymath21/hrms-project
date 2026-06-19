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
  Chip,
  Stack,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/axios';

const ApplicationCreate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [candidates, setCandidates] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedVacancy, setSelectedVacancy] = useState(null);
  
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
      setLoadingData(true);
      setError(null);
      
      const [candidatesRes, vacanciesRes] = await Promise.all([
        api.get('/candidates', { params: { per_page: 100 } }),
        api.get('/vacancies', { params: { per_page: 100 } }),
      ]);

      // Handle candidates
      let candidatesData = [];
      if (candidatesRes.data?.status === 'success') {
        if (candidatesRes.data.data?.data && Array.isArray(candidatesRes.data.data.data)) {
          candidatesData = candidatesRes.data.data.data;
        } else if (Array.isArray(candidatesRes.data.data)) {
          candidatesData = candidatesRes.data.data;
        }
      } else if (Array.isArray(candidatesRes.data)) {
        candidatesData = candidatesRes.data;
      }
      setCandidates(Array.isArray(candidatesData) ? candidatesData : []);

      // Handle vacancies
      let vacanciesData = [];
      if (vacanciesRes.data?.status === 'success') {
        if (vacanciesRes.data.data?.data && Array.isArray(vacanciesRes.data.data.data)) {
          vacanciesData = vacanciesRes.data.data.data;
        } else if (Array.isArray(vacanciesRes.data.data)) {
          vacanciesData = vacanciesRes.data.data;
        }
      } else if (Array.isArray(vacanciesRes.data)) {
        vacanciesData = vacanciesRes.data;
      }
      setVacancies(Array.isArray(vacanciesData) ? vacanciesData : []);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'candidate_id') {
      const candidate = candidates.find(c => c.id === parseInt(value));
      setSelectedCandidate(candidate || null);
    }
    if (name === 'vacancy_id') {
      const vacancy = vacancies.find(v => v.id === parseInt(value));
      setSelectedVacancy(vacancy || null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!formData.candidate_id) {
        setError('Please select a candidate');
        setLoading(false);
        return;
      }
      if (!formData.vacancy_id) {
        setError('Please select a vacancy');
        setLoading(false);
        return;
      }

      const submitData = {
        candidate_id: parseInt(formData.candidate_id),
        vacancy_id: parseInt(formData.vacancy_id),
        notes: formData.notes || '',
        interview_date: formData.interview_date || null,
      };

      console.log('📤 Submitting application:', submitData);

      const response = await api.post('/applications', submitData);
      
      if (response.data?.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          navigate('/applications');
        }, 1500);
      } else {
        setError(response.data?.message || 'Failed to create application');
      }
    } catch (err) {
      console.error('Error creating application:', err);
      if (err.response?.data?.errors) {
        const errorMessages = Object.values(err.response.data.errors).flat().join(', ');
        setError(errorMessages);
      } else {
        setError(err.response?.data?.message || 'Failed to create application');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
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
        <IconButton onClick={() => navigate('/applications')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Create Application
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
          ✅ Application created successfully! Redirecting...
        </Alert>
      )}

      {/* Info Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <PersonIcon sx={{ color: '#6366f1', fontSize: 32 }} />
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Available Candidates
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {candidates.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <WorkIcon sx={{ color: '#10b981', fontSize: 32 }} />
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Open Vacancies
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {vacancies.filter(v => v.status === 'open').length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Form */}
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
            Application Details
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            {/* Candidate Selection */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Select Candidate *</InputLabel>
                <Select
                  name="candidate_id"
                  value={formData.candidate_id}
                  onChange={handleChange}
                  label="Select Candidate *"
                  required
                  disabled={loading}
                >
                  <MenuItem value="">Choose a candidate</MenuItem>
                  {candidates.map(c => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} - {c.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {selectedCandidate && (
                <Box sx={{ mt: 1, p: 1.5, bgcolor: '#f8fafc', borderRadius: 1 }}>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="textSecondary">
                      Selected Candidate
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {selectedCandidate.first_name} {selectedCandidate.last_name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Position: {selectedCandidate.position_applied || 'Not specified'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Status: {selectedCandidate.status || 'New'}
                    </Typography>
                  </Stack>
                </Box>
              )}
            </Grid>

            {/* Vacancy Selection */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Select Vacancy *</InputLabel>
                <Select
                  name="vacancy_id"
                  value={formData.vacancy_id}
                  onChange={handleChange}
                  label="Select Vacancy *"
                  required
                  disabled={loading}
                >
                  <MenuItem value="">Choose a vacancy</MenuItem>
                  {vacancies.map(v => (
                    <MenuItem key={v.id} value={v.id}>
                      {v.title} - {v.department?.name || 'No Dept'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {selectedVacancy && (
                <Box sx={{ mt: 1, p: 1.5, bgcolor: '#f8fafc', borderRadius: 1 }}>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="textSecondary">
                      Selected Vacancy
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {selectedVacancy.title}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Department: {selectedVacancy.department?.name || 'Not specified'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Status: {selectedVacancy.status || 'Open'}
                    </Typography>
                  </Stack>
                </Box>
              )}
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes / Additional Information"
                name="notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                disabled={loading}
                placeholder="Add any notes about this application..."
              />
            </Grid>

            {/* Interview Date */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Interview Date (Optional)"
                name="interview_date"
                value={formData.interview_date}
                onChange={handleChange}
                disabled={loading}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Summary */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="textSecondary">Candidate</Typography>
                    <Typography variant="body2">
                      {formData.candidate_id ? 
                        candidates.find(c => c.id === parseInt(formData.candidate_id))?.first_name + ' ' + 
                        candidates.find(c => c.id === parseInt(formData.candidate_id))?.last_name 
                        : 'Not selected'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="textSecondary">Vacancy</Typography>
                    <Typography variant="body2">
                      {formData.vacancy_id ? 
                        vacancies.find(v => v.id === parseInt(formData.vacancy_id))?.title 
                        : 'Not selected'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="textSecondary">Status</Typography>
                    <Chip 
                      label="Pending" 
                      size="small" 
                      color="warning"
                      sx={{ mt: 0.5 }}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>

          {/* Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/applications')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading || !formData.candidate_id || !formData.vacancy_id}
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              {loading ? 'Creating...' : 'Create Application'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default ApplicationCreate;