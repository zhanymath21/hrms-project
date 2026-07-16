// src/pages/leaves/ApprovalFlowList.jsx

import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Chip,
    Button,
    IconButton,
    Divider,
    Avatar,
    Stack,
    Alert,
    CircularProgress,
    Card,
    CardContent,
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    DialogActions,
    Tooltip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    LinearProgress,
    Table,              // ✅ Tambahkan ini
    TableBody,          // ✅ Tambahkan ini
    TableCell,          // ✅ Tambahkan ini
    TableContainer,     // ✅ Tambahkan ini
    TableHead,          // ✅ Tambahkan ini
    TableRow,           // ✅ Tambahkan ini
    Switch,             // ✅ Tambahkan ini
    FormControlLabel,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Save as SaveIcon,
    Close as CloseIcon,
    Person as PersonIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Pending as PendingIcon,
    ArrowUpward as ArrowUpwardIcon,
    ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import api from '../../services/axios';

const APPROVER_TYPES = [
    { value: 'manager', label: 'Manager' },
    { value: 'hr', label: 'HR' },
    { value: 'director', label: 'Director' },
    { value: 'custom', label: 'Custom Approver' },
];

const DEFAULT_FLOW = {
    level: 1,
    approver_type: 'manager',
    approver_id: '',
    department_id: '',
    position_id: '',
    is_active: true,
};

const ApprovalFlowList = () => {
    const [loading, setLoading] = useState(false);
    const [flows, setFlows] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingFlow, setEditingFlow] = useState(null);
    const [formData, setFormData] = useState(DEFAULT_FLOW);
    const [currentUser, setCurrentUser] = useState(null);

    // Load data
    useEffect(() => {
        loadAllData();
        loadCurrentUser();
    }, []);

    const loadCurrentUser = () => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setCurrentUser(user);
    };

    const loadAllData = async () => {
        setLoading(true);
        setError(null);
        try {
            await Promise.all([
                loadFlows(),
                loadDepartments(),
                loadPositions(),
                loadEmployees(),
            ]);
        } catch (err) {
            setError('Failed to load data: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadFlows = async () => {
        const response = await api.get('/approval-flow');
        setFlows(response.data.data || []);
    };

    const loadDepartments = async () => {
        const response = await api.get('/departments');
        setDepartments(response.data.data || []);
    };

    const loadPositions = async () => {
        const response = await api.get('/positions');
        setPositions(response.data.data || []);
    };

    const loadEmployees = async () => {
        const response = await api.get('/employees?per_page=100&status=active');
        const data = response.data.data?.data || response.data.data || [];
        setEmployees(Array.isArray(data) ? data : []);
    };

    // Dialog handlers
    const handleOpenDialog = (flow = null) => {
        if (flow) {
            setEditingFlow(flow);
            setFormData({ ...flow });
        } else {
            setEditingFlow(null);
            setFormData({
                ...DEFAULT_FLOW,
                level: flows.length + 1,
            });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingFlow(null);
        setFormData(DEFAULT_FLOW);
        setError(null);
    };

    const handleSave = async () => {
        try {
            let flowsData = [...flows];
            
            if (editingFlow) {
                const index = flowsData.findIndex(f => f.id === editingFlow.id);
                if (index !== -1) {
                    flowsData[index] = { ...flowsData[index], ...formData };
                }
            } else {
                flowsData.push({ ...formData, id: Date.now() });
            }

            flowsData.sort((a, b) => a.level - b.level);
            flowsData.forEach((f, i) => f.level = i + 1);

            await api.post('/approval-flow', { flows: flowsData });
            
            setSuccess(editingFlow ? '✅ Flow updated!' : '✅ Flow added!');
            setDialogOpen(false);
            await loadFlows();
            
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this approval level?')) return;

        try {
            const flowsData = flows.filter(f => f.id !== id);
            flowsData.sort((a, b) => a.level - b.level);
            flowsData.forEach((f, i) => f.level = i + 1);
            
            await api.post('/approval-flow', { flows: flowsData });
            setSuccess('✅ Flow deleted!');
            await loadFlows();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('Failed to delete');
        }
    };

    const handleMove = async (index, direction) => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= flows.length) return;

        const flowsData = [...flows];
        [flowsData[index], flowsData[newIndex]] = [flowsData[newIndex], flowsData[index]];
        flowsData.forEach((f, i) => f.level = i + 1);

        try {
            await api.post('/approval-flow', { flows: flowsData });
            setSuccess('✅ Reordered!');
            await loadFlows();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('Failed to reorder');
        }
    };

    // Helper functions
    const getApproverName = (flow) => {
        if (flow.approver_type === 'custom' && flow.approver_id) {
            const emp = employees.find(e => e.id === flow.approver_id);
            return emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown';
        }
        const type = APPROVER_TYPES.find(t => t.value === flow.approver_type);
        return type ? type.label : flow.approver_type;
    };

    const getDepartmentName = (id) => {
        if (!id) return 'All';
        const dept = departments.find(d => d.id === id);
        return dept ? dept.name : 'Unknown';
    };

    const getPositionName = (id) => {
        if (!id) return 'All';
        const pos = positions.find(p => p.id === id);
        return pos ? pos.title : 'Unknown';
    };

    // Check if current user can edit (Admin/HR only)
    const canEdit = currentUser?.role === 'admin' || 
                    currentUser?.position?.title === 'HR Manager' ||
                    currentUser?.position?.title === 'Admin' ||
                    currentUser?.position?.title === 'System Admin';

    // Check if current user is the assigned approver
    const isAssignedApprover = (flow) => {
        if (flow.approver_type !== 'custom') return false;
        return flow.approver_id === currentUser?.id;
    };

    const stats = {
        total: flows.length,
        active: flows.filter(f => f.is_active).length,
        inactive: flows.filter(f => !f.is_active).length,
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
                <Box>
                    <Typography variant="h4" fontWeight="bold">
                        📋 Approval Flow
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Configure approval levels for leave requests
                    </Typography>
                    {!canEdit && (
                        <Alert severity="info" sx={{ mt: 1 }} icon={false}>
                            ℹ️ You are viewing approval flows. Only Admin/HR can manage.
                        </Alert>
                    )}
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadFlows}
                        disabled={loading}
                        size="small"
                    >
                        Refresh
                    </Button>
                    {canEdit && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenDialog()}
                            size="small"
                        >
                            Add Level
                        </Button>
                    )}
                </Stack>
            </Box>

            {/* Messages */}
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

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={4}>
                    <Card>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption" color="textSecondary">Total Levels</Typography>
                            <Typography variant="h5">{stats.total}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={4}>
                    <Card sx={{ bgcolor: '#e8f5e9' }}>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption" color="textSecondary">Active</Typography>
                            <Typography variant="h5" color="success.main">{stats.active}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={4}>
                    <Card sx={{ bgcolor: '#ffebee' }}>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption" color="textSecondary">Inactive</Typography>
                            <Typography variant="h5" color="error.main">{stats.inactive}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Info */}
            <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                    💡 Leave requests go through levels in order. 
                    {canEdit ? ' You can add, edit, or delete approval levels.' : ' Only Admin/HR can manage approval flows.'}
                </Typography>
            </Alert>

            {/* Table */}
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell width={50}>#</TableCell>
                            <TableCell width={80}>Level</TableCell>
                            <TableCell>Approver</TableCell>
                            <TableCell>Department</TableCell>
                            <TableCell>Position</TableCell>
                            <TableCell align="center">Status</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {flows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                    <Typography color="textSecondary">No approval flow configured</Typography>
                                    {canEdit && (
                                        <Button
                                            variant="text"
                                            startIcon={<AddIcon />}
                                            onClick={() => handleOpenDialog()}
                                            size="small"
                                            sx={{ mt: 1 }}
                                        >
                                            Add First Level
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : (
                            flows.map((flow, index) => {
                                const isAssigned = isAssignedApprover(flow);
                                
                                return (
                                    <TableRow key={flow.id} hover>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`Lv.${flow.level}`}
                                                size="small"
                                                color="primary"
                                                variant={flow.is_active ? 'filled' : 'outlined'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <PersonIcon fontSize="small" color="action" />
                                                <Typography variant="body2">
                                                    {getApproverName(flow)}
                                                </Typography>
                                                {isAssigned && (
                                                    <Chip
                                                        label="You"
                                                        size="small"
                                                        color="secondary"
                                                        sx={{ fontWeight: 600 }}
                                                    />
                                                )}
                                                <Chip
                                                    label={flow.approver_type}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ height: 20, fontSize: '0.6rem' }}
                                                />
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {getDepartmentName(flow.department_id)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {getPositionName(flow.position_id)}
                                            </Typography>
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
                                                {canEdit && (
                                                    <>
                                                        <Tooltip title="Move Up">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleMove(index, 'up')}
                                                                disabled={index === 0}
                                                            >
                                                                <ArrowUpwardIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Move Down">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleMove(index, 'down')}
                                                                disabled={index === flows.length - 1}
                                                            >
                                                                <ArrowDownwardIcon fontSize="small" />
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
                                                    </>
                                                )}
                                                {!canEdit && (
                                                    <Tooltip title="View Only">
                                                        <Chip
                                                            label="View Only"
                                                            size="small"
                                                            variant="outlined"
                                                            disabled
                                                        />
                                                    </Tooltip>
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

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">
                            {editingFlow ? '✏️ Edit Level' : '➕ Add Level'}
                        </Typography>
                        <IconButton onClick={handleCloseDialog} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Level"
                                    value={formData.level}
                                    onChange={(e) => setFormData({ 
                                        ...formData, 
                                        level: parseInt(e.target.value) || 1 
                                    })}
                                    inputProps={{ min: 1 }}
                                    size="small"
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Approver Type</InputLabel>
                                    <Select
                                        value={formData.approver_type}
                                        label="Approver Type"
                                        onChange={(e) => setFormData({ 
                                            ...formData, 
                                            approver_type: e.target.value,
                                            approver_id: ''
                                        })}
                                    >
                                        {APPROVER_TYPES.map(type => (
                                            <MenuItem key={type.value} value={type.value}>
                                                {type.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            {formData.approver_type === 'custom' && (
                                <Grid item xs={12}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Custom Approver</InputLabel>
                                        <Select
                                            value={formData.approver_id}
                                            label="Custom Approver"
                                            onChange={(e) => setFormData({ 
                                                ...formData, 
                                                approver_id: e.target.value 
                                            })}
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
                                    <Chip label="Scope (Optional)" size="small" />
                                </Divider>
                            </Grid>

                            <Grid item xs={12}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Department</InputLabel>
                                    <Select
                                        value={formData.department_id}
                                        label="Department"
                                        onChange={(e) => setFormData({ 
                                            ...formData, 
                                            department_id: e.target.value 
                                        })}
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

                            <Grid item xs={12}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Position</InputLabel>
                                    <Select
                                        value={formData.position_id}
                                        label="Position"
                                        onChange={(e) => setFormData({ 
                                            ...formData, 
                                            position_id: e.target.value 
                                        })}
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
                                            onChange={(e) => setFormData({ 
                                                ...formData, 
                                                is_active: e.target.checked 
                                            })}
                                            color="primary"
                                            size="small"
                                        />
                                    }
                                    label="Active"
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseDialog} size="small">Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        startIcon={<SaveIcon />}
                        size="small"
                    >
                        {editingFlow ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ApprovalFlowList;