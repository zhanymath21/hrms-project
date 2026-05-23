// src/pages/leave/components/AdminLeaveBalances.jsx
// Tambahkan di bagian Actions, ganti dengan dropdown

import React, { useState, useEffect } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  Chip,
  Stack,
  Avatar,
  CircularProgress,
  Alert,
  Tooltip,
  Collapse,
  Box,
  Button,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  BeachAccess as BeachIcon,
  LocalHospital as SickIcon,
  EmojiEvents as SpecialIcon,
} from '@mui/icons-material';
import { useLeave } from '../../contexts/LeaveContext';
import { formatDate } from '../../../utils/dateFormat';
import EditBalanceDialog from './EditBalanceDialog';

const AdminLeaveBalances = () => {
  const { allBalances, loading, error, fetchAllBalances, pagination } = useLeave();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [expandedRow, setExpandedRow] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    loadBalances();
  }, [page, rowsPerPage, searchTerm]);

  const loadBalances = () => {
    fetchAllBalances({
      page: page + 1,
      per_page: rowsPerPage,
      search: searchTerm,
    });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const toggleExpand = (employeeId) => {
    setExpandedRow(expandedRow === employeeId ? null : employeeId);
  };

  const handleEditBalance = (balance) => {
    setSelectedBalance(balance);
    setEditDialogOpen(true);
    setAnchorEl(null);
  };

  const handleMenuOpen = (event, employee) => {
    setAnchorEl(event.currentTarget);
    setSelectedEmployee(employee);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedEmployee(null);
  };

  const getLeaveTypeIcon = (code) => {
    switch(code) {
      case 'AL': return <BeachIcon fontSize="small" />;
      case 'SL': return <SickIcon fontSize="small" />;
      case 'SPL': return <SpecialIcon fontSize="small" />;
      default: return <BeachIcon fontSize="small" />;
    }
  };

  const getLeaveTypeColor = (code) => {
    const colors = {
      AL: '#10b981',
      SL: '#3b82f6',
      SPL: '#f59e0b',
    };
    return colors[code] || '#6b7280';
  };

  const getLeaveTypeName = (code) => {
    const names = {
      AL: 'Annual Leave',
      SL: 'Sick Leave',
      SPL: 'Special Leave',
    };
    return names[code] || code;
  };

  if (loading && allBalances.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper>
      {/* Header with Search and Refresh */}
      <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by employee name or ID..."
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
        <Tooltip title="Refresh">
          <IconButton onClick={loadBalances}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8fafc' }}>
              <TableCell width="40"></TableCell>
              <TableCell>Employee</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Hire Date</TableCell>
              <TableCell>Years</TableCell>
              
              {/* Annual Leave Columns */}
              <TableCell align="center" colSpan={4} sx={{ borderBottom: 'none', bgcolor: '#f0fdf4' }}>
                <Typography variant="subtitle2" color="#10b981">Annual Leave</Typography>
              </TableCell>
              
              {/* Sick Leave Columns */}
              <TableCell align="center" colSpan={4} sx={{ borderBottom: 'none', bgcolor: '#eff6ff' }}>
                <Typography variant="subtitle2" color="#3b82f6">Sick Leave</Typography>
              </TableCell>
              
              {/* Special Leave Columns */}
              <TableCell align="center" colSpan={4} sx={{ borderBottom: 'none', bgcolor: '#fef3c7' }}>
                <Typography variant="subtitle2" color="#f59e0b">Special Leave</Typography>
              </TableCell>
              
              <TableCell align="center">Actions</TableCell>
            </TableRow>
            
            {/* Sub Header */}
            <TableRow sx={{ bgcolor: '#f8fafc' }}>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              
              <TableCell align="center" size="small">Total</TableCell>
              <TableCell align="center" size="small">Used</TableCell>
              <TableCell align="center" size="small">Pending</TableCell>
              <TableCell align="center" size="small">Remaining</TableCell>
              
              <TableCell align="center" size="small">Total</TableCell>
              <TableCell align="center" size="small">Used</TableCell>
              <TableCell align="center" size="small">Pending</TableCell>
              <TableCell align="center" size="small">Remaining</TableCell>
              
              <TableCell align="center" size="small">Total</TableCell>
              <TableCell align="center" size="small">Used</TableCell>
              <TableCell align="center" size="small">Pending</TableCell>
              <TableCell align="center" size="small">Remaining</TableCell>
              
              <TableCell align="center"></TableCell>
            </TableRow>
          </TableHead>
          
          <TableBody>
            {allBalances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={19} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">No employees found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              allBalances.map((employee) => {
                const annualBalance = employee.leave_balances?.find(b => b.leave_type?.code === 'AL');
                const sickBalance = employee.leave_balances?.find(b => b.leave_type?.code === 'SL');
                const specialBalance = employee.leave_balances?.find(b => b.leave_type?.code === 'SPL');

                return (
                  <React.Fragment key={employee.id}>
                    <TableRow hover>
                      <TableCell>
                        <IconButton size="small" onClick={() => toggleExpand(employee.id)}>
                          {expandedRow === employee.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </TableCell>
                      
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                            {employee.first_name?.[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {employee.first_name} {employee.last_name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {employee.employee_id}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{employee.department?.name || '-'}</TableCell>
                      <TableCell>{formatDate(employee.hire_date)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={`${(employee.years_of_service || 0).toFixed(1)} yrs`}
                          size="small"
                          color={employee.years_of_service >= 3 ? 'primary' : 'default'}
                        />
                      </TableCell>
                      
                      {/* Annual Leave Data */}
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight="bold" color="#10b981">
                          {annualBalance?.total_entitlement || 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="error.main">
                          {annualBalance?.used_days || 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="warning.main">
                          {annualBalance?.pending_days || 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight="bold" color="#10b981">
                          {annualBalance?.remaining_days || 0}
                        </Typography>
                      </TableCell>
                      
                      {/* Sick Leave Data */}
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight="bold" color="#3b82f6">
                          {sickBalance?.total_entitlement || 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="error.main">
                          {sickBalance?.used_days || 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="warning.main">
                          {sickBalance?.pending_days || 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight="bold" color="#3b82f6">
                          {sickBalance?.remaining_days || 0}
                        </Typography>
                      </TableCell>
                      
                      {/* Special Leave Data */}
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight="bold" color="#f59e0b">
                          {specialBalance?.total_entitlement || 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="error.main">
                          {specialBalance?.used_days || 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="warning.main">
                          {specialBalance?.pending_days || 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight="bold" color="#f59e0b">
                          {specialBalance?.remaining_days || 0}
                        </Typography>
                      </TableCell>
                      
                      {/* Actions - Dropdown untuk pilih leave type */}
                      <TableCell align="center">
                        <Tooltip title="Edit Leave Balance">
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={(e) => handleMenuOpen(e, employee)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Row - Detailed View */}
                    <TableRow>
                      <TableCell colSpan={19} sx={{ py: 0 }}>
                        <Collapse in={expandedRow === employee.id} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 3, bgcolor: '#f9fafb' }}>
                            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                              Detailed Leave Balances for {employee.first_name} {employee.last_name}
                            </Typography>
                            
                            <Stack direction="row" spacing={3} flexWrap="wrap">
                              {/* Annual Leave Card */}
                              {annualBalance && (
                                <Paper sx={{ p: 2, minWidth: 280, flex: 1, borderTop: `4px solid #10b981` }}>
                                  <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="h6" color="#10b981">Annual Leave</Typography>
                                    <Button size="small" variant="outlined" color="success" onClick={() => handleEditBalance(annualBalance)}>
                                      Edit
                                    </Button>
                                  </Box>
                                  <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                                    <Box><Typography variant="caption">Total</Typography><Typography variant="h6">{annualBalance.total_entitlement}</Typography></Box>
                                    <Box><Typography variant="caption">Used</Typography><Typography variant="h6" color="error.main">{annualBalance.used_days}</Typography></Box>
                                    <Box><Typography variant="caption">Pending</Typography><Typography variant="h6" color="warning.main">{annualBalance.pending_days}</Typography></Box>
                                    <Box><Typography variant="caption">Remaining</Typography><Typography variant="h6" color="#10b981">{annualBalance.remaining_days}</Typography></Box>
                                  </Stack>
                                </Paper>
                              )}
                              
                              {/* Sick Leave Card */}
                              {sickBalance && (
                                <Paper sx={{ p: 2, minWidth: 280, flex: 1, borderTop: `4px solid #3b82f6` }}>
                                  <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="h6" color="#3b82f6">Sick Leave</Typography>
                                    <Button size="small" variant="outlined" color="info" onClick={() => handleEditBalance(sickBalance)}>
                                      Edit
                                    </Button>
                                  </Box>
                                  <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                                    <Box><Typography variant="caption">Total</Typography><Typography variant="h6">{sickBalance.total_entitlement}</Typography></Box>
                                    <Box><Typography variant="caption">Used</Typography><Typography variant="h6" color="error.main">{sickBalance.used_days}</Typography></Box>
                                    <Box><Typography variant="caption">Pending</Typography><Typography variant="h6" color="warning.main">{sickBalance.pending_days}</Typography></Box>
                                    <Box><Typography variant="caption">Remaining</Typography><Typography variant="h6" color="#3b82f6">{sickBalance.remaining_days}</Typography></Box>
                                  </Stack>
                                </Paper>
                              )}
                              
                              {/* Special Leave Card */}
                              {specialBalance && (
                                <Paper sx={{ p: 2, minWidth: 280, flex: 1, borderTop: `4px solid #f59e0b` }}>
                                  <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="h6" color="#f59e0b">Special Leave</Typography>
                                    <Button size="small" variant="outlined" color="warning" onClick={() => handleEditBalance(specialBalance)}>
                                      Edit
                                    </Button>
                                  </Box>
                                  <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                                    <Box><Typography variant="caption">Total</Typography><Typography variant="h6">{specialBalance.total_entitlement}</Typography></Box>
                                    <Box><Typography variant="caption">Used</Typography><Typography variant="h6" color="error.main">{specialBalance.used_days}</Typography></Box>
                                    <Box><Typography variant="caption">Pending</Typography><Typography variant="h6" color="warning.main">{specialBalance.pending_days}</Typography></Box>
                                    <Box><Typography variant="caption">Remaining</Typography><Typography variant="h6" color="#f59e0b">{specialBalance.remaining_days}</Typography></Box>
                                  </Stack>
                                </Paper>
                              )}
                            </Stack>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[15, 25, 50, 100]}
        component="div"
        count={pagination.total}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* Dropdown Menu untuk pilih leave type yang akan diedit */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{ sx: { width: 250 } }}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, bgcolor: '#f5f5f5' }}>
          Select Leave Type to Edit
        </Typography>
        <Divider />
        
        {selectedEmployee?.leave_balances?.map((balance) => (
          <MenuItem 
            key={balance.id} 
            onClick={() => handleEditBalance(balance)}
            sx={{ 
              borderLeft: `3px solid ${getLeaveTypeColor(balance.leave_type?.code)}`,
              ml: 1,
              my: 0.5,
            }}
          >
            <ListItemIcon>
              {getLeaveTypeIcon(balance.leave_type?.code)}
            </ListItemIcon>
            <ListItemText>
              {getLeaveTypeName(balance.leave_type?.code)}
              <Typography variant="caption" color="textSecondary" display="block">
                Remaining: {balance.remaining_days} days | Total: {balance.total_entitlement} days
              </Typography>
            </ListItemText>
          </MenuItem>
        ))}
        
        {(!selectedEmployee?.leave_balances || selectedEmployee.leave_balances.length === 0) && (
          <MenuItem disabled>
            <Typography variant="body2" color="textSecondary">No leave balances found</Typography>
          </MenuItem>
        )}
      </Menu>

      {/* Edit Balance Dialog */}
      <EditBalanceDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedBalance(null);
        }}
        balance={selectedBalance}
        onSuccess={() => {
          loadBalances();
        }}
      />
    </Paper>
  );
};

export default AdminLeaveBalances;