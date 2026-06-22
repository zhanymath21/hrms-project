// src/pages/safety/LostTimeInjuryList.jsx
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
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Stack,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Healing as HealingIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/axios';
import { formatDate } from '../../utils/dateFormat';

const STATUS_CONFIG = {
  reported: { label: 'Reported', bgColor: '#f59e0b', textColor: '#ffffff' },
  under_investigation: { label: 'Under Investigation', bgColor: '#3b82f6', textColor: '#ffffff' },
  in_review: { label: 'In Review', bgColor: '#8b5cf6', textColor: '#ffffff' },
  resolved: { label: 'Resolved', bgColor: '#10b981', textColor: '#ffffff' },
  closed: { label: 'Closed', bgColor: '#6b7280', textColor: '#ffffff' },
  rejected: { label: 'Rejected', bgColor: '#ef4444', textColor: '#ffffff' },
};

const SEVERITY_CONFIG = {
  minor: { label: 'Minor', color: '#10b981' },
  moderate: { label: 'Moderate', color: '#f59e0b' },
  severe: { label: 'Severe', color: '#f97316' },
  critical: { label: 'Critical', color: '#ef4444' },
};

const STATUS_OPTIONS = [
  'reported', 'under_investigation', 'in_review', 'resolved', 'closed', 'rejected'
];

const LostTimeInjuryList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ltis, setLtis] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, title: '' });
  
  // Get current user role
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = currentUser?.role || '';
  const isAdmin = ['admin', 'hr', 'super_admin'].includes(userRole);

  useEffect(() => {
    fetchLtis();
    fetchStats();
  }, []);

  const fetchLtis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      
      const response = await api.get('/lost-time-injuries', { params });
      
      let data = [];
      if (response.data?.status === 'success') {
        if (response.data.data?.data && Array.isArray(response.data.data.data)) {
          data = response.data.data.data;
        } else if (Array.isArray(response.data.data)) {
          data = response.data.data;
        }
      }
      
      setLtis(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.message || 'Failed to fetch data');
      setLtis([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/lost-time-injuries/stats');
      if (response.data?.status === 'success') {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/lost-time-injuries/${deleteDialog.id}`);
      setDeleteDialog({ open: false, id: null, title: '' });
      await fetchLtis();
      await fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    fetchLtis();
  };

  const handleClearFilters = () => {
    setFilters({ status: '', search: '' });
    setTimeout(fetchLtis, 100);
  };

  const renderStatusChip = (status) => {
    const config = STATUS_CONFIG[status];
    if (!config) return <Chip label={status || 'Unknown'} size="small" />;
    return (
      <Chip
        label={config.label}
        size="small"
        sx={{
          backgroundColor: config.bgColor,
          color: config.textColor,
          fontWeight: 600,
        }}
      />
    );
  };

  const renderSeverityChip = (severity) => {
    const config = SEVERITY_CONFIG[severity];
    if (!config) return <Chip label={severity || 'Unknown'} size="small" />;
    return (
      <Chip
        label={config.label}
        size="small"
        sx={{
          backgroundColor: config.color,
          color: '#ffffff',
          fontWeight: 600,
        }}
      />
    );
  };

  const isFinalStatus = (status) => {
    return ['resolved', 'closed', 'rejected'].includes(status);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            🏥 Lost Time Injury
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage workplace injuries and lost time incidents
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/lost-time-injuries/create')}
          >
            Report Injury
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchLtis}>
            Refresh
          </Button>
        </Box>
      </Box>

      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="textSecondary">Total Incidents</Typography>
                <Typography variant="h5" fontWeight="bold">{stats.total || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="textSecondary">Total Days Lost</Typography>
                <Typography variant="h5" fontWeight="bold" color="error.main">
                  {stats.total_days_lost || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="textSecondary">Critical Injuries</Typography>
                <Typography variant="h5" fontWeight="bold" color="error.main">
                  {stats.by_severity?.find(s => s.severity === 'critical')?.count || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="textSecondary">Under Investigation</Typography>
                <Typography variant="h5" fontWeight="bold" color="warning.main">
                  {stats.by_status?.find(s => s.status === 'under_investigation')?.count || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="Search"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by title or description..."
              InputProps={{
                endAdornment: (
                  <IconButton size="small" onClick={handleSearch}>
                    <SearchIcon />
                  </IconButton>
                ),
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                label="Status"
              >
                <MenuItem value="">All Statuses</MenuItem>
                {STATUS_OPTIONS.map(status => (
                  <MenuItem key={status} value={status}>
                    {STATUS_CONFIG[status]?.label || status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box display="flex" gap={1}>
              <Button variant="contained" onClick={handleSearch} startIcon={<SearchIcon />} fullWidth>
                Search
              </Button>
              <Button variant="outlined" onClick={handleClearFilters} startIcon={<ClearIcon />} fullWidth>
                Clear
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Employee</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Days Lost</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center"><CircularProgress /></TableCell>
              </TableRow>
            ) : ltis.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="textSecondary">No lost time injury records found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              ltis.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>#{item.id}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {item.employee?.first_name} {item.employee?.last_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                      {item.title}
                    </Typography>
                  </TableCell>
                  <TableCell>{renderSeverityChip(item.severity)}</TableCell>
                  <TableCell>
                    <Chip
                      label={item.days_lost || 0}
                      size="small"
                      color={item.days_lost > 30 ? 'error' : item.days_lost > 7 ? 'warning' : 'default'}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>{formatDate(item.injury_date)}</TableCell>
                  <TableCell>{renderStatusChip(item.status)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => navigate(`/lost-time-injuries/${item.id}`)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={isFinalStatus(item.status) ? 'Cannot edit - Record is ' + item.status : 'Edit'}>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/lost-time-injuries/${item.id}/edit`)}
                          disabled={isFinalStatus(item.status)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={!isAdmin ? 'Only Admin/HR can delete' : isFinalStatus(item.status) ? 'Cannot delete - Record is ' + item.status : 'Delete'}>
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            if (!isAdmin) {
                              alert('Only Admin or HR can delete this record.');
                              return;
                            }
                            if (isFinalStatus(item.status)) {
                              alert('Cannot delete this record. Status is already ' + item.status);
                              return;
                            }
                            setDeleteDialog({ open: true, id: item.id, title: item.title });
                          }}
                          disabled={!isAdmin || isFinalStatus(item.status)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, title: '' })}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the lost time injury record "{deleteDialog.title}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null, title: '' })}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LostTimeInjuryList;