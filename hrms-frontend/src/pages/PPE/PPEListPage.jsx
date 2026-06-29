import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Chip, IconButton,
  MenuItem, Stack, Alert, Skeleton, Card, CardContent,
  Tooltip, Avatar, Divider, InputAdornment, FormControl, InputLabel,
  Select, Pagination, Popover
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ArchiveIcon from '@mui/icons-material/Archive';
import HistoryIcon from '@mui/icons-material/History';
import ShieldIcon from '@mui/icons-material/Shield';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DateRangeIcon from '@mui/icons-material/DateRange';
import ppeService from '../../services/ppeService';

// ========== CONSTANTS ==========
const STATUS_OPTIONS = [
  { value: 'available', label: 'Available', color: 'success' },
  { value: 'assigned', label: 'Assigned', color: 'primary' },
  { value: 'maintenance', label: 'Maintenance', color: 'warning' },
  { value: 'write_off', label: 'Write-off', color: 'error' },
];

const CONDITION_OPTIONS = [
  { value: 'good', label: 'Good', color: 'success' },
  { value: 'fair', label: 'Fair', color: 'warning' },
  { value: 'poor', label: 'Poor', color: 'error' },
  { value: 'damaged', label: 'Damaged', color: 'error' },
  { value: 'expired', label: 'Expired', color: 'default' },
];

const WRITE_OFF_REASONS = [
  { value: 'expired', label: 'Expired' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'lost', label: 'Lost' },
  { value: 'stolen', label: 'Stolen' },
  { value: 'obsolete', label: 'Obsolete' },
  { value: 'recalled', label: 'Recalled' },
  { value: 'replaced', label: 'Replaced' },
  { value: 'other', label: 'Other' },
];

// ========== EXPORT DIALOG ==========
function ExportDialog({ open, onClose, onExport, loading }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState('xlsx');
  const [error, setError] = useState('');

  const handleExport = () => {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setError('Start date must be before end date');
      return;
    }
    setError('');
    onExport({ startDate, endDate, format });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        📤 Export PPE Data
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">Export PPE data with date filter. Leave dates empty to export all data.</Typography>
        </Alert>

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="End Date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Export Format</InputLabel>
              <Select
                label="Export Format"
                value={format}
                onChange={e => setFormat(e.target.value)}
              >
                <MenuItem value="xlsx">Excel (.xlsx)</MenuItem>
                <MenuItem value="csv">CSV (.csv)</MenuItem>
                <MenuItem value="pdf">PDF (.pdf)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}
          {startDate && endDate && (
            <Grid item xs={12}>
              <Alert severity="success">
                Exporting data from {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          variant="contained" 
          onClick={handleExport} 
          disabled={loading}
          startIcon={<FileDownloadIcon />}
        >
          {loading ? 'Exporting...' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ========== IMPORT DIALOG ==========
function ImportDialog({ open, onClose, onDownloadTemplate, onImport, importFile, setImportFile, importing, importResult }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>📥 Import PPE from Excel</DialogTitle>
      <DialogContent>
        {/* Step 1: Download Template */}
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight="bold">Step 1: Download Template</Typography>
          <Typography variant="body2">Download the template, fill in your PPE data, then upload.</Typography>
          <Button variant="outlined" onClick={onDownloadTemplate} sx={{ mt: 1 }} size="small">
            📥 Download Template
          </Button>
        </Alert>

        <Divider sx={{ my: 2 }} />

        {/* Step 2: Upload File */}
        <Typography variant="body2" fontWeight="bold" gutterBottom>Step 2: Upload Filled Template</Typography>
        <Button variant="outlined" component="label" fullWidth sx={{ py: 2, borderStyle: 'dashed' }} disabled={importing}>
          {importFile ? `✅ ${importFile.name}` : '📁 Choose Excel File (.xlsx)'}
          <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={e => setImportFile(e.target.files[0])} />
        </Button>

        {/* Import Result */}
        {importResult && (
          <Box sx={{ mt: 2 }}>
            {importResult.status === 'success' || importResult.success_count !== undefined ? (
              <Alert severity="success">
                <Typography variant="body2"><strong>Import Complete!</strong></Typography>
                <Typography variant="body2">✅ Success: {importResult.success_count || 0}</Typography>
                <Typography variant="body2">❌ Failed: {importResult.fail_count || 0}</Typography>
                {importResult.errors?.length > 0 && (
                  <Box sx={{ mt: 1, maxHeight: 150, overflow: 'auto' }}>
                    {importResult.errors.map((err, i) => (
                      <Typography key={i} variant="caption" color="error" display="block">{err}</Typography>
                    ))}
                  </Box>
                )}
              </Alert>
            ) : (
              <Alert severity="error">
                <Typography variant="body2">{importResult.message}</Typography>
                {importResult.errors?.map((err, i) => (
                  <Typography key={i} variant="caption" display="block">• {err}</Typography>
                ))}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={importing}>Close</Button>
        <Button variant="contained" onClick={onImport} disabled={!importFile || importing}>
          {importing ? 'Importing...' : 'Import Now'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ========== STAT CARD ==========
function StatCard({ icon, title, value, color }) {
  return (
    <Card sx={{ height: '100%', borderRadius: 2 }}>
      <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
        <Box sx={{ color, mb: 1 }}>{icon}</Box>
        <Typography variant="h5" fontWeight="bold">{value || 0}</Typography>
        <Typography variant="body2" color="textSecondary">{title}</Typography>
      </CardContent>
    </Card>
  );
}

// ========== FILTER BAR ==========
function FilterBar({ filters, setFilters, categories, onClear }) {
  const count = Object.values(filters).filter(v => v !== '').length;
  return (
    <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6} md={3}>
          <TextField fullWidth size="small" placeholder="Search name, code, holder..."
            value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: filters.search && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setFilters({ ...filters, search: '' })}><ClearIcon fontSize="small" /></IconButton>
                </InputAdornment>
              ),
            }} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <FormControl fullWidth size="small"><InputLabel>Category</InputLabel>
            <Select label="Category" value={filters.category_id} onChange={e => setFilters({ ...filters, category_id: e.target.value })}>
              <MenuItem value="">All</MenuItem>
              {(categories || []).map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <FormControl fullWidth size="small"><InputLabel>Status</InputLabel>
            <Select label="Status" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
              <MenuItem value="">All</MenuItem>
              {STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <FormControl fullWidth size="small"><InputLabel>Condition</InputLabel>
            <Select label="Condition" value={filters.condition} onChange={e => setFilters({ ...filters, condition: e.target.value })}>
              <MenuItem value="">All</MenuItem>
              {CONDITION_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <TextField fullWidth size="small" label="Location" placeholder="Building..."
            value={filters.location} onChange={e => setFilters({ ...filters, location: e.target.value })} />
        </Grid>
        {count > 0 && (
          <Grid item xs={12} sm={4} md={1}>
            <Button fullWidth variant="outlined" color="error" size="small" onClick={onClear} startIcon={<ClearIcon />}>Clear</Button>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
}

// ========== PPE FORM DIALOG ==========
function PPEFormDialog({ open, onClose, onSubmit, categories = [], employees = [], editData }) {
  const [form, setForm] = useState({
    name: '', code: '', category_id: '', location: '', status: 'available', condition: 'good',
    serial_number: '', manufacturer: '', model: '', size: '', color: '', material: '',
    expiry_date: '', description: '', current_holder_id: '', current_holder_name: '',
    current_holder_department: '', current_holder_position: '', expected_return_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      if (editData) {
        setForm({
          name: editData.name || '', code: editData.code || '', category_id: editData.category_id || '',
          location: editData.location || '', status: editData.status || 'available',
          condition: editData.condition || 'good', serial_number: editData.serial_number || '',
          manufacturer: editData.manufacturer || '', model: editData.model || '',
          size: editData.size || '', color: editData.color || '', material: editData.material || '',
          expiry_date: editData.expiry_date || '', description: editData.description || '',
          current_holder_id: editData.current_holder_id || '', current_holder_name: editData.current_holder_name || '',
          current_holder_department: editData.current_holder_department || '',
          current_holder_position: editData.current_holder_position || '',
          expected_return_date: editData.expected_return_date || '',
        });
      } else {
        setForm({
          name: '', code: '', category_id: categories[0]?.id || '', location: '',
          status: 'available', condition: 'good', serial_number: '', manufacturer: '',
          model: '', size: '', color: '', material: '', expiry_date: '', description: '',
          current_holder_id: '', current_holder_name: '', current_holder_department: '',
          current_holder_position: '', expected_return_date: '',
        });
      }
      setErrors({});
    }
  }, [open, editData, categories]);

  const handleEmployeeSelect = (empId) => {
    if (!empId) {
      setForm({ ...form, current_holder_id: '', current_holder_name: '', current_holder_department: '', current_holder_position: '', status: 'available' });
      return;
    }
    const emp = employees.find(e => e.id == empId);
    if (emp) {
      setForm({
        ...form,
        current_holder_id: emp.id,
        current_holder_name: emp.last_name || emp.first_name || '',
        current_holder_department: emp.department?.name || '',
        current_holder_position: emp.position?.title || '',
        status: 'assigned',
      });
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (!form.code.trim()) errs.code = 'Required';
    if (!form.category_id) errs.category_id = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try { await onSubmit(form); onClose(); }
    catch (err) { alert(err.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{editData ? '✏️ Edit PPE Item' : '🆕 Add New PPE'}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}><Divider sx={{ mb: 1 }}><Chip label="Basic Information" size="small" color="primary" /></Divider></Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Item Name *" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value, code: editData ? form.code : e.target.value.substring(0, 10).toUpperCase().replace(/\s/g, '-') })}
              error={!!errors.name} helperText={errors.name} autoFocus />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Code *" value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              error={!!errors.code} helperText={errors.code || 'Auto-generated'} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth label="Category *" value={form.category_id}
              onChange={e => setForm({ ...form, category_id: e.target.value })} error={!!errors.category_id} helperText={errors.category_id || 'Select category'}>
              <MenuItem value="">-- Select --</MenuItem>
              {(categories || []).map(c => <MenuItem key={c.id} value={c.id}>{c.name} ({c.code})</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Location" value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Building A - Floor 1" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField select fullWidth label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              {STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField select fullWidth label="Condition" value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}>
              {CONDITION_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={3}><TextField fullWidth label="Serial Number" value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} /></Grid>
          <Grid item xs={6} sm={3}><TextField fullWidth type="date" label="Expiry Date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>

          <Grid item xs={12} sx={{ mt: 1 }}><Divider sx={{ mb: 1 }}><Chip label="Specification" size="small" color="info" /></Divider></Grid>
          <Grid item xs={6} sm={4}><TextField fullWidth label="Manufacturer" value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} /></Grid>
          <Grid item xs={6} sm={4}><TextField fullWidth label="Model" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} /></Grid>
          <Grid item xs={4} sm={2}><TextField fullWidth label="Size" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} /></Grid>
          <Grid item xs={4} sm={2}><TextField fullWidth label="Color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} /></Grid>
          <Grid item xs={4} sm={2}><TextField fullWidth label="Material" value={form.material} onChange={e => setForm({ ...form, material: e.target.value })} /></Grid>
          <Grid item xs={12}><TextField fullWidth label="Description" multiline rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Grid>

          <Grid item xs={12} sx={{ mt: 1 }}><Divider sx={{ mb: 1 }}><Chip label="Assign to Employee (Optional)" size="small" color="success" /></Divider></Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth label="Assign to Employee" value={form.current_holder_id} onChange={e => handleEmployeeSelect(e.target.value)}>
              <MenuItem value="">-- Not Assigned (Stock) --</MenuItem>
              {(employees || []).map(emp => (
                <MenuItem key={emp.id} value={emp.id}>{emp.last_name || emp.first_name || ''} ({emp.employee_id || ''})</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Holder Name" value={form.current_holder_name} InputProps={{ readOnly: true }} helperText="Auto-filled" /></Grid>
          <Grid item xs={6} sm={4}><TextField fullWidth label="Department" value={form.current_holder_department} InputProps={{ readOnly: true }} /></Grid>
          <Grid item xs={6} sm={4}><TextField fullWidth label="Position" value={form.current_holder_position} InputProps={{ readOnly: true }} /></Grid>
          <Grid item xs={6} sm={4}><TextField fullWidth type="date" label="Expected Return Date" value={form.expected_return_date || ''} onChange={e => setForm({ ...form, expected_return_date: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" onClick={handleSubmit} disabled={loading}>{loading ? 'Saving...' : editData ? 'Update' : 'Create'}</Button></DialogActions>
    </Dialog>
  );
}

// ========== ASSIGN DIALOG ==========
function AssignDialog({ open, onClose, onSubmit, item, employees = [] }) {
  const [empId, setEmpId] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open && item) { setEmpId(''); setLocation(item.location || ''); } }, [open, item]);

  const selectedEmp = employees.find(e => e.id == empId);

  const handleSubmit = async () => {
    if (!empId || !selectedEmp) return;
    setLoading(true);
    try {
      await onSubmit(item.id, {
        current_holder_id: selectedEmp.id,
        current_holder_name: selectedEmp.last_name || selectedEmp.first_name || '',
        current_holder_department: selectedEmp.department?.name || '',
        current_holder_position: selectedEmp.position?.title || '',
        location: location,
      });
      onClose();
    } catch (err) { alert(err.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>👤 Assign PPE to Employee</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}><strong>Item:</strong> {item?.name || ''} ({item?.code || ''})</Alert>
        <TextField select fullWidth margin="normal" label="Employee *" value={empId} onChange={e => setEmpId(e.target.value)}>
          <MenuItem value="">Select Employee</MenuItem>
          {(employees || []).map(emp => <MenuItem key={emp.id} value={emp.id}>{emp.last_name || emp.first_name || ''} ({emp.employee_id || ''})</MenuItem>)}
        </TextField>
        {selectedEmp && (
          <>
            <TextField fullWidth margin="normal" label="Name" value={selectedEmp.last_name || selectedEmp.first_name || ''} InputProps={{ readOnly: true }} />
            <TextField fullWidth margin="normal" label="Department" value={selectedEmp.department?.name || ''} InputProps={{ readOnly: true }} />
            <TextField fullWidth margin="normal" label="Position" value={selectedEmp.position?.title || ''} InputProps={{ readOnly: true }} />
          </>
        )}
        <TextField fullWidth margin="normal" label="Location" value={location} onChange={e => setLocation(e.target.value)} placeholder="Where will it be used?" />
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" onClick={handleSubmit} disabled={loading || !empId}>Assign</Button></DialogActions>
    </Dialog>
  );
}

// ========== MOVE DIALOG ==========
function MoveDialog({ open, onClose, onSubmit, item }) {
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (open && item) setLocation(item.location || ''); }, [open, item]);
  const handleSubmit = async () => { if (!location.trim()) return; setLoading(true); try { await onSubmit(item.id, { location }); onClose(); } catch (err) { alert(err.message); } finally { setLoading(false); } };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>📍 Move PPE Location</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}><strong>Item:</strong> {item?.name || ''}<br /><strong>Current:</strong> {item?.location || 'N/A'}</Alert>
        <TextField fullWidth label="New Location *" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Building B - Floor 2" />
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" onClick={handleSubmit} disabled={loading}>Move</Button></DialogActions>
    </Dialog>
  );
}

// ========== WRITE-OFF DIALOG ==========
function WriteOffDialog({ open, onClose, onSubmit, item }) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async () => { if (!reason) return; setLoading(true); try { await onSubmit(item.id, { write_off_reason: reason, write_off_notes: notes }); onClose(); } catch (err) { alert(err.message); } finally { setLoading(false); } };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>🗑️ Write-off PPE</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}><strong>Item:</strong> {item?.name || ''} ({item?.code || ''})</Alert>
        <TextField select fullWidth margin="normal" label="Reason *" value={reason} onChange={e => setReason(e.target.value)}>
          <MenuItem value="">Select Reason</MenuItem>
          {WRITE_OFF_REASONS.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
        </TextField>
        <TextField fullWidth margin="normal" label="Notes" multiline rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" color="error" onClick={handleSubmit} disabled={loading}>Write-off</Button></DialogActions>
    </Dialog>
  );
}

// ========== HISTORY DIALOG ==========
function HistoryDialog({ open, onClose, histories = [] }) {
  const getColor = (t) => ({ created: '#4caf50', updated: '#757575', assigned: '#2196f3', returned: '#9c27b0', moved: '#00bcd4', maintenance: '#ff9800', write_off: '#f44336', condition_change: '#ff5722' }[t] || '#757575');
  const getIcon = (t) => ({ created: '🆕', assigned: '👤', returned: '🔄', moved: '📍', write_off: '🗑️', condition_change: '⚠️', updated: '✏️', maintenance: '🔧' }[t] || '📋');
  const fmt = (d) => d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>📋 History Timeline</DialogTitle>
      <DialogContent>
        {histories.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}><HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} /><Typography color="textSecondary">No history yet</Typography></Box>
        ) : (
          <Box sx={{ position: 'relative', pl: 3 }}>
            <Box sx={{ position: 'absolute', left: 12, top: 8, bottom: 8, width: 2, bgcolor: '#e0e0e0', borderRadius: 1 }} />
            {histories.map((h) => (
              <Box key={h.id} sx={{ mb: 2.5, position: 'relative', pl: 3 }}>
                <Box sx={{ position: 'absolute', left: -4, top: 4, width: 28, height: 28, borderRadius: '50%', bgcolor: getColor(h.action_type), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 1 }}>{getIcon(h.action_type)}</Box>
                <Paper sx={{ p: 1.5, borderRadius: 2, boxShadow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>{h.action_type?.replace(/_/g, ' ') || ''}</Typography>
                    <Chip label={h.performed_by_name || 'System'} size="small" variant="outlined" sx={{ fontSize: 11, height: 20 }} />
                  </Box>
                  <Typography variant="body2" color="textSecondary">{h.description || ''}</Typography>
                  {h.notes && <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5 }}>Note: {h.notes}</Typography>}
                  <Typography variant="caption" color="textDisabled" sx={{ display: 'block', mt: 0.5 }}>{fmt(h.created_at)}</Typography>
                </Paper>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}

// ========== MAIN PAGE ==========
export default function PPEListPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ search: '', category_id: '', status: '', condition: '', location: '' });
  const [formDialog, setFormDialog] = useState({ open: false, editData: null });
  const [assignDialog, setAssignDialog] = useState({ open: false, item: null });
  const [moveDialog, setMoveDialog] = useState({ open: false, item: null });
  const [writeOffDialog, setWriteOffDialog] = useState({ open: false, item: null });
  const [historyDialog, setHistoryDialog] = useState({ open: false, histories: [] });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  
  // Import dialog states
  const [importDialog, setImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Export dialog states
  const [exportDialog, setExportDialog] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { loadInitialData(); }, []);
  useEffect(() => { loadItems(); }, [filters, page]);

  const loadInitialData = async () => {
    setLoading(true); setError('');
    try {
      const [cat, emp, st] = await Promise.all([ppeService.getCategories(), ppeService.getEmployees(), ppeService.getStats()]);
      setCategories(cat || []); setEmployees(emp || []); setStats(st || {});
    } catch (err) { setError('Failed to load data'); console.error(err); }
    finally { setLoading(false); }
  };

  const loadItems = async () => {
    try {
      const params = { ...filters, page, per_page: 15 };
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
      const data = await ppeService.getItems(params);
      setItems(data?.data || data || []); setTotalPages(data?.last_page || 1);
    } catch (err) { console.error(err); }
  };

  const refreshAll = async () => { await loadInitialData(); await loadItems(); };
  const showMsg = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  // Import handlers
  const handleDownloadTemplate = () => {
    ppeService.downloadTemplate();
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await ppeService.importPPE(importFile);
      setImportResult(result.data || result);
      showMsg('Import completed!');
      refreshAll();
      setTimeout(() => {
        setImportDialog(false);
        setImportFile(null);
        setImportResult(null);
      }, 1500);
    } catch (err) {
      setImportResult({
        status: 'error',
        message: err.response?.data?.message || 'Import failed',
        errors: err.response?.data?.errors || [],
      });
    } finally {
      setImporting(false);
    }
  };

  // Export handler
  const handleExport = async ({ startDate, endDate, format }) => {
    setExporting(true);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (format) params.format = format;
      
      const response = await ppeService.exportItems(params);
      
      // Create download link
      const blob = new Blob([response.data], { 
        type: format === 'csv' ? 'text/csv' : 
              format === 'pdf' ? 'application/pdf' : 
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `ppe_export_${dateStr}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showMsg('Export completed successfully!');
      setExportDialog(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleCreate = async (data) => { await ppeService.createItem(data); showMsg('PPE created!'); refreshAll(); };
  const handleUpdate = async (data) => { await ppeService.updateItem(formDialog.editData.id, data); showMsg('PPE updated!'); refreshAll(); };
  const handleDelete = async () => { await ppeService.deleteItem(deleteDialog.item.id); showMsg('PPE deleted!'); setDeleteDialog({ open: false }); refreshAll(); };
  const handleAssign = async (id, data) => { await ppeService.assignItem(id, data); showMsg('PPE assigned!'); refreshAll(); };
  const handleReturn = async (id) => { if (window.confirm('Return this PPE?')) { await ppeService.returnItem(id); showMsg('PPE returned!'); refreshAll(); } };
  const handleMove = async (id, data) => { await ppeService.moveItem(id, data); showMsg('Location updated!'); refreshAll(); };
  const handleWriteOff = async (id, data) => { await ppeService.writeOffItem(id, data); showMsg('PPE written off!'); refreshAll(); };
  const handleViewHistory = async (id) => { try { const data = await ppeService.getHistory(id); setHistoryDialog({ open: true, histories: data || [] }); } catch (err) { alert(err.message); } };

  const getStatusChip = (s) => { const x = STATUS_OPTIONS.find(o => o.value === s) || STATUS_OPTIONS[0]; return <Chip label={x.label} color={x.color} size="small" variant="outlined" />; };
  const getConditionChip = (c) => { const x = CONDITION_OPTIONS.find(o => o.value === c) || CONDITION_OPTIONS[0]; return <Chip label={x.label} color={x.color} size="small" />; };

  if (loading) return <Box sx={{ p: 3 }}><Skeleton variant="text" width={400} height={60} /><Grid container spacing={2} sx={{ mt: 1 }}>{[1,2,3,4].map(i => <Grid item xs={6} sm={3} key={i}><Skeleton variant="rounded" height={120} /></Grid>)}</Grid></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box><Typography variant="h4" fontWeight="bold">🛡️ PPE List</Typography><Typography variant="body2" color="textSecondary">Personal Protective Equipment Management</Typography></Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refreshAll}>Refresh</Button>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={() => setExportDialog(true)}>Export</Button>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setImportDialog(true)}>Import Excel</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormDialog({ open: true, editData: null })}>Add PPE</Button>
        </Stack>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}><StatCard icon={<ShieldIcon sx={{ fontSize: 36 }} />} title="Total PPE" value={stats.total} color="#1976d2" /></Grid>
        <Grid item xs={6} sm={3}><StatCard icon={<CheckCircleIcon sx={{ fontSize: 36 }} />} title="Available" value={stats.available} color="#4caf50" /></Grid>
        <Grid item xs={6} sm={3}><StatCard icon={<PersonAddIcon sx={{ fontSize: 36 }} />} title="Assigned" value={stats.assigned} color="#2196f3" /></Grid>
        <Grid item xs={6} sm={3}><StatCard icon={<WarningIcon sx={{ fontSize: 36 }} />} title="Write-off" value={stats.write_off} color="#f44336" /></Grid>
      </Grid>

      <FilterBar filters={filters} setFilters={setFilters} categories={categories} onClear={() => setFilters({ search: '', category_id: '', status: '', condition: '', location: '' })} />

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead><TableRow sx={{ bgcolor: '#f5f5f5' }}><TableCell><strong>Item</strong></TableCell><TableCell><strong>Category</strong></TableCell><TableCell><strong>Location</strong></TableCell><TableCell><strong>Holder</strong></TableCell><TableCell><strong>Status</strong></TableCell><TableCell><strong>Condition</strong></TableCell><TableCell align="center"><strong>Actions</strong></TableCell></TableRow></TableHead>
          <TableBody>
            {items.length === 0 ? <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>No PPE items found</TableCell></TableRow> : items.map(item => (
              <TableRow key={item.id} hover sx={{ bgcolor: item.condition === 'expired' ? '#fff3e0' : item.status === 'write_off' ? '#ffebee' : 'inherit' }}>
                <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ShieldIcon color="primary" fontSize="small" /><Box><Typography variant="body2" fontWeight="bold">{item.name}</Typography><Typography variant="caption" color="textSecondary">{item.code} {item.serial_number && `| SN: ${item.serial_number}`}</Typography></Box></Box></TableCell>
                <TableCell><Chip label={item.category?.name || '-'} size="small" variant="outlined" /></TableCell>
                <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><LocationOnIcon fontSize="small" color="action" /><Typography variant="body2">{item.location || 'N/A'}</Typography></Box></TableCell>
                <TableCell>
                  {item.current_holder_name ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: '#1976d2' }}>{item.current_holder_name?.charAt(0)}</Avatar><Typography variant="body2">{item.current_holder_name}</Typography></Box>
                  ) : '-'}
                </TableCell>
                <TableCell>{getStatusChip(item.status)}</TableCell>
                <TableCell>{getConditionChip(item.condition)}</TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={0.3} justifyContent="center">
                    <Tooltip title="History"><IconButton size="small" onClick={() => handleViewHistory(item.id)}><HistoryIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => setFormDialog({ open: true, editData: item })}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    {item.status === 'available' && <Tooltip title="Assign"><IconButton size="small" color="success" onClick={() => setAssignDialog({ open: true, item })}><PersonAddIcon fontSize="small" /></IconButton></Tooltip>}
                    {item.status === 'assigned' && <><Tooltip title="Return"><IconButton size="small" color="secondary" onClick={() => handleReturn(item.id)}><KeyboardReturnIcon fontSize="small" /></IconButton></Tooltip><Tooltip title="Move"><IconButton size="small" color="info" onClick={() => setMoveDialog({ open: true, item })}><LocationOnIcon fontSize="small" /></IconButton></Tooltip></>}
                    {item.status !== 'write_off' && <Tooltip title="Write-off"><IconButton size="small" color="error" onClick={() => setWriteOffDialog({ open: true, item })}><ArchiveIcon fontSize="small" /></IconButton></Tooltip>}
                    <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, item })}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {totalPages > 1 && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}><Pagination count={totalPages} page={page} onChange={(e, v) => setPage(v)} color="primary" /></Box>}

      {/* Dialogs */}
      <ImportDialog
        open={importDialog}
        onClose={() => {
          setImportDialog(false);
          setImportFile(null);
          setImportResult(null);
        }}
        onDownloadTemplate={handleDownloadTemplate}
        onImport={handleImport}
        importFile={importFile}
        setImportFile={setImportFile}
        importing={importing}
        importResult={importResult}
      />

      <ExportDialog
        open={exportDialog}
        onClose={() => setExportDialog(false)}
        onExport={handleExport}
        loading={exporting}
      />

      <PPEFormDialog 
        open={formDialog.open} 
        onClose={() => setFormDialog({ open: false, editData: null })} 
        onSubmit={formDialog.editData ? handleUpdate : handleCreate} 
        categories={categories} 
        employees={employees} 
        editData={formDialog.editData} 
      />
      
      <AssignDialog 
        open={assignDialog.open} 
        onClose={() => setAssignDialog({ open: false, item: null })} 
        onSubmit={handleAssign} 
        item={assignDialog.item} 
        employees={employees} 
      />
      
      <MoveDialog 
        open={moveDialog.open} 
        onClose={() => setMoveDialog({ open: false, item: null })} 
        onSubmit={handleMove} 
        item={moveDialog.item} 
      />
      
      <WriteOffDialog 
        open={writeOffDialog.open} 
        onClose={() => setWriteOffDialog({ open: false, item: null })} 
        onSubmit={handleWriteOff} 
        item={writeOffDialog.item} 
      />
      
      <HistoryDialog 
        open={historyDialog.open} 
        onClose={() => setHistoryDialog({ open: false, histories: [] })} 
        histories={historyDialog.histories} 
      />
      
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false })}>
        <DialogTitle>Delete {deleteDialog.item?.name}?</DialogTitle>
        <DialogContent><Typography>This action cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}