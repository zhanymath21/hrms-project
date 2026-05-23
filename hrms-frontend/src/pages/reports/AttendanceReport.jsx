// src/pages/reports/AttendanceReport.jsx
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
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
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
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  TableChart as ExcelIcon,
  Print as PrintIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useAttendance } from '../contexts/AttendanceContext';
import { useEmployee } from '../contexts/EmployeeContext';
import { formatDate, formatTime } from '../../utils/dateFormat';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const AttendanceReport = () => {
  const { 
    attendances = [], 
    loading = false, 
    error = null, 
    pagination = { total: 0, current_page: 1, per_page: 15, last_page: 1 },
    fetchAttendances 
  } = useAttendance();
  
  const { employees = [], fetchEmployees } = useEmployee();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [localAttendances, setLocalAttendances] = useState([]);
  const [localPagination, setLocalPagination] = useState({ total: 0, current_page: 1, per_page: 15, last_page: 1 });
  const [summary, setSummary] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    totalHours: 0,
    totalOvertime: 0,
  });

  useEffect(() => {
    if (fetchEmployees) {
      fetchEmployees({ per_page: 100 });
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [page, rowsPerPage, searchTerm, filterStatus, filterDepartment, startDate, endDate, selectedEmployee]);

  const loadReport = async () => {
    if (!fetchAttendances) return;
    
    const params = {
      page: page + 1,
      per_page: rowsPerPage,
      search: searchTerm,
      status: filterStatus,
      department_id: filterDepartment,
      employee_id: selectedEmployee,
      start_date: startDate,
      end_date: endDate,
    };
    
    try {
      const result = await fetchAttendances(params);
      
      // Extract data array safely
      let dataArray = [];
      let paginationData = { total: 0, current_page: 1, per_page: rowsPerPage, last_page: 1 };
      
      if (result) {
        // Check different response structures
        if (Array.isArray(result)) {
          dataArray = result;
        } else if (result.data && Array.isArray(result.data)) {
          dataArray = result.data;
        } else if (result.data && result.data.data && Array.isArray(result.data.data)) {
          dataArray = result.data.data;
          paginationData = {
            total: result.data.total || 0,
            current_page: result.data.current_page || 1,
            per_page: result.data.per_page || rowsPerPage,
            last_page: result.data.last_page || 1,
          };
        } else if (result.attendances && Array.isArray(result.attendances)) {
          dataArray = result.attendances;
        }
      }
      
      // If still no data, try using context attendances
      if (dataArray.length === 0 && Array.isArray(attendances)) {
        dataArray = attendances;
      }
      
      setLocalAttendances(dataArray);
      setLocalPagination(paginationData);
      calculateSummary(dataArray);
    } catch (err) {
      console.error('Error loading report:', err);
      setLocalAttendances([]);
      calculateSummary([]);
    }
  };

  const calculateSummary = (data) => {
    // Ensure data is array
    const safeData = Array.isArray(data) ? data : [];
    
    const summaryData = {
      total: safeData.length,
      present: safeData.filter(a => a?.status === 'present').length,
      absent: safeData.filter(a => a?.status === 'absent').length,
      late: safeData.filter(a => a?.status === 'late').length,
      halfDay: safeData.filter(a => a?.status === 'half_day').length,
      totalHours: safeData.reduce((sum, a) => sum + (parseFloat(a?.total_hours) || 0), 0),
      totalOvertime: safeData.reduce((sum, a) => sum + (parseFloat(a?.overtime_hours) || 0), 0),
    };
    setSummary(summaryData);
  };

  const exportToCSV = () => {
    const exportData = (localAttendances.length > 0 ? localAttendances : attendances).map(attendance => ({
      'Date': formatDate(attendance?.date),
      'Employee ID': attendance?.employee?.employee_id || '-',
      'Employee Name': `${attendance?.employee?.first_name || ''} ${attendance?.employee?.last_name || ''}`.trim() || '-',
      'Department': attendance?.employee?.department?.name || '-',
      'Position': attendance?.employee?.position?.title || '-',
      'Status': attendance?.status?.toUpperCase() || '-',
      'First Check In': attendance?.first_check_in || '-',
      'Last Check Out': attendance?.last_check_out || '-',
      'Total Hours': attendance?.total_hours || 0,
      'Overtime Hours': attendance?.overtime_hours || 0,
      'Total Sessions': attendance?.total_sessions || 0,
      'Approved': attendance?.is_approved ? 'Yes' : 'No',
      'Remarks': attendance?.remarks || '-',
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `attendance_report_${formatDate(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    const exportData = (localAttendances.length > 0 ? localAttendances : attendances).map(attendance => ({
      'Date': formatDate(attendance?.date),
      'Employee ID': attendance?.employee?.employee_id || '-',
      'Employee Name': `${attendance?.employee?.first_name || ''} ${attendance?.employee?.last_name || ''}`.trim() || '-',
      'Department': attendance?.employee?.department?.name || '-',
      'Position': attendance?.employee?.position?.title || '-',
      'Status': attendance?.status?.toUpperCase() || '-',
      'First Check In': attendance?.first_check_in || '-',
      'Last Check Out': attendance?.last_check_out || '-',
      'Total Hours': attendance?.total_hours || 0,
      'Overtime Hours': attendance?.overtime_hours || 0,
      'Total Sessions': attendance?.total_sessions || 0,
      'Approved': attendance?.is_approved ? 'Yes' : 'No',
      'Remarks': attendance?.remarks || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
    XLSX.writeFile(wb, `attendance_report_${formatDate(new Date())}.xlsx`);
  };

  const printReport = () => {
    const displayData = localAttendances.length > 0 ? localAttendances : attendances;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Attendance Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; }
            h1 { color: #333; }
            .summary { margin-bottom: 20px; }
            .summary-item { display: inline-block; margin-right: 20px; padding: 10px; background: #f0f0f0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>Attendance Report</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <div class="summary">
            <div class="summary-item">Total: ${summary.total}</div>
            <div class="summary-item">Present: ${summary.present}</div>
            <div class="summary-item">Absent: ${summary.absent}</div>
            <div class="summary-item">Late: ${summary.late}</div>
            <div class="summary-item">Half Day: ${summary.halfDay}</div>
            <div class="summary-item">Total Hours: ${summary.totalHours}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Employee</th><th>Department</th><th>Status</th>
                <th>Check In</th><th>Check Out</th><th>Hours</th>
              </tr>
            </thead>
            <tbody>
              ${displayData.map(attendance => `
                <tr>
                  <td>${formatDate(attendance?.date)}</td>
                  <td>${attendance?.employee?.first_name || ''} ${attendance?.employee?.last_name || ''}</td>
                  <td>${attendance?.employee?.department?.name || '-'}</td>
                  <td>${attendance?.status?.toUpperCase() || '-'}</td>
                  <td>${attendance?.first_check_in || '-'}</td>
                  <td>${attendance?.last_check_out || '-'}</td>
                  <td>${attendance?.total_hours || 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusColor = (status) => {
    const colors = {
      present: 'success',
      absent: 'error',
      late: 'warning',
      half_day: 'info',
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'present': return <CheckCircleIcon fontSize="small" />;
      case 'absent': return <CancelIcon fontSize="small" />;
      case 'late': return <ScheduleIcon fontSize="small" />;
      default: return null;
    }
  };

  const departments = [...new Set(employees.map(emp => emp?.department_id))].filter(Boolean);
  const displayAttendances = localAttendances.length > 0 ? localAttendances : attendances;
  const displayPagination = localPagination.total > 0 ? localPagination : pagination;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Attendance Report
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadReport}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExcelIcon />}
            onClick={exportToExcel}
          >
            Excel
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportToCSV}
          >
            CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={printReport}
          >
            Print
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Records</Typography>
              <Typography variant="h4">{summary.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ borderLeft: '4px solid #10b981' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Present</Typography>
              <Typography variant="h4" color="success.main">{summary.present}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ borderLeft: '4px solid #ef4444' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Absent</Typography>
              <Typography variant="h4" color="error.main">{summary.absent}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ borderLeft: '4px solid #f59e0b' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Late</Typography>
              <Typography variant="h4" color="warning.main">{summary.late}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Hours</Typography>
              <Typography variant="h4">{summary.totalHours}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Overtime</Typography>
              <Typography variant="h4">{summary.totalOvertime}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name or ID..."
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
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="present">Present</MenuItem>
                <MenuItem value="absent">Absent</MenuItem>
                <MenuItem value="late">Late</MenuItem>
                <MenuItem value="half_day">Half Day</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Department</InputLabel>
              <Select
                value={filterDepartment}
                label="Department"
                onChange={(e) => setFilterDepartment(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {departments.map(dept => (
                  <MenuItem key={dept} value={dept}>Department {dept}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Employee</InputLabel>
              <Select
                value={selectedEmployee}
                label="Employee"
                onChange={(e) => setSelectedEmployee(e.target.value)}
              >
                <MenuItem value="">All Employees</MenuItem>
                {employees.map(emp => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} - {emp.employee_id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Stack direction="row" spacing={1}>
              <TextField
                type="date"
                label="Start Date"
                size="small"
                fullWidth
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                type="date"
                label="End Date"
                size="small"
                fullWidth
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Attendance Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 500px)', overflowX: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Employee</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Position</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>First Check-in</TableCell>
                <TableCell>Last Check-out</TableCell>
                <TableCell>Total Hours</TableCell>
                <TableCell>Overtime</TableCell>
                <TableCell>Sessions</TableCell>
                <TableCell>Approved</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : displayAttendances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">No attendance records found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                displayAttendances.map((attendance) => (
                  <TableRow key={attendance?.id || Math.random()} hover>
                    <TableCell>{formatDate(attendance?.date)}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                          {attendance?.employee?.first_name?.[0] || '?'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2">
                            {attendance?.employee?.first_name} {attendance?.employee?.last_name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {attendance?.employee?.employee_id}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>{attendance?.employee?.department?.name || '-'}</TableCell>
                    <TableCell>{attendance?.employee?.position?.title || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(attendance?.status)}
                        label={attendance?.status?.toUpperCase() || '-'}
                        color={getStatusColor(attendance?.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{attendance?.first_check_in || '-'}</TableCell>
                    <TableCell>{attendance?.last_check_out || '-'}</TableCell>
                    <TableCell>{attendance?.total_hours || 0} hrs</TableCell>
                    <TableCell>{attendance?.overtime_hours || 0} hrs</TableCell>
                    <TableCell>{attendance?.total_sessions || 0}</TableCell>
                    <TableCell>
                      <Chip
                        label={attendance?.is_approved ? 'Approved' : 'Pending'}
                        color={attendance?.is_approved ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[15, 25, 50, 100]}
          component="div"
          count={displayPagination?.total || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>
    </Box>
  );
};

export default AttendanceReport;