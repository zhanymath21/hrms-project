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
  Tooltip,
} from '@mui/material';
import { Refresh as RefreshIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import api from '../../services/axios';
import { formatDate } from '../../utils/dateFormat';

const ApplicationList = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/applications');
      if (response.data?.status === 'success') {
        setApplications(response.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      reviewed: 'info',
      interview: 'primary',
      accepted: 'success',
      rejected: 'error',
    };
    return colors[status] || 'default';
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            📋 Applications
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Track all job applications
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchApplications}>
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Candidate</TableCell>
              <TableCell>Position</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Applied Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center"><CircularProgress /></TableCell></TableRow>
            ) : applications.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center">No applications found</TableCell></TableRow>
            ) : (
              applications.map((app) => (
                <TableRow key={app.id} hover>
                  <TableCell>
                    {app.candidate?.first_name} {app.candidate?.last_name}
                  </TableCell>
                  <TableCell>{app.vacancy?.title || '-'}</TableCell>
                  <TableCell>
                    <Chip label={app.status} color={getStatusColor(app.status)} size="small" />
                  </TableCell>
                  <TableCell>{formatDate(app.created_at)}</TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <Button size="small" startIcon={<VisibilityIcon />}>
                        View
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ApplicationList;