// src/pages/assets/EmployeeAssetPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Button, Typography, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Chip, IconButton,
  MenuItem, Stack, Alert, Skeleton, Card, CardContent, Tabs, Tab,
  Tooltip, Avatar, Divider, InputAdornment, FormControl, InputLabel,
  Select, CircularProgress
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
import CloseIcon from '@mui/icons-material/Close';
import employeeAssetService from '../../services/employeeAssetService';

// ============================================================
// CONSTANTS
// ============================================================

const ASSET_TYPES = ['Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Headset', 'Phone', 'Tablet', 'Uniform', 'Safety Shoes', 'ID Card', 'Access Card', 'Tool Kit', 'Vehicle', 'Other'];
const DOCUMENT_TYPES = [
  'Identity Card',
  'Family Book',
  'Child Birth Certificate',
  'Marriage Certificate',
  'Tax ID',
  'Diploma',
  'Academic Transcript',
  'Certificate',
  'Police Clearance',
  'Health Insurance',
  'Employment Insurance',
  "Driver's License",
  'Passport',
  'Employment Contract',
  'Appointment Letter',
  'Resignation Letter',
  'Medical Certificate',
  'Training Certificate',
  'Professional License',
  'Bank Account',
  'Payroll Slip',
  'Performance Review',
  'Reference Letter',
  'Other'
];
const RETURN_REASONS = ['Resign', 'Damaged', 'Upgrade', 'Lost', 'No Longer Needed', 'Other'];
const REPLACE_REASONS = ['Broken / Damaged', 'Lost', 'Upgrade', 'Unusable', 'Obsolete', 'Other'];
const CONDITION_OPTIONS = ['good', 'fair', 'poor'];
const STATUS_OPTIONS = ['active', 'returned'];

// ============================================================
// STAT CARD COMPONENT
// ============================================================

function StatCard({ icon, title, value, color, loading }) {
  return (
    <Card sx={{ height: '100%', borderRadius: 2 }}>
      <CardContent sx={{ textAlign: 'center', py: 3 }}>
        <Box sx={{ color, mb: 1 }}>{icon}</Box>
        {loading ? (
          <CircularProgress size={30} />
        ) : (
          <Typography variant="h4" fontWeight="bold">{value || 0}</Typography>
        )}
        <Typography variant="body2" color="textSecondary">{title}</Typography>
      </CardContent>
    </Card>
  );
}

// ============================================================
// FILTER BAR COMPONENT
// ============================================================

function FilterBar({ filters, setFilters, employees, onClear }) {
  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;

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
                  {emp.first_name} {emp.last_name} ({emp.employee_id})
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
              {ASSET_TYPES.map(type => (
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
            <span>
              <IconButton 
                onClick={onClear} 
                color="error"
                disabled={activeFilterCount === 0}
              >
                <FilterListIcon />
              </IconButton>
            </span>
          </Tooltip>
          {activeFilterCount > 0 && (
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'center' }}>
              {activeFilterCount}
            </Typography>
          )}
        </Grid>
      </Grid>
    </Paper>
  );
}

// ============================================================
// ASSIGN ASSET DIALOG
// ============================================================

function AssignAssetDialog({ open, onClose, onSubmit, employees }) {
  const [form, setForm] = useState({
    employee_id: '',
    asset_type: '',
    asset_name: '',
    serial_number: '',
    condition: 'good',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm({
        employee_id: '',
        asset_type: '',
        asset_name: '',
        serial_number: '',
        condition: 'good',
        notes: ''
      });
      setErrors({});
    }
  }, [open]);

  const validate = () => {
    const newErrors = {};
    if (!form.employee_id) newErrors.employee_id = 'Employee is required';
    if (!form.asset_type) newErrors.asset_type = 'Asset type is required';
    if (!form.asset_name.trim()) newErrors.asset_name = 'Asset name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        📦 Assign Asset
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          disabled={loading}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <TextField
          select
          fullWidth
          margin="normal"
          label="Employee *"
          value={form.employee_id}
          onChange={e => setForm({ ...form, employee_id: e.target.value })}
          error={!!errors.employee_id}
          helperText={errors.employee_id}
          disabled={loading}
        >
          <MenuItem value="">Select Employee</MenuItem>
          {employees.map(emp => (
            <MenuItem key={emp.id} value={emp.id}>
              {emp.first_name} {emp.last_name} ({emp.employee_id})
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          fullWidth
          margin="normal"
          label="Asset Type *"
          value={form.asset_type}
          onChange={e => setForm({ ...form, asset_type: e.target.value })}
          error={!!errors.asset_type}
          helperText={errors.asset_type}
          disabled={loading}
        >
          <MenuItem value="">Select Type</MenuItem>
          {ASSET_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>

        <TextField
          fullWidth
          margin="normal"
          label="Asset Name *"
          value={form.asset_name}
          onChange={e => setForm({ ...form, asset_name: e.target.value })}
          error={!!errors.asset_name}
          helperText={errors.asset_name}
          disabled={loading}
        />

        <TextField
          fullWidth
          margin="normal"
          label="Serial Number"
          value={form.serial_number}
          onChange={e => setForm({ ...form, serial_number: e.target.value })}
          disabled={loading}
        />

        <TextField
          select
          fullWidth
          margin="normal"
          label="Condition"
          value={form.condition}
          onChange={e => setForm({ ...form, condition: e.target.value })}
          disabled={loading}
        >
          <MenuItem value="good">✅ Good</MenuItem>
          <MenuItem value="fair">⚠️ Fair</MenuItem>
          <MenuItem value="poor">❌ Poor</MenuItem>
        </TextField>

        <TextField
          fullWidth
          margin="normal"
          label="Notes"
          multiline
          rows={2}
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          disabled={loading}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit} 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Assigning...' : 'Assign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// RETURN ASSET DIALOG
// ============================================================

function ReturnAssetDialog({ open, onClose, onSubmit, asset }) {
  const [form, setForm] = useState({
    return_reason: '',
    return_condition: 'good',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm({
        return_reason: '',
        return_condition: 'good',
        notes: ''
      });
      setErrors({});
    }
  }, [open]);

  const validate = () => {
    const newErrors = {};
    if (!form.return_reason) newErrors.return_reason = 'Return reason is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await onSubmit(asset.id, form);
      onClose();
    } catch (err) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        🔄 Return Asset
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          disabled={loading}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Asset:</strong> {asset?.asset_name || ''} ({asset?.serial_number || 'No SN'})<br />
          <strong>Employee:</strong> {asset?.employee_name || '-'}
        </Alert>

        <TextField
          select
          fullWidth
          margin="normal"
          label="Return Reason *"
          value={form.return_reason}
          onChange={e => setForm({ ...form, return_reason: e.target.value })}
          error={!!errors.return_reason}
          helperText={errors.return_reason}
          disabled={loading}
        >
          <MenuItem value="">Select Reason</MenuItem>
          {RETURN_REASONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>

        <TextField
          select
          fullWidth
          margin="normal"
          label="Return Condition"
          value={form.return_condition}
          onChange={e => setForm({ ...form, return_condition: e.target.value })}
          disabled={loading}
        >
          <MenuItem value="good">✅ Good</MenuItem>
          <MenuItem value="fair">⚠️ Fair</MenuItem>
          <MenuItem value="poor">❌ Poor</MenuItem>
          <MenuItem value="broken">💔 Broken</MenuItem>
        </TextField>

        <TextField
          fullWidth
          margin="normal"
          label="Notes"
          multiline
          rows={2}
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          disabled={loading}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button 
          variant="contained" 
          color="warning" 
          onClick={handleSubmit} 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Returning...' : 'Return'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// REPLACE ASSET DIALOG
// ============================================================

function ReplaceAssetDialog({ open, onClose, onSubmit, asset }) {
  const [form, setForm] = useState({
    employee_id: '',
    asset_type: '',
    asset_name: '',
    serial_number: '',
    condition: 'good',
    notes: '',
    replace_reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
      setErrors({});
    }
  }, [open, asset]);

  const validate = () => {
    const newErrors = {};
    if (!form.asset_name.trim()) newErrors.asset_name = 'New asset name is required';
    if (!form.replace_reason) newErrors.replace_reason = 'Replace reason is required';
    if (!form.asset_type) newErrors.asset_type = 'Asset type is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await onSubmit({ ...form, old_asset_id: asset.id });
      onClose();
    } catch (err) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        🔄 Replace Asset
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          disabled={loading}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Old Asset:</strong> {asset?.asset_name || ''}<br />
          <strong>Employee:</strong> {asset?.employee_name || '-'}
        </Alert>

        <TextField
          select
          fullWidth
          margin="normal"
          label="Replace Reason *"
          value={form.replace_reason}
          onChange={e => setForm({ ...form, replace_reason: e.target.value })}
          error={!!errors.replace_reason}
          helperText={errors.replace_reason}
          disabled={loading}
        >
          <MenuItem value="">Select Reason</MenuItem>
          {REPLACE_REASONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>

        <Divider sx={{ my: 2 }}>
          <Chip label="New Asset Details" color="primary" />
        </Divider>

        <TextField
          select
          fullWidth
          margin="normal"
          label="Asset Type *"
          value={form.asset_type}
          onChange={e => setForm({ ...form, asset_type: e.target.value })}
          error={!!errors.asset_type}
          helperText={errors.asset_type}
          disabled={loading}
        >
          <MenuItem value="">Select Type</MenuItem>
          {ASSET_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>

        <TextField
          fullWidth
          margin="normal"
          label="New Asset Name *"
          value={form.asset_name}
          onChange={e => setForm({ ...form, asset_name: e.target.value })}
          error={!!errors.asset_name}
          helperText={errors.asset_name}
          disabled={loading}
        />

        <TextField
          fullWidth
          margin="normal"
          label="New Serial Number"
          value={form.serial_number}
          onChange={e => setForm({ ...form, serial_number: e.target.value })}
          disabled={loading}
        />

        <TextField
          select
          fullWidth
          margin="normal"
          label="Condition"
          value={form.condition}
          onChange={e => setForm({ ...form, condition: e.target.value })}
          disabled={loading}
        >
          <MenuItem value="good">✅ Good</MenuItem>
          <MenuItem value="fair">⚠️ Fair</MenuItem>
        </TextField>

        <TextField
          fullWidth
          margin="normal"
          label="Notes"
          multiline
          rows={2}
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          disabled={loading}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSubmit} 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Replacing...' : 'Replace Asset'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// UPLOAD DOCUMENT DIALOG
// ============================================================

function UploadDocumentDialog({ open, onClose, onSubmit, employees }) {
  const [form, setForm] = useState({
    employee_id: '',
    document_type: '',
    title: '',
    file: null
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (open) {
      setForm({
        employee_id: '',
        document_type: '',
        title: '',
        file: null
      });
      setErrors({});
      setPreview(null);
    }
  }, [open]);

  const validate = () => {
    const newErrors = {};
    if (!form.employee_id) newErrors.employee_id = 'Employee is required';
    if (!form.document_type) newErrors.document_type = 'Document type is required';
    if (!form.file) newErrors.file = 'File is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrors({ ...errors, file: 'File size must be less than 10MB' });
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setErrors({ ...errors, file: 'Only JPG, PNG, and PDF files are allowed' });
        return;
      }

      setForm({ ...form, file });
      setErrors({ ...errors, file: '' });

      // Preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('document_type', form.document_type);// 🔥 Changed from 'document_type' to 'type' to match database
      formData.append('title', form.title || form.document_type);
      formData.append('file', form.file);
      // uploaded_by will be set by backend from logged-in user

      await onSubmit(form.employee_id, formData);
      onClose();
    } catch (err) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        📄 Upload Document
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          disabled={loading}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <TextField
          select
          fullWidth
          margin="normal"
          label="Employee *"
          value={form.employee_id}
          onChange={e => setForm({ ...form, employee_id: e.target.value })}
          error={!!errors.employee_id}
          helperText={errors.employee_id}
          disabled={loading}
        >
          <MenuItem value="">Select Employee</MenuItem>
          {employees.map(emp => (
            <MenuItem key={emp.id} value={emp.id}>
              {emp.first_name} {emp.last_name} ({emp.employee_id})
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          fullWidth
          margin="normal"
          label="Document Type *"
          value={form.document_type}
          onChange={e => setForm({ ...form, document_type: e.target.value })}
          error={!!errors.document_type}
          helperText={errors.document_type}
          disabled={loading}
        >
          <MenuItem value="">Select Type</MenuItem>
          {DOCUMENT_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>

        <TextField
          fullWidth
          margin="normal"
          label="Title"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          disabled={loading}
          helperText="Optional - will use document type if empty"
        />

        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            component="label"
            fullWidth
            sx={{ py: 2, borderStyle: 'dashed' }}
            disabled={loading}
            startIcon={<UploadIcon />}
          >
            {form.file ? form.file.name : 'Choose File *'}
            <input
              type="file"
              hidden
              onChange={handleFileChange}
              accept=".jpg,.jpeg,.png,.pdf"
            />
          </Button>
          {errors.file && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
              {errors.file}
            </Typography>
          )}
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
            Supported: JPG, PNG, PDF (Max 10MB)
          </Typography>
        </Box>

        {preview && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="textSecondary">Preview:</Typography>
            <Box
              component="img"
              src={preview}
              alt="Document preview"
              sx={{
                maxWidth: '100%',
                maxHeight: 200,
                objectFit: 'contain',
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                mt: 0.5,
              }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !form.employee_id || !form.document_type || !form.file}
          startIcon={loading ? <CircularProgress size={20} /> : <UploadIcon />}
        >
          {loading ? 'Uploading...' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

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

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    employee_id: '',
    asset_type: '',
    condition: '',
    status: '',
  });

  // ============================================================
  // DATA LOADING
  // ============================================================

  const loadData = useCallback(async () => {
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
      console.error('Error loading data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
      setAssets([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDocuments = useCallback(async (empId) => {
    if (!empId) {
      setDocuments([]);
      return;
    }
    try {
      const docs = await employeeAssetService.getDocuments(empId);
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch (err) {
      console.error('Error loading documents:', err);
      setDocuments([]);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedEmployee) {
      loadDocuments(selectedEmployee);
    } else {
      setDocuments([]);
    }
  }, [selectedEmployee, loadDocuments]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const showSuccess = useCallback((msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }, []);

  const showError = useCallback((msg) => {
    setError(msg);
    setTimeout(() => setError(''), 5000);
  }, []);

  const handleAssign = useCallback(async (data) => {
    try {
      await employeeAssetService.assignAsset(data);
      showSuccess('Asset assigned successfully!');
      await loadData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to assign asset');
    }
  }, [loadData, showSuccess, showError]);

  const handleReturn = useCallback(async (id, data) => {
    try {
      await employeeAssetService.returnAsset(id, data);
      showSuccess('Asset returned successfully!');
      await loadData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to return asset');
    }
  }, [loadData, showSuccess, showError]);

  const handleReplace = useCallback(async (data) => {
    try {
      await employeeAssetService.replaceAsset(data);
      showSuccess('Asset replaced successfully!');
      await loadData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to replace asset');
    }
  }, [loadData, showSuccess, showError]);

  const handleUpload = useCallback(async (employeeId, formData) => {
    try {
      await employeeAssetService.uploadDocument(employeeId, formData);
      showSuccess('Document uploaded successfully!');
      await loadDocuments(selectedEmployee);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to upload document');
    }
  }, [selectedEmployee, loadDocuments, showSuccess, showError]);

  const handleDeleteDoc = useCallback(async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await employeeAssetService.deleteDocument(docId);
      showSuccess('Document deleted successfully!');
      await loadDocuments(selectedEmployee);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete document');
    }
  }, [selectedEmployee, loadDocuments, showSuccess, showError]);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      employee_id: '',
      asset_type: '',
      condition: '',
      status: '',
    });
  }, []);

  // ============================================================
  // COMPUTED VALUES
  // ============================================================

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(v => v !== '').length;
  }, [filters]);

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
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
  }, [assets, filters]);

  const activeAssets = useMemo(() => {
    return filteredAssets.filter(a => a.status !== 'returned');
  }, [filteredAssets]);

  const returnedAssets = useMemo(() => {
    return filteredAssets.filter(a => a.status === 'returned');
  }, [filteredAssets]);

  const stats = useMemo(() => {
    return {
      total: assets.length,
      active: assets.filter(a => a.status !== 'returned').length,
      returned: assets.filter(a => a.status === 'returned').length,
      documents: documents.length,
    };
  }, [assets, documents]);

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  const getConditionChip = useCallback((condition) => {
    const map = {
      good: { label: 'Good', color: 'success' },
      fair: { label: 'Fair', color: 'warning' },
      poor: { label: 'Poor', color: 'error' },
      broken: { label: 'Broken', color: 'error' }
    };
    const x = map[condition] || map.good;
    return <Chip label={x.label} color={x.color} size="small" />;
  }, []);

  const formatDate = useCallback((date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  // ============================================================
  // RENDER
  // ============================================================

  if (loading && assets.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={400} height={60} />
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={12} sm={3} key={i}>
              <Skeleton variant="rounded" height={140} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={400} sx={{ mt: 2 }} />
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
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialog(true)}
          >
            Upload Document
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAssignDialog(true)}
          >
            Assign Asset
          </Button>
        </Stack>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* STATS */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<InventoryIcon sx={{ fontSize: 36 }} />}
            value={stats.total}
            title="Total Assets"
            color="#1976d2"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<AssignmentIcon sx={{ fontSize: 36 }} />}
            value={stats.active}
            title="Active Assets"
            color="#388e3c"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<ReturnIcon sx={{ fontSize: 36 }} />}
            value={stats.returned}
            title="Returned"
            color="#f57c00"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<DescriptionIcon sx={{ fontSize: 36 }} />}
            value={stats.documents}
            title="Documents"
            color="#7b1fa2"
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* TABS */}
      <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} sx={{ mb: 2 }}>
        <Tab label={`📦 Active Assets (${activeAssets.length})`} />
        <Tab label={`🔄 Returned Assets (${returnedAssets.length})`} />
        <Tab label={`📄 Documents (${documents.length})`} />
      </Tabs>

      {/* FILTER BAR (only for asset tabs) */}
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
        <Alert severity="info" sx={{ mb: 2 }} icon={<FilterListIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2">
              {activeFilterCount} filter(s) applied — Showing {filteredAssets.length} result(s)
            </Typography>
            <Button size="small" onClick={clearFilters}>Clear All</Button>
          </Box>
        </Alert>
      )}

      {/* ============================================================
          TAB 0: ACTIVE ASSETS
          ============================================================ */}
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
                    {activeFilterCount > 0 && (
                      <Typography variant="caption" color="textSecondary">
                        Try adjusting your filters
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                activeAssets.map(asset => (
                  <TableRow key={asset.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <InventoryIcon color="primary" fontSize="small" />
                        <Box>
                          <Typography fontWeight="bold">{asset.asset_name}</Typography>
                          {asset.notes && (
                            <Typography variant="caption" color="textSecondary">
                              {asset.notes.substring(0, 50)}
                              {asset.notes.length > 50 && '...'}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={asset.asset_type} size="small" variant="outlined" />
                    </TableCell>
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
                          <Typography variant="body2" fontWeight="bold">
                            {asset.employee_name || '-'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {asset.employee_nik || '-'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{getConditionChip(asset.condition)}</TableCell>
                    <TableCell>{formatDate(asset.assigned_date)}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Replace / Exchange">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => setReplaceDialog({ open: true, asset })}
                          >
                            <SwapHorizIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Return">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => setReturnDialog({ open: true, asset })}
                          >
                            <ReturnIcon fontSize="small" />
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
      )}

      {/* ============================================================
          TAB 1: RETURNED ASSETS
          ============================================================ */}
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
              ) : (
                returnedAssets.map(asset => (
                  <TableRow key={asset.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <InventoryIcon color="disabled" fontSize="small" />
                        <Box>
                          <Typography fontWeight="bold">{asset.asset_name}</Typography>
                          {asset.serial_number && (
                            <Typography variant="caption" color="textSecondary">
                              SN: {asset.serial_number}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={asset.asset_type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{asset.employee_name || '-'}</Typography>
                    </TableCell>
                    <TableCell>{formatDate(asset.return_date)}</TableCell>
                    <TableCell>
                      <Chip label={asset.return_reason || '-'} size="small" color="warning" />
                    </TableCell>
                    <TableCell>{getConditionChip(asset.return_condition || 'good')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ============================================================
          TAB 2: DOCUMENTS
          ============================================================ */}
      {tabIndex === 2 && (
        <Box>
          <TextField
            select
            fullWidth
            sx={{ mb: 2 }}
            label="Select Employee to View Documents"
            value={selectedEmployee}
            onChange={e => {
              setSelectedEmployee(e.target.value);
            }}
          >
            <MenuItem value="">Select Employee</MenuItem>
            {employees.map(emp => (
              <MenuItem key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name} ({emp.employee_id})
              </MenuItem>
            ))}
          </TextField>

          {selectedEmployee ? (
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
                        <Typography color="textSecondary">No documents found for this employee</Typography>
                        <Button
                          startIcon={<UploadIcon />}
                          onClick={() => setUploadDialog(true)}
                          sx={{ mt: 1 }}
                        >
                          Upload Document
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    documents.map(doc => (
                      <TableRow key={doc.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DescriptionIcon color="primary" />
                            <Box>
                              <Typography fontWeight="bold">
                                {doc.title || doc.document_type || doc.type}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {doc.file_name}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={doc.document_type || doc.type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : '-'}
                        </TableCell>
                        <TableCell>
                          {doc.created_at ? formatDate(doc.created_at) : '-'}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Download">
                            <IconButton
                              color="primary"
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="small"
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              color="error"
                              onClick={() => handleDeleteDoc(doc.id)}
                              size="small"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="textSecondary">
                Please select an employee to view their documents
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* ============================================================
          DIALOGS
          ============================================================ */}
      <AssignAssetDialog
        open={assignDialog}
        onClose={() => setAssignDialog(false)}
        onSubmit={handleAssign}
        employees={employees}
      />

      <ReturnAssetDialog
        open={returnDialog.open}
        onClose={() => setReturnDialog({ open: false, asset: null })}
        onSubmit={handleReturn}
        asset={returnDialog.asset}
      />

      <ReplaceAssetDialog
        open={replaceDialog.open}
        onClose={() => setReplaceDialog({ open: false, asset: null })}
        onSubmit={handleReplace}
        asset={replaceDialog.asset}
      />

      <UploadDocumentDialog
        open={uploadDialog}
        onClose={() => setUploadDialog(false)}
        onSubmit={handleUpload}
        employees={employees}
      />
    </Box>
  );
}