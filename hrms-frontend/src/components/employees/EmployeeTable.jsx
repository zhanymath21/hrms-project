// src/components/employees/EmployeeTable.jsx

import React from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Paper, Chip, IconButton, Avatar,
  Typography, Stack, Tooltip, CircularProgress
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { formatDate } from '../../utils/dateFormat';
import { formatCurrency, getStatusColor, getStatusLabel, getEmploymentTypeLabel } from '../../utils/employeeUtils';

export const EmployeeTable = ({
  employees,
  loading,
  pagination,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onView,
  onEdit,
  onDelete,
  hasActiveFilters,
}) => {
  return (
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
                        <IconButton size="small" color="info" onClick={() => onView(employee.id)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" color="primary" onClick={() => onEdit(employee.id)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onDelete(employee.id, `${employee.first_name} ${employee.last_name}`)}
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
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
      />
    </Paper>
  );
};