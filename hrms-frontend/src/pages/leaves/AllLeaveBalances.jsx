// src/pages/leaves/AllLeaveBalances.jsx

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
    Alert,
    CircularProgress,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Card,
    CardContent,
    Tooltip,
    Avatar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    LinearProgress,
    Snackbar,
    Menu,
    ListItemIcon,
    ListItemText,
} from '@mui/material';

import {
    Refresh as RefreshIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Close as CloseIcon,
    ArrowForward as ArrowForwardIcon,
    History as HistoryIcon,
    Download as DownloadIcon,
    PictureAsPdf as PictureAsPdfIcon,
    TableChart as TableChartIcon,
    FilterList as FilterListIcon,
} from '@mui/icons-material';

import { useLeave } from '../../contexts/LeaveContext';
import api from '../../services/axios';
import * as XLSX from 'xlsx';

const AllLeaveBalances = () => {
    const { fetchAllBalances, loading, error, updateBalance, updateCarryForward } = useLeave();
    const [employees, setEmployees] = useState([]);
    const [pagination, setPagination] = useState({
        current_page: 1,
        per_page: 20,
        total: 0,
        last_page: 1,
    });
    const [search, setSearch] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [departments, setDepartments] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [showCarryForward, setShowCarryForward] = useState(true);
    const [stats, setStats] = useState({
        totalEmployees: 0,
        totalAnnualLeave: 0,
        totalSickLeave: 0,
        totalSpecialLeave: 0,
        totalRemaining: 0,
        totalUsed: 0,
        totalPending: 0,
        totalCarryForward: 0,
        totalEntitlement: 0,
    });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Date Filter
    const [dateFilter, setDateFilter] = useState({
        startDate: null,
        endDate: null,
    });

    // Export Menu
    const [exportAnchorEl, setExportAnchorEl] = useState(null);
    const exportMenuOpen = Boolean(exportAnchorEl);

    // Edit Balance Dialog
    const [editDialog, setEditDialog] = useState({
        open: false,
        balanceId: null,
        employeeName: '',
        employeeId: '',
        leaveType: '',
        leaveCode: '',
        currentRemaining: 0,
        currentTotal: 0,
        usedDays: 0,
        pendingDays: 0,
        carryForward: 0,
        newTotal: 0,
        adjustmentReason: '',
        isLoading: false,
    });

    // Edit Carry Forward Dialog
    const [editCFDialog, setEditCFDialog] = useState({
        open: false,
        balanceId: null,
        employeeName: '',
        employeeId: '',
        leaveType: '',
        leaveCode: '',
        currentCarryForward: 0,
        newCarryForward: 0,
        adjustmentReason: '',
        isLoading: false,
    });

    useEffect(() => {
        loadData();
        fetchDepartments();
    }, [page, rowsPerPage, search, departmentFilter, dateFilter.startDate, dateFilter.endDate]);

    const fetchDepartments = async () => {
        try {
            const response = await api.get('/departments');
            setDepartments(response.data.data || []);
        } catch (err) {
            console.error('Error fetching departments:', err);
        }
    };

    const loadData = async () => {
        try {
            const params = {
                page: page + 1,
                per_page: rowsPerPage,
            };
            if (search) params.search = search;
            if (departmentFilter) params.department_id = departmentFilter;
            
            if (dateFilter.startDate) {
                params.start_date = dateFilter.startDate.toISOString().split('T')[0];
            }
            if (dateFilter.endDate) {
                params.end_date = dateFilter.endDate.toISOString().split('T')[0];
            }

            const response = await fetchAllBalances(params);
            const employeesData = response?.data || [];
            
            setEmployees(employeesData);
            setPagination({
                current_page: response?.pagination?.current_page || 1,
                per_page: response?.pagination?.per_page || 20,
                total: response?.pagination?.total || 0,
                last_page: response?.pagination?.last_page || 1,
            });

            let totalAL = 0, totalSL = 0, totalSPL = 0;
            let totalRemaining = 0, totalUsed = 0, totalPending = 0;
            let totalCarryForward = 0, totalEntitlement = 0;
            
            employeesData.forEach(emp => {
                const alBalance = emp.leave_balances?.find(b => 
                    b.leave_code === 'AL' || b.leave_type?.code === 'AL'
                );
                const slBalance = emp.leave_balances?.find(b => 
                    b.leave_code === 'SL' || b.leave_type?.code === 'SL'
                );
                const splBalance = emp.leave_balances?.find(b => 
                    b.leave_code === 'SPL' || b.leave_type?.code === 'SPL'
                );
                
                const alRemaining = parseFloat(alBalance?.remaining_days || 0);
                const slRemaining = parseFloat(slBalance?.remaining_days || 0);
                const splRemaining = parseFloat(splBalance?.remaining_days || 0);
                
                const alEntitlement = parseFloat(alBalance?.total_entitlement || 0);
                const slEntitlement = parseFloat(slBalance?.total_entitlement || 0);
                const splEntitlement = parseFloat(splBalance?.total_entitlement || 0);
                
                totalAL += alRemaining;
                totalSL += slRemaining;
                totalSPL += splRemaining;
                
                totalRemaining += alRemaining + slRemaining + splRemaining;
                
                const alUsed = parseFloat(alBalance?.used_days || 0);
                const slUsed = parseFloat(slBalance?.used_days || 0);
                const splUsed = parseFloat(splBalance?.used_days || 0);
                totalUsed += alUsed + slUsed + splUsed;
                
                const alPending = parseFloat(alBalance?.pending_days || 0);
                const slPending = parseFloat(slBalance?.pending_days || 0);
                const splPending = parseFloat(splBalance?.pending_days || 0);
                totalPending += alPending + slPending + splPending;
                
                totalEntitlement += alEntitlement + slEntitlement + splEntitlement;
                
                const alCarryForward = parseFloat(alBalance?.carry_forward || 0);
                const slCarryForward = parseFloat(slBalance?.carry_forward || 0);
                const splCarryForward = parseFloat(splBalance?.carry_forward || 0);
                totalCarryForward += alCarryForward + slCarryForward + splCarryForward;
            });

            setStats({
                totalEmployees: pagination.total || employeesData.length,
                totalAnnualLeave: totalAL,
                totalSickLeave: totalSL,
                totalSpecialLeave: totalSPL,
                totalRemaining: totalRemaining,
                totalUsed: totalUsed,
                totalPending: totalPending,
                totalCarryForward: totalCarryForward,
                totalEntitlement: totalEntitlement,
            });

        } catch (err) {
            console.error('Error loading data:', err);
            setSnackbar({
                open: true,
                message: 'Failed to load data: ' + err.message,
                severity: 'error',
            });
        }
    };

    const handleRefresh = () => {
        loadData();
        setSnackbar({
            open: true,
            message: 'Data refreshed successfully!',
            severity: 'success',
        });
    };

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setPage(0);
    };

    const handleDepartmentChange = (e) => {
        setDepartmentFilter(e.target.value);
        setPage(0);
    };

    const handleClearFilters = () => {
        setSearch('');
        setDepartmentFilter('');
        setDateFilter({ startDate: null, endDate: null });
        setPage(0);
        setSnackbar({
            open: true,
            message: 'All filters cleared!',
            severity: 'info',
        });
    };

    // ==================== EXPORT FUNCTIONS ====================
    const handleExportMenuOpen = (event) => {
        setExportAnchorEl(event.currentTarget);
    };

    const handleExportMenuClose = () => {
        setExportAnchorEl(null);
    };

    const exportToExcel = () => {
        try {
            const exportData = employees.map(emp => {
                const al = getBalanceByCode(emp, 'AL');
                const sl = getBalanceByCode(emp, 'SL');
                const spl = getBalanceByCode(emp, 'SPL');
                
                const alRemaining = parseFloat(al.remaining_days || 0);
                const slRemaining = parseFloat(sl.remaining_days || 0);
                const splRemaining = parseFloat(spl.remaining_days || 0);
                
                const alEntitlement = parseFloat(al.total_entitlement || 0);
                const slEntitlement = parseFloat(sl.total_entitlement || 0);
                const splEntitlement = parseFloat(spl.total_entitlement || 0);
                
                const alUsed = parseFloat(al.used_days || 0);
                const slUsed = parseFloat(sl.used_days || 0);
                const splUsed = parseFloat(spl.used_days || 0);
                
                const alPending = parseFloat(al.pending_days || 0);
                const slPending = parseFloat(sl.pending_days || 0);
                const splPending = parseFloat(spl.pending_days || 0);
                
                const alCarryForward = parseFloat(al.carry_forward || 0);
                const slCarryForward = parseFloat(sl.carry_forward || 0);
                const splCarryForward = parseFloat(spl.carry_forward || 0);

                return {
                    'Employee ID': emp.employee_id || '',
                    'Employee Name': emp.name || '',
                    'Department': emp.department?.name || 'N/A',
                    'AL Entitlement': alEntitlement,
                    'AL Used': alUsed,
                    'AL Pending': alPending,
                    'AL Remaining': alRemaining,
                    'AL Carry Forward': alCarryForward,
                    'SL Entitlement': slEntitlement,
                    'SL Used': slUsed,
                    'SL Pending': slPending,
                    'SL Remaining': slRemaining,
                    'SL Carry Forward': slCarryForward,
                    'SPL Entitlement': splEntitlement,
                    'SPL Used': splUsed,
                    'SPL Pending': splPending,
                    'SPL Remaining': splRemaining,
                    'SPL Carry Forward': splCarryForward,
                    'Total Entitlement': alEntitlement + slEntitlement + splEntitlement,
                    'Total Used': alUsed + slUsed + splUsed,
                    'Total Pending': alPending + slPending + splPending,
                    'Total Remaining': alRemaining + slRemaining + splRemaining,
                    'Total Carry Forward': alCarryForward + slCarryForward + splCarryForward,
                };
            });

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);
            
            const colWidths = [
                { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 12 },
                { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 12 },
                { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 12 },
                { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 15 },
                { wch: 15 }, { wch: 18 }, { wch: 20 },
            ];
            ws['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(wb, ws, 'Leave Balances');
            
            const fileName = `Leave_Balances_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            
            handleExportMenuClose();
            setSnackbar({
                open: true,
                message: `✅ Excel file downloaded successfully!`,
                severity: 'success',
            });
        } catch (err) {
            console.error('Export error:', err);
            setSnackbar({
                open: true,
                message: 'Failed to export Excel: ' + err.message,
                severity: 'error',
            });
        }
    };

    const exportToPDF = async () => {
        try {
            const jsPDFModule = await import('jspdf');
            const jsPDF = jsPDFModule.default;
            await import('jspdf-autotable');
            
            const doc = new jsPDF('landscape', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            
            doc.setFontSize(16);
            doc.setTextColor(40, 40, 40);
            doc.text('Employee Leave Balance Report', pageWidth / 2, 15, { align: 'center' });
            
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            let dateInfo = 'Report Date: ' + new Date().toLocaleDateString();
            if (dateFilter.startDate || dateFilter.endDate) {
                dateInfo += ' | Period: ';
                if (dateFilter.startDate) dateInfo += dateFilter.startDate.toLocaleDateString();
                if (dateFilter.startDate && dateFilter.endDate) dateInfo += ' - ';
                if (dateFilter.endDate) dateInfo += dateFilter.endDate.toLocaleDateString();
            }
            doc.text(dateInfo, pageWidth / 2, 22, { align: 'center' });
            
            const tableData = employees.map(emp => {
                const al = getBalanceByCode(emp, 'AL');
                const sl = getBalanceByCode(emp, 'SL');
                const spl = getBalanceByCode(emp, 'SPL');
                
                const alRemaining = parseFloat(al.remaining_days || 0);
                const slRemaining = parseFloat(sl.remaining_days || 0);
                const splRemaining = parseFloat(spl.remaining_days || 0);
                
                const alEntitlement = parseFloat(al.total_entitlement || 0);
                const slEntitlement = parseFloat(sl.total_entitlement || 0);
                const splEntitlement = parseFloat(spl.total_entitlement || 0);
                
                const alUsed = parseFloat(al.used_days || 0);
                const slUsed = parseFloat(sl.used_days || 0);
                const splUsed = parseFloat(spl.used_days || 0);
                
                const alPending = parseFloat(al.pending_days || 0);
                const slPending = parseFloat(sl.pending_days || 0);
                const splPending = parseFloat(spl.pending_days || 0);

                return [
                    emp.employee_id || '',
                    emp.name || '',
                    emp.department?.name || 'N/A',
                    alEntitlement.toFixed(1),
                    alUsed.toFixed(1),
                    alPending.toFixed(1),
                    alRemaining.toFixed(1),
                    slEntitlement.toFixed(1),
                    slUsed.toFixed(1),
                    slPending.toFixed(1),
                    slRemaining.toFixed(1),
                    splEntitlement.toFixed(1),
                    splUsed.toFixed(1),
                    splPending.toFixed(1),
                    splRemaining.toFixed(1),
                    (alEntitlement + slEntitlement + splEntitlement).toFixed(1),
                    (alUsed + slUsed + splUsed).toFixed(1),
                    (alPending + slPending + splPending).toFixed(1),
                    (alRemaining + slRemaining + splRemaining).toFixed(1),
                ];
            });

            const headers = [
                'ID', 'Name', 'Dept',
                'AL Ent.', 'AL Used', 'AL Pend.', 'AL Rem.',
                'SL Ent.', 'SL Used', 'SL Pend.', 'SL Rem.',
                'SPL Ent.', 'SPL Used', 'SPL Pend.', 'SPL Rem.',
                'Total Ent.', 'Total Used', 'Total Pend.', 'Total Rem.'
            ];

            doc.autoTable({
                head: [headers],
                body: tableData,
                startY: 28,
                styles: {
                    fontSize: 6,
                    cellPadding: 1.5,
                },
                headStyles: {
                    fillColor: [63, 81, 181],
                    textColor: 255,
                    fontSize: 7,
                    fontStyle: 'bold',
                },
                columnStyles: {
                    0: { cellWidth: 20 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 25 },
                },
                didDrawPage: function(data) {
                    doc.setFontSize(8);
                    doc.setTextColor(150, 150, 150);
                    doc.text(
                        `Page ${doc.internal.getCurrentPageInfo().pageNumber}`,
                        pageWidth - 20,
                        doc.internal.pageSize.getHeight() - 5
                    );
                }
            });

            const fileName = `Leave_Balances_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
            
            handleExportMenuClose();
            setSnackbar({
                open: true,
                message: `✅ PDF file downloaded successfully!`,
                severity: 'success',
            });
        } catch (err) {
            console.error('Export error:', err);
            setSnackbar({
                open: true,
                message: 'Failed to export PDF: ' + err.message,
                severity: 'error',
            });
        }
    };

    // ==================== EDIT BALANCE ====================
    const handleOpenEdit = (employee, balance) => {
        if (!balance || !balance.id) {
            setSnackbar({
                open: true,
                message: 'Balance not found for this employee',
                severity: 'error',
            });
            return;
        }

        setEditDialog({
            open: true,
            balanceId: balance.id,
            employeeName: employee.name,
            employeeId: employee.employee_id,
            leaveType: balance.leave_type || balance.leaveType?.name || 'Unknown',
            leaveCode: balance.leave_code || balance.leaveType?.code || 'N/A',
            currentRemaining: parseFloat(balance.remaining_days || 0),
            currentTotal: parseFloat(balance.total_entitlement || 0),
            usedDays: parseFloat(balance.used_days || 0),
            pendingDays: parseFloat(balance.pending_days || 0),
            carryForward: parseFloat(balance.carry_forward || 0),
            newTotal: parseFloat(balance.total_entitlement || 0),
            adjustmentReason: '',
            isLoading: false,
        });
    };

    const handleCloseEdit = () => {
        setEditDialog({
            open: false,
            balanceId: null,
            employeeName: '',
            employeeId: '',
            leaveType: '',
            leaveCode: '',
            currentRemaining: 0,
            currentTotal: 0,
            usedDays: 0,
            pendingDays: 0,
            carryForward: 0,
            newTotal: 0,
            adjustmentReason: '',
            isLoading: false,
        });
    };

    const handleSaveEdit = async () => {
        if (!editDialog.adjustmentReason) {
            setSnackbar({
                open: true,
                message: 'Please provide a reason for adjustment',
                severity: 'error',
            });
            return;
        }

        if (editDialog.newTotal < 0) {
            setSnackbar({
                open: true,
                message: 'Total entitlement cannot be negative',
                severity: 'error',
            });
            return;
        }

        setEditDialog({ ...editDialog, isLoading: true });

        try {
            await updateBalance(editDialog.balanceId, {
                total_entitlement: editDialog.newTotal,
                adjustment_reason: editDialog.adjustmentReason,
            });

            setSnackbar({
                open: true,
                message: `✅ ${editDialog.employeeName}'s ${editDialog.leaveType} balance updated successfully!`,
                severity: 'success',
            });
            
            handleCloseEdit();
            loadData();
        } catch (err) {
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to update balance',
                severity: 'error',
            });
        } finally {
            setEditDialog({ ...editDialog, isLoading: false });
        }
    };

    // ==================== EDIT CARRY FORWARD ====================
    const handleOpenEditCF = (employee, balance) => {
        if (!balance || !balance.id) {
            setSnackbar({
                open: true,
                message: 'Balance not found for this employee',
                severity: 'error',
            });
            return;
        }

        const leaveCode = balance.leave_code || balance.leaveType?.code;
        if (leaveCode !== 'AL') {
            setSnackbar({
                open: true,
                message: 'Carry forward is only allowed for Annual Leave (AL)',
                severity: 'warning',
            });
            return;
        }

        setEditCFDialog({
            open: true,
            balanceId: balance.id,
            employeeName: employee.name,
            employeeId: employee.employee_id,
            leaveType: balance.leave_type || balance.leaveType?.name || 'Annual Leave',
            leaveCode: leaveCode,
            currentCarryForward: parseFloat(balance.carry_forward || 0),
            newCarryForward: parseFloat(balance.carry_forward || 0),
            adjustmentReason: '',
            isLoading: false,
        });
    };

    const handleCloseEditCF = () => {
        setEditCFDialog({
            open: false,
            balanceId: null,
            employeeName: '',
            employeeId: '',
            leaveType: '',
            leaveCode: '',
            currentCarryForward: 0,
            newCarryForward: 0,
            adjustmentReason: '',
            isLoading: false,
        });
    };

    const handleSaveEditCF = async () => {
        if (!editCFDialog.adjustmentReason) {
            setSnackbar({
                open: true,
                message: 'Please provide a reason for the adjustment',
                severity: 'error',
            });
            return;
        }

        if (editCFDialog.newCarryForward < 0 || editCFDialog.newCarryForward > 6) {
            setSnackbar({
                open: true,
                message: 'Carry forward must be between 0 and 6 days',
                severity: 'error',
            });
            return;
        }

        setEditCFDialog({ ...editCFDialog, isLoading: true });

        try {
            await updateCarryForward(editCFDialog.balanceId, {
                carry_forward: editCFDialog.newCarryForward,
                adjustment_reason: editCFDialog.adjustmentReason,
            });

            setSnackbar({
                open: true,
                message: `✅ ${editCFDialog.employeeName}'s carry forward updated to ${editCFDialog.newCarryForward} days!`,
                severity: 'success',
            });
            
            handleCloseEditCF();
            loadData();
        } catch (err) {
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to update carry forward',
                severity: 'error',
            });
        } finally {
            setEditCFDialog({ ...editCFDialog, isLoading: false });
        }
    };

    const getStatusColor = (remaining, total) => {
        const percentage = total > 0 ? (remaining / total) * 100 : 0;
        if (percentage <= 20) return 'error';
        if (percentage <= 50) return 'warning';
        return 'success';
    };

    const getStatusLabel = (remaining, total) => {
        const percentage = total > 0 ? (remaining / total) * 100 : 0;
        if (percentage <= 20) return 'Critical';
        if (percentage <= 50) return 'Low';
        return 'Good';
    };

    const getInitials = (name) => {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
        }
        return name.substring(0, 2).toUpperCase();
    };

    const getBalanceByCode = (employee, code) => {
        if (!employee?.leave_balances) return {};
        const balance = employee.leave_balances.find(b => 
            b.leave_code === code || b.leave_type?.code === code
        );
        return balance || {};
    };

    const formatNumber = (value) => {
        const num = parseFloat(value) || 0;
        return num.toFixed(1);
    };

    if (loading && employees.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">
                        📊 Employee Leave Balances
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Manage and monitor all employee leave balances including carry forward
                    </Typography>
                </Box>
                <Box display="flex" gap={1}>
                    <Button
                        variant={showCarryForward ? "contained" : "outlined"}
                        startIcon={<HistoryIcon />}
                        onClick={() => setShowCarryForward(!showCarryForward)}
                        color="secondary"
                        size="small"
                    >
                        {showCarryForward ? 'Hide' : 'Show'} Carry Forward
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={handleRefresh}
                        disabled={loading}
                        size="small"
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        onClick={handleExportMenuOpen}
                        color="primary"
                        size="small"
                    >
                        Export
                    </Button>
                </Box>
            </Box>

            {/* Export Menu */}
            <Menu
                anchorEl={exportAnchorEl}
                open={exportMenuOpen}
                onClose={handleExportMenuClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <MenuItem onClick={exportToExcel}>
                    <ListItemIcon>
                        <TableChartIcon sx={{ color: '#4caf50' }} />
                    </ListItemIcon>
                    <ListItemText primary="Export to Excel" secondary=".xlsx" />
                </MenuItem>
                <MenuItem onClick={exportToPDF}>
                    <ListItemIcon>
                        <PictureAsPdfIcon sx={{ color: '#f44336' }} />
                    </ListItemIcon>
                    <ListItemText primary="Export to PDF" secondary=".pdf" />
                </MenuItem>
            </Menu>

            {/* Stats Cards */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={6} sm={3} md={2}>
                    <Card sx={{ bgcolor: '#e3f2fd', borderLeft: '4px solid #1976d2' }}>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography color="textSecondary" variant="caption">Total Employees</Typography>
                            <Typography variant="h5" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                                {stats.totalEmployees}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                    <Card sx={{ bgcolor: '#e8f5e9', borderLeft: '4px solid #4caf50' }}>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography color="textSecondary" variant="caption">🏖️ AL Remaining</Typography>
                            <Typography variant="h5" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                                {formatNumber(stats.totalAnnualLeave)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                    <Card sx={{ bgcolor: '#ffebee', borderLeft: '4px solid #f44336' }}>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography color="textSecondary" variant="caption">🏥 SL Remaining</Typography>
                            <Typography variant="h5" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                                {formatNumber(stats.totalSickLeave)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                    <Card sx={{ bgcolor: '#fff3e0', borderLeft: '4px solid #ff9800' }}>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography color="textSecondary" variant="caption">🎉 SPL Remaining</Typography>
                            <Typography variant="h5" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                                {formatNumber(stats.totalSpecialLeave)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                    <Card sx={{ bgcolor: '#f3e5f5', borderLeft: '4px solid #9c27b0' }}>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography color="textSecondary" variant="caption">🔄 Total Carry Forward</Typography>
                            <Typography variant="h5" sx={{ color: '#9c27b0', fontWeight: 'bold' }}>
                                {formatNumber(stats.totalCarryForward)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                    <Card sx={{ bgcolor: '#e8eaf6', borderLeft: '4px solid #3f51b5' }}>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography color="textSecondary" variant="caption">📋 Total Entitlement</Typography>
                            <Typography variant="h5" sx={{ color: '#3f51b5', fontWeight: 'bold' }}>
                                {formatNumber(stats.totalEntitlement)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search by name or employee ID..."
                            value={search}
                            onChange={handleSearch}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
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
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Department</InputLabel>
                            <Select value={departmentFilter} label="Department" onChange={handleDepartmentChange}>
                                <MenuItem value="">All Departments</MenuItem>
                                {departments.map((dept) => (
                                    <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={3} md={2}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Start Date"
                            type="date"
                            value={dateFilter.startDate ? dateFilter.startDate.toISOString().split('T')[0] : ''}
                            onChange={(e) => {
                                const value = e.target.value;
                                setDateFilter({
                                    ...dateFilter,
                                    startDate: value ? new Date(value) : null,
                                });
                            }}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={6} sm={3} md={2}>
                        <TextField
                            fullWidth
                            size="small"
                            label="End Date"
                            type="date"
                            value={dateFilter.endDate ? dateFilter.endDate.toISOString().split('T')[0] : ''}
                            onChange={(e) => {
                                const value = e.target.value;
                                setDateFilter({
                                    ...dateFilter,
                                    endDate: value ? new Date(value) : null,
                                });
                            }}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={1}>
                        <Button
                            fullWidth
                            variant="outlined"
                            color="error"
                            onClick={handleClearFilters}
                            disabled={!search && !departmentFilter && !dateFilter.startDate && !dateFilter.endDate}
                            startIcon={<ClearIcon />}
                            size="small"
                        >
                            Clear
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell sx={{ minWidth: 180 }}>Employee</TableCell>
                            <TableCell sx={{ minWidth: 120 }}>Department</TableCell>
                            <TableCell align="center" sx={{ minWidth: 70 }}>
                                <Tooltip title="Annual Leave">
                                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                        🏖️ <Typography variant="caption">AL</Typography>
                                    </Box>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 70 }}>
                                <Tooltip title="Sick Leave">
                                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                        🏥 <Typography variant="caption">SL</Typography>
                                    </Box>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 70 }}>
                                <Tooltip title="Special Leave">
                                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                        🎉 <Typography variant="caption">SPL</Typography>
                                    </Box>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 80 }}>
                                <Tooltip title="Total Entitlement (All Leave Types)">
                                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                        📋 <Typography variant="caption">Total Ent.</Typography>
                                    </Box>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 70 }}>
                                <Tooltip title="Used Days">
                                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                        📈 <Typography variant="caption">Used</Typography>
                                    </Box>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 70 }}>
                                <Tooltip title="Pending Days">
                                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                        ⏳ <Typography variant="caption">Pending</Typography>
                                    </Box>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 80 }}>
                                <Tooltip title="Total Remaining (All Leave Types)">
                                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                        💚 <Typography variant="caption">Total Rem.</Typography>
                                    </Box>
                                </Tooltip>
                            </TableCell>
                            {showCarryForward && (
                                <TableCell align="center" sx={{ minWidth: 120 }}>
                                    <Tooltip title="Carry Forward (Max 6 days for AL)">
                                        <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                            🔄 <Typography variant="caption" fontWeight="bold">Carry Forward</Typography>
                                        </Box>
                                    </Tooltip>
                                </TableCell>
                            )}
                            <TableCell align="center" sx={{ minWidth: 90 }}>Status</TableCell>
                            <TableCell align="center" sx={{ minWidth: 70 }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {employees.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={showCarryForward ? 13 : 12} align="center" sx={{ py: 4 }}>
                                    <Typography color="textSecondary">No employees found</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            employees.map((employee) => {
                                const al = getBalanceByCode(employee, 'AL');
                                const sl = getBalanceByCode(employee, 'SL');
                                const spl = getBalanceByCode(employee, 'SPL');
                                
                                const alRemaining = parseFloat(al.remaining_days || 0);
                                const slRemaining = parseFloat(sl.remaining_days || 0);
                                const splRemaining = parseFloat(spl.remaining_days || 0);
                                
                                const alEntitlement = parseFloat(al.total_entitlement || 0);
                                const slEntitlement = parseFloat(sl.total_entitlement || 0);
                                const splEntitlement = parseFloat(spl.total_entitlement || 0);
                                
                                const alUsed = parseFloat(al.used_days || 0);
                                const slUsed = parseFloat(sl.used_days || 0);
                                const splUsed = parseFloat(spl.used_days || 0);
                                
                                const alPending = parseFloat(al.pending_days || 0);
                                const slPending = parseFloat(sl.pending_days || 0);
                                const splPending = parseFloat(spl.pending_days || 0);
                                
                                const totalEntitlement = alEntitlement + slEntitlement + splEntitlement;
                                const totalRemaining = alRemaining + slRemaining + splRemaining;
                                const totalUsed = alUsed + slUsed + splUsed;
                                const totalPending = alPending + slPending + splPending;
                                
                                const alCarryForward = parseFloat(al.carry_forward || 0);
                                const slCarryForward = parseFloat(sl.carry_forward || 0);
                                const splCarryForward = parseFloat(spl.carry_forward || 0);
                                const totalCarryForward = alCarryForward + slCarryForward + splCarryForward;
                                
                                const statusColor = getStatusColor(totalRemaining, totalEntitlement);
                                const statusLabel = getStatusLabel(totalRemaining, totalEntitlement);

                                return (
                                    <TableRow key={employee.id} hover>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Avatar sx={{ width: 32, height: 32, bgcolor: '#6366f1', fontSize: 12 }}>
                                                    {getInitials(employee.name)}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight="medium" fontSize="0.875rem">
                                                        {employee.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {employee.employee_id}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={employee.department?.name || 'N/A'} 
                                                size="small" 
                                                variant="outlined"
                                                sx={{ fontWeight: 500, fontSize: '0.7rem' }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography 
                                                variant="body2" 
                                                fontWeight="bold" 
                                                sx={{ color: alRemaining > 0 ? '#4caf50' : '#f44336' }}
                                            >
                                                {formatNumber(alRemaining)}
                                            </Typography>
                                            {showCarryForward && alCarryForward > 0 && (
                                                <Chip
                                                    label={`CF: ${formatNumber(alCarryForward)}`}
                                                    size="small"
                                                    color="secondary"
                                                    sx={{ mt: 0.5, height: 18, fontSize: '0.6rem' }}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography 
                                                variant="body2" 
                                                fontWeight="bold" 
                                                sx={{ color: slRemaining > 0 ? '#4caf50' : '#f44336' }}
                                            >
                                                {formatNumber(slRemaining)}
                                            </Typography>
                                            {showCarryForward && slCarryForward > 0 && (
                                                <Chip
                                                    label={`CF: ${formatNumber(slCarryForward)}`}
                                                    size="small"
                                                    color="secondary"
                                                    sx={{ mt: 0.5, height: 18, fontSize: '0.6rem' }}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography 
                                                variant="body2" 
                                                fontWeight="bold" 
                                                sx={{ color: splRemaining > 0 ? '#4caf50' : '#f44336' }}
                                            >
                                                {formatNumber(splRemaining)}
                                            </Typography>
                                            {showCarryForward && splCarryForward > 0 && (
                                                <Chip
                                                    label={`CF: ${formatNumber(splCarryForward)}`}
                                                    size="small"
                                                    color="secondary"
                                                    sx={{ mt: 0.5, height: 18, fontSize: '0.6rem' }}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" fontWeight="bold" sx={{ color: '#3f51b5' }}>
                                                {formatNumber(totalEntitlement)}
                                            </Typography>
                                            <Typography variant="caption" display="block" color="textSecondary" fontSize="0.65rem">
                                                {formatNumber(alEntitlement)} + {formatNumber(slEntitlement)} + {formatNumber(splEntitlement)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" sx={{ color: '#f44336', fontWeight: 'medium' }}>
                                                {formatNumber(totalUsed)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" sx={{ color: '#ff9800', fontWeight: 'medium' }}>
                                                {formatNumber(totalPending)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography 
                                                variant="body2" 
                                                fontWeight="bold" 
                                                sx={{ color: totalRemaining > 0 ? '#4caf50' : '#f44336' }}
                                            >
                                                {formatNumber(totalRemaining)}
                                            </Typography>
                                            <Typography variant="caption" display="block" color="textSecondary" fontSize="0.65rem">
                                                {formatNumber(alRemaining)} + {formatNumber(slRemaining)} + {formatNumber(splRemaining)}
                                            </Typography>
                                        </TableCell>
                                        {showCarryForward && (
                                            <TableCell align="center">
                                                {totalCarryForward > 0 ? (
                                                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                                        <Chip
                                                            label={`${formatNumber(totalCarryForward)} days`}
                                                            size="small"
                                                            color="secondary"
                                                            icon={<ArrowForwardIcon />}
                                                            sx={{ fontWeight: 600 }}
                                                        />
                                                        <Tooltip title="Edit Carry Forward">
                                                            <IconButton
                                                                size="small"
                                                                color="primary"
                                                                onClick={() => {
                                                                    const alBalance = employee.leave_balances?.find(b => 
                                                                        b.leave_code === 'AL' || b.leave_type?.code === 'AL'
                                                                    );
                                                                    if (alBalance) {
                                                                        handleOpenEditCF(employee, alBalance);
                                                                    }
                                                                }}
                                                                sx={{ p: 0.5 }}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                ) : (
                                                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                                        <Chip
                                                            label="0"
                                                            size="small"
                                                            variant="outlined"
                                                            color="default"
                                                        />
                                                        <Tooltip title="Set Carry Forward">
                                                            <IconButton
                                                                size="small"
                                                                color="primary"
                                                                onClick={() => {
                                                                    const alBalance = employee.leave_balances?.find(b => 
                                                                        b.leave_code === 'AL' || b.leave_type?.code === 'AL'
                                                                    );
                                                                    if (alBalance) {
                                                                        handleOpenEditCF(employee, alBalance);
                                                                    }
                                                                }}
                                                                sx={{ p: 0.5 }}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                )}
                                            </TableCell>
                                        )}
                                        <TableCell align="center">
                                            <Tooltip title={`${statusLabel} (${formatNumber(totalRemaining)} days remaining)`}>
                                                <Chip 
                                                    label={statusLabel} 
                                                    color={statusColor} 
                                                    size="small" 
                                                    icon={
                                                        statusColor === 'error' ? <ErrorIcon /> :
                                                        statusColor === 'warning' ? <WarningIcon /> :
                                                        <CheckCircleIcon />
                                                    }
                                                />
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Edit Balance">
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => {
                                                        const balanceToEdit = employee.leave_balances?.[0];
                                                        if (balanceToEdit) {
                                                            handleOpenEdit(employee, balanceToEdit);
                                                        }
                                                    }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[20, 50, 100]}
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

            {/* Carry Forward Info */}
            {showCarryForward && (
                <Paper sx={{ p: 2, mt: 2, bgcolor: '#f8fafc' }}>
                    <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                        <HistoryIcon sx={{ color: '#9c27b0' }} />
                        <Box>
                            <Typography variant="subtitle2" fontWeight="600" color="#9c27b0">
                                🔄 Carry Forward Information
                            </Typography>
                            <Typography variant="body2" color="textSecondary" fontSize="0.8rem">
                                • <strong>Annual Leave (AL)</strong> allows carry forward up to <strong>6 days</strong>
                                <br />• <strong>Sick Leave (SL)</strong> and <strong>Special Leave (SPL)</strong> do not allow carry forward
                                <br />• Click the <strong>✏️ edit icon</strong> next to carry forward to adjust the value
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            )}

            {/* Edit Balance Dialog */}
            <Dialog open={editDialog.open} onClose={handleCloseEdit} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">✏️ Edit {editDialog.leaveType} Balance</Typography>
                        <IconButton onClick={handleCloseEdit} size="small"><CloseIcon /></IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box mt={2}>
                        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa' }}>
                            <Grid container spacing={1}>
                                <Grid item xs={12}>
                                    <Typography variant="body2">
                                        <strong>Employee:</strong> {editDialog.employeeName}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2">
                                        <strong>Leave Type:</strong> {editDialog.leaveType} ({editDialog.leaveCode})
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2" sx={{ color: '#4caf50' }}>
                                        <strong>Current Remaining:</strong> {formatNumber(editDialog.currentRemaining)} days
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2" sx={{ color: '#f44336' }}>
                                        <strong>Used:</strong> {formatNumber(editDialog.usedDays)} days
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2" sx={{ color: '#ff9800' }}>
                                        <strong>Pending:</strong> {formatNumber(editDialog.pendingDays)} days
                                    </Typography>
                                </Grid>
                                {editDialog.carryForward > 0 && (
                                    <Grid item xs={12}>
                                        <Typography variant="body2" sx={{ color: '#9c27b0', fontWeight: 'bold' }}>
                                            <strong>🔄 Carry Forward:</strong> {formatNumber(editDialog.carryForward)} days
                                        </Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </Paper>

                        <TextField
                            fullWidth
                            type="number"
                            label="New Total Entitlement *"
                            value={editDialog.newTotal}
                            onChange={(e) => setEditDialog({ ...editDialog, newTotal: parseFloat(e.target.value) || 0 })}
                            InputProps={{ inputProps: { min: 0, step: 0.5 } }}
                            sx={{ mb: 2 }}
                            helperText={`New remaining: ${formatNumber(editDialog.newTotal - editDialog.usedDays - editDialog.pendingDays)} days`}
                        />

                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Adjustment Reason *"
                            value={editDialog.adjustmentReason}
                            onChange={(e) => setEditDialog({ ...editDialog, adjustmentReason: e.target.value })}
                            placeholder="Please explain why this balance is being adjusted..."
                            required
                        />

                        {editDialog.isLoading && <LinearProgress sx={{ mt: 2 }} />}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseEdit} disabled={editDialog.isLoading}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSaveEdit}
                        disabled={editDialog.isLoading || !editDialog.adjustmentReason}
                        startIcon={<SaveIcon />}
                    >
                        {editDialog.isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Carry Forward Dialog */}
            <Dialog open={editCFDialog.open} onClose={handleCloseEditCF} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">
                            ✏️ Edit Carry Forward - {editCFDialog.leaveType}
                        </Typography>
                        <IconButton onClick={handleCloseEditCF} size="small" disabled={editCFDialog.isLoading}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box mt={2}>
                        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa' }}>
                            <Grid container spacing={1}>
                                <Grid item xs={12}>
                                    <Typography variant="body2">
                                        <strong>Employee:</strong> {editCFDialog.employeeName}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2">
                                        <strong>Leave Type:</strong> {editCFDialog.leaveType} ({editCFDialog.leaveCode})
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2" sx={{ color: '#9c27b0' }}>
                                        <strong>Current Carry Forward:</strong> {formatNumber(editCFDialog.currentCarryForward)} days
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Alert severity="info" sx={{ mt: 1 }}>
                                        <Typography variant="caption">
                                            ⚠️ Carry forward maximum is <strong>6 days</strong> for Annual Leave (AL)
                                        </Typography>
                                    </Alert>
                                </Grid>
                            </Grid>
                        </Paper>

                        <TextField
                            fullWidth
                            type="number"
                            label="New Carry Forward *"
                            value={editCFDialog.newCarryForward}
                            onChange={(e) => setEditCFDialog({ 
                                ...editCFDialog, 
                                newCarryForward: parseFloat(e.target.value) || 0 
                            })}
                            InputProps={{ 
                                inputProps: { min: 0, max: 6, step: 0.5 } 
                            }}
                            sx={{ mb: 2 }}
                            helperText={`Max: 6 days`}
                        />

                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Adjustment Reason *"
                            value={editCFDialog.adjustmentReason}
                            onChange={(e) => setEditCFDialog({ ...editCFDialog, adjustmentReason: e.target.value })}
                            placeholder="Please explain why this carry forward is being adjusted..."
                            required
                        />

                        {editCFDialog.isLoading && <LinearProgress sx={{ mt: 2 }} />}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseEditCF} disabled={editCFDialog.isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSaveEditCF}
                        disabled={editCFDialog.isLoading || !editCFDialog.adjustmentReason || editCFDialog.newCarryForward < 0 || editCFDialog.newCarryForward > 6}
                        startIcon={<SaveIcon />}
                    >
                        {editCFDialog.isLoading ? 'Saving...' : 'Update Carry Forward'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default AllLeaveBalances;