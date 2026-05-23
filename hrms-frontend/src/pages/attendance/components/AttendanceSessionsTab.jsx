// src/pages/attendance/components/AttendanceSessionsTab.jsx
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
  Typography,
  Chip,
  IconButton,
  Avatar,
  Stack,
  CircularProgress,
  Alert,
  Tooltip,
  TextField,
  InputAdornment,
  Button,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  AccessTime as AccessTimeIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { useAttendance } from '../../contexts/AttendanceContext';
import { formatDate, formatTime } from '../../../utils/dateFormat';

const AttendanceSessionsTab = () => {
  const { attendanceSessions, loading, fetchAttendanceSessions } = useAttendance();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAttendanceSessions();
  }, []);

  const getSessionStatusColor = (status) => {
    const colors = {
      ongoing: 'warning',
      completed: 'success',
      cancelled: 'error',
    };
    return colors[status] || 'default';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search sessions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Sessions Grid */}
      <Grid container spacing={2}>
        {attendanceSessions.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="textSecondary">No attendance sessions found</Typography>
            </Paper>
          </Grid>
        ) : (
          attendanceSessions.map((session) => (
            <Grid item xs={12} md={6} lg={4} key={session.id}>
              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1" fontWeight="bold">
                        Session #{session.session_number}
                      </Typography>
                      <Chip
                        label={session.status?.toUpperCase()}
                        color={getSessionStatusColor(session.status)}
                        size="small"
                      />
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                        {session.employee?.first_name?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {session.employee?.first_name} {session.employee?.last_name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {session.employee?.employee_id}
                        </Typography>
                      </Box>
                    </Box>

                    <Box display="flex" justifyContent="space-between">
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Check In
                        </Typography>
                        <Typography variant="body2">
                          {formatTime(session.check_in_time)}
                        </Typography>
                        {session.is_late && (
                          <Chip
                            icon={<WarningIcon />}
                            label={`Late: ${session.late_minutes} min`}
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Check Out
                        </Typography>
                        <Typography variant="body2">
                          {formatTime(session.check_out_time) || '-'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Duration
                        </Typography>
                        <Typography variant="body2">
                          {session.session_hours} hrs
                        </Typography>
                      </Box>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Location
                      </Typography>
                      <Typography variant="body2" display="flex" alignItems="center" gap={0.5}>
                        <LocationIcon fontSize="small" />
                        {session.check_in_location || 'Unknown'}
                      </Typography>
                    </Box>

                    <Box display="flex" gap={1}>
                      <Tooltip title="View Details">
                        <IconButton size="small" color="info">
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {session.check_in_method && (
                        <Chip
                          icon={session.check_in_method === 'mobile' ? <LoginIcon /> : <LoginIcon />}
                          label={session.check_in_method}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
};

export default AttendanceSessionsTab;