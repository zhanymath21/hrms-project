import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Chip, IconButton,
  MenuItem, Stack, Alert, Skeleton, Card, CardContent,
  Tooltip, Avatar, InputAdornment, FormControl, InputLabel,
  Select, Pagination
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
import FilterListIcon from '@mui/icons-material/FilterList';
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

const WRITE_OFF_REASONS = ['expired', 'damaged', 'lost', 'stolen', 'obsolete', 'recalled', 'replaced', 'other'];

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
  const activeFilters = Object.values(filters).filter(v => v !== '').length;

  return (
    <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6} md={3}>
          <TextField fullWidth size="small" placeholder="Search name, code, holder..."
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
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
        <Grid item xs={6} sm={4} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Category</InputLabel>
            <Select label="Category" value={filters.category_id}
              onChange={e => setFilters({ ...filters, category_id: e.target.value })}>
              <MenuItem value="">All Categories</MenuItem>
              {categories.map(cat => (
                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}>
              <MenuItem value="">All Status</MenuItem>
              {STATUS_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Condition</InputLabel>
            <Select label="Condition" value={filters.condition}
              onChange={e => setFilters({ ...filters, condition: e.target.value })}>
              <MenuItem value="">All Conditions</MenuItem>
              {CONDITION_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <TextField fullWidth size="small" label="Location" placeholder="Building..."
            value={filters.location}
            onChange={e => setFilters({ ...filters, location: e.target.value })} />
        </Grid>
        <Grid item xs={12} sm={4} md={1}>
          {activeFilters > 0 && (
            <Button fullWidth variant="outlined" color="error" size="small" onClick={onClear} startIcon={<ClearIcon />}>
              Clear
            </Button>
          )}
        </Grid>
      </Grid>
      {activeFilters > 0 && (
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
          <FilterListIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
          {activeFilters} filter(s) applied
        </Typography>
      )}
    </Paper>
  );
}

// ========== PPE FORM DIALOG ==========
function PPEFormDialog({ open, onClose, onSubmit, categories, editData }) {
  const [form, setForm] = useState({
    name: '', code: '', category_id: '', location: '',
    status: 'available', condition: 'good', description: '',
    serial_number: '', manufacturer: '', model: '',
    size: '', color: '', material: '', expiry_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      if (editData) {
        setForm({
          name: editData.name || '', code: editData.code || '', category_id: editData.category_id || '',
          location: editData.location || '', status: editData.status || 'available',
          condition: editData.condition || 'good', description: editData.description || '',
          serial_number: editData.serial_number || '', manufacturer: editData.manufacturer || '',
          model: editData.model || '', size: editData.size || '', color: editData.color || '',
          material: editData.material || '', expiry_date: editData.expiry_date || ''
        });
      } else {
        setForm({
          name: '', code: '', category_id: categories[0]?.id || '', location: '',
          status: 'available', condition: 'good', description: '',
          serial_number: '', manufacturer: '', model: '',
          size: '', color: '', material: '', expiry_date: ''
        });
      }
      setErrors({});
    }
  }, [open, editData, categories]);

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
    catch (err) { alert(err?.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{editData ? '✏️ Edit PPE' : '🆕 Add PPE'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Name *" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value, code: e.target.value.substring(0, 8).toUpperCase().replace(/\s/g, '-') })}
              error={!!errors.name} helperText={errors.name} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Code *" value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              error={!!errors.code} helperText={errors.code} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth label="Category *" value={form.category_id}
              onChange={e => setForm({ ...form, category_id: e.target.value })}
              error={!!errors.category_id} helperText={errors.category_id}>
              {categories.map(cat => <MenuItem key={cat.id} value={cat.id}>{cat.name} ({cat.code})</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Location" value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Building A - Floor 1 - PPE Cabinet" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField select fullWidth label="Status" value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}>
              {STATUS_OPTIONS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField select fullWidth label="Condition" value={form.condition}
              onChange={e => setForm({ ...form, condition: e.target.value })}>
              {CONDITION_OPTIONS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField fullWidth label="Serial Number" value={form.serial_number}
              onChange={e => setForm({ ...form, serial_number: e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField fullWidth type="date" label="Expiry Date" value={form.expiry_date}
              onChange={e => setForm({ ...form, expiry_date: e.target.value })} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField fullWidth label="Manufacturer" value={form.manufacturer}
              onChange={e => setForm({ ...form, manufacturer: e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField fullWidth label="Model" value={form.model}
              onChange={e => setForm({ ...form, model: e.target.value })} />
          </Grid>
          <Grid item xs={4} sm={2}>
            <TextField fullWidth label="Size" value={form.size}
              onChange={e => setForm({ ...form, size: e.target.value })} />
          </Grid>
          <Grid item xs={4} sm={2}>
            <TextField fullWidth label="Color" value={form.color}
              onChange={e => setForm({ ...form, color: e.target.value })} />
          </Grid>
          <Grid item xs={4} sm={2}>
            <TextField fullWidth label="Material" value={form.material}
              onChange={e => setForm({ ...form, material: e.target.value })} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Description" multiline rows={2} value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ========== ASSIGN DIALOG ==========
function AssignDialog({ open, onClose, onSubmit, item, employees }) {
  const [form, setForm] = useState({
    current_holder_id: '', current_holder_name: '',
    current_holder_department: '', current_holder_position: '', location: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && item) setForm({
      current_holder_id: '', current_holder_name: '',
      current_holder_department: '', current_holder_position: '',
      location: item.location || ''
    });
  }, [open, item]);

  const handleEmployeeSelect = (empId) => {
    const emp = employees.find(e => e.id == empId);
    if (emp) {
      setForm({
        ...form,
        current_holder_id: emp.id,
        current_holder_name: `${emp.first_name} ${emp.last_name}`,
        current_holder_department: emp.department?.name || '',
        current_holder_position: emp.position?.title || '',
      });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>👤 Assign PPE</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Item:</strong> {item?.name} ({item?.code})
        </Alert>
        <TextField select fullWidth margin="normal" label="Employee *" value={form.current_holder_id}
          onChange={e => handleEmployeeSelect(e.target.value)}>
          <MenuItem value="">Select Employee</MenuItem>
          {employees.map(emp => (
            <MenuItem key={emp.id} value={emp.id}>
              {emp.first_name} {emp.last_name} ({emp.employee_id})
            </MenuItem>
          ))}
        </TextField>
        <TextField fullWidth margin="normal" label="Holder Name" value={form.current_holder_name} InputProps={{ readOnly: true }} />
        <TextField fullWidth margin="normal" label="Department" value={form.current_holder_department} InputProps={{ readOnly: true }} />
        <TextField fullWidth margin="normal" label="Location" value={form.location}
          onChange={e => setForm({ ...form, location: e.target.value })}
          placeholder="Where will they use it?" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={async () => {
          if (!form.current_holder_id) return;
          setLoading(true);
          try { await onSubmit(item.id, form); onClose(); }
          catch (err) { alert(err.message); }
          finally { setLoading(false); }
        }} disabled={loading}>Assign</Button>
      </DialogActions>
    </Dialog>
  );
}

// ========== MOVE DIALOG ==========
function MoveDialog({ open, onClose, onSubmit, item }) {
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open && item) setLocation(item.location || ''); }, [open, item]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>📍 Move PPE</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Item:</strong> {item?.name}<br />
          <strong>Current Location:</strong> {item?.location || 'N/A'}
        </Alert>
        <TextField fullWidth label="New Location *" value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="e.g. Building B - Floor 3 - Storage" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={async () => {
          setLoading(true);
          try { await onSubmit(item.id, { location }); onClose(); }
          catch (err) { alert(err.message); }
          finally { setLoading(false); }
        }} disabled={loading}>Move</Button>
      </DialogActions>
    </Dialog>
  );
}

// ========== WRITE-OFF DIALOG ==========
function WriteOffDialog({ open, onClose, onSubmit, item }) {
  const [form, setForm] = useState({ write_off_reason: '', write_off_notes: '' });
  const [loading, setLoading] = useState(false);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>🗑️ Write-off PPE</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Item:</strong> {item?.name} ({item?.code})
        </Alert>
        <TextField select fullWidth margin="normal" label="Reason *" value={form.write_off_reason}
          onChange={e => setForm({ ...form, write_off_reason: e.target.value })}>
          <MenuItem value="">Select Reason</MenuItem>
          {WRITE_OFF_REASONS.map(r => (
            <MenuItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</MenuItem>
          ))}
        </TextField>
        <TextField fullWidth margin="normal" label="Notes" multiline rows={3} value={form.write_off_notes}
          onChange={e => setForm({ ...form, write_off_notes: e.target.value })} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="error" onClick={async () => {
          setLoading(true);
          try { await onSubmit(item.id, form); onClose(); }
          catch (err) { alert(err.message); }
          finally { setLoading(false); }
        }} disabled={loading}>Write-off</Button>
      </DialogActions>
    </Dialog>
  );
}

// ========== HISTORY DIALOG (NO MUI TIMELINE) ==========
function HistoryDialog({ open, onClose, histories }) {
  const getColor = (type) => {
    const map = {
      created: '#4caf50', assigned: '#2196f3', returned: '#9c27b0',
      moved: '#00bcd4', maintenance: '#ff9800', write_off: '#f44336',
      condition_change: '#ff5722', updated: '#757575'
    };
    return map[type] || '#757575';
  };

  const getIcon = (type) => {
    const map = {
      created: '🆕', assigned: '👤', returned: '🔄', moved: '📍',
      maintenance: '🔧', write_off: '🗑️', condition_change: '⚠️', updated: '✏️'
    };
    return map[type] || '📋';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>📋 PPE History</DialogTitle>
      <DialogContent>
        {!histories || histories.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="textSecondary">No history yet</Typography>
          </Box>
        ) : (
          <Box sx={{ position: 'relative', pl: 4 }}>
            <Box sx={{
              position: 'absolute', left: 16, top: 0, bottom: 0,
              width: 2, bgcolor: '#e0e0e0'
            }} />
            {histories.map((h, i) => (
              <Box key={h.id || i} sx={{ display: 'flex', mb: 3, position: 'relative' }}>
                <Box sx={{
                  position: 'absolute', left: -28, top: 0,
                  width: 30, height: 30, borderRadius: '50%',
                  bgcolor: getColor(h.action_type),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 13, zIndex: 1
                }}>
                  {getIcon(h.action_type)}
                </Box>
                <Box sx={{ ml: 2, flex: 1 }}>
                  <Typography variant="body2" fontWeight="bold">
                    {h.action_type?.charAt(0).toUpperCase() + h.action_type?.slice(1)}
                  </Typography>
                  <Typography variant="body2">{h.description}</Typography>
                  <Typography variant="caption" color="text.disabled">
                    {h.performed_by_name || 'System'} — {new Date(h.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
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
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, item: null });

  useEffect(() => { loadInitialData(); }, []);
  useEffect(() => { loadItems(); }, [filters, page]);

  const loadInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const [catData, empData, statsData] = await Promise.all([
        ppeService.getCategories(),
        ppeService.getEmployees(),
        ppeService.getStats()
      ]);
      setCategories(catData);
      setEmployees(empData);
      setStats(statsData);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      const params = { ...filters, page, per_page: 15 };
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
      const data = await ppeService.getItems(params);
      setItems(data?.data || data || []);
      setTotalPages(data?.last_page || 1);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshAll = async () => {
    await loadInitialData();
    await loadItems();
  };

  const showMsg = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleCreate = async (form) => { await ppeService.createItem(form); showMsg('PPE created!'); refreshAll(); };
  const handleUpdate = async (form) => { await ppeService.updateItem(formDialog.editData.id, form); showMsg('PPE updated!'); refreshAll(); };
  const handleDelete = async () => { await ppeService.deleteItem(deleteConfirm.item.id); showMsg('PPE deleted!'); setDeleteConfirm({ open: false }); refreshAll(); };
  const handleAssign = async (id, data) => { await ppeService.assignItem(id, data); showMsg('PPE assigned!'); refreshAll(); };
  const handleReturn = async (id) => { await ppeService.returnItem(id); showMsg('PPE returned!'); refreshAll(); };
  const handleMove = async (id, data) => { await ppeService.moveItem(id, data); showMsg('Location updated!'); refreshAll(); };
  const handleWriteOff = async (id, data) => { await ppeService.writeOffItem(id, data); showMsg('PPE written off!'); refreshAll(); };

  const handleViewHistory = async (id) => {
    try {
      const data = await ppeService.getHistory(id);
      setHistoryDialog({ open: true, histories: data });
    } catch (err) {
      alert('Failed to load history');
    }
  };

  const getStatusChip = (status) => {
    const s = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
    return <Chip label={s.label} color={s.color} size="small" variant="outlined" />;
  };

  const getConditionChip = (condition) => {
    const c = CONDITION_OPTIONS.find(o => o.value === condition) || CONDITION_OPTIONS[0];
    return <Chip label={c.label} color={c.color} size="small" />;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={50} />
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {[1,2,3,4].map(i => <Grid item xs={6} sm={3} key={i}><Skeleton variant="rounded" height={120} /></Grid>)}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">🛡️ PPE List</Typography>
          <Typography variant="body2" color="textSecondary">Personal Protective Equipment Management</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refreshAll}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormDialog({ open: true, editData: null })}>Add PPE</Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}><StatCard icon={<ShieldIcon sx={{ fontSize: 36 }} />} title="Total PPE" value={stats.total} color="#1976d2" /></Grid>
        <Grid item xs={6} sm={3}><StatCard icon={<CheckCircleIcon sx={{ fontSize: 36 }} />} title="Available" value={stats.available} color="#4caf50" /></Grid>
        <Grid item xs={6} sm={3}><StatCard icon={<PersonAddIcon sx={{ fontSize: 36 }} />} title="Assigned" value={stats.assigned} color="#2196f3" /></Grid>
        <Grid item xs={6} sm={3}><StatCard icon={<WarningIcon sx={{ fontSize: 36 }} />} title="Damaged/Expired" value={stats.damaged} color="#f44336" /></Grid>
      </Grid>

      <FilterBar filters={filters} setFilters={setFilters} categories={categories}
        onClear={() => setFilters({ search: '', category_id: '', status: '', condition: '', location: '' })} />

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell><strong>Item</strong></TableCell>
              <TableCell><strong>Category</strong></TableCell>
              <TableCell><strong>Location</strong></TableCell>
              <TableCell><strong>Holder</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Condition</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                <ShieldIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="textSecondary">No PPE items found</Typography>
              </TableCell></TableRow>
            ) : items.map(item => (
              <TableRow key={item.id} hover sx={{ bgcolor: item.condition === 'expired' ? '#fff3e0' : item.status === 'write_off' ? '#ffebee' : 'inherit' }}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ShieldIcon color="primary" fontSize="small" />
                    <Box>
                      <Typography variant="body2" fontWeight="bold">{item.name}</Typography>
                      <Typography variant="caption" color="textSecondary">{item.code} {item.serial_number && `| SN: ${item.serial_number}`}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell><Chip label={item.category?.name || '-'} size="small" variant="outlined" /></TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LocationOnIcon fontSize="small" color="action" />
                    <Typography variant="body2">{item.location || 'N/A'}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {item.current_holder_name ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: '#1976d2' }}>{item.current_holder_name?.charAt(0)}</Avatar>
                      <Typography variant="body2">{item.current_holder_name}</Typography>
                    </Box>
                  ) : '-'}
                </TableCell>
                <TableCell>{getStatusChip(item.status)}</TableCell>
                <TableCell>{getConditionChip(item.condition)}</TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={0.3} justifyContent="center">
                    <Tooltip title="History"><IconButton size="small" onClick={() => handleViewHistory(item.id)}><HistoryIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => setFormDialog({ open: true, editData: item })}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    {item.status === 'available' && (
                      <Tooltip title="Assign"><IconButton size="small" color="success" onClick={() => setAssignDialog({ open: true, item })}><PersonAddIcon fontSize="small" /></IconButton></Tooltip>
                    )}
                    {item.status === 'assigned' && (
                      <>
                        <Tooltip title="Return"><IconButton size="small" color="secondary" onClick={async () => { if (window.confirm('Return?')) await handleReturn(item.id); }}><KeyboardReturnIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Move"><IconButton size="small" color="info" onClick={() => setMoveDialog({ open: true, item })}><LocationOnIcon fontSize="small" /></IconButton></Tooltip>
                      </>
                    )}
                    {item.status !== 'write_off' && (
                      <Tooltip title="Write-off"><IconButton size="small" color="error" onClick={() => setWriteOffDialog({ open: true, item })}><ArchiveIcon fontSize="small" /></IconButton></Tooltip>
                    )}
                    <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteConfirm({ open: true, item })}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={totalPages} page={page} onChange={(e, v) => setPage(v)} color="primary" />
        </Box>
      )}

      <PPEFormDialog open={formDialog.open} onClose={() => setFormDialog({ open: false, editData: null })}
        onSubmit={formDialog.editData ? handleUpdate : handleCreate} categories={categories} editData={formDialog.editData} />
      <AssignDialog open={assignDialog.open} onClose={() => setAssignDialog({ open: false, item: null })}
        onSubmit={handleAssign} item={assignDialog.item} employees={employees} />
      <MoveDialog open={moveDialog.open} onClose={() => setMoveDialog({ open: false, item: null })}
        onSubmit={handleMove} item={moveDialog.item} />
      <WriteOffDialog open={writeOffDialog.open} onClose={() => setWriteOffDialog({ open: false, item: null })}
        onSubmit={handleWriteOff} item={writeOffDialog.item} />
      <HistoryDialog open={historyDialog.open} onClose={() => setHistoryDialog({ open: false, histories: [] })}
        histories={historyDialog.histories} />

      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, item: null })}>
        <DialogTitle>Delete {deleteConfirm.item?.name}?</DialogTitle>
        <DialogContent><Typography>This action cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, item: null })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}