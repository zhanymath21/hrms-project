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
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/axios';
import { formatDate } from '../../utils/dateFormat';

// Status Configuration
const STATUS_CONFIG = {
  pending: { label: 'Pending', bgColor: '#f59e0b', textColor: '#ffffff' },
  in_progress: { label: 'In Progress', bgColor: '#3b82f6', textColor: '#ffffff' },
  completed: { label: 'Completed', bgColor: '#10b981', textColor: '#ffffff' },
  cancelled: { label: 'Cancelled', bgColor: '#ef4444', textColor: '#ffffff' },
  on_hold: { label: 'On Hold', bgColor: '#8b5cf6', textColor: '#ffffff' },
};

const OnboardingList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [onboardingList, setOnboardingList] = useState([]);
  const [stats, setStats] = useState(null);
  
  // Dialog States
  const [createDialog, setCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    candidate_id: '',
    position_title: '',
    start_date: '',
    expected_end_date: '',
    notes: '',
    tasks: [],
  });
  const [candidates, setCandidates] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOnboardingList();
    fetchStats();
    fetchCandidates();
  }, []);

  const fetchOnboardingList = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/onboarding');
      
      let data = [];
      if (response.data?.status === 'success') {
        if (response.data.data?.data && Array.isArray(response.data.data.data)) {
          data = response.data.data.data;
        } else if (Array.isArray(response.data.data)) {
          data = response.data.data;
        }
      }
      
      setOnboardingList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.message || 'Failed to fetch onboarding list');
      setOnboardingList([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/onboarding/stats');
      if (response.data?.status === 'success') {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchCandidates = async () => {
    try {
      const response = await api.get('/candidates', { params: { per_page: 100 } });
      let data = [];
      if (response.data?.status === 'success') {
        if (response.data.data?.data && Array.isArray(response.data.data.data)) {
          data = response.data.data.data;
        } else if (Array.isArray(response.data.data)) {
          data = response.data.data;
        }
      }
      setCandidates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching candidates:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this onboarding record?')) return;
    
    try {
      await api.delete(`/onboarding/${id}`);
      await fetchOnboardingList();
      await fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await api.post('/onboarding', {
        ...formData,
        candidate_id: parseInt(formData.candidate_id),
        status: 'pending',
      });
      setCreateDialog(false);
      setFormData({ candidate_id: '', position_title: '', start_date: '', expected_end_date: '', notes: '', tasks: [] });
      await fetchOnboardingList();
      await fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusChip = (status) => {
    const config = STATUS_CONFIG[status];
    if (!config) {
      return <Chip label={status || 'Unknown'} size="small" />;
    }
    return (
      <Chip
        label={config.label}
        size="small"
        sx={{
          backgroundColor: config.bgColor,
          color: config.textColor,
          fontWeight: 600,
          '&:hover': { opacity: 0.8 },
        }}
      />
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            🎯 Onboarding
          </Typography>
          <Typography variant="body2" color="textSecondary">
            New employee onboarding process
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialog(true)}
          >
            Create Onboarding
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchOnboardingList}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="textSecondary">Total</Typography>
                <Typography variant="h5" fontWeight="bold">{stats.total}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="textSecondary">Pending</Typography>
                <Typography variant="h5" fontWeight="bold" color="warning.main">{stats.pending}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="textSecondary">In Progress</Typography>
                <Typography variant="h5" fontWeight="bold" color="info.main">{stats.in_progress}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="textSecondary">Completed</Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">{stats.completed}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Candidate</TableCell>
              <TableCell>Position</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center"><CircularProgress /></TableCell>
              </TableRow>
            ) : onboardingList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">No onboarding records found</TableCell>
              </TableRow>
            ) : (
              onboardingList.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {item.candidate?.first_name} {item.candidate?.last_name}
                      </Typography>
                      <Typography variant="caption" display="block" color="textSecondary">
                        {item.candidate?.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{item.position_title || '-'}</TableCell>
                  <TableCell>{formatDate(item.start_date)}</TableCell>
                  <TableCell>
                    {item.actual_end_date 
                      ? formatDate(item.actual_end_date)
                      : item.expected_end_date 
                        ? formatDate(item.expected_end_date) 
                        : '-'}
                  </TableCell>
                  <TableCell sx={{ minWidth: 150 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LinearProgress 
                        variant="determinate" 
                        value={item.progress || 0} 
                        sx={{ flex: 1, height: 8, borderRadius: 4 }} 
                      />
                      <Typography variant="caption">{item.progress || 0}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{renderStatusChip(item.status)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => navigate(`/onboarding/${item.id}`)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => navigate(`/onboarding/${item.id}/edit`)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Create Onboarding
          <IconButton
            sx={{ position: 'absolute', right: 8, top: 8 }}
            onClick={() => setCreateDialog(false)}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              select
              label="Candidate"
              fullWidth
              value={formData.candidate_id}
              onChange={(e) => setFormData({ ...formData, candidate_id: e.target.value })}
              required
            >
              <MenuItem value="">Select Candidate</MenuItem>
              {candidates.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} - {c.email}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Position Title"
              fullWidth
              value={formData.position_title}
              onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
              required
            />

            <TextField
              label="Start Date"
              type="date"
              fullWidth
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
            />

            <TextField
              label="Expected End Date"
              type="date"
              fullWidth
              value={formData.expected_end_date}
              onChange={(e) => setFormData({ ...formData, expected_end_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Notes"
              fullWidth
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting || !formData.candidate_id || !formData.position_title || !formData.start_date}
          >
            {submitting ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OnboardingList;