// src/pages/attendance/components/MyAttendanceTab.jsx
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
  Button,
  Stack,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  QrCodeScanner as QrCodeIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  LocationOn as LocationIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useAttendance } from '../../contexts/AttendanceContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatTime } from '../../../utils/dateFormat';

const MyAttendanceTab = () => {
  const { user } = useAuth();
  const { attendances, loading, fetchAttendances, checkIn, checkOut } = useAttendance();
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);

  useEffect(() => {
    if (user) {
      fetchAttendances({ 
        employee_id: user.id,
        date: formatDate(new Date(), 'yyyy-MM-dd')
      });
    }
  }, [user]);

  useEffect(() => {
    // Find today's attendance
    const today = formatDate(new Date(), 'yyyy-MM-dd');
    const todayData = attendances.find(a => a.date === today);
    setTodayAttendance(todayData);
  }, [attendances]);

  const handleCheckIn = async () => {
    try {
      // Get current location
      navigator.geolocation.getCurrentPosition(async (position) => {
        const data = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          check_in_method: 'web',
        };
        await checkIn(data);
        setCheckInDialogOpen(false);
        fetchAttendances({ employee_id: user.id, date: formatDate(new Date(), 'yyyy-MM-dd') });
      });
    } catch (error) {
      console.error('Check-in failed:', error);
    }
  };

  const handleCheckOut = async () => {
    if (todayAttendance) {
      try {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const data = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            check_out_method: 'web',
          };
          await checkOut(todayAttendance.id, data);
          setCheckOutDialogOpen(false);
          fetchAttendances({ employee_id: user.id, date: formatDate(new Date(), 'yyyy-MM-dd') });
        });
      } catch (error) {
        console.error('Check-out failed:', error);
      }
    }
  };

  const getTodayStatus = () => {
    if (!todayAttendance) return 'Not Checked In';
    if (todayAttendance.last_check_out) return 'Completed';
    if (todayAttendance.first_check_in) return 'Checked In';
    return 'Not Checked In';
  };

  return (
    <Box>
      {/* Today's Status Card */}
      <Card sx={{ mb: 3, bgcolor: 'primary.main', color: 'white' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Today's Attendance Status
          </Typography>
          <Stack direction="row" spacing={3} alignItems="center">
            <Chip 
              label={getTodayStatus()} 
              sx={{ bgcolor: 'white', color: 'primary.main', fontWeight: 'bold' }}
            />
            {!todayAttendance?.first_check_in ? (
              <Button 
                variant="contained" 
                startIcon={<LoginIcon />}
                onClick={() => setCheckInDialogOpen(true)}
                sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: '#f5f5f5' } }}
              >
                Check In
              </Button>
            ) : !todayAttendance?.last_check_out ? (
              <Button 
                variant="contained" 
                startIcon={<LogoutIcon />}
                onClick={() => setCheckOutDialogOpen(true)}
                sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: '#f5f5f5' } }}
              >
                Check Out
              </Button>
            ) : (
              <Chip 
                icon={<CheckCircleIcon />}
                label="Attendance Completed" 
                sx={{ bgcolor: 'white', color: 'success.main' }}
              />
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Typography variant="h6" gutterBottom>
        Attendance History
      </Typography>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Check In</TableCell>
              <TableCell>Check Out</TableCell>
              <TableCell>Total Hours</TableCell>
              <TableCell>Overtime</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {attendances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">No attendance records found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              attendances.map((attendance) => (
                <TableRow key={attendance.id} hover>
                  <TableCell>{formatDate(attendance.date)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={attendance.status?.toUpperCase()}
                      color={attendance.status === 'present' ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatTime(attendance.first_check_in)}</TableCell>
                  <TableCell>{formatTime(attendance.last_check_out)}</TableCell>
                  <TableCell>{attendance.total_hours} hrs</TableCell>
                  <TableCell>{attendance.overtime_hours} hrs</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Check-in Dialog */}
      <Dialog open={checkInDialogOpen} onClose={() => setCheckInDialogOpen(false)}>
        <DialogTitle>Confirm Check In</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to check in now?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckInDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCheckIn} variant="contained" color="primary">
            Check In
          </Button>
        </DialogActions>
      </Dialog>

      {/* Check-out Dialog */}
      <Dialog open={checkOutDialogOpen} onClose={() => setCheckOutDialogOpen(false)}>
        <DialogTitle>Confirm Check Out</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to check out now?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckOutDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCheckOut} variant="contained" color="warning">
            Check Out
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MyAttendanceTab;