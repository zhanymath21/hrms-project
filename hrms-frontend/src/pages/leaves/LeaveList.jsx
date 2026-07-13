// src/pages/leaves/LeaveList.jsx

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
    Chip,
    IconButton,
    Button,
    Typography,
    Stack,
    Alert,
    CircularProgress,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Tooltip,
    Avatar,
    Tabs,
    Tab,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Add as AddIcon,
    Visibility as VisibilityIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    Pending as PendingIcon,
    Check as CheckIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { useLeave } from '../../contexts/LeaveContext';
import { useNavigate } from 'react-router-dom';
import LeaveStatusBadge from '../../components/leaves/LeaveStatusBadge';
import { formatDate } from '../../utils/dateFormat';

const LeaveList = () => {
    const navigate = useNavigate();
    const {
        leaves,
        loading,
        error,
        pagination,
        fetchLeaves,
        fetchPendingLeaves,
        cancelLeave,
    } = useLeave();

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [tabValue, setTabValue] = useState(0);

    useEffect(() => {
        loadData();
    }, [page, rowsPerPage, search, statusFilter, tabValue]);

    const loadData = async () => {
        const params = {
            page: page + 1,
            per_page: rowsPerPage,
        };
        if (search) params.search = search;
        if (statusFilter !== 'all') params.status = statusFilter;
        
        await fetchLeaves(params);
        await fetchPendingLeaves();
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
        setPage(0);
        const statusMap = ['all', 'pending', 'approved', 'rejected'];
        setStatusFilter(statusMap[newValue] || 'all');
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <PendingIcon fontSize="small" />;
            case 'approved': return <CheckIcon fontSize="small" />;
            case 'rejected': return <CloseIcon fontSize="small" />;
            default: return null;
        }
    };

    if (loading && leaves.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold">
                    📋 My Leave Requests
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadData}
                        disabled={loading}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/leaves/create')}
                    >
                        Request Leave
                    </Button>
                </Stack>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Tabs */}
            <Paper sx={{ mb: 2 }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="All" />
                    <Tab label="Pending" />
                    <Tab label="Approved" />
                    <Tab label="Rejected" />
                </Tabs>
            </Paper>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search by leave type or reason..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                                endAdornment: search && (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setSearch('')}>
                                            <ClearIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => {
                                setSearch('');
                                setStatusFilter('all');
                                setTabValue(0);
                                setPage(0);
                            }}
                            disabled={!search && statusFilter === 'all'}
                            startIcon={<ClearIcon />}
                        >
                            Clear Filters
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell>Leave Type</TableCell>
                            <TableCell>Duration</TableCell>
                            <TableCell>Days</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Requested</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {leaves.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                    <Typography color="textSecondary">
                                        {search || statusFilter !== 'all' 
                                            ? 'No leave requests match your filters' 
                                            : 'No leave requests found'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            leaves.map((leave) => (
                                <TableRow key={leave.id} hover>
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                                                {leave.leave_type?.code?.charAt(0) || 'L'}
                                            </Avatar>
                                            <Typography variant="body2" fontWeight="medium">
                                                {leave.leave_type?.name || '-'}
                                            </Typography>
                                        </Box>
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
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={0.5} justifyContent="center">
                                            <Tooltip title="View Details">
                                                <IconButton
                                                    size="small"
                                                    color="info"
                                                    onClick={() => navigate(`/leaves/${leave.id}`)}
                                                >
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {leave.status === 'pending' && (
                                                <Tooltip title="Cancel">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => {
                                                            if (window.confirm('Cancel this leave request?')) {
                                                                cancelLeave(leave.id);
                                                                loadData();
                                                            }
                                                        }}
                                                    >
                                                        <CancelIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[10, 25, 50]}
                    component="div"
                    count={pagination.total || 0}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                />
            </TableContainer>
        </Box>
    );
};

export default LeaveList;