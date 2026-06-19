// src/pages/recruitment/OnboardingCreate.jsx
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
} from '@mui/material';
import { Save as SaveIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/axios';
import { formatDate } from '../../utils/dateFormat';

const OnboardingCreate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const [formData, setFormData] = useState({
    candidate_id: '',
    employee_id: '',
    position_title: '',
    start_date: '',
    status: 'pending',
    progress: 0,
    notes: '',
    tasks: [],
  });

  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      const [candidatesRes, employeesRes] = await Promise.all([
        api.get('/candidates', { params: { status: 'hired', per_page: 100 } }),
        api.get('/employees', { params: { status: 'active', per_page: 100 } }),
      ]);

      // Handle candidates
      let candidatesData = [];
      if (candidatesRes.data?.status === 'success') {
        candidatesData = candidatesRes.data.data?.data || candidatesRes.data.data || [];
      }
      setCandidates(Array.isArray(candidatesData) ? candidatesData : []);

      // Handle employees
      let employeesData = [];
      if (employeesRes.data?.status === 'success') {
        employeesData = employeesRes.data.data?.data || employeesRes.data.data || [];
      }
      setEmployees(Array.isArray(employeesData) ? employeesData : []);

    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addTask = () => {
    if (newTask.trim()) {
      setFormData(prev => ({
        ...prev,
        tasks: [...prev.tasks, newTask.trim()]
      }));
      setNewTask('');
    }
  };

  const removeTask = (index) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post('/onboarding', formData);
      navigate('/onboarding');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create onboarding');
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
      <Box display="flex" alignItems="center" mb={3} gap={2}>
        <IconButton onClick={() => navigate('/onboarding')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Create Onboarding
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Candidate Selection */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Candidate (Hired)</InputLabel>
                <Select
                  name="candidate_id"
                  value={formData.candidate_id}
                  onChange={handleChange}
                  label="Candidate (Hired)"
                >
                  <MenuItem value="">Select Candidate</MenuItem>
                  {candidates.map(c => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} - {c.position_applied}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Employee (Optional) */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Employee (Optional)</InputLabel>
                <Select
                  name="employee_id"
                  value={formData.employee_id}
                  onChange={handleChange}
                  label="Employee (Optional)"
                >
                  <MenuItem value="">Select Employee</MenuItem>
                  {employees.map(e => (
                    <MenuItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} - {e.employee_id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Position Title */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Position Title"
                name="position_title"
                value={formData.position_title}
                onChange={handleChange}
              />
            </Grid>

            {/* Start Date */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
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
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Progress */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Progress (%)"
                name="progress"
                value={formData.progress}
                onChange={handleChange}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>

            {/* Tasks */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Onboarding Tasks
              </Typography>
              <Box display="flex" gap={1} mb={1}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Add task..."
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTask()}
                />
                <Button variant="outlined" onClick={addTask}>
                  Add
                </Button>
              </Box>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {formData.tasks.map((task, index) => (
                  <Chip
                    key={index}
                    label={task}
                    onDelete={() => removeTask(index)}
                    color="primary"
                  />
                ))}
              </Box>
            </Grid>

            {/* Notes */}
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
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
            <Button variant="outlined" onClick={() => navigate('/onboarding')}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={loading} startIcon={<SaveIcon />}>
              {loading ? 'Creating...' : 'Create Onboarding'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default OnboardingCreate;