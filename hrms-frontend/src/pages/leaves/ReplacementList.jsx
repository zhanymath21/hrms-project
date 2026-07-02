// src/pages/leaves/ReplacementList.jsx

import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Add as AddIcon,
    Visibility as VisibilityIcon,
    Download as DownloadIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import leaveService from '../../services/leaveService';
import LeaveStatusBadge from '../../components/leaves/LeaveStatusBadge';
import { formatDate } from '../../utils/dateFormat';

const ReplacementList = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [replacements, setReplacements] = useState([]);
    const [pagination, setPagination] = useState({
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
    });
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [error, setError] = useState(null);
    const [selectedReplacement, setSelectedReplacement] = useState(null);
    const [showDetailDialog, setShowDetailDialog] = useState(false);

    useEffect(() => {
        loadData();
    }, [page, rowsPerPage, search, statusFilter]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: page + 1,
                per_page: rowsPerPage,
            };
            if (search) params.search = search;
            if (statusFilter) params.status = statusFilter;

            const data = await leaveService.getReplacements(params);
            setReplacements(data?.data || []);
            setPagination({
                current_page: data?.current_page || 1,
                per_page: data?.per_page || 15,
                total: data?.total || 0,
                last_page: data?.last_page || 1,
            });
        } catch (err) {
            setError('Failed to load replacement data');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => loadData();

    const handleViewDetail = (replacement) => {
        setSelectedReplacement(replacement);
        setShowDetailDialog(true);
    };

    const handleDownloadAttachment = async (id) => {
        try {
            const response = await leaveService.downloadReplacementAttachment(id);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = 'replacement_attachment.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Failed to download attachment: ' + err.message);
        }
    };

    if (loading && replacements.length === 0) {
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
                    🔄 Replacement Leaves
                </Typography>
                <Stack direction="row" spacing={1}>
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
                        onClick={() => navigate('/leaves/replacement/create')}
                    >
                        Request Replacement
                    </Button>
                </Stack>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search by employee name..."
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
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Status"
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="pending">Pending</MenuItem>
                                <MenuItem value="approved">Approved</MenuItem>
                                <MenuItem value="rejected">Rejected</MenuItem>
                                <MenuItem value="cancelled">Cancelled</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <Button
                            fullWidth
                            variant="outlined"
                            color="error"
                            onClick={() => {
                                setSearch('');
                                setStatusFilter('');
                            }}
                            disabled={!search && !statusFilter}
                            startIcon={<ClearIcon />}
                        >
                            Clear
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell>Employee</TableCell>
                            <TableCell>Work Date</TableCell>
                            <TableCell>Replacement Date</TableCell>
                            <TableCell>Hours</TableCell>
                            <TableCell>Days Added</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Requested</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {replacements.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                    <Typography color="textSecondary">
                                        No replacement requests found
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            replacements.map((item) => (
                                <TableRow key={item.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="medium">
                                            {item.employee?.first_name} {item.employee?.last_name}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {item.employee?.employee_id}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {formatDate(item.work_date)}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {item.work_day_type}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {formatDate(item.replacement_date)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={`${item.hours_worked}h`}
                                            size="small"
                                            color="info"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={`+${item.days_to_add} day`}
                                            size="small"
                                            color="primary"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <LeaveStatusBadge status={item.status} />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" color="textSecondary">
                                            {formatDate(item.created_at)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={0.5} justifyContent="center">
                                            <Tooltip title="View Details">
                                                <IconButton
                                                    size="small"
                                                    color="info"
                                                    onClick={() => handleViewDetail(item)}
                                                >
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {item.attachment && (
                                                <Tooltip title="Download Attachment">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => handleDownloadAttachment(item.id)}
                                                    >
                                                        <DownloadIcon fontSize="small" />
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
                    rowsPerPageOptions={[15, 25, 50]}
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

            {/* Detail Dialog */}
            <Dialog open={showDetailDialog} onClose={() => setShowDetailDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">Replacement Details</Typography>
                        {selectedReplacement?.attachment && (
                            <Button
                                size="small"
                                startIcon={<DownloadIcon />}
                                onClick={() => handleDownloadAttachment(selectedReplacement.id)}
                            >
                                Download Attachment
                            </Button>
                        )}
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="textSecondary">Employee</Typography>
                                <Typography variant="body1">
                                    {selectedReplacement?.employee?.first_name} {selectedReplacement?.employee?.last_name}
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                                <LeaveStatusBadge status={selectedReplacement?.status} size="medium" />
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="textSecondary">Work Date</Typography>
                                <Typography variant="body1">{formatDate(selectedReplacement?.work_date)}</Typography>
                                <Typography variant="caption" color="textSecondary">
                                    {selectedReplacement?.work_day_type} · {selectedReplacement?.hours_worked} hours
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="textSecondary">Replacement Date</Typography>
                                <Typography variant="body1">{formatDate(selectedReplacement?.replacement_date)}</Typography>
                                <Typography variant="caption" color="textSecondary">
                                    +{selectedReplacement?.days_to_add} days to Annual Leave
                                </Typography>
                            </Paper>
                        </Grid>
                        {selectedReplacement?.reason && (
                            <Grid item xs={12}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" color="textSecondary">Reason</Typography>
                                    <Typography variant="body1">{selectedReplacement.reason}</Typography>
                                </Paper>
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowDetailDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ReplacementList;