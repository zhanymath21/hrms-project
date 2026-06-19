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
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/axios';
import { formatDate } from '../../utils/dateFormat';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'on_hold', label: 'On Hold' },
];

const OnboardingEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    candidate_id: '',
    employee_id: '',
    vacancy_id: '',
    position_title: '',
    start_date: '',
    expected_end_date: '',
    actual_end_date: '',
    status: '',
    progress: 0,
    notes: '',
    tasks: [],
  });
  const [candidates, setCandidates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [vacancies, setVacancies] = useState([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch onboarding data and related data in parallel
      const [onboardingRes, candidatesRes, employeesRes, vacanciesRes] = await Promise.all([
        api.get(`/onboarding/${id}`),
        api.get('/candidates', { params: { per_page: 100 } }),
        api.get('/employees', { params: { per_page: 100 } }),
        api.get('/vacancies', { params: { per_page: 100 } }),
      ]);

      // Set onboarding data
      if (onboardingRes.data?.status === 'success') {
        const data = onboardingRes.data.data;
        setFormData({
          candidate_id: data.candidate_id || '',
          employee_id: data.employee_id || '',
          vacancy_id: data.vacancy_id || '',
          position_title: data.position_title || '',
          start_date: data.start_date || '',
          expected_end_date: data.expected_end_date || '',
          actual_end_date: data.actual_end_date || '',
          status: data.status || 'pending',
          progress: data.progress || 0,
          notes: data.notes || '',
          tasks: data.tasks || [],
        });
      } else {
        setError('Onboarding record not found');
      }

      // Set candidates
      let candidatesData = [];
      if (candidatesRes.data?.status === 'success') {
        if (candidatesRes.data.data?.data && Array.isArray(candidatesRes.data.data.data)) {
          candidatesData = candidatesRes.data.data.data;
        } else if (Array.isArray(candidatesRes.data.data)) {
          candidatesData = candidatesRes.data.data;
        }
      }
      setCandidates(Array.isArray(candidatesData) ? candidatesData : []);

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

      // Set vacancies
      let vacanciesData = [];
      if (vacanciesRes.data?.status === 'success') {
        if (vacanciesRes.data.data?.data && Array.isArray(vacanciesRes.data.data.data)) {
          vacanciesData = vacanciesRes.data.data.data;
        } else if (Array.isArray(vacanciesRes.data.data)) {
          vacanciesData = vacanciesRes.data.data;
        }
      }
      setVacancies(Array.isArray(vacanciesData) ? vacanciesData : []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const submitData = {
        ...formData,
        candidate_id: formData.candidate_id ? parseInt(formData.candidate_id) : null,
        employee_id: formData.employee_id ? parseInt(formData.employee_id) : null,
        vacancy_id: formData.vacancy_id ? parseInt(formData.vacancy_id) : null,
        progress: parseInt(formData.progress) || 0,
      };

      const response = await api.put(`/onboarding/${id}`, submitData);

      if (response.data?.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          navigate(`/onboarding/${id}`);
        }, 1500);
      } else {
        setError(response.data?.message || 'Failed to update onboarding');
      }
    } catch (err) {
      console.error('Error updating onboarding:', err);
      if (err.response?.data?.errors) {
        const errorMessages = Object.values(err.response.data.errors).flat().join(', ');
        setError(errorMessages);
      } else {
        setError(err.response?.data?.message || 'Failed to update onboarding');
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
        <IconButton onClick={() => navigate(`/onboarding/${id}`)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Edit Onboarding
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
          ✅ Onboarding updated successfully! Redirecting...
        </Alert>
      )}

      {/* Form */}
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
            Onboarding Information
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            {/* Candidate Selection */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Candidate *</InputLabel>
                <Select
                  name="candidate_id"
                  value={formData.candidate_id}
                  onChange={handleChange}
                  label="Candidate *"
                  required
                  disabled={saving}
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

            {/* Employee Assignment */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Assign Employee</InputLabel>
                <Select
                  name="employee_id"
                  value={formData.employee_id}
                  onChange={handleChange}
                  label="Assign Employee"
                  disabled={saving}
                >
                  <MenuItem value="">None</MenuItem>
                  {employees.map(e => (
                    <MenuItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Vacancy */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Vacancy</InputLabel>
                <Select
                  name="vacancy_id"
                  value={formData.vacancy_id}
                  onChange={handleChange}
                  label="Vacancy"
                  disabled={saving}
                >
                  <MenuItem value="">None</MenuItem>
                  {vacancies.map(v => (
                    <MenuItem key={v.id} value={v.id}>
                      {v.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Position Title */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Position Title *"
                name="position_title"
                value={formData.position_title}
                onChange={handleChange}
                required
                disabled={saving}
              />
            </Grid>

            {/* Dates */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="Start Date *"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                required
                disabled={saving}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="Expected End Date"
                name="expected_end_date"
                value={formData.expected_end_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                disabled={saving}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="Actual End Date"
                name="actual_end_date"
                value={formData.actual_end_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                disabled={saving}
              />
            </Grid>

            {/* Status */}
            <Grid item xs={12} sm={6}>
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

            {/* Progress */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Progress (%)"
                name="progress"
                value={formData.progress}
                onChange={handleChange}
                InputProps={{ inputProps: { min: 0, max: 100 } }}
                disabled={saving}
                helperText="Enter a value between 0 and 100"
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                multiline
                rows={4}
                value={formData.notes}
                onChange={handleChange}
                disabled={saving}
                placeholder="Additional notes about the onboarding process..."
              />
            </Grid>
          </Grid>

          {/* Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
            <Button
              variant="outlined"
              onClick={() => navigate(`/onboarding/${id}`)}
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

export default OnboardingEdit;