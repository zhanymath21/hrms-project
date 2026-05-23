// src/pages/attendance/components/MonthlyReport.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccessTime as AccessTimeIcon,
  EventAvailable as EventAvailableIcon,
  EventBusy as EventBusyIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useAttendance } from '../../contexts/AttendanceContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../../utils/dateFormat';

const MonthlyReport = () => {
  const { user } = useAuth();
  const { monthlyReport, loading, error, getMonthlyReport } = useAttendance();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    getMonthlyReport(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const years = [2023, 2024, 2025];

  if (loading && !monthlyReport) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  const summary = monthlyReport?.summary || {};
  const attendances = monthlyReport?.attendances || [];

  return (
    <Box>
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Month</InputLabel>
              <Select
                value={selectedMonth}
                label="Month"
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {months.map(month => (
                  <MenuItem key={month.value} value={month.value}>
                    {month.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Year</InputLabel>
              <Select
                value={selectedYear}
                label="Year"
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {years.map(year => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                setSelectedMonth(new Date().getMonth() + 1);
                setSelectedYear(new Date().getFullYear());
              }}
            >
              Current Month
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Working Days
              </Typography>
              <Typography variant="h4">{summary.working_days || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderLeft: '4px solid #10b981' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Present
              </Typography>
              <Typography variant="h4" color="success.main">
                {summary.present_days || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderLeft: '4px solid #ef4444' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Absent
              </Typography>
              <Typography variant="h4" color="error.main">
                {summary.absent_days || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderLeft: '4px solid #f59e0b' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Late
              </Typography>
              <Typography variant="h4" color="warning.main">
                {summary.late_days || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Hours
              </Typography>
              <Typography variant="h4">
                {summary.total_hours || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detail Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>First Check-in</TableCell>
              <TableCell>Last Check-out</TableCell>
              <TableCell>Total Hours</TableCell>
              <TableCell>Overtime</TableCell>
              <TableCell>Sessions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {attendances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">No attendance records for this month</Typography>
                </TableCell>
              </TableRow>
            ) : (
              attendances.map((attendance) => (
                <TableRow key={attendance.id} hover>
                  <TableCell>{formatDate(attendance.date)}</TableCell>
                  <TableCell>
                    <Chip
                      label={attendance.status?.toUpperCase()}
                      color={
                        attendance.status === 'present' ? 'success' :
                        attendance.status === 'late' ? 'warning' : 'error'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{attendance.first_check_in || '-'}</TableCell>
                  <TableCell>{attendance.last_check_out || '-'}</TableCell>
                  <TableCell>{attendance.total_hours} hrs</TableCell>
                  <TableCell>{attendance.overtime_hours} hrs</TableCell>
                  <TableCell>{attendance.total_sessions}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default MonthlyReport;