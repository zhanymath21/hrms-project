// src/pages/leaves/ApprovalFlowList.jsx

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
    Chip,
    IconButton,
    Button,
    Stack,
    Alert,
    CircularProgress,
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
    Switch,
    FormControlLabel,
    Grid,
    Card,
    CardContent,
    Divider,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Save as SaveIcon,
    Close as CloseIcon,
    Business as BusinessIcon,
    Person as PersonIcon,
    LocationOn as LocationOnIcon,
} from '@mui/icons-material';
import api from '../../services/axios';

const ApprovalFlowList = () => {
    const [loading, setLoading] = useState(true);
    const [flows, setFlows] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingFlow, setEditingFlow] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [employees, setEmployees] = useState([]);

    const [formData, setFormData] = useState({
        level: 1,
        approver_type: 'manager',
        approver_id: '',
        department_id: '',
        position_id: '',
        is_active: true,
    });

    useEffect(() => {
        loadData();
        loadSelectData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/approval-flow');
            setFlows(response.data.data || []);
        } catch (err) {
            setError('Failed to load approval flow');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadSelectData = async () => {
        try {
            const [deptRes, posRes, empRes] = await Promise.all([
                api.get('/departments'),
                api.get('/positions'),
                api.get('/employees?per_page=100&status=active'),
            ]);
            setDepartments(deptRes.data.data || []);
            setPositions(posRes.data.data || []);
            setEmployees(empRes.data.data?.data || []);
        } catch (err) {
            console.error('Error loading select data:', err);
        }
    };

    const handleOpenDialog = (flow = null) => {
        if (flow) {
            setEditingFlow(flow);
            setFormData({
                level: flow.level,
                approver_type: flow.approver_type,
                approver_id: flow.approver_id || '',
                department_id: flow.department_id || '',
                position_id: flow.position_id || '',
                is_active: flow.is_active,
            });
        } else {
            setEditingFlow(null);
            setFormData({
                level: flows.length + 1,
                approver_type: 'manager',
                approver_id: '',
                department_id: '',
                position_id: '',
                is_active: true,
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingFlow(null);
        setError(null);
    };

    const handleSave = async () => {
        try {
            let flowsData = [...flows];
            
            if (editingFlow) {
                // Update existing
                const index = flowsData.findIndex(f => f.id === editingFlow.id);
                flowsData[index] = { ...flowsData[index], ...formData };
            } else {
                // Add new
                flowsData.push({ ...formData, id: Date.now() });
            }

            // Sort by level
            flowsData.sort((a, b) => a.level - b.level);

            // Send to API
            await api.post('/approval-flow', { flows: flowsData });
            
            setSuccess(editingFlow ? 'Flow updated successfully!' : 'Flow added successfully!');
            setOpenDialog(false);
            loadData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save approval flow');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this approval flow?')) return;

        try {
            const flowsData = flows.filter(f => f.id !== id);
            await api.post('/approval-flow', { flows: flowsData });
            setSuccess('Flow deleted successfully!');
            loadData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('Failed to delete approval flow');
        }
    };

    const handleMoveUp = async (index) => {
        if (index === 0) return;
        const flowsData = [...flows];
        [flowsData[index], flowsData[index - 1]] = [flowsData[index - 1], flowsData[index]];
        // Reassign levels
        flowsData.forEach((f, i) => f.level = i + 1);
        try {
            await api.post('/approval-flow', { flows: flowsData });
            setSuccess('Flow reordered successfully!');
            loadData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('Failed to reorder flow');
        }
    };

    const handleMoveDown = async (index) => {
        if (index === flows.length - 1) return;
        const flowsData = [...flows];
        [flowsData[index], flowsData[index + 1]] = [flowsData[index + 1], flowsData[index]];
        flowsData.forEach((f, i) => f.level = i + 1);
        try {
            await api.post('/approval-flow', { flows: flowsData });
            setSuccess('Flow reordered successfully!');
            loadData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('Failed to reorder flow');
        }
    };

    const getApproverTypeLabel = (type) => {
        const labels = {
            manager: 'Manager',
            hr: 'HR',
            director: 'Director',
            custom: 'Custom',
        };
        return labels[type] || type;
    };

    const getApproverName = (flow) => {
        if (flow.approver_type === 'custom' && flow.approver_id) {
            const employee = employees.find(e => e.id === flow.approver_id);
            return employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown';
        }
        return getApproverTypeLabel(flow.approver_type);
    };

    const getDepartmentName = (departmentId) => {
        if (!departmentId) return 'All Departments';
        const dept = departments.find(d => d.id === departmentId);
        return dept ? dept.name : 'Unknown';
    };

    const getPositionName = (positionId) => {
        if (!positionId) return 'All Positions';
        const pos = positions.find(p => p.id === positionId);
        return pos ? pos.title : 'Unknown';
    };

    if (loading) {
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
                    📋 Approval Flow Configuration
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
                        onClick={() => handleOpenDialog()}
                    >
                        Add Level
                    </Button>
                </Stack>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            )}

            {/* Info Card */}
            <Paper sx={{ p: 3, mb: 3, bgcolor: '#f8f9fa' }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" variant="body2">
                                    Total Levels
                                </Typography>
                                <Typography variant="h4" color="primary.main">
                                    {flows.length}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" variant="body2">
                                    Active Levels
                                </Typography>
                                <Typography variant="h4" color="success.main">
                                    {flows.filter(f => f.is_active).length}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" variant="body2">
                                    Inactive Levels
                                </Typography>
                                <Typography variant="h4" color="error.main">
                                    {flows.filter(f => !f.is_active).length}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Paper>

            {/* Flow Description */}
            <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                    <strong>How it works:</strong> Leave requests will go through these approval levels in order.
                    Each level represents one approver. The request must be approved by all levels before being fully approved.
                </Typography>
            </Alert>

            {/* Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell width="50">#</TableCell>
                            <TableCell width="80">Level</TableCell>
                            <TableCell>Approver Type</TableCell>
                            <TableCell>Approver</TableCell>
                            <TableCell>Department</TableCell>
                            <TableCell>Position</TableCell>
                            <TableCell align="center">Status</TableCell>
                            <TableCell align="center" width="200">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {flows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                    <Typography color="textSecondary">
                                        No approval flow configured. Click "Add Level" to create one.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            flows.map((flow, index) => (
                                <TableRow key={flow.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" color="textSecondary">
                                            {index + 1}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={`Level ${flow.level}`}
                                            size="small"
                                            color="primary"
                                            variant={flow.is_active ? 'filled' : 'outlined'}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={getApproverTypeLabel(flow.approver_type)}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <PersonIcon fontSize="small" color="action" />
                                            <Typography variant="body2">
                                                {getApproverName(flow)}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <BusinessIcon fontSize="small" color="action" />
                                            <Typography variant="body2">
                                                {getDepartmentName(flow.department_id)}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <LocationOnIcon fontSize="small" color="action" />
                                            <Typography variant="body2">
                                                {getPositionName(flow.position_id)}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={flow.is_active ? 'Active' : 'Inactive'}
                                            color={flow.is_active ? 'success' : 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={0.5} justifyContent="center">
                                            <Tooltip title="Move Up">
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => handleMoveUp(index)}
                                                    disabled={index === 0}
                                                >
                                                    ↑
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Move Down">
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => handleMoveDown(index)}
                                                    disabled={index === flows.length - 1}
                                                >
                                                    ↓
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Edit">
                                                <IconButton
                                                    size="small"
                                                    color="info"
                                                    onClick={() => handleOpenDialog(flow)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDelete(flow.id)}
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

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">
                            {editingFlow ? '✏️ Edit Approval Level' : '➕ Add Approval Level'}
                        </Typography>
                        <IconButton onClick={handleCloseDialog} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Level *"
                                value={formData.level}
                                onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
                                inputProps={{ min: 1 }}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Approver Type *</InputLabel>
                                <Select
                                    value={formData.approver_type}
                                    label="Approver Type *"
                                    onChange={(e) => setFormData({ ...formData, approver_type: e.target.value, approver_id: '' })}
                                >
                                    <MenuItem value="manager">Manager</MenuItem>
                                    <MenuItem value="hr">HR</MenuItem>
                                    <MenuItem value="director">Director</MenuItem>
                                    <MenuItem value="custom">Custom</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {formData.approver_type === 'custom' && (
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel>Custom Approver *</InputLabel>
                                    <Select
                                        value={formData.approver_id}
                                        label="Custom Approver *"
                                        onChange={(e) => setFormData({ ...formData, approver_id: e.target.value })}
                                    >
                                        <MenuItem value="">Select Approver</MenuItem>
                                        {employees.map((emp) => (
                                            <MenuItem key={emp.id} value={emp.id}>
                                                {emp.first_name} {emp.last_name} ({emp.employee_id})
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}

                        <Grid item xs={12}>
                            <Divider>
                                <Chip label="Scope" size="small" />
                            </Divider>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Department (Optional)</InputLabel>
                                <Select
                                    value={formData.department_id}
                                    label="Department (Optional)"
                                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                >
                                    <MenuItem value="">All Departments</MenuItem>
                                    {departments.map((dept) => (
                                        <MenuItem key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Position (Optional)</InputLabel>
                                <Select
                                    value={formData.position_id}
                                    label="Position (Optional)"
                                    onChange={(e) => setFormData({ ...formData, position_id: e.target.value })}
                                >
                                    <MenuItem value="">All Positions</MenuItem>
                                    {positions.map((pos) => (
                                        <MenuItem key={pos.id} value={pos.id}>
                                            {pos.title}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        color="primary"
                                    />
                                }
                                label="Active"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        startIcon={<SaveIcon />}
                    >
                        {editingFlow ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ApprovalFlowList;