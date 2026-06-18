// src/pages/recruitment/OnboardingList.jsx
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
  LinearProgress,
} from '@mui/material';
import { Refresh as RefreshIcon, CheckCircle as CheckCircleIcon, Pending as PendingIcon } from '@mui/icons-material';
import api from '../../services/axios';
import { formatDate } from '../../utils/dateFormat';

const OnboardingList = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [onboardingList, setOnboardingList] = useState([]);

  useEffect(() => {
    fetchOnboardingList();
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
      } else if (Array.isArray(response.data)) {
        data = response.data;
      }
      
      setOnboardingList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching onboarding list:', err);
      setError(err.response?.data?.message || 'Failed to fetch onboarding list');
      setOnboardingList([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      in_progress: 'info',
      completed: 'success',
      cancelled: 'error',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return labels[status] || status || 'Unknown';
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">🎯 Onboarding</Typography>
          <Typography variant="body2" color="textSecondary">New employee onboarding process</Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchOnboardingList} disabled={loading}>
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Position</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center"><CircularProgress /></TableCell></TableRow>
            ) : onboardingList.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center">No onboarding records found</TableCell></TableRow>
            ) : (
              onboardingList.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    {item.employee?.first_name} {item.employee?.last_name}
                    {item.candidate && (
                      <Typography variant="caption" display="block" color="textSecondary">
                        Candidate: {item.candidate?.first_name} {item.candidate?.last_name}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{item.position_title || item.position?.title || '-'}</TableCell>
                  <TableCell>{formatDate(item.start_date)}</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LinearProgress variant="determinate" value={item.progress || 0} sx={{ flex: 1, height: 8, borderRadius: 4 }} />
                      <Typography variant="caption">{item.progress || 0}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(item.status)}
                      color={getStatusColor(item.status)}
                      size="small"
                      icon={item.status === 'completed' ? <CheckCircleIcon /> : <PendingIcon />}
                    />
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

export default OnboardingList;