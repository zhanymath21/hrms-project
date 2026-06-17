import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Chip, IconButton,
  MenuItem, Stack, Alert, Skeleton, Card, CardContent, Tabs, Tab,
  Tooltip, Avatar, Divider, InputAdornment, FormControl, InputLabel,
  Select
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import InventoryIcon from '@mui/icons-material/Inventory';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ReturnIcon from '@mui/icons-material/KeyboardReturn';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import DescriptionIcon from '@mui/icons-material/Description';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import employeeAssetService from '../../services/employeeAssetService';

// ========== STAT CARD ==========
function StatCard({ icon, title, value, color }) {
  return (
    <Card sx={{ height: '100%', borderRadius: 2 }}>
      <CardContent sx={{ textAlign: 'center', py: 3 }}>
        <Box sx={{ color, mb: 1 }}>{icon}</Box>
        <Typography variant="h4" fontWeight="bold">{value}</Typography>
        <Typography variant="body2" color="textSecondary">{title}</Typography>
      </CardContent>
    </Card>
  );
}

// ========== ASSIGN ASSET DIALOG ==========
function AssignAssetDialog({ open, onClose, onSubmit, employees }) {
  const [form, setForm] = useState({
    employee_id: '', asset_type: '', asset_name: '',
    serial_number: '', condition: 'good', notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setForm({ employee_id: '', asset_type: '', asset_name: '', serial_number: '', condition: 'good', notes: '' });
  }, [open]);

  const assetTypes = ['Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Headset', 'Phone', 'Tablet', 'Uniform', 'Safety Shoes', 'ID Card', 'Access Card', 'Tool Kit', 'Vehicle', 'Other'];

  const handleSubmit = async () => {
    if (!form.employee_id || !form.asset_name) return;
    setLoading(true);
    try { await onSubmit(form); onClose(); }
    catch (err) { alert(err.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>📦 Assign Asset</DialogTitle>
      <DialogContent>
        <TextField select fullWidth margin="normal" label="Employee *" value={form.employee_id}
          onChange={e => setForm({ ...form, employee_id: e.target.value })}>
          <MenuItem value="">Select Employee</MenuItem>
          {employees.map(emp => (
            <MenuItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.employee_id})</MenuItem>
          ))}
        </TextField>
        <TextField select fullWidth margin="normal" label="Asset Type *" value={form.asset_type}
          onChange={e => setForm({ ...form, asset_type: e.target.value })}>
          <MenuItem value="">Select Type</MenuItem>
          {assetTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
        <TextField fullWidth margin="normal" label="Asset Name *" value={form.asset_name}
          onChange={e => setForm({ ...form, asset_name: e.target.value })} />
        <TextField fullWidth margin="normal" label="Serial Number" value={form.serial_number}
          onChange={e => setForm({ ...form, serial_number: e.target.value })} />
        <TextField select fullWidth margin="normal" label="Condition" value={form.condition}
          onChange={e => setForm({ ...form, condition: e.target.value })}>
          <MenuItem value="good">✅ Good</MenuItem>
          <MenuItem value="fair">⚠️ Fair</MenuItem>
          <MenuItem value="poor">❌ Poor</MenuItem>
        </TextField>
        <TextField fullWidth margin="normal" label="Notes" multiline rows={2} value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>Assign</Button>
      </DialogActions>
    </Dialog>
  );
}

// ========== RETURN ASSET DIALOG ==========
function ReturnAssetDialog({ open, onClose, onSubmit, asset }) {
  const [form, setForm] = useState({ return_reason: '', return_condition: 'good', notes: '' });
  const [loading, setLoading] = useState(false);
  const reasons = ['Resign', 'Damaged', 'Upgrade', 'Lost', 'No Longer Needed', 'Other'];

  const handleSubmit = async () => {
    setLoading(true);
    try { await onSubmit(asset.id, form); onClose(); }
    catch (err) { alert(err.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>🔄 Return Asset</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Asset:</strong> {asset?.asset_name} ({asset?.serial_number || 'No SN'})<br />
          <strong>Employee:</strong> {asset?.employee_name}
        </Alert>
        <TextField select fullWidth margin="normal" label="Return Reason *" value={form.return_reason}
          onChange={e => setForm({ ...form, return_reason: e.target.value })}>
          <MenuItem value="">Select Reason</MenuItem>
          {reasons.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>
        <TextField select fullWidth margin="normal" label="Return Condition" value={form.return_condition}
          onChange={e => setForm({ ...form, return_condition: e.target.value })}>
          <MenuItem value="good">✅ Good</MenuItem>
          <MenuItem value="fair">⚠️ Fair</MenuItem>
          <MenuItem value="poor">❌ Poor</MenuItem>
          <MenuItem value="broken">💔 Broken</MenuItem>
        </TextField>
        <TextField fullWidth margin="normal" label="Notes" multiline rows={2} value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="warning" onClick={handleSubmit} disabled={loading}>Return</Button>
      </DialogActions>
    </Dialog>
  );
}

// ========== REPLACE ASSET DIALOG ==========
function ReplaceAssetDialog({ open, onClose, onSubmit, asset, employees }) {
  const [form, setForm] = useState({
    employee_id: '', asset_type: '', asset_name: '',
    serial_number: '', condition: 'good', notes: '', replace_reason: ''
  });
  const [loading, setLoading] = useState(false);
  const assetTypes = ['Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Headset', 'Phone', 'Tablet', 'Uniform', 'Safety Shoes', 'ID Card', 'Access Card', 'Tool Kit', 'Vehicle', 'Other'];
  const replaceReasons = ['Rusak / Broken', 'Hilang / Lost', 'Upgrade', 'Tidak Layak Pakai', 'Usang / Obsolete', 'Other'];

  useEffect(() => {
    if (open && asset) {
      setForm({
        employee_id: asset.employee_id || '',
        asset_type: asset.asset_type || '',
        asset_name: '',
        serial_number: '',
        condition: 'good',
        notes: '',
        replace_reason: ''
      });
    }
  }, [open, asset]);

  const handleSubmit = async () => {
    if (!form.asset_name || !form.replace_reason) return;
    setLoading(true);
    try { await onSubmit({ ...form, old_asset_id: asset.id }); onClose(); }
    catch (err) { alert(err.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>🔄 Replace Broken Asset</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Old Asset:</strong> {asset?.asset_name}<br />
          <strong>Employee:</strong> {asset?.employee_name}
        </Alert>
        <TextField select fullWidth margin="normal" label="Replace Reason *" value={form.replace_reason}
          onChange={e => setForm({ ...form, replace_reason: e.target.value })}>
          <MenuItem value="">Select Reason</MenuItem>
          {replaceReasons.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>
        <Divider sx={{ my: 2 }}><Chip label="New Asset Details" color="primary" /></Divider>
        <TextField select fullWidth margin="normal" label="Asset Type *" value={form.asset_type}
          onChange={e => setForm({ ...form, asset_type: e.target.value })}>
          {assetTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
        <TextField fullWidth margin="normal" label="New Asset Name *" value={form.asset_name}
          onChange={e => setForm({ ...form, asset_name: e.target.value })} />
        <TextField fullWidth margin="normal" label="New Serial Number" value={form.serial_number}
          onChange={e => setForm({ ...form, serial_number: e.target.value })} />
        <TextField select fullWidth margin="normal" label="Condition" value={form.condition}
          onChange={e => setForm({ ...form, condition: e.target.value })}>
          <MenuItem value="good">✅ Good</MenuItem>
          <MenuItem value="fair">⚠️ Fair</MenuItem>
        </TextField>
        <TextField fullWidth margin="normal" label="Notes" multiline rows={2} value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="primary" onClick={handleSubmit} disabled={loading}>Replace Asset</Button>
      </DialogActions>
    </Dialog>
  );
}

// ========== UPLOAD DOCUMENT DIALOG ==========
function UploadDocumentDialog({ open, onClose, onSubmit, employees }) {
  const [form, setForm] = useState({ employee_id: '', document_type: '', title: '', file: null });
  const [loading, setLoading] = useState(false);
  const docTypes = ['KTP', 'KK', 'NPWP', 'Ijazah', 'Transkrip', 'Sertifikat', 'SKCK', 'BPJS Kesehatan', 'BPJS Ketenagakerjaan', 'SIM', 'Paspor', 'Kontrak Kerja', 'Other'];

  const handleSubmit = async () => {
    if (!form.employee_id || !form.file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('document_type', form.document_type);
      formData.append('title', form.title);
      formData.append('file', form.file);
      await onSubmit(form.employee_id, formData);
      onClose();
    } catch (err) { alert(err.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>📄 Upload Document</DialogTitle>
      <DialogContent>
        <TextField select fullWidth margin="normal" label="Employee *" value={form.employee_id}
          onChange={e => setForm({ ...form, employee_id: e.target.value })}>
          <MenuItem value="">Select Employee</MenuItem>
          {employees.map(emp => (
            <MenuItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</MenuItem>
          ))}
        </TextField>
        <TextField select fullWidth margin="normal" label="Document Type *" value={form.document_type}
          onChange={e => setForm({ ...form, document_type: e.target.value })}>
          <MenuItem value="">Select Type</MenuItem>
          {docTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
        <TextField fullWidth margin="normal" label="Title" value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })} />
        <Button variant="outlined" component="label" fullWidth sx={{ mt: 2, py: 2 }}>
          {form.file ? form.file.name : 'Choose File'}
          <input type="file" hidden onChange={e => setForm({ ...form, file: e.target.files[0] })} />
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>Upload</Button>
      </DialogActions>
    </Dialog>
  );
}

// ========== FILTER BAR COMPONENT ==========
function FilterBar({ filters, setFilters, employees, onClear }) {
  const assetTypes = ['Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Headset', 'Phone', 'Tablet', 'Uniform', 'Safety Shoes', 'ID Card', 'Access Card', 'Tool Kit', 'Vehicle', 'Other'];
  const conditions = ['good', 'fair', 'poor'];
  const statuses = ['active', 'returned'];

  return (
    <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
      <Grid container spacing={2} alignItems="center">
        {/* Search */}
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search asset name, serial number..."
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: filters.search && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setFilters({ ...filters, search: '' })}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        {/* Employee Filter */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Employee</InputLabel>
            <Select
              value={filters.employee_id}
              label="Employee"
              onChange={e => setFilters({ ...filters, employee_id: e.target.value })}
            >
              <MenuItem value="">All Employees</MenuItem>
              {employees.map(emp => (
                <MenuItem key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Asset Type Filter */}
        <Grid item xs={6} sm={4} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Asset Type</InputLabel>
            <Select
              value={filters.asset_type}
              label="Asset Type"
              onChange={e => setFilters({ ...filters, asset_type: e.target.value })}
            >
              <MenuItem value="">All Types</MenuItem>
              {assetTypes.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Condition Filter */}
        <Grid item xs={6} sm={4} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Condition</InputLabel>
            <Select
              value={filters.condition}
              label="Condition"
              onChange={e => setFilters({ ...filters, condition: e.target.value })}
            >
              <MenuItem value="">All Conditions</MenuItem>
              <MenuItem value="good">✅ Good</MenuItem>
              <MenuItem value="fair">⚠️ Fair</MenuItem>
              <MenuItem value="poor">❌ Poor</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Status Filter */}
        <Grid item xs={6} sm={4} md={1.5}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={e => setFilters({ ...filters, status: e.target.value })}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="returned">Returned</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Clear Filters */}
        <Grid item xs={6} sm={4} md={0.5}>
          <Tooltip title="Clear All Filters">
            <IconButton onClick={onClear} color="error">
              <FilterListIcon />
            </IconButton>
          </Tooltip>
        </Grid>
      </Grid>
    </Paper>
  );
}

// ========== MAIN PAGE ==========
export default function EmployeeAssetPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabIndex, setTabIndex] = useState(0);
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [assignDialog, setAssignDialog] = useState(false);
  const [returnDialog, setReturnDialog] = useState({ open: false, asset: null });
  const [replaceDialog, setReplaceDialog] = useState({ open: false, asset: null });
  const [uploadDialog, setUploadDialog] = useState(false);

  // ✅ FILTER STATE
  const [filters, setFilters] = useState({
    search: '',
    employee_id: '',
    asset_type: '',
    condition: '',
    status: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [assetData, empData] = await Promise.all([
        employeeAssetService.getAssets(),
        employeeAssetService.getEmployees()
      ]);
      setAssets(Array.isArray(assetData) ? assetData : []);
      setEmployees(Array.isArray(empData) ? empData : []);
    } catch (err) {
      setError('Failed to load data');
    } finally { setLoading(false); }
  };

  const showMsg = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const handleAssign = async (data) => { await employeeAssetService.assignAsset(data); showMsg('Asset assigned successfully!'); loadData(); };
  const handleReturn = async (id, data) => { await employeeAssetService.returnAsset(id, data); showMsg('Asset returned successfully!'); loadData(); };
  const handleReplace = async (data) => { await employeeAssetService.replaceAsset(data); showMsg('Asset replaced successfully!'); loadData(); };

  const handleUpload = async (employeeId, formData) => {
    await employeeAssetService.uploadDocument(employeeId, formData);
    showMsg('Document uploaded successfully!');
    loadDocuments(employeeId);
  };

  const loadDocuments = async (empId) => {
    if (!empId) return;
    try { const docs = await employeeAssetService.getDocuments(empId); setDocuments(Array.isArray(docs) ? docs : []); }
    catch (err) { console.error(err); }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    await employeeAssetService.deleteDocument(docId);
    showMsg('Document deleted!');
    loadDocuments(selectedEmployee);
  };

  const clearFilters = () => {
    setFilters({ search: '', employee_id: '', asset_type: '', condition: '', status: '' });
  };

  const getConditionChip = (c) => {
    const map = { 
      good: { label: 'Good', color: 'success' }, 
      fair: { label: 'Fair', color: 'warning' }, 
      poor: { label: 'Poor', color: 'error' }, 
      broken: { label: 'Broken', color: 'error' } 
    };
    const x = map[c] || map.good;
    return <Chip label={x.label} color={x.color} size="small" />;
  };

  // ✅ FILTER LOGIC
  const filteredAssets = assets.filter(asset => {
    const matchSearch = !filters.search || 
      asset.asset_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      asset.serial_number?.toLowerCase().includes(filters.search.toLowerCase()) ||
      asset.employee_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      asset.employee_nik?.toLowerCase().includes(filters.search.toLowerCase());

    const matchEmployee = !filters.employee_id || asset.employee_id == filters.employee_id;
    const matchType = !filters.asset_type || asset.asset_type === filters.asset_type;
    const matchCondition = !filters.condition || asset.condition === filters.condition || asset.return_condition === filters.condition;
    const matchStatus = !filters.status || asset.status === filters.status;

    return matchSearch && matchEmployee && matchType && matchCondition && matchStatus;
  });

  const activeAssets = filteredAssets.filter(a => a.status !== 'returned');
  const returnedAssets = filteredAssets.filter(a => a.status === 'returned');

  // ✅ ACTIVE FILTER COUNT
  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={400} height={60} />
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {[1,2,3,4].map(i => <Grid item xs={12} sm={3} key={i}><Skeleton variant="rounded" height={140} /></Grid>)}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">📦 Employee Assets & Documents</Typography>
          <Typography variant="body2" color="textSecondary">
            Manage employee assets, replacements, returns, and documents
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData}>Refresh</Button>
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => setUploadDialog(true)}>
            Upload Document
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAssignDialog(true)}>
            Assign Asset
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* STATS */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard icon={<InventoryIcon sx={{ fontSize: 36 }} />} value={assets.length} title="Total Assets" color="#1976d2" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard icon={<AssignmentIcon sx={{ fontSize: 36 }} />} value={assets.filter(a => a.status !== 'returned').length} title="Active Assets" color="#388e3c" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard icon={<ReturnIcon sx={{ fontSize: 36 }} />} value={assets.filter(a => a.status === 'returned').length} title="Returned" color="#f57c00" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard icon={<DescriptionIcon sx={{ fontSize: 36 }} />} value={documents.length} title="Documents" color="#7b1fa2" />
        </Grid>
      </Grid>

      {/* TABS */}
      <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} sx={{ mb: 2 }}>
        <Tab label={`📦 Active Assets (${activeAssets.length})`} />
        <Tab label={`🔄 Returned Assets (${returnedAssets.length})`} />
        <Tab label={`📄 Documents`} />
      </Tabs>

      {/* ✅ FILTER BAR (Tampil hanya untuk tab Assets) */}
      {tabIndex !== 2 && (
        <FilterBar 
          filters={filters} 
          setFilters={setFilters} 
          employees={employees} 
          onClear={clearFilters} 
        />
      )}

      {/* Filter info */}
      {activeFilterCount > 0 && tabIndex !== 2 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2">
              <FilterListIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
              {activeFilterCount} filter(s) applied — Showing {filteredAssets.length} result(s)
            </Typography>
            <Button size="small" onClick={clearFilters}>Clear All</Button>
          </Box>
        </Alert>
      )}

      {/* ACTIVE ASSETS TABLE */}
      {tabIndex === 0 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell><strong>Asset</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell><strong>Serial No</strong></TableCell>
                <TableCell><strong>Employee</strong></TableCell>
                <TableCell><strong>Condition</strong></TableCell>
                <TableCell><strong>Assigned Date</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <InventoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="textSecondary">No active assets found</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {activeFilterCount > 0 ? 'Try adjusting your filters' : 'Click "Assign Asset" to add one'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : activeAssets.map(asset => (
                <TableRow key={asset.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InventoryIcon color="primary" fontSize="small" />
                      <Box>
                        <Typography fontWeight="bold">{asset.asset_name}</Typography>
                        {asset.notes && (
                          <Typography variant="caption" color="textSecondary">{asset.notes.substring(0, 50)}</Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell><Chip label={asset.asset_type} size="small" variant="outlined" /></TableCell>
                  <TableCell>
                    {asset.serial_number ? (
                      <Chip label={asset.serial_number} size="small" variant="outlined" />
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#1976d2' }}>
                        {asset.employee_name?.charAt(0) || '?'}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">{asset.employee_name || '-'}</Typography>
                        <Typography variant="caption" color="textSecondary">{asset.employee_nik || '-'}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{getConditionChip(asset.condition)}</TableCell>
                  <TableCell>{asset.assigned_date ? new Date(asset.assigned_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="Replace / Exchange">
                        <IconButton size="small" color="info" onClick={() => setReplaceDialog({ open: true, asset })}>
                          <SwapHorizIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Return">
                        <IconButton size="small" color="warning" onClick={() => setReturnDialog({ open: true, asset })}>
                          <ReturnIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* RETURNED ASSETS TABLE */}
      {tabIndex === 1 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell><strong>Asset</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell><strong>Employee</strong></TableCell>
                <TableCell><strong>Return Date</strong></TableCell>
                <TableCell><strong>Return Reason</strong></TableCell>
                <TableCell><strong>Condition</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {returnedAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <ReturnIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="textSecondary">No returned assets found</Typography>
                  </TableCell>
                </TableRow>
              ) : returnedAssets.map(asset => (
                <TableRow key={asset.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InventoryIcon color="disabled" fontSize="small" />
                      <Box>
                        <Typography fontWeight="bold">{asset.asset_name}</Typography>
                        {asset.serial_number && (
                          <Typography variant="caption" color="textSecondary">SN: {asset.serial_number}</Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell><Chip label={asset.asset_type} size="small" variant="outlined" /></TableCell>
                  <TableCell>
                    <Typography variant="body2">{asset.employee_name || '-'}</Typography>
                  </TableCell>
                  <TableCell>{asset.return_date ? new Date(asset.return_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</TableCell>
                  <TableCell><Chip label={asset.return_reason || '-'} size="small" color="warning" /></TableCell>
                  <TableCell>{getConditionChip(asset.return_condition || 'good')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* DOCUMENTS TAB */}
      {tabIndex === 2 && (
        <Box>
          <TextField 
            select 
            fullWidth 
            sx={{ mb: 2 }} 
            label="Select Employee to View Documents" 
            value={selectedEmployee}
            onChange={e => { setSelectedEmployee(e.target.value); loadDocuments(e.target.value); }}
          >
            <MenuItem value="">Select Employee</MenuItem>
            {employees.map(emp => (
              <MenuItem key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name} ({emp.employee_id})
              </MenuItem>
            ))}
          </TextField>

          {selectedEmployee && (
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell><strong>Document</strong></TableCell>
                    <TableCell><strong>Type</strong></TableCell>
                    <TableCell><strong>File Size</strong></TableCell>
                    <TableCell><strong>Uploaded Date</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                        <DescriptionIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography color="textSecondary">No documents found</Typography>
                        <Button 
                          startIcon={<UploadIcon />} 
                          onClick={() => setUploadDialog(true)} 
                          sx={{ mt: 1 }}
                        >
                          Upload Document
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : documents.map(doc => (
                    <TableRow key={doc.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <DescriptionIcon color="primary" />
                          <Box>
                            <Typography fontWeight="bold">{doc.title || doc.document_type}</Typography>
                            <Typography variant="caption" color="textSecondary">{doc.file_name}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell><Chip label={doc.document_type} size="small" variant="outlined" /></TableCell>
                      <TableCell>
                        {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : '-'}
                      </TableCell>
                      <TableCell>{new Date(doc.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="Download">
                          <IconButton color="primary" href={doc.file_url} target="_blank">
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton color="error" onClick={() => handleDeleteDoc(doc.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* DIALOGS */}
      <AssignAssetDialog open={assignDialog} onClose={() => setAssignDialog(false)} onSubmit={handleAssign} employees={employees} />
      <ReturnAssetDialog open={returnDialog.open} onClose={() => setReturnDialog({ open: false, asset: null })} onSubmit={handleReturn} asset={returnDialog.asset} />
      <ReplaceAssetDialog open={replaceDialog.open} onClose={() => setReplaceDialog({ open: false, asset: null })} onSubmit={handleReplace} asset={replaceDialog.asset} employees={employees} />
      <UploadDocumentDialog open={uploadDialog} onClose={() => setUploadDialog(false)} onSubmit={handleUpload} employees={employees} />
    </Box>
  );
}