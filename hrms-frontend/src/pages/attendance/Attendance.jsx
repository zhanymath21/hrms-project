// src/pages/attendance/Attendance.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Stack,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Avatar,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Snackbar,
} from '@mui/material';
import {
  Login as LoginIcon,
  Logout as LogoutIcon,
  LocationOn as LocationIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  History as HistoryIcon,
  Today as TodayIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useAttendance } from '../contexts/AttendanceContext';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatTime } from '../../utils/dateFormat';
import MonthlyReport from './components/MonthlyReport';

const Attendance = () => {
  const { user } = useAuth();
  const { 
    todayAttendance, 
    activeSchedule,
    officeLocations,
    loading, 
    error, 
    getTodayAttendance, 
    checkIn, 
    checkOut,
    getMonthlyReport,
    canPerformAttendance,
  } = useAttendance();
  
  const [tabValue, setTabValue] = useState(0);
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkOutLoading, setCheckOutLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [scheduleValid, setScheduleValid] = useState(true);
  const [scheduleError, setScheduleError] = useState(null);
  const [officeValid, setOfficeValid] = useState(true);
  const [officeError, setOfficeError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [currentTime, setCurrentTime] = useState(new Date());
  const intervalRef = useRef();

  // Update current time every second
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    initializeAttendance();
    
    // Auto refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      getTodayAttendance();
    }, 3000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  const initializeAttendance = async () => {
    try {
      const { schedule, offices } = await canPerformAttendance();
      
      setScheduleValid(!!schedule);
      setOfficeValid(offices && offices.length > 0);
      
      await getTodayAttendance();
      getCurrentLocation();
      
    } catch (err) {
      console.error('Initialization error:', err);
      if (err.message && err.message.includes('jadwal kerja')) {
        setScheduleValid(false);
        setScheduleError(err.message);
      } else if (err.message && err.message.includes('lokasi kantor')) {
        setOfficeValid(false);
        setOfficeError(err.message);
      }
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          console.error('Location error:', error);
          setLocationError('Unable to get location. Please enable GPS.');
        }
      );
    } else {
      setLocationError('Geolocation is not supported by this browser.');
    }
  };

  const handleCheckIn = async () => {
    try {
      setCheckInLoading(true);
      const data = {
        method: 'web',
        latitude: location?.latitude,
        longitude: location?.longitude,
        location: 'Office',
      };

      const result = await checkIn(data);
      
      // Show success message
      setSnackbar({
        open: true,
        message: result?.message || 'Check-in successful!',
        severity: 'success'
      });
      
      setCheckInDialogOpen(false);
      
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || 'Check-in failed',
        severity: 'error'
      });
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setCheckOutLoading(true);
      const data = {
        method: 'web',
        location: 'Office',
      };

      const result = await checkOut(data);
      
      // Show success message
      setSnackbar({
        open: true,
        message: result?.message || 'Check-out successful!',
        severity: 'success'
      });
      
      setCheckOutDialogOpen(false);
      
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || 'Check-out failed',
        severity: 'error'
      });
    } finally {
      setCheckOutLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    if (newValue === 1) {
      getMonthlyReport();
    }
  };

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  // Show validation errors
  if (!scheduleValid || !officeValid) {
    return (
      <Box>
        <Typography variant="h4" component="h1" fontWeight="bold" mb={3}>
          Attendance
        </Typography>
        
        <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <ErrorIcon sx={{ fontSize: 48 }} />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Cannot Access Attendance
                </Typography>
                {scheduleError && (
                  <Typography variant="body2">
                    • {scheduleError}
                  </Typography>
                )}
                {officeError && (
                  <Typography variant="body2">
                    • {officeError}
                  </Typography>
                )}
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Please contact HR administrator to resolve this issue.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Attendance
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => getTodayAttendance()}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Active Schedule Info */}
      {activeSchedule && activeSchedule.work_schedule && (
        <Alert severity="info" icon={<ScheduleIcon />} sx={{ mb: 2 }}>
          <strong>Active Schedule:</strong> {activeSchedule.work_schedule.name} • 
          Start: {activeSchedule.work_schedule.start_time} - End: {activeSchedule.work_schedule.end_time}
          {activeSchedule.work_schedule.break_start_time && ` • Break: ${activeSchedule.work_schedule.break_start_time} - ${activeSchedule.work_schedule.break_end_time}`}
        </Alert>
      )}

      {/* Office Locations Info */}
      {officeLocations && officeLocations.length > 0 && (
        <Alert severity="info" icon={<BusinessIcon />} sx={{ mb: 2 }}>
          You can check-in from {officeLocations.length} office location(s)
        </Alert>
      )}

      {/* Location Warning */}
      {locationError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {locationError}
        </Alert>
      )}

      {/* Today's Attendance Card */}
      <Card sx={{ mb: 3, bgcolor: 'primary.main', color: 'white' }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" gutterBottom>
                Today's Attendance
              </Typography>
              <Typography variant="body2">
                {formatDate(new Date())}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
              <TodayIcon />
            </Avatar>
          </Stack>

          <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />

          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Current Time
              </Typography>
              <Typography variant="h5">
                {formatCurrentTime()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Status
              </Typography>
              <Chip 
                label={todayAttendance?.attendance?.status?.toUpperCase() || 'NOT STARTED'}
                size="small"
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 'bold'
                }}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Total Hours
              </Typography>
              <Typography variant="h6">
                {todayAttendance?.attendance?.total_hours || 0} hrs
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Overtime
              </Typography>
              <Typography variant="h6">
                {todayAttendance?.attendance?.overtime_hours || 0} hrs
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Total Sessions
              </Typography>
              <Typography variant="h6">
                {todayAttendance?.attendance?.total_sessions || 0} / 2
              </Typography>
            </Box>
          </Stack>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            {todayAttendance?.can_checkin && (
              <Button
                variant="contained"
                startIcon={checkInLoading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                onClick={() => setCheckInDialogOpen(true)}
                disabled={checkInLoading}
                sx={{ 
                  bgcolor: 'white', 
                  color: 'primary.main',
                  '&:hover': { bgcolor: '#f5f5f5' }
                }}
              >
                {checkInLoading ? 'Checking In...' : `Check In Session #${todayAttendance?.next_session_number || 1}`}
              </Button>
            )}
            
            {todayAttendance?.can_checkout && (
              <Button
                variant="contained"
                startIcon={checkOutLoading ? <CircularProgress size={20} color="inherit" /> : <LogoutIcon />}
                onClick={() => setCheckOutDialogOpen(true)}
                disabled={checkOutLoading}
                sx={{ 
                  bgcolor: 'white', 
                  color: 'warning.main',
                  '&:hover': { bgcolor: '#f5f5f5' }
                }}
              >
                {checkOutLoading ? 'Checking Out...' : `Check Out Session #${todayAttendance?.active_session_number}`}
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Today's Sessions - Live Update */}
      {todayAttendance?.attendance?.sessions?.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Today's Sessions
            </Typography>
            <Stack spacing={2}>
              {todayAttendance.attendance.sessions.map((session) => (
                <Paper key={session.session_number} sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Session #{session.session_number}
                      </Typography>
                      <Stack direction="row" spacing={3} mt={1}>
                        <Box>
                          <Typography variant="caption" color="textSecondary">
                            Check In
                          </Typography>
                          <Typography variant="body2">
                            {formatTime(session.check_in_time)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="textSecondary">
                            Check Out
                          </Typography>
                          <Typography variant="body2">
                            {formatTime(session.check_out_time) || 'In Progress'}
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
                      </Stack>
                    </Box>
                    {session.is_late && (
                      <Chip
                        icon={<WarningIcon />}
                        label={`Late: ${session.late_minutes} min`}
                        color="warning"
                        size="small"
                      />
                    )}
                    {session.status === 'completed' && (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Completed"
                        color="success"
                        size="small"
                      />
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Reports */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab icon={<TodayIcon />} label="Today" />
          <Tab icon={<HistoryIcon />} label="Monthly Report" />
        </Tabs>
      </Paper>

      {/* Monthly Report Tab */}
      {tabValue === 1 && <MonthlyReport />}

      {/* Check-in Dialog */}
      <Dialog open={checkInDialogOpen} onClose={() => setCheckInDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Check In - Session #{todayAttendance?.next_session_number || 1}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              <strong>Schedule:</strong> {activeSchedule?.work_schedule?.start_time} - {activeSchedule?.work_schedule?.end_time}
              {activeSchedule?.work_schedule?.break_start_time && ` (Break: ${activeSchedule.work_schedule.break_start_time} - ${activeSchedule.work_schedule.break_end_time})`}
            </Alert>
            
            {location && (
              <Alert severity="success" icon={<LocationIcon />}>
                Location detected ✓
              </Alert>
            )}

            {!location && !locationError && (
              <LinearProgress />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckInDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCheckIn} variant="contained" color="primary" disabled={checkInLoading}>
            {checkInLoading ? <CircularProgress size={24} /> : 'Confirm Check In'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Check-out Dialog */}
      <Dialog open={checkOutDialogOpen} onClose={() => setCheckOutDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Check Out - Session #{todayAttendance?.active_session_number}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">
              Are you sure you want to check out?
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckOutDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCheckOut} variant="contained" color="warning" disabled={checkOutLoading}>
            {checkOutLoading ? <CircularProgress size={24} /> : 'Confirm Check Out'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Attendance;