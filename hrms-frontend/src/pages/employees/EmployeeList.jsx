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
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useEmployee } from '../contexts/EmployeeContext';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../utils/dateFormat';

// Format currency ke USD
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const StatCard = ({ title, value, color = 'primary', loading }) => (
  <Card>
    <CardContent>
      <Typography color="textSecondary" gutterBottom variant="body2">
        {title}
      </Typography>
      {loading ? (
        <CircularProgress size={24} />
      ) : (
        <Typography variant="h4" component="div" color={`${color}.main`}>
          {value}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const EmployeeList = () => {
  const { employees, loading, error, pagination, fetchEmployees, deleteEmployee } = useEmployee();
  const navigate = useNavigate();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEmploymentType, setFilterEmploymentType] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  
  // Ref untuk debounce
  const debounceTimerRef = useRef(null);
  const initialLoadRef = useRef(true);
  const isMountedRef = useRef(true);

  // Buat params dengan useMemo
  const fetchParams = useMemo(() => {
    const params = {
      page: page + 1,
      per_page: rowsPerPage,
    };
    
    if (searchTerm.trim()) params.search = searchTerm.trim();
    if (filterStatus) params.status = filterStatus;
    if (filterEmploymentType) params.employment_type = filterEmploymentType;
    
    return params;
  }, [page, rowsPerPage, searchTerm, filterStatus, filterEmploymentType]);

  // Function untuk fetch dengan debounce
  const loadEmployees = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const delay = searchTerm ? 500 : 100;

    debounceTimerRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      
      console.log('🔄 Loading employees with params:', fetchParams);
      
      try {
        await fetchEmployees(fetchParams);
      } catch (err) {
        console.error('Error loading employees:', err);
      }
    }, delay);
  }, [fetchEmployees, fetchParams, searchTerm]);

  // useEffect untuk initial load
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

  // useEffect untuk perubahan filter
  useEffect(() => {
    if (initialLoadRef.current) return;
    
    loadEmployees();
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [fetchParams]);

  // 🔥 UPDATE: Tambahkan 'resign' ke status colors
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

  // 🔥 UPDATE: Tambahkan label untuk status resign
  const getStatusLabel = useCallback((status) => {
    const labels = {
      active: 'Active',
      inactive: 'Inactive',
      suspended: 'Suspended',
      terminated: 'Terminated',
      resigned: 'Resigned',   // 🔥 Alternatif
     
      
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

  // 🔥 UPDATE: Tambahkan resign ke stats perhitungan
  const stats = useMemo(() => {
    const totalSalary = employees.reduce((sum, emp) => sum + (parseFloat(emp.salary) || 0), 0);
    const activeEmployees = employees.filter(e => e.status === 'active').length;
    const resignEmployees = employees.filter(e => 
      e.status === 'resign' || e.status === 'resigned'
    ).length;
    const onProbation = employees.filter(e => 
      e.employment_type === 'intern' || e.employment_status === 'probation'
    ).length;
    
    return {
      total: pagination.total || employees.length,
      active: activeEmployees,
      resign: resignEmployees,    // 🔥 Tambahkan stat resign
      probation: onProbation,
      salary: totalSalary,
    };
  }, [employees, pagination.total]);

  // Handler
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
    setPage(0);
  }, []);

  const handleStatusChange = useCallback((e) => {
    setFilterStatus(e.target.value);
    setPage(0);
  }, []);

  const handleEmploymentTypeChange = useCallback((e) => {
    setFilterEmploymentType(e.target.value);
    setPage(0);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setFilterStatus('');
    setFilterEmploymentType('');
    setPage(0);
  }, []);

  const handleRefresh = useCallback(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleDelete = useCallback(async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteEmployee(id);
        loadEmployees();
      } catch (err) {
        console.error('Error deleting employee:', err);
      }
    }
  }, [deleteEmployee, loadEmployees]);

  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const hasActiveFilters = searchTerm || filterStatus || filterEmploymentType;

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
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
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

      {/* Stats - 🔥 UPDATE: Tambahkan card untuk Resign */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard title="Total Employees" value={stats.total} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard title="Active" value={stats.active} color="success" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard title="Resign" value={stats.resign} color="warning" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard title="On Probation" value={stats.probation} color="warning" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard title="Total Salary" value={formatCurrency(stats.salary)} color="info" loading={loading} />
        </Grid>
      </Grid>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => window.location.reload()}>
          {error}
        </Alert>
      )}

      {/* Filters - 🔥 UPDATE: Tambahkan Resign ke filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name, email, ID..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={handleStatusChange}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="terminated">Terminated</MenuItem>
                <MenuItem value="resigned">Resigned</MenuItem>  {/* 🔥 Alternatif */}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Employment Type</InputLabel>
              <Select
                value={filterEmploymentType}
                label="Employment Type"
                onChange={handleEmploymentTypeChange}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="full_time">Full Time</MenuItem>
                <MenuItem value="part_time">Part Time</MenuItem>
                <MenuItem value="contract">Contract</MenuItem>
                <MenuItem value="intern">Intern</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={1}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
            >
              Clear
            </Button>
          </Grid>
        </Grid>
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
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
        />
      </Paper>
    </Box>
  );
};

export default EmployeeList;