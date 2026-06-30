// src/pages/employees/EmployeeList.jsx - SANGAT RINGKAS

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Box, Button, Typography, Grid, Alert, CircularProgress } from '@mui/material';
import {
  Refresh as RefreshIcon,
  Upload as UploadIcon,
  FileDownload as FileDownloadIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useEmployee } from '../contexts/EmployeeContext';
import { useNavigate } from 'react-router-dom';
import EmployeeStatCard from '../../components/employees/EmployeeStatCard'; // <-- default import
import EmployeeFilterBar from '../../components/employees/EmployeeFilterBar'; // <-- default import
import EmployeeTable from '../../components/employees/EmployeeTable'; // <-- default import
import ImportDialog from '../../components/employees/ImportDialog'; // <-- default import
import ExportDialog from '../../components/employees/ExportDialog'; // <-- default import
import { formatCurrency } from '../../utils/employeeUtils';
import employeeService from '../../services/employeeService';

const EmployeeList = () => {
  const { employees, loading, error, pagination, fetchEmployees, deleteEmployee } = useEmployee();
  const navigate = useNavigate();

  // Filter State
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
  const [importDialog, setImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFilters, setExportFilters] = useState({});

  const debounceTimerRef = useRef(null);
  const initialLoadRef = useRef(true);
  const isMountedRef = useRef(true);

  // Build fetch params
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

  // Load employees with debounce
  const loadEmployees = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

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

  // Initial load
  useEffect(() => {
    isMountedRef.current = true;
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      loadEmployees();
    }
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Reload on filter change
  useEffect(() => {
    if (initialLoadRef.current) return;
    loadEmployees();
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [fetchParams]);

  // Stats
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

  // Handlers
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
  };

  const handleRefresh = () => loadEmployees();

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteEmployee(id);
        loadEmployees();
      } catch (err) {
        console.error('Error deleting employee:', err);
      }
    }
  };

  const handleImport = async (file) => {
    setImporting(true);
    try {
      const result = await employeeService.importEmployees(file);
      alert(`✅ Import completed!\nSuccess: ${result.success_count || 0}\nFailed: ${result.fail_count || 0}`);
      setImportDialog(false);
      loadEmployees();
    } catch (err) {
      alert('❌ Import failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setImporting(false);
    }
  };

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
      setExportDialog(false);
    } catch (err) {
      alert('❌ Export failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setExporting(false);
    }
  };

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
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={loading}>
            Refresh
          </Button>
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => setImportDialog(true)}>
            Import
          </Button>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={() => setExportDialog(true)}>
            Export
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/employees/create')}>
            Add New Employee
          </Button>
        </Box>
      </Box>

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
      <EmployeeFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        loading={loading}
      />

      {/* Table */}
      <EmployeeTable
        employees={employees}
        loading={loading}
        pagination={pagination}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(event, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        onView={(id) => navigate(`/employees/${id}`)}
        onEdit={(id) => navigate(`/employees/${id}/edit`)}
        onDelete={handleDelete}
        hasActiveFilters={
          filters.searchTerm || filters.filterStatus || filters.filterEmploymentType ||
          filters.filterDepartment || filters.startDate || filters.endDate
        }
      />

      {/* Dialogs */}
      <ImportDialog
        open={importDialog}
        onClose={() => setImportDialog(false)}
        onImport={handleImport}
        loading={importing}
      />

      <ExportDialog
        open={exportDialog}
        onClose={() => setExportDialog(false)}
        onExport={handleExport}
        loading={exporting}
        filters={exportFilters}
        setFilters={setExportFilters}
      />
    </Box>
  );
};

export default EmployeeList;