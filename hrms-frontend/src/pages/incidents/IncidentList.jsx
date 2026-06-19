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
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/axios';
import { formatDate } from '../../utils/dateFormat';

// Status Configuration
const STATUS_CONFIG = {
  reported: { label: 'Reported', bgColor: '#f59e0b', textColor: '#ffffff' },
  under_investigation: { label: 'Under Investigation', bgColor: '#3b82f6', textColor: '#ffffff' },
  in_review: { label: 'In Review', bgColor: '#8b5cf6', textColor: '#ffffff' },
  resolved: { label: 'Resolved', bgColor: '#10b981', textColor: '#ffffff' },
  closed: { label: 'Closed', bgColor: '#6b7280', textColor: '#ffffff' },
  rejected: { label: 'Rejected', bgColor: '#ef4444', textColor: '#ffffff' },
};

const SEVERITY_CONFIG = {
  low: { label: 'Low', color: '#10b981' },
  medium: { label: 'Medium', color: '#f59e0b' },
  high: { label: 'High', color: '#f97316' },
  critical: { label: 'Critical', color: '#ef4444' },
};

const CATEGORY_OPTIONS = [
  'safety', 'security', 'health', 'property_damage', 'environmental',
  'harassment', 'discrimination', 'fraud', 'theft', 'data_breach',
  'policy_violation', 'workplace_violence', 'accident', 'near_miss', 'other'
];

const STATUS_OPTIONS = [
  'reported', 'under_investigation', 'in_review', 'resolved', 'closed', 'rejected'
];

const IncidentList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    severity: '',
    search: '',
  });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, title: '' });

  useEffect(() => {
    fetchIncidents();
    fetchStats();
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.severity) params.severity = filters.severity;
      if (filters.search) params.search = filters.search;
      
      const response = await api.get('/incident-reports', { params });
      
      let data = [];
      if (response.data?.status === 'success') {
        if (response.data.data?.data && Array.isArray(response.data.data.data)) {
          data = response.data.data.data;
        } else if (Array.isArray(response.data.data)) {
          data = response.data.data;
        }
      }
      
      setIncidents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.message || 'Failed to fetch incidents');
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/incident-reports/stats');
      if (response.data?.status === 'success') {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/incident-reports/${deleteDialog.id}`);
      setDeleteDialog({ open: false, id: null, title: '' });
      await fetchIncidents();
      await fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete incident');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    fetchIncidents();
  };

  const handleClearFilters = () => {
    setFilters({ status: '', category: '', severity: '', search: '' });
    setTimeout(fetchIncidents, 100);
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

  const getCategoryLabel = (category) => {
    const labels = {
      safety: 'Safety',
      security: 'Security',
      health: 'Health',
      property_damage: 'Property Damage',
      environmental: 'Environmental',
      harassment: 'Harassment',
      discrimination: 'Discrimination',
      fraud: 'Fraud',
      theft: 'Theft',
      data_breach: 'Data Breach',
      policy_violation: 'Policy Violation',
      workplace_violence: 'Workplace Violence',
      accident: 'Accident',
      near_miss: 'Near Miss',
      other: 'Other',
    };
    return labels[category] || category;
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            🚨 Incident Reports
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage and track workplace incidents
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/incident-reports/create')}
          >
            Report Incident
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchIncidents}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="textSecondary">Total</Typography>
                <Typography variant="h5" fontWeight="bold">{stats.total || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="textSecondary">Under Investigation</Typography>
                <Typography variant="h5" fontWeight="bold" color="info.main">
                  {stats.under_investigation || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="textSecondary">Pending Approval</Typography>
                <Typography variant="h5" fontWeight="bold" color="warning.main">
                  {stats.pending_approval || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="textSecondary">Resolved This Month</Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  {stats.resolved_this_month || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="textSecondary">Critical</Typography>
                <Typography variant="h5" fontWeight="bold" color="error.main">
                  {stats.critical_incidents || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
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
          <Grid item xs={12} sm={3}>
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
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                label="Category"
              >
                <MenuItem value="">All Categories</MenuItem>
                {CATEGORY_OPTIONS.map(category => (
                  <MenuItem key={category} value={category}>
                    {getCategoryLabel(category)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                onClick={handleSearch}
                startIcon={<SearchIcon />}
                fullWidth
              >
                Search
              </Button>
              <Button
                variant="outlined"
                onClick={handleClearFilters}
                startIcon={<ClearIcon />}
                fullWidth
              >
                Clear
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Error */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Reported By</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Approval</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : incidents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography color="textSecondary">No incident reports found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              incidents.map((incident) => (
                <TableRow key={incident.id} hover>
                  <TableCell>#{incident.id}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {incident.title}
                    </Typography>
                  </TableCell>
                  <TableCell>{getCategoryLabel(incident.category)}</TableCell>
                  <TableCell>{renderSeverityChip(incident.severity)}</TableCell>
                  <TableCell>
                    {incident.reported_by?.first_name} {incident.reported_by?.last_name}
                  </TableCell>
                  <TableCell>{formatDate(incident.incident_date)}</TableCell>
                  <TableCell>{renderStatusChip(incident.status)}</TableCell>
                  <TableCell>
                    <Chip
                      label={incident.approval_status?.replace('_', ' ') || 'Pending'}
                      size="small"
                      sx={{
                        backgroundColor: 
                          incident.approval_status === 'approved' ? '#10b981' :
                          incident.approval_status === 'rejected' ? '#ef4444' :
                          incident.approval_status === 'in_progress' ? '#3b82f6' :
                          incident.approval_status === 'partially_approved' ? '#8b5cf6' :
                          '#f59e0b',
                        color: '#ffffff',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/incident-reports/${incident.id}`)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/incident-reports/${incident.id}/edit`)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteDialog({
                          open: true,
                          id: incident.id,
                          title: incident.title
                        })}
                      >
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

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, title: '' })}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the incident report "{deleteDialog.title}"?
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

export default IncidentList;