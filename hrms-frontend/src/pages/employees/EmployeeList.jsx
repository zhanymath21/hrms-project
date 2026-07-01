// src/pages/employees/EmployeeList.jsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  LinearProgress,
  Collapse,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  FileDownload as FileDownloadIcon,
  Upload as UploadIcon,
  DateRange as DateRangeIcon,
  FilterList as FilterListIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useEmployee } from '../contexts/EmployeeContext';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../utils/dateFormat';
import EmployeeStatCard from '../../components/employees/EmployeeStatCard';
import EmployeeFilterBar from '../../components/employees/EmployeeFilterBar';
import EmployeeTable from '../../components/employees/EmployeeTable';
import ImportDialog from '../../components/employees/ImportDialog';
import ExportDialog from '../../components/employees/ExportDialog';
import { formatCurrency } from '../../utils/employeeUtils';
import employeeService from '../../services/employeeService';

// ========== CONSTANTS ==========
const DATE_FILTER_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

// ========== MAIN COMPONENT ==========
const EmployeeList = () => {
  const { employees, loading, error, pagination, fetchEmployees, deleteEmployee } = useEmployee();
  const navigate = useNavigate();

  // ========== FILTER STATE ==========
  const [filters, setFilters] = useState({
    searchTerm: '',
    filterStatus: '',
    filterEmploymentType: '',
    filterDepartment: '',
    startDate: '',
    endDate: '',
    datePreset: '',
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [success, setSuccess] = useState('');

  // ========== IMPORT/EXPORT STATE ==========
  const [importDialog, setImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFilters, setExportFilters] = useState({});

  // ========== REFS ==========
  const debounceTimerRef = useRef(null);
  const initialLoadRef = useRef(true);
  const isMountedRef = useRef(true);

  // ========== BUILD FETCH PARAMS ==========
  const fetchParams = useMemo(() => {
    const params = {
      page: page + 1,
      per_page: rowsPerPage,
    };

    if (filters.searchTerm.trim()) params.search = filters.searchTerm.trim();
    if (filters.filterStatus) params.status = filters.filterStatus;
    if (filters.filterEmploymentType) params.employment_type = filters.filterEmploymentType;
    if (filters.filterDepartment) params.department = filters.filterDepartment;
    if (filters.startDate) params.start_date = filters.startDate;
    if (filters.endDate) params.end_date = filters.endDate;

    return params;
  }, [page, rowsPerPage, filters]);

  // ========== LOAD EMPLOYEES ==========
  const loadEmployees = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const delay = filters.searchTerm ? 500 : 100;

    debounceTimerRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      
      try {
        await fetchEmployees(fetchParams);
      } catch (err) {
        console.error('Error loading employees:', err);
      }
    }, delay);
  }, [fetchEmployees, fetchParams, filters.searchTerm]);

  // ========== EFFECTS ==========
  useEffect(() => {
    isMountedRef.current = true;
    
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      loadEmployees();
    }

    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (initialLoadRef.current) return;
    loadEmployees();
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [fetchParams]);

  // ========== STATS ==========
  const stats = useMemo(() => {
    const totalSalary = employees.reduce((sum, emp) => sum + (parseFloat(emp.salary) || 0), 0);
    const activeEmployees = employees.filter(e => e.status === 'active').length;
    const resignEmployees = employees.filter(e => e.status === 'resign' || e.status === 'resigned').length;
    const onProbation = employees.filter(e => e.employment_type === 'intern' || e.employment_status === 'probation').length;

    return {
      total: pagination.total || employees.length,
      active: activeEmployees,
      resign: resignEmployees,
      probation: onProbation,
      salary: totalSalary,
    };
  }, [employees, pagination.total]);

  // ========== HANDLERS ==========
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  const handleClearFilters = () => {
    setFilters({
      searchTerm: '',
      filterStatus: '',
      filterEmploymentType: '',
      filterDepartment: '',
      startDate: '',
      endDate: '',
      datePreset: '',
    });
    setPage(0);
    setShowDateFilter(false);
  };

  const handleRefresh = () => {
    loadEmployees();
    setSuccess('Data refreshed successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteEmployee(id);
        setSuccess(`✅ Employee ${name} deleted successfully!`);
        setTimeout(() => setSuccess(''), 3000);
        loadEmployees();
      } catch (err) {
        console.error('Error deleting employee:', err);
        alert('❌ Failed to delete employee: ' + err.message);
      }
    }
  };

  // ========== IMPORT HANDLER ==========
  const handleImport = async (file) => {
    setImporting(true);
    try {
      const result = await employeeService.importEmployees(file);
      
      console.log('📊 Import result:', result);
      
      let message = `✅ Import completed!\n`;
      message += `✅ Success: ${result.success_count || 0}\n`;
      message += `❌ Failed: ${result.fail_count || 0}`;
      
      if (result.errors && result.errors.length > 0) {
        message += `\n\nErrors:\n${result.errors.slice(0, 5).join('\n')}`;
        if (result.errors.length > 5) {
          message += `\n... and ${result.errors.length - 5} more errors`;
        }
      }
      
      alert(message);
      
      // 🔥 REFRESH DATA AFTER IMPORT
      if (result.success_count > 0) {
        setSuccess(`✅ ${result.success_count} employees imported successfully!`);
        setTimeout(() => setSuccess(''), 5000);
        
        // Close dialog and refresh data
        setImportDialog(false);
        
        // Force reload dengan delay untuk memastikan cache clear
        setTimeout(() => {
          loadEmployees();
        }, 500);
      }
      
      return result;
    } catch (err) {
      console.error('❌ Import error:', err);
      alert('❌ Import failed: ' + err.message);
      throw err;
    } finally {
      setImporting(false);
    }
  };

  // ========== EXPORT HANDLER ==========
  const handleExport = async (filters) => {
    setExporting(true);
    try {
      const response = await employeeService.exportEmployees(filters);
      
      const blob = new Blob([response.data], {
        type: response.headers?.['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Employees_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess('✅ Export completed successfully!');
      setTimeout(() => setSuccess(''), 3000);
      setExportDialog(false);
    } catch (err) {
      console.error('❌ Export error:', err);
      alert('❌ Export failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setExporting(false);
    }
  };

  // ========== DATE FILTER HANDLERS ==========
  const handleDatePreset = (value) => {
    if (value === 'custom') {
      setFilters({ ...filters, datePreset: value });
      return;
    }
    
    const now = new Date();
    let start = '';
    let end = '';
    
    switch(value) {
      case 'today':
        const today = new Date();
        start = today.toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      case 'yesterday':
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        start = yesterday.toISOString().split('T')[0];
        end = yesterday.toISOString().split('T')[0];
        break;
      case 'this_week':
        const startOfWeek = new Date(now);
        const day = now.getDay() || 7;
        startOfWeek.setDate(now.getDate() - day + 1);
        start = startOfWeek.toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
        break;
      case 'last_week':
        const startLastWeek = new Date(now);
        const dayLast = now.getDay() || 7;
        startLastWeek.setDate(now.getDate() - dayLast - 6);
        const endLastWeek = new Date(now);
        endLastWeek.setDate(now.getDate() - dayLast);
        start = startLastWeek.toISOString().split('T')[0];
        end = endLastWeek.toISOString().split('T')[0];
        break;
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
        break;
      default:
        start = '';
        end = '';
    }
    
    setFilters({ 
      ...filters, 
      datePreset: value,
      startDate: start,
      endDate: end
    });
    setPage(0);
  };

  const handleClearDateFilter = () => {
    setFilters({ 
      ...filters, 
      datePreset: '',
      startDate: '',
      endDate: ''
    });
  };

  // ========== STATUS HELPERS ==========
  const getStatusColor = useCallback((status) => {
    const colors = {
      active: 'success',
      inactive: 'default',
      suspended: 'warning',
      terminated: 'error',
      resigned: 'warning',
    };
    return colors[status] || 'default';
  }, []);

  const getStatusLabel = useCallback((status) => {
    const labels = {
      active: 'Active',
      inactive: 'Inactive',
      suspended: 'Suspended',
      terminated: 'Terminated',
      resigned: 'Resigned',
    };
    return labels[status] || status;
  }, []);

  const getEmploymentTypeLabel = useCallback((type) => {
    const labels = {
      full_time: 'Full Time',
      part_time: 'Part Time',
      contract: 'Contract',
      intern: 'Intern'
    };
    return labels[type] || type;
  }, []);

  const hasActiveFilters = filters.searchTerm || filters.filterStatus || filters.filterEmploymentType || 
                          filters.filterDepartment || filters.startDate || filters.endDate;

  // ========== RENDER ==========
  if (loading && employees.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Employee Management
        </Typography>
        <Box display="flex" gap={2} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setImportDialog(true)}
          >
            Import
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={() => setExportDialog(true)}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/employees/create')}
          >
            Add New Employee
          </Button>
        </Box>
      </Box>

      {/* Success Message */}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Stats */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={2.4}>
          <EmployeeStatCard title="Total Employees" value={stats.total} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <EmployeeStatCard title="Active" value={stats.active} color="success" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <EmployeeStatCard title="Resign" value={stats.resign} color="warning" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <EmployeeStatCard title="On Probation" value={stats.probation} color="warning" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <EmployeeStatCard title="Total Salary" value={formatCurrency(stats.salary)} color="info" loading={loading} />
        </Grid>
      </Grid>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => window.location.reload()}>
          {error}
        </Alert>
      )}

      {/* Filter Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          {/* Search */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name, email, ID..."
              value={filters.searchTerm}
              onChange={(e) => {
                setFilters({ ...filters, searchTerm: e.target.value });
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: filters.searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => {
                      setFilters({ ...filters, searchTerm: '' });
                      setPage(0);
                    }}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Status */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.filterStatus}
                label="Status"
                onChange={(e) => {
                  setFilters({ ...filters, filterStatus: e.target.value });
                  setPage(0);
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="terminated">Terminated</MenuItem>
                <MenuItem value="resigned">Resigned</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Employment Type */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Employment Type</InputLabel>
              <Select
                value={filters.filterEmploymentType}
                label="Employment Type"
                onChange={(e) => {
                  setFilters({ ...filters, filterEmploymentType: e.target.value });
                  setPage(0);
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="full_time">Full Time</MenuItem>
                <MenuItem value="part_time">Part Time</MenuItem>
                <MenuItem value="contract">Contract</MenuItem>
                <MenuItem value="intern">Intern</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Department */}
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Department"
              value={filters.filterDepartment}
              onChange={(e) => {
                setFilters({ ...filters, filterDepartment: e.target.value });
                setPage(0);
              }}
              placeholder="Filter by department..."
            />
          </Grid>

          {/* Date Filter Button */}
          <Grid item xs={12} sm={6} md={1}>
            <Button
              fullWidth
              variant="outlined"
              color={filters.startDate || filters.endDate ? 'primary' : 'inherit'}
              size="large"
              onClick={() => setShowDateFilter(!showDateFilter)}
              startIcon={<DateRangeIcon />}
            >
              📅
            </Button>
          </Grid>

          {/* Clear Button */}
          <Grid item xs={12} sm={6} md={1}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters || loading}
              color={hasActiveFilters ? 'error' : 'inherit'}
            >
              Clear
            </Button>
          </Grid>
        </Grid>

        {/* Date Filter Section */}
        <Collapse in={showDateFilter}>
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <DateRangeIcon fontSize="small" />
                  Date Filter (Hire Date)
                  {(filters.startDate || filters.endDate) && (
                    <Chip
                      label={`${filters.startDate || '...'} → ${filters.endDate || '...'}`}
                      size="small"
                      color="primary"
                      onDelete={handleClearDateFilter}
                    />
                  )}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Quick Select</InputLabel>
                  <Select
                    label="Quick Select"
                    value={filters.datePreset || ''}
                    onChange={(e) => handleDatePreset(e.target.value)}
                  >
                    <MenuItem value="">Custom Range</MenuItem>
                    {DATE_FILTER_OPTIONS.map(o => (
                      <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  type="date"
                  label="Start Date"
                  size="small"
                  value={filters.startDate}
                  onChange={(e) => {
                    setFilters({ ...filters, startDate: e.target.value, datePreset: '' });
                    setPage(0);
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  type="date"
                  label="End Date"
                  size="small"
                  value={filters.endDate}
                  onChange={(e) => {
                    setFilters({ ...filters, endDate: e.target.value, datePreset: '' });
                    setPage(0);
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => setShowDateFilter(false)}
                  >
                    Apply
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={handleClearDateFilter}
                    disabled={!filters.startDate && !filters.endDate}
                  >
                    Clear
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Collapse>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #f0f0f0' }}>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {filters.searchTerm && (
                <Chip 
                  label={`Search: ${filters.searchTerm}`} 
                  size="small" 
                  onDelete={() => {
                    setFilters({ ...filters, searchTerm: '' });
                    setPage(0);
                  }} 
                />
              )}
              {filters.filterStatus && (
                <Chip 
                  label={`Status: ${filters.filterStatus}`} 
                  size="small" 
                  onDelete={() => {
                    setFilters({ ...filters, filterStatus: '' });
                    setPage(0);
                  }} 
                />
              )}
              {filters.filterEmploymentType && (
                <Chip 
                  label={`Type: ${filters.filterEmploymentType.replace('_', ' ')}`} 
                  size="small" 
                  onDelete={() => {
                    setFilters({ ...filters, filterEmploymentType: '' });
                    setPage(0);
                  }} 
                />
              )}
              {filters.filterDepartment && (
                <Chip 
                  label={`Department: ${filters.filterDepartment}`} 
                  size="small" 
                  onDelete={() => {
                    setFilters({ ...filters, filterDepartment: '' });
                    setPage(0);
                  }} 
                />
              )}
              {filters.startDate && (
                <Chip 
                  label={`From: ${new Date(filters.startDate).toLocaleDateString()}`} 
                  size="small" 
                  onDelete={handleClearDateFilter} 
                />
              )}
              {filters.endDate && (
                <Chip 
                  label={`To: ${new Date(filters.endDate).toLocaleDateString()}`} 
                  size="small" 
                  onDelete={handleClearDateFilter} 
                />
              )}
            </Stack>
          </Box>
        )}
      </Paper>

      {/* Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 450px)', overflowX: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell width="100">ID</TableCell>
                <TableCell>Employee</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Position</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Employment Type</TableCell>
                <TableCell>Hire Date</TableCell>
                <TableCell align="right">Salary</TableCell>
                <TableCell align="center" width="120">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                    {loading ? (
                      <CircularProgress size={40} />
                    ) : (
                      <Typography color="textSecondary">
                        {hasActiveFilters ? 'No employees match your filters' : 'No employees found'}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee) => (
                  <TableRow key={employee.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {employee.employee_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {employee.first_name?.[0]}{employee.last_name?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {employee.first_name} {employee.last_name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {employee.email}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {employee.phone || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {employee.department?.name || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {employee.position?.title || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(employee.status)}
                        color={getStatusColor(employee.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getEmploymentTypeLabel(employee.employment_type)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(employee.hire_date)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium" sx={{ whiteSpace: 'nowrap' }}>
                        {formatCurrency(employee.salary)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => navigate(`/employees/${employee.id}`)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => navigate(`/employees/${employee.id}/edit`)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(employee.id, `${employee.first_name} ${employee.last_name}`)}
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
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[15, 25, 50]}
          component="div"
          count={pagination.total || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
        />
      </Paper>

      {/* Dialogs */}
      <ImportDialog
        open={importDialog}
        onClose={() => {
          setImportDialog(false);
          setImporting(false);
        }}
        onImport={handleImport}
        loading={importing}
      />

      <ExportDialog
        open={exportDialog}
        onClose={() => {
          setExportDialog(false);
          setExportFilters({});
        }}
        onExport={handleExport}
        loading={exporting}
        filters={exportFilters}
        setFilters={setExportFilters}
      />
    </Box>
  );
};

export default EmployeeList;