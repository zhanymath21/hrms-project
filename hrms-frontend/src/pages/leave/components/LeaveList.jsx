// src/pages/leave/components/LeaveList.jsx
import React, { useState, useEffect } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Typography,
  Stack,
  Avatar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Alert,
  TablePagination,
  Box,
  Tabs,
  Tab,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  Pending as PendingIcon,
  DeleteOutline as DeleteOutlineIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useLeave } from '../../contexts/LeaveContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../../utils/dateFormat';
import { useNotification } from '../../contexts/NotificationContext';

const LeaveList = ({ isAdmin = false }) => {
  const { user } = useAuth();
  const { leaves, loading, error, pagination, fetchLeaves, approveLeave, rejectLeave, cancelLeave } = useLeave();
  const { fetchUnreadCount } = useNotification();
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelLeaveData, setCancelLeaveData] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailLeave, setDetailLeave] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  // Check if user can approve (Manager or HR/Admin)
  const canApprove = () => {
    const position = user?.position?.title || '';
    return position.includes('HR') || position.includes('Admin') || position.includes('Manager');
  };

  // Check if user can cancel (only own pending leaves)
  const canCancel = (leave) => {
    return leave.employee_id === user?.id && leave.status === 'pending';
  };

  useEffect(() => {
    loadLeaves();
  }, [page, rowsPerPage, tabValue]);

  const loadLeaves = async () => {
    const params = {
      page: page + 1,
      per_page: rowsPerPage,
    };
    
    if (tabValue === 1) {
      params.status = 'pending';
    } else if (tabValue === 2) {
      params.status = 'approved';
    } else if (tabValue === 3) {
      params.status = 'rejected';
    } else if (tabValue === 4) {
      params.status = 'cancelled';
    }
    
    await fetchLeaves(params);
  };

  const handleApprove = async (leave) => {
    if (window.confirm(`Approve leave request for ${leave.employee?.first_name} ${leave.employee?.last_name}?`)) {
      await approveLeave(leave.id);
      await loadLeaves();
      await fetchUnreadCount();
    }
  };

  const handleReject = async () => {
    if (selectedLeave && rejectReason) {
      await rejectLeave(selectedLeave.id, rejectReason);
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedLeave(null);
      await loadLeaves();
      await fetchUnreadCount();
    }
  };

  const handleCancel = async () => {
    if (cancelLeaveData) {
      await cancelLeave(cancelLeaveData.id);
      setCancelDialogOpen(false);
      setCancelLeaveData(null);
      await loadLeaves();
      await fetchUnreadCount();
    }
  };

  const handleViewDetail = (leave) => {
    setDetailLeave(leave);
    setDetailDialogOpen(true);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'approved': return <CheckCircleIcon fontSize="small" />;
      case 'pending': return <PendingIcon fontSize="small" />;
      case 'rejected': return <CancelIcon fontSize="small" />;
      case 'cancelled': return <DeleteOutlineIcon fontSize="small" />;
      default: return null;
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPage(0);
  };

  // Filter leaves based on user role
  const getVisibleLeaves = () => {
    if (canApprove()) {
      return leaves;
    }
    // Regular employee only sees their own leaves
    return leaves.filter(l => l.employee_id === user?.id);
  };

  const visibleLeaves = getVisibleLeaves();

  if (loading && leaves.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Tabs for filtering */}
      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="All Requests" />
        <Tab label="Pending" />
        <Tab label="Approved" />
        <Tab label="Rejected" />
        <Tab label="Cancelled" />
      </Tabs>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date Submitted</TableCell>
              {(isAdmin || canApprove()) && <TableCell>Employee</TableCell>}
              <TableCell>Leave Type</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Total Days</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleLeaves.length === 0 ? (
              <TableRow>
                <TableCell colSpan={(isAdmin || canApprove()) ? 8 : 7} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">No leave requests found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              visibleLeaves.map((leave) => {
                const showApproveButtons = canApprove() && leave.status === 'pending';
                const showCancelButton = canCancel(leave);
                
                return (
                  <TableRow key={leave.id} hover>
                    <TableCell>{formatDate(leave.created_at)}</TableCell>
                    {(isAdmin || canApprove()) && (
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                            {leave.employee?.first_name?.[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2">
                              {leave.employee?.first_name} {leave.employee?.last_name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {leave.employee?.employee_id}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                    )}
                    <TableCell>
                      <Chip
                        label={leave.leave_type?.name}
                        size="small"
                        sx={{ bgcolor: '#e0e7ff', color: '#4338ca' }}
                      />
                    </TableCell>
                    <TableCell>{formatDate(leave.start_date)}</TableCell>
                    <TableCell>{formatDate(leave.end_date)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {leave.total_days} day(s)
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(leave.status)}
                        label={leave.status?.toUpperCase()}
                        color={getStatusColor(leave.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="View Details">
                          <IconButton size="small" color="info" onClick={() => handleViewDetail(leave)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        {showCancelButton && (
                          <Tooltip title="Cancel Request">
                            <IconButton 
                              size="small" 
                              color="warning" 
                              onClick={() => {
                                setCancelLeaveData(leave);
                                setCancelDialogOpen(true);
                              }}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {showApproveButtons && (
                          <>
                            <Tooltip title="Approve">
                              <IconButton 
                                size="small" 
                                color="success" 
                                onClick={() => handleApprove(leave)}
                              >
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton 
                                size="small" 
                                color="error" 
                                onClick={() => {
                                  setSelectedLeave(leave);
                                  setRejectDialogOpen(true);
                                }}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[15, 25, 50]}
        component="div"
        count={pagination.total}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Leave Request Details</DialogTitle>
        <DialogContent>
          {detailLeave && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert 
                severity={
                  detailLeave.status === 'approved' ? 'success' : 
                  detailLeave.status === 'rejected' ? 'error' : 
                  detailLeave.status === 'cancelled' ? 'info' : 
                  'warning'
                }
              >
                Status: <strong>{detailLeave.status?.toUpperCase()}</strong>
              </Alert>
              
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Employee</Typography>
                <Typography variant="body1">
                  {detailLeave.employee?.first_name} {detailLeave.employee?.last_name}
                  <br />
                  <Typography variant="caption" color="textSecondary">
                    {detailLeave.employee?.employee_id}
                  </Typography>
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Leave Type</Typography>
                <Typography variant="body1">{detailLeave.leave_type?.name}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Duration</Typography>
                <Typography variant="body1">
                  {formatDate(detailLeave.start_date)} - {formatDate(detailLeave.end_date)}
                  <br />
                  <strong>{detailLeave.total_days} working day(s)</strong>
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Reason</Typography>
                <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                  <Typography variant="body2">{detailLeave.reason}</Typography>
                </Paper>
              </Box>
              
              {detailLeave.approved_by && (
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Approved/Rejected By</Typography>
                  <Typography variant="body2">Manager/HR</Typography>
                  <Typography variant="caption" color="textSecondary">
                    on {formatDate(detailLeave.approved_at)}
                  </Typography>
                </Box>
              )}
              
              {detailLeave.rejection_reason && (
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Rejection Reason</Typography>
                  <Alert severity="error">{detailLeave.rejection_reason}</Alert>
                </Box>
              )}
              
              {detailLeave.status === 'cancelled' && (
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Cancelled Info</Typography>
                  <Alert severity="info">
                    This request was cancelled by the employee
                    {detailLeave.cancelled_at && ` on ${formatDate(detailLeave.cancelled_at)}`}
                  </Alert>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
          {detailLeave?.status === 'pending' && canApprove() && (
            <>
              <Button 
                onClick={() => {
                  handleApprove(detailLeave);
                  setDetailDialogOpen(false);
                }} 
                variant="contained" 
                color="success"
              >
                Approve
              </Button>
              <Button 
                onClick={() => {
                  setSelectedLeave(detailLeave);
                  setRejectDialogOpen(true);
                  setDetailDialogOpen(false);
                }} 
                variant="contained" 
                color="error"
              >
                Reject
              </Button>
            </>
          )}
          {detailLeave?.status === 'pending' && canCancel(detailLeave) && (
            <Button 
              onClick={() => {
                setCancelLeaveData(detailLeave);
                setCancelDialogOpen(true);
                setDetailDialogOpen(false);
              }} 
              variant="contained" 
              color="warning"
            >
              Cancel Request
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Leave Request</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Rejection Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            required
            placeholder="Please provide a reason for rejecting this leave request..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleReject} variant="contained" color="error" disabled={!rejectReason}>
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cancel Leave Request</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            Are you sure you want to cancel this leave request?
          </Alert>
          {cancelLeaveData && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Leave Type:</strong> {cancelLeaveData.leave_type?.name}
              </Typography>
              <Typography variant="body2">
                <strong>Dates:</strong> {formatDate(cancelLeaveData.start_date)} - {formatDate(cancelLeaveData.end_date)}
              </Typography>
              <Typography variant="body2">
                <strong>Total Days:</strong> {cancelLeaveData.total_days} day(s)
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>No, Keep It</Button>
          <Button onClick={handleCancel} variant="contained" color="warning">
            Yes, Cancel Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeaveList;