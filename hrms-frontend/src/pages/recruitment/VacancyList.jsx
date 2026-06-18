// src/pages/recruitment/VacancyList.jsx
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
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/axios';
import { formatDate } from '../../utils/dateFormat';

const VacancyList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vacancies, setVacancies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, vacancy: null });

  useEffect(() => {
    fetchVacancies();
  }, []);

  const fetchVacancies = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/vacancies');
      
      let data = [];
      if (response.data?.status === 'success') {
        if (response.data.data?.data && Array.isArray(response.data.data.data)) {
          data = response.data.data.data;
        } else if (Array.isArray(response.data.data)) {
          data = response.data.data;
        }
      } else if (Array.isArray(response.data)) {
        data = response.data;
      }
      
      setVacancies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching vacancies:', err);
      setError(err.response?.data?.message || 'Failed to fetch vacancies');
      setVacancies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/vacancies/${deleteDialog.vacancy.id}`);
      setDeleteDialog({ open: false, vacancy: null });
      fetchVacancies();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete vacancy');
    }
  };

  const filteredVacancies = vacancies.filter(v =>
    v.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.department?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">💼 Job Vacancies</Typography>
          <Typography variant="body2" color="textSecondary">Manage open positions and job postings</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/vacancies/create')}>Add Vacancy</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search vacancies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm('')}><ClearIcon fontSize="small" /></IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Applicants</TableCell>
              <TableCell>Posted Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center"><CircularProgress /></TableCell></TableRow>
            ) : filteredVacancies.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">No vacancies found</TableCell></TableRow>
            ) : (
              filteredVacancies.map((vacancy) => (
                <TableRow key={vacancy.id} hover>
                  <TableCell><Typography variant="body2" fontWeight="medium">{vacancy.title || '-'}</Typography></TableCell>
                  <TableCell>{vacancy.department?.name || '-'}</TableCell>
                  <TableCell>
                    <Chip label={vacancy.status || 'unknown'} color={vacancy.status === 'open' ? 'success' : vacancy.status === 'closed' ? 'error' : 'default'} size="small" />
                  </TableCell>
                  <TableCell>{vacancy.applicants_count || vacancy.applications?.length || 0}</TableCell>
                  <TableCell>{formatDate(vacancy.created_at)}</TableCell>
                  <TableCell>
                    <Tooltip title="View">
                      <IconButton size="small" color="info" onClick={() => navigate(`/vacancies/${vacancy.id}`)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" color="primary" onClick={() => navigate(`/vacancies/${vacancy.id}/edit`)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, vacancy })}>
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

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, vacancy: null })}>
        <DialogTitle>Delete Vacancy</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete "{deleteDialog.vacancy?.title}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, vacancy: null })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VacancyList;