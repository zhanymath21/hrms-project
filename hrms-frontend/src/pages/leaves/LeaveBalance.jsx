// src/pages/leaves/LeaveBalance.jsx

import React, { useEffect, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    CircularProgress,
    Alert,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Button,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    LinearProgress,
    Divider,
    Avatar,
    Stack,
    Tab,
    Tabs,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    ListItemSecondaryAction,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as ViewIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Pending as PendingIcon,
    CalendarToday as CalendarIcon,
    People as PeopleIcon,
    Receipt as ReceiptIcon,
    Download as DownloadIcon,
    Print as PrintIcon,
    Search as SearchIcon,
    ArrowForward as ArrowForwardIcon,
    History as HistoryIcon,
} from '@mui/icons-material';
import { useLeave } from '../../contexts/LeaveContext';
import { useAuth } from '../contexts/AuthContext';

// Tab Panel Component
function TabPanel({ children, value, index }) {
    return (
        <div hidden={value !== index}>
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
}

const LeaveBalance = () => {
    const {
        leaveTypes,
        balances,
        allBalances,
        loading,
        error,
        fetchLeaveTypes,
        fetchMyBalance,
        fetchAllBalances,
        updateBalance,
        fetchBalanceSummary,
        clearError,
    } = useLeave();

    const { user } = useAuth();
    const isAdmin = user?.position?.title === 'HR Manager' || 
                    user?.position?.title === 'Admin' || 
                    user?.position?.title === 'System Admin';

    // State
    const [tabValue, setTabValue] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedBalance, setSelectedBalance] = useState(null);
    const [formData, setFormData] = useState({
        total_entitlement: 0,
        adjustment_reason: '',
    });
    const [summary, setSummary] = useState(null);
    const [filter, setFilter] = useState({
        search: '',
        department_id: '',
        leave_type_id: '',
    });
    const [sortConfig, setSortConfig] = useState({
        key: 'name',
        direction: 'asc',
    });
    const [showCarryForward, setShowCarryForward] = useState(false);

    // Load data on mount
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        await fetchLeaveTypes();
        await fetchMyBalance();
        if (isAdmin) {
            await fetchAllBalances();
            const summaryData = await fetchBalanceSummary();
            setSummary(summaryData);
        }
    };

    const handleRefresh = () => {
        loadData();
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    // Handle edit balance
    const handleEditBalance = (balance) => {
        setSelectedBalance(balance);
        setFormData({
            total_entitlement: balance.total_entitlement || 0,
            adjustment_reason: '',
        });
        setOpenDialog(true);
    };

    const handleUpdateBalance = async () => {
        if (!formData.adjustment_reason) {
            alert('Please provide an adjustment reason');
            return;
        }

        try {
            await updateBalance(selectedBalance.id, formData);
            setOpenDialog(false);
            setSelectedBalance(null);
            await loadData();
        } catch (err) {
            console.error('Failed to update balance:', err);
        }
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedBalance(null);
        setFormData({
            total_entitlement: 0,
            adjustment_reason: '',
        });
    };

    // Filter and sort employees
    const filteredEmployees = allBalances?.data?.filter(emp => {
        if (!filter.search) return true;
        const searchLower = filter.search.toLowerCase();
        return (
            emp.name?.toLowerCase().includes(searchLower) ||
            emp.employee_id?.toLowerCase().includes(searchLower) ||
            emp.email?.toLowerCase().includes(searchLower) ||
            emp.department?.name?.toLowerCase().includes(searchLower)
        );
    }) || [];

    // Sort employees
    const sortedEmployees = [...filteredEmployees].sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        if (typeof aVal === 'string') {
            return sortConfig.direction === 'asc'
                ? aVal.localeCompare(bVal)
                : bVal.localeCompare(aVal);
        }
        return sortConfig.direction === 'asc'
            ? (aVal || 0) - (bVal || 0)
            : (bVal || 0) - (aVal || 0);
    });

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    // Get color for leave type
    const getLeaveTypeColor = (code) => {
        const colors = {
            AL: '#4CAF50',
            SL: '#2196F3',
            SPL: '#FF9800',
            ML: '#9C27B0',
            BL: '#F44336',
            CL: '#00BCD4',
        };
        return colors[code] || '#757575';
    };

    // Check if leave type allows carry forward
    const allowCarryForward = (leaveType) => {
        return leaveType?.allow_carry_forward || false;
    };

    // Get max carry forward days
    const getMaxCarryForward = (leaveType) => {
        return leaveType?.max_carry_forward_days || 6;
    };

    // Calculate carry forward amount
    const calculateCarryForward = (balance) => {
        if (!balance || !allowCarryForward(balance.leave_type)) return 0;
        const maxCarry = getMaxCarryForward(balance.leave_type);
        return Math.min(balance.remaining_days || 0, maxCarry);
    };

    // Loading state
    if (loading && !balances.length) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress size={60} />
                    <Typography sx={{ mt: 2, color: 'text.secondary' }}>
                        Loading leave balances...
                    </Typography>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        My Leave Balance
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        View your leave balance and carry forward details
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Refresh">
                        <IconButton onClick={handleRefresh} sx={{ bgcolor: 'background.paper' }}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Error Alert */}
            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 3 }}
                    onClose={clearError}
                >
                    {error}
                </Alert>
            )}

            {/* My Balance Tab */}
            <Grid container spacing={3}>
                {/* Summary Cards */}
                <Grid item xs={12} md={3}>
                    <Card sx={{ bgcolor: '#6366f1', color: 'white' }}>
                        <CardContent>
                            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                                Total Entitlement
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                {balances.reduce((sum, b) => sum + (b.total_entitlement || 0), 0)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={{ bgcolor: '#10b981', color: 'white' }}>
                        <CardContent>
                            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                                Used Days
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                {balances.reduce((sum, b) => sum + (b.used_days || 0), 0)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={{ bgcolor: '#f59e0b', color: 'white' }}>
                        <CardContent>
                            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                                Pending Days
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                {balances.reduce((sum, b) => sum + (b.pending_days || 0), 0)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={{ bgcolor: '#3b82f6', color: 'white' }}>
                        <CardContent>
                            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                                Remaining Days
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                {balances.reduce((sum, b) => sum + (b.remaining_days || 0), 0)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Balance Details with Carry Forward */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Balance Details
                                </Typography>
                                <Button
                                    size="small"
                                    startIcon={<HistoryIcon />}
                                    onClick={() => setShowCarryForward(!showCarryForward)}
                                >
                                    {showCarryForward ? 'Hide Carry Forward' : 'Show Carry Forward'}
                                </Button>
                            </Box>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Leave Type</TableCell>
                                            <TableCell align="center">Entitlement</TableCell>
                                            <TableCell align="center">Used</TableCell>
                                            <TableCell align="center">Pending</TableCell>
                                            <TableCell align="center">Remaining</TableCell>
                                            {showCarryForward && (
                                                <>
                                                    <TableCell align="center">Carry Forward</TableCell>
                                                    <TableCell align="center">Max Carry Forward</TableCell>
                                                </>
                                            )}
                                            <TableCell align="center">Progress</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {balances && balances.length > 0 ? (
                                            balances.map((balance) => {
                                                const percentage = balance.total_entitlement > 0
                                                    ? (balance.used_days / balance.total_entitlement) * 100
                                                    : 0;
                                                const color = percentage > 80 ? 'error' : percentage > 50 ? 'warning' : 'success';
                                                const carryForward = calculateCarryForward(balance);
                                                const maxCarry = getMaxCarryForward(balance.leave_type);
                                                
                                                return (
                                                    <TableRow key={balance.id}>
                                                        <TableCell>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Avatar
                                                                    sx={{
                                                                        width: 32,
                                                                        height: 32,
                                                                        bgcolor: getLeaveTypeColor(balance.leave_type?.code),
                                                                        fontSize: 14,
                                                                    }}
                                                                >
                                                                    {balance.leave_type?.code?.substring(0, 2) || 'L'}
                                                                </Avatar>
                                                                <Box>
                                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                        {balance.leave_type?.name}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {balance.leave_type?.code}
                                                                    </Typography>
                                                                </Box>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                {balance.total_entitlement || 0}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Typography variant="body2">
                                                                {balance.used_days || 0}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            {balance.pending_days > 0 ? (
                                                                <Chip
                                                                    label={balance.pending_days}
                                                                    size="small"
                                                                    color="warning"
                                                                    icon={<PendingIcon />}
                                                                />
                                                            ) : (
                                                                <Typography variant="body2">0</Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Typography 
                                                                variant="body2" 
                                                                sx={{ 
                                                                    fontWeight: 700, 
                                                                    color: balance.remaining_days <= 0 ? 'error.main' : 'text.primary' 
                                                                }}
                                                            >
                                                                {balance.remaining_days || 0}
                                                            </Typography>
                                                        </TableCell>
                                                        {showCarryForward && (
                                                            <>
                                                                <TableCell align="center">
                                                                    {allowCarryForward(balance.leave_type) ? (
                                                                        <Chip
                                                                            label={carryForward > 0 ? `${carryForward} days` : '0 days'}
                                                                            size="small"
                                                                            color={carryForward > 0 ? 'success' : 'default'}
                                                                            icon={carryForward > 0 ? <ArrowForwardIcon /> : null}
                                                                        />
                                                                    ) : (
                                                                        <Chip
                                                                            label="Not Allowed"
                                                                            size="small"
                                                                            color="default"
                                                                            variant="outlined"
                                                                        />
                                                                    )}
                                                                </TableCell>
                                                                <TableCell align="center">
                                                                    {allowCarryForward(balance.leave_type) ? (
                                                                        <Chip
                                                                            label={`${maxCarry} days`}
                                                                            size="small"
                                                                            color="info"
                                                                            variant="outlined"
                                                                        />
                                                                    ) : (
                                                                        <Typography variant="body2" color="text.secondary">
                                                                            -
                                                                        </Typography>
                                                                    )}
                                                                </TableCell>
                                                            </>
                                                        )}
                                                        <TableCell align="center">
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <LinearProgress
                                                                    variant="determinate"
                                                                    value={Math.min(percentage, 100)}
                                                                    sx={{
                                                                        width: 100,
                                                                        borderRadius: 2,
                                                                        bgcolor: 'grey.200',
                                                                        '& .MuiLinearProgress-bar': {
                                                                            bgcolor: color === 'success' ? '#10b981' : color === 'warning' ? '#f59e0b' : '#ef4444',
                                                                        }
                                                                    }}
                                                                />
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {Math.round(percentage)}%
                                                                </Typography>
                                                            </Box>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={showCarryForward ? 9 : 7} align="center">
                                                    <Typography color="text.secondary">
                                                        No balance records found
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Carry Forward Information Card */}
                {showCarryForward && (
                    <Grid item xs={12}>
                        <Card sx={{ bgcolor: '#f8fafc' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={2}>
                                    <Avatar sx={{ bgcolor: '#6366f1' }}>
                                        <HistoryIcon />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight="600">
                                            Carry Forward Information
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            • Annual Leave (AL) allows carry forward up to 6 days
                                            • Sick Leave (SL) and Special Leave (SPL) do not allow carry forward
                                            • Carry forward will be applied automatically at the end of the year
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};

export default LeaveBalance;