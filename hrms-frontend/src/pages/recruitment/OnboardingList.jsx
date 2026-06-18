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
      const response = await api.get('/onboarding');
      if (response.data?.status === 'success') {
        setOnboardingList(response.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch onboarding list');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            🎯 Onboarding
          </Typography>
          <Typography variant="body2" color="textSecondary">
            New employee onboarding process
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchOnboardingList}>
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
                  </TableCell>
                  <TableCell>{item.position || '-'}</TableCell>
                  <TableCell>{formatDate(item.start_date)}</TableCell>
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
                  <TableCell>
                    <Chip
                      label={item.status}
                      color={item.status === 'completed' ? 'success' : 'warning'}
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