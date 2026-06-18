// src/pages/recruitment/CandidateList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Button,
  Typography,
  InputAdornment,
  Avatar,
  Stack,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  Description as DescriptionIcon,
  Download as DownloadIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationOnIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  FileCopy as FileCopyIcon,
  // 🔥 TAMBAHKAN INI
  PersonAdd as PersonAddIcon,  // 🔥 Yang ini hilang!
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/axios';
import { formatDate } from '../../utils/dateFormat';

// Status options
const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'info' },
  { value: 'screening', label: 'Screening', color: 'primary' },
  { value: 'interview', label: 'Interview', color: 'warning' },
  { value: 'technical_test', label: 'Technical Test', color: 'secondary' },
  { value: 'hr_interview', label: 'HR Interview', color: 'info' },
  { value: 'offer', label: 'Offer', color: 'success' },
  { value: 'hired', label: 'Hired', color: 'success' },
  { value: 'rejected', label: 'Rejected', color: 'error' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'default' },
];

const StatCard = ({ title, value, icon, color = 'primary' }) => (
  <Card>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="body2">
            {title}
          </Typography>
          <Typography variant="h4" component="div" fontWeight="bold">
            {value}
          </Typography>
        </Box>
        <Box sx={{ color, fontSize: 40, opacity: 0.5 }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const CandidateList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    per_page: 15,
    current_page: 1,
    last_page: 1,
  });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Dialog
  const [deleteDialog, setDeleteDialog] = useState({ open: false, candidate: null });
  const [cvDialog, setCvDialog] = useState({ open: false, candidate: null });

  // Fetch candidates
  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: page + 1,
        per_page: rowsPerPage,
        search: searchTerm,
        status: filterStatus,
      };

      const response = await api.get('/candidates', { params });
      
      if (response.data?.status === 'success') {
        setCandidates(response.data.data.data || []);
        setPagination({
          total: response.data.data.total || 0,
          per_page: response.data.data.per_page || rowsPerPage,
          current_page: response.data.data.current_page || 1,
          last_page: response.data.data.last_page || 1,
        });
      }
    } catch (err) {
      console.error('Error fetching candidates:', err);
      setError(err.response?.data?.message || 'Failed to fetch candidates');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchTerm, filterStatus]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Delete candidate
  const handleDelete = async () => {
    try {
      await api.delete(`/candidates/${deleteDialog.candidate.id}`);
      setDeleteDialog({ open: false, candidate: null });
      fetchCandidates();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete candidate');
    }
  };

  // Get status chip
  const getStatusChip = (status) => {
    const option = STATUS_OPTIONS.find(s => s.value === status);
    return (
      <Chip
        label={option?.label || status}
        color={option?.color || 'default'}
        size="small"
      />
    );
  };

  // Statistics
  const stats = {
    total: pagination.total || 0,
    new: candidates.filter(c => c.status === 'new').length,
    interview: candidates.filter(c => c.status === 'interview' || c.status === 'hr_interview').length,
    hired: candidates.filter(c => c.status === 'hired').length,
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            👥 Candidates
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage job candidates and their applications
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchCandidates}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/candidates/create')}
          >
            Add Candidate
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Total Candidates" 
            value={stats.total} 
            icon={<PersonAddIcon />}
            color="#3b82f6"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="New" 
            value={stats.new} 
            icon={<PendingIcon />}
            color="#f59e0b"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="In Interview" 
            value={stats.interview} 
            icon={<PhoneIcon />}
            color="#8b5cf6"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Hired" 
            value={stats.hired} 
            icon={<CheckCircleIcon />}
            color="#10b981"
          />
        </Grid>
      </Grid>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {STATUS_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('');
                setPage(0);
              }}
              disabled={!searchTerm && !filterStatus}
            >
              Clear
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell>Candidate</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Position</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Applied Date</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {candidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  {loading ? <CircularProgress size={40} /> : 'No candidates found'}
                </TableCell>
              </TableRow>
            ) : (
              candidates.map((candidate) => (
                <TableRow key={candidate.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar src={candidate.photo} sx={{ bgcolor: '#ec4899' }}>
                        {candidate.first_name?.[0]}{candidate.last_name?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {candidate.first_name} {candidate.last_name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {candidate.email}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{candidate.phone || '-'}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {candidate.location || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {candidate.position_applied || candidate.position?.title || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {getStatusChip(candidate.status)}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(candidate.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="View CV">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => setCvDialog({ open: true, candidate })}
                        >
                          <DescriptionIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => navigate(`/candidates/${candidate.id}`)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => navigate(`/candidates/${candidate.id}/edit`)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteDialog({ open: true, candidate })}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[15, 25, 50]}
          component="div"
          count={pagination.total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, candidate: null })}>
        <DialogTitle>Delete Candidate</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {deleteDialog.candidate?.first_name} {deleteDialog.candidate?.last_name}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, candidate: null })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* CV Dialog */}
      <Dialog 
        open={cvDialog.open} 
        onClose={() => setCvDialog({ open: false, candidate: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          📄 CV - {cvDialog.candidate?.first_name} {cvDialog.candidate?.last_name}
        </DialogTitle>
        <DialogContent>
          {cvDialog.candidate?.cv_url ? (
            <Box sx={{ height: 500, width: '100%' }}>
              <iframe
                src={cvDialog.candidate.cv_url}
                title="CV Preview"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </Box>
          ) : (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <DescriptionIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography color="textSecondary">No CV uploaded</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {cvDialog.candidate?.cv_url && (
            <Button
              startIcon={<DownloadIcon />}
              href={cvDialog.candidate.cv_url}
              download
            >
              Download CV
            </Button>
          )}
          <Button onClick={() => setCvDialog({ open: false, candidate: null })}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CandidateList;