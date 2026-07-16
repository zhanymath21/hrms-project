// src/pages/leaves/ManageNewEmployees.jsx

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
    Button,
    Chip,
    Alert,
    CircularProgress,
    Card,
    CardContent,
    Grid,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    IconButton,
    Tooltip,
    LinearProgress,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Add as AddIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    PersonAdd as PersonAddIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import api from '../../services/axios';

const ManageNewEmployees = () => {
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        generated: 0,
        pending: 0,
    });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [generatingAll, setGeneratingAll] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/employees-without-balances');
            const data = response.data.data;
            
            setEmployees(data.employees || []);
            setStats({
                total: data.total || 0,
                generated: 0,
                pending: data.total || 0,
            });
        } catch (err) {
            console.error('Error loading data:', err);
            setSnackbar({
                open: true,
                message: 'Failed to load data: ' + (err.response?.data?.message || err.message),
                severity: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateForEmployee = async (employee) => {
        setSelectedEmployee(employee);
        setDialogOpen(true);
    };

    const confirmGenerate = async () => {
        setGenerating(true);
        try {
            const response = await api.post('/generate-balance', {
                employee_id: selectedEmployee.id,
            });

            if (response.data.status === 'success') {
                setSnackbar({
                    open: true,
                    message: `✅ Balances generated for ${selectedEmployee.first_name} ${selectedEmployee.last_name}`,
                    severity: 'success',
                });
                
                setStats(prev => ({
                    ...prev,
                    generated: prev.generated + 1,
                    pending: prev.pending - 1,
                }));
                
                setEmployees(prevEmployees => prevEmployees.filter(emp => emp.id !== selectedEmployee.id));
                setDialogOpen(false);
                setSelectedEmployee(null);
                loadData();
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || 'Failed to generate balances',
                    severity: 'warning',
                });
            }
        } catch (err) {
            console.error('Error generating balance:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to generate balances',
                severity: 'error',
            });
        } finally {
            setGenerating(false);
        }
    };

    const handleGenerateAll = async () => {
        if (employees.length === 0) {
            setSnackbar({
                open: true,
                message: 'No employees to process',
                severity: 'info',
            });
            return;
        }

        setGeneratingAll(true);
        setProgress(0);

        try {
            const response = await api.post('/generate-new-employees-balances');
            
            if (response.data.status === 'success') {
                const data = response.data.data || {};
                const generated = data.generated || 0;
                
                setSnackbar({
                    open: true,
                    message: `✅ Balances generated for ${generated} employees`,
                    severity: 'success',
                });
                setProgress(100);
                
                setTimeout(() => {
                    loadData();
                }, 1000);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || 'Failed to generate balances',
                    severity: 'warning',
                });
            }
        } catch (err) {
            console.error('Error generating all balances:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to generate balances',
                severity: 'error',
            });
        } finally {
            setGeneratingAll(false);
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

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">
                        👥 New Employees - Leave Balance
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Generate leave balances for newly hired employees
                    </Typography>
                </Box>
                <Box display="flex" gap={1}>
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
                        color="primary"
                        startIcon={<PersonAddIcon />}
                        onClick={handleGenerateAll}
                        disabled={generatingAll || employees.length === 0}
                    >
                        Generate All ({employees.length})
                    </Button>
                </Box>
            </Box>

            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2">
                                Total New Employees
                            </Typography>
                            <Typography variant="h3" color="primary.main">
                                {stats.total}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: '#e8f5e9' }}>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2">
                                ✅ Generated
                            </Typography>
                            <Typography variant="h3" color="success.main">
                                {stats.generated}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: '#fff3e0' }}>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2">
                                ⏳ Pending
                            </Typography>
                            <Typography variant="h3" color="warning.main">
                                {stats.pending}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {generatingAll && (
                <Box sx={{ width: '100%', mb: 3 }}>
                    <Typography variant="body2" color="textSecondary">
                        Generating balances...
                    </Typography>
                    <LinearProgress 
                        variant="determinate" 
                        value={progress} 
                        sx={{ height: 8, borderRadius: 4, mt: 1 }}
                    />
                </Box>
            )}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell>Employee ID</TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Hire Date</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {employees.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                    <Typography color="textSecondary">
                                        🎉 All employees have balances generated
                                    </Typography>
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
                                        {employee.first_name} {employee.last_name}
                                    </TableCell>
                                    <TableCell>{employee.email}</TableCell>
                                    <TableCell>{formatDate(employee.hire_date)}</TableCell>
                                    <TableCell>
                                        <Chip 
                                            label="Pending" 
                                            color="warning" 
                                            size="small"
                                            icon={<WarningIcon />}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Generate balance">
                                            <IconButton
                                                color="primary"
                                                onClick={() => handleGenerateForEmployee(employee)}
                                                disabled={generating}
                                            >
                                                <AddIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={dialogOpen} onClose={() => !generating && setDialogOpen(false)}>
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">Generate Leave Balance</Typography>
                        <IconButton onClick={() => setDialogOpen(false)} disabled={generating}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ py: 2 }}>
                        <Typography variant="body1" gutterBottom>
                            Are you sure you want to generate leave balances for:
                        </Typography>
                        <Paper sx={{ p: 2, bgcolor: '#f5f5f5', mt: 2 }}>
                            <Typography variant="body1" fontWeight="bold">
                                {selectedEmployee?.first_name} {selectedEmployee?.last_name}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Employee ID: {selectedEmployee?.employee_id}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Hire Date: {formatDate(selectedEmployee?.hire_date)}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Email: {selectedEmployee?.email}
                            </Typography>
                        </Paper>
                        <Alert severity="info" sx={{ mt: 2 }}>
                            Balance will be calculated based on:
                            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                                <li>Hire date (prorated if hired this year)</li>
                                <li>Leave type defaults</li>
                                <li>Current year</li>
                            </ul>
                        </Alert>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDialogOpen(false)} disabled={generating}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={confirmGenerate}
                        disabled={generating}
                        startIcon={generating ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                    >
                        {generating ? 'Generating...' : 'Generate'}
                    </Button>
                </DialogActions>
            </Dialog>

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

export default ManageNewEmployees;