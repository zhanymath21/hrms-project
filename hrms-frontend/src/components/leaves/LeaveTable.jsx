// src/components/leaves/LeaveTable.jsx

import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Paper,
    Chip,
    IconButton,
    Typography,
    Stack,
    Tooltip,
    CircularProgress,
    Box,
} from '@mui/material';
import {
    Visibility as VisibilityIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Block as BlockIcon,
} from '@mui/icons-material';
import LeaveStatusBadge from './LeaveStatusBadge';
import { formatDate } from '../../utils/dateFormat';

const LeaveTable = ({
    data = [],
    loading = false,
    pagination = {},
    page = 0,
    rowsPerPage = 15,
    onPageChange,
    onRowsPerPageChange,
    onView,
    onApprove,
    onReject,
    onCancel,
    hasActiveFilters = false,
    showActions = true,
}) => {
    const isPending = (status) => status === 'pending';

    if (loading && data.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 450px)', overflowX: 'auto' }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell>Employee</TableCell>
                            <TableCell>Leave Type</TableCell>
                            <TableCell>Duration</TableCell>
                            <TableCell>Total Days</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Requested</TableCell>
                            {showActions && (
                                <TableCell align="center" width="150">Actions</TableCell>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell 
                                    colSpan={showActions ? 7 : 6} 
                                    align="center" 
                                    sx={{ py: 4 }}
                                >
                                    <Typography color="textSecondary">
                                        {hasActiveFilters 
                                            ? 'No leave requests match your filters' 
                                            : 'No leave requests found'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((leave) => (
                                <TableRow 
                                    key={leave.id} 
                                    hover
                                    sx={{ 
                                        bgcolor: leave.status === 'pending' 
                                            ? 'rgba(255, 243, 224, 0.5)' 
                                            : 'inherit'
                                    }}
                                >
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="medium">
                                            {leave.employee?.first_name} {leave.employee?.last_name}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {leave.employee?.employee_id}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={leave.leave_type?.name}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {formatDate(leave.start_date)}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            → {formatDate(leave.end_date)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="medium">
                                            {leave.total_days} day{leave.total_days > 1 ? 's' : ''}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <LeaveStatusBadge status={leave.status} />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" color="textSecondary">
                                            {formatDate(leave.created_at)}
                                        </Typography>
                                    </TableCell>
                                    {showActions && (
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={0.5} justifyContent="center">
                                                {/* Approve */}
                                                {isPending(leave.status) && (
                                                    <Tooltip title="Approve">
                                                        <IconButton
                                                            size="small"
                                                            color="success"
                                                            onClick={() => onApprove?.(leave.id)}
                                                        >
                                                            <CheckCircleIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}

                                                {/* Reject */}
                                                {isPending(leave.status) && (
                                                    <Tooltip title="Reject">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => onReject?.(leave)}
                                                        >
                                                            <CancelIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}

                                                {/* Cancel */}
                                                {isPending(leave.status) && (
                                                    <Tooltip title="Cancel">
                                                        <IconButton
                                                            size="small"
                                                            color="warning"
                                                            onClick={() => onCancel?.(leave.id)}
                                                        >
                                                            <BlockIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}

                                                {/* View */}
                                                <Tooltip title="View Details">
                                                    <IconButton
                                                        size="small"
                                                        color="info"
                                                        onClick={() => onView?.(leave.id)}
                                                    >
                                                        <VisibilityIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
                rowsPerPageOptions={[15, 25, 50, 100]}
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

export default LeaveTable;