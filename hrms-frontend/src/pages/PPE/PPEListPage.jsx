import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Chip, IconButton,
  MenuItem, Stack, Alert, Skeleton, Card, CardContent,
  Tooltip, Avatar, Divider, InputAdornment, FormControl, InputLabel,
  Select, Pagination
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
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
import ppeService from '../../services/ppeService';

// ============================================================
// KONSTANTA
// ============================================================

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

// ============================================================
// KOMPONEN STAT CARD
// ============================================================

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

// ============================================================
// KOMPONEN FILTER BAR
// ============================================================

function FilterBar({ filters, setFilters, categories, onClear }) {
  const count = Object.values(filters).filter(v => v !== '').length;

  return (
    <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6} md={3}>
          <TextField 
            fullWidth 
            size="small" 
            placeholder="Search name, code, holder..."
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
                  <IconButton 
                    size="small" 
                    onClick={() => setFilters({ ...filters, search: '' })}
                  >
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
            <Select 
              label="Category" 
              value={filters.category_id} 
              onChange={e => setFilters({ ...filters, category_id: e.target.value })}
            >
              <MenuItem value="">All Categories</MenuItem>
              {Array.isArray(categories) && categories.map(c => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={6} sm={4} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select 
              label="Status" 
              value={filters.status} 
              onChange={e => setFilters({ ...filters, status: e.target.value })}
            >
              <MenuItem value="">All Status</MenuItem>
              {STATUS_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={6} sm={4} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Condition</InputLabel>
            <Select 
              label="Condition" 
              value={filters.condition} 
              onChange={e => setFilters({ ...filters, condition: e.target.value })}
            >
              <MenuItem value="">All Conditions</MenuItem>
              {CONDITION_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={6} sm={4} md={2}>
          <TextField 
            fullWidth 
            size="small" 
            label="Location" 
            placeholder="Building..."
            value={filters.location} 
            onChange={e => setFilters({ ...filters, location: e.target.value })} 
          />
        </Grid>
        
        {count > 0 && (
          <Grid item xs={12} sm={4} md={1}>
            <Button 
              fullWidth 
              variant="outlined" 
              color="error" 
              size="small" 
              onClick={onClear} 
              startIcon={<ClearIcon />}
            >
              Clear
            </Button>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
}

// ============================================================
// KOMPONEN PPE FORM DIALOG
// ============================================================

function PPEFormDialog({ 
  open, 
  onClose, 
  onSubmit, 
  categories = [], 
  employees = [], 
  editData 
}) {
  const [form, setForm] = useState({
    name: '',
    code: '',
    category_id: '',
    location: '',
    status: 'available',
    condition: 'good',
    serial_number: '',
    manufacturer: '',
    model: '',
    size: '',
    color: '',
    material: '',
    expiry_date: '',
    description: '',
    current_holder_id: '',
    current_holder_name: '',
    current_holder_department: '',
    current_holder_position: '',
    expected_return_date: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (editData) {
        setForm({
          name: editData.name || '',
          code: editData.code || '',
          category_id: editData.category_id || '',
          location: editData.location || '',
          status: editData.status || 'available',
          condition: editData.condition || 'good',
          serial_number: editData.serial_number || '',
          manufacturer: editData.manufacturer || '',
          model: editData.model || '',
          size: editData.size || '',
          color: editData.color || '',
          material: editData.material || '',
          expiry_date: editData.expiry_date || '',
          description: editData.description || '',
          current_holder_id: editData.current_holder_id || '',
          current_holder_name: editData.current_holder_name || '',
          current_holder_department: editData.current_holder_department || '',
          current_holder_position: editData.current_holder_position || '',
          expected_return_date: editData.expected_return_date || '',
        });
      } else {
        setForm({
          name: '',
          code: '',
          category_id: Array.isArray(categories) && categories.length > 0 ? categories[0]?.id || '' : '',
          location: '',
          status: 'available',
          condition: 'good',
          serial_number: '',
          manufacturer: '',
          model: '',
          size: '',
          color: '',
          material: '',
          expiry_date: '',
          description: '',
          current_holder_id: '',
          current_holder_name: '',
          current_holder_department: '',
          current_holder_position: '',
          expected_return_date: '',
        });
      }
      setErrors({});
    }
  }, [open, editData, categories]);

  // Handle employee selection
  const handleEmployeeSelect = (empId) => {
    if (!empId) {
      setForm({ 
        ...form, 
        current_holder_id: '', 
        current_holder_name: '', 
        current_holder_department: '', 
        current_holder_position: '',
        status: 'available' 
      });
      return;
    }
    
    const emp = employees.find(e => e.id == empId);
    if (emp) {
      setForm({
        ...form,
        current_holder_id: emp.id,
        current_holder_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
        current_holder_department: emp.department?.name || '',
        current_holder_position: emp.position?.title || '',
        status: 'assigned',
      });
    }
  };

  // Validate form
  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (!form.code.trim()) errs.code = 'Required';
    if (!form.category_id) errs.category_id = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editData ? '✏️ Edit PPE Item' : '🆕 Add New PPE'}
        <IconButton 
          onClick={onClose} 
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          
          {/* BASIC INFO */}
          <Grid item xs={12}>
            <Divider sx={{ mb: 1 }}>
              <Chip label="Basic Information" size="small" color="primary" />
            </Divider>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField 
              fullWidth 
              label="Item Name *" 
              value={form.name}
              onChange={e => setForm({ 
                ...form, 
                name: e.target.value, 
                code: editData ? form.code : e.target.value.substring(0, 10).toUpperCase().replace(/\s/g, '-')
              })}
              error={!!errors.name} 
              helperText={errors.name} 
              autoFocus 
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField 
              fullWidth 
              label="Code *" 
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              error={!!errors.code} 
              helperText={errors.code || 'Auto-generated from name'} 
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField 
              select 
              fullWidth 
              label="Category *" 
              value={form.category_id}
              onChange={e => setForm({ ...form, category_id: e.target.value })}
              error={!!errors.category_id} 
              helperText={errors.category_id || 'Select a category'}
            >
              <MenuItem value="">-- Select Category --</MenuItem>
              {Array.isArray(categories) && categories.length > 0 ? (
                categories.map(c => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </MenuItem>
                ))
              ) : (
                <MenuItem value="" disabled>No categories available</MenuItem>
              )}
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField 
              fullWidth 
              label="Location" 
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Building A - Floor 1 - Cabinet 3" 
            />
          </Grid>

          <Grid item xs={6} sm={3}>
            <TextField 
              select 
              fullWidth 
              label="Status" 
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
            >
              {STATUS_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <TextField 
              select 
              fullWidth 
              label="Condition" 
              value={form.condition}
              onChange={e => setForm({ ...form, condition: e.target.value })}
            >
              {CONDITION_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <TextField 
              fullWidth 
              label="Serial Number" 
              value={form.serial_number}
              onChange={e => setForm({ ...form, serial_number: e.target.value })} 
            />
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <TextField 
              fullWidth 
              type="date" 
              label="Expiry Date" 
              value={form.expiry_date}
              onChange={e => setForm({ ...form, expiry_date: e.target.value })} 
              InputLabelProps={{ shrink: true }} 
            />
          </Grid>

          {/* SPECIFICATION */}
          <Grid item xs={12} sx={{ mt: 1 }}>
            <Divider sx={{ mb: 1 }}>
              <Chip label="Specification" size="small" color="info" />
            </Divider>
          </Grid>
          
          <Grid item xs={6} sm={4}>
            <TextField 
              fullWidth 
              label="Manufacturer" 
              value={form.manufacturer}
              onChange={e => setForm({ ...form, manufacturer: e.target.value })} 
            />
          </Grid>
          
          <Grid item xs={6} sm={4}>
            <TextField 
              fullWidth 
              label="Model" 
              value={form.model}
              onChange={e => setForm({ ...form, model: e.target.value })} 
            />
          </Grid>
          
          <Grid item xs={4} sm={2}>
            <TextField 
              fullWidth 
              label="Size" 
              value={form.size} 
              onChange={e => setForm({ ...form, size: e.target.value })} 
            />
          </Grid>
          
          <Grid item xs={4} sm={2}>
            <TextField 
              fullWidth 
              label="Color" 
              value={form.color} 
              onChange={e => setForm({ ...form, color: e.target.value })} 
            />
          </Grid>
          
          <Grid item xs={4} sm={2}>
            <TextField 
              fullWidth 
              label="Material" 
              value={form.material} 
              onChange={e => setForm({ ...form, material: e.target.value })} 
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField 
              fullWidth 
              label="Description" 
              multiline 
              rows={2} 
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} 
            />
          </Grid>

          {/* ASSIGN TO EMPLOYEE */}
          <Grid item xs={12} sx={{ mt: 1 }}>
            <Divider sx={{ mb: 1 }}>
              <Chip label="Assign to Employee (Optional)" size="small" color="success" />
            </Divider>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
              You can assign this PPE directly to an employee. Leave empty if stock only.
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField 
              select 
              fullWidth 
              label="Assign to Employee" 
              value={form.current_holder_id}
              onChange={e => handleEmployeeSelect(e.target.value)}
            >
              <MenuItem value="">-- Not Assigned (Stock) --</MenuItem>
              {Array.isArray(employees) && employees.map(emp => (
                <MenuItem key={emp.id} value={emp.id}>
                  {emp.first_name || ''} {emp.last_name || ''} ({emp.employee_id || ''})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField 
              fullWidth 
              label="Holder Name" 
              value={form.current_holder_name} 
              InputProps={{ readOnly: true }}
              helperText="Auto-filled when employee selected" 
            />
          </Grid>
          
          <Grid item xs={6} sm={4}>
            <TextField 
              fullWidth 
              label="Department" 
              value={form.current_holder_department} 
              InputProps={{ readOnly: true }} 
            />
          </Grid>
          
          <Grid item xs={6} sm={4}>
            <TextField 
              fullWidth 
              label="Position" 
              value={form.current_holder_position} 
              InputProps={{ readOnly: true }} 
            />
          </Grid>
          
          <Grid item xs={6} sm={4}>
            <TextField 
              fullWidth 
              type="date" 
              label="Expected Return Date" 
              value={form.expected_return_date || ''}
              onChange={e => setForm({ ...form, expected_return_date: e.target.value })}
              InputLabelProps={{ shrink: true }} 
            />
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Saving...' : editData ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// KOMPONEN ASSIGN DIALOG
// ============================================================

function AssignDialog({ open, onClose, onSubmit, item, employees = [] }) {
  const [empId, setEmpId] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && item) {
      setEmpId('');
      setLocation(item.location || '');
    }
  }, [open, item]);

  const selectedEmp = employees.find(e => e.id == empId);

  const handleSubmit = async () => {
    if (!empId) return;
    setLoading(true);
    try {
      await onSubmit(item.id, {
        current_holder_id: selectedEmp.id,
        current_holder_name: `${selectedEmp.first_name || ''} ${selectedEmp.last_name || ''}`.trim(),
        current_holder_department: selectedEmp.department?.name || '',
        current_holder_position: selectedEmp.position?.title || '',
        location: location,
      });
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>👤 Assign PPE to Employee</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Item:</strong> {item?.name || ''} ({item?.code || ''})
        </Alert>
        
        <TextField 
          select 
          fullWidth 
          margin="normal" 
          label="Employee *" 
          value={empId}
          onChange={e => setEmpId(e.target.value)}
        >
          <MenuItem value="">Select Employee</MenuItem>
          {Array.isArray(employees) && employees.map(emp => (
            <MenuItem key={emp.id} value={emp.id}>
              {emp.first_name || ''} {emp.last_name || ''} ({emp.employee_id || ''})
            </MenuItem>
          ))}
        </TextField>
        
        {selectedEmp && (
          <>
            <TextField 
              fullWidth 
              margin="normal" 
              label="Name" 
              value={`${selectedEmp.first_name || ''} ${selectedEmp.last_name || ''}`.trim()} 
              InputProps={{ readOnly: true }} 
            />
            <TextField 
              fullWidth 
              margin="normal" 
              label="Department" 
              value={selectedEmp.department?.name || ''} 
              InputProps={{ readOnly: true }} 
            />
            <TextField 
              fullWidth 
              margin="normal" 
              label="Position" 
              value={selectedEmp.position?.title || ''} 
              InputProps={{ readOnly: true }} 
            />
          </>
        )}
        
        <TextField 
          fullWidth 
          margin="normal" 
          label="Location" 
          value={location}
          onChange={e => setLocation(e.target.value)} 
          placeholder="Where will it be used?" 
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading || !empId}>
          Assign
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// KOMPONEN MOVE DIALOG
// ============================================================

function MoveDialog({ open, onClose, onSubmit, item }) {
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && item) setLocation(item.location || '');
  }, [open, item]);

  const handleSubmit = async () => {
    if (!location.trim()) return;
    setLoading(true);
    try {
      await onSubmit(item.id, { location });
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>📍 Move PPE Location</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Item:</strong> {item?.name || ''}<br />
          <strong>Current Location:</strong> {item?.location || 'N/A'}
        </Alert>
        <TextField 
          fullWidth 
          label="New Location *" 
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="e.g. Building B - Floor 2 - Storage Room" 
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          Move
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// KOMPONEN WRITE-OFF DIALOG
// ============================================================

function WriteOffDialog({ open, onClose, onSubmit, item }) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setLoading(true);
    try {
      await onSubmit(item.id, { write_off_reason: reason, write_off_notes: notes });
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>🗑️ Write-off PPE</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Item:</strong> {item?.name || ''} ({item?.code || ''})
        </Alert>
        
        <TextField 
          select 
          fullWidth 
          margin="normal" 
          label="Reason *" 
          value={reason}
          onChange={e => setReason(e.target.value)}
        >
          <MenuItem value="">Select Reason</MenuItem>
          {WRITE_OFF_REASONS.map(r => (
            <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
          ))}
        </TextField>
        
        <TextField 
          fullWidth 
          margin="normal" 
          label="Notes" 
          multiline 
          rows={3} 
          value={notes}
          onChange={e => setNotes(e.target.value)} 
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="error" onClick={handleSubmit} disabled={loading}>
          Write-off
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// KOMPONEN HISTORY DIALOG
// ============================================================

function HistoryDialog({ open, onClose, histories = [] }) {
  const getColor = (type) => {
    const map = {
      created: '#4caf50',
      updated: '#757575',
      assigned: '#2196f3',
      returned: '#9c27b0',
      moved: '#00bcd4',
      maintenance: '#ff9800',
      write_off: '#f44336',
      condition_change: '#ff5722'
    };
    return map[type] || '#757575';
  };

  const getIcon = (type) => {
    const map = {
      created: '🆕',
      assigned: '👤',
      returned: '🔄',
      moved: '📍',
      write_off: '🗑️',
      condition_change: '⚠️',
      updated: '✏️',
      maintenance: '🔧'
    };
    return map[type] || '📋';
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>📋 History Timeline</DialogTitle>
      <DialogContent>
        {!Array.isArray(histories) || histories.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="textSecondary">No history yet</Typography>
          </Box>
        ) : (
          <Box sx={{ position: 'relative', pl: 3 }}>
            {/* Vertical line */}
            <Box sx={{
              position: 'absolute',
              left: 12,
              top: 8,
              bottom: 8,
              width: 2,
              bgcolor: '#e0e0e0',
              borderRadius: 1
            }} />
            
            {histories.map((h) => (
              <Box key={h.id} sx={{ mb: 2.5, position: 'relative', pl: 3 }}>
                {/* Dot */}
                <Box sx={{
                  position: 'absolute',
                  left: -4,
                  top: 4,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  bgcolor: getColor(h.action_type),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  zIndex: 1
                }}>
                  {getIcon(h.action_type)}
                </Box>
                
                {/* Card */}
                <Paper sx={{ p: 1.5, borderRadius: 2, boxShadow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                      {h.action_type?.replace(/_/g, ' ') || ''}
                    </Typography>
                    <Chip 
                      label={h.performed_by_name || 'System'} 
                      size="small" 
                      variant="outlined"
                      sx={{ fontSize: 11, height: 20 }}
                    />
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    {h.description || ''}
                  </Typography>
                  {h.notes && (
                    <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                      Note: {h.notes}
                    </Typography>
                  )}
                  <Typography variant="caption" color="textDisabled" sx={{ display: 'block', mt: 0.5 }}>
                    {formatDate(h.created_at)}
                  </Typography>
                </Paper>
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

// ============================================================
// KOMPONEN UTAMA - PPE LIST PAGE
// ============================================================

export default function PPEListPage() {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ 
    search: '', 
    category_id: '', 
    status: '', 
    condition: '', 
    location: '' 
  });
  
  // Dialog states
  const [formDialog, setFormDialog] = useState({ open: false, editData: null });
  const [assignDialog, setAssignDialog] = useState({ open: false, item: null });
  const [moveDialog, setMoveDialog] = useState({ open: false, item: null });
  const [writeOffDialog, setWriteOffDialog] = useState({ open: false, item: null });
  const [historyDialog, setHistoryDialog] = useState({ open: false, histories: [] });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });

  // Effects
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadItems();
  }, [filters, page]);

  // Load initial data
  const loadInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const [cat, emp, st] = await Promise.all([
        ppeService.getCategories(),
        ppeService.getEmployees(),
        ppeService.getStats()
      ]);
      setCategories(cat || []);
      setEmployees(emp || []);
      setStats(st || {});
    } catch (err) {
      setError('Failed to load data: ' + (err.message || 'Unknown error'));
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load items with filters
  const loadItems = async () => {
    try {
      const params = { ...filters, page, per_page: 15 };
      Object.keys(params).forEach(k => {
        if (!params[k]) delete params[k];
      });
      const data = await ppeService.getItems(params);
      setItems(data?.data || data || []);
      setTotalPages(data?.last_page || 1);
    } catch (err) {
      console.error('Error loading items:', err);
      setItems([]);
    }
  };

  // Refresh all data
  const refreshAll = async () => {
    setLoading(true);
    await loadInitialData();
    await loadItems();
    setLoading(false);
  };

  // Show success message
  const showMsg = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  // CRUD Handlers
  const handleCreate = async (data) => {
    await ppeService.createItem(data);
    showMsg('PPE created successfully!');
    refreshAll();
  };

  const handleUpdate = async (data) => {
    await ppeService.updateItem(formDialog.editData.id, data);
    showMsg('PPE updated successfully!');
    refreshAll();
  };

  const handleDelete = async () => {
    await ppeService.deleteItem(deleteDialog.item.id);
    showMsg('PPE deleted successfully!');
    setDeleteDialog({ open: false, item: null });
    refreshAll();
  };

  const handleAssign = async (id, data) => {
    await ppeService.assignItem(id, data);
    showMsg('PPE assigned successfully!');
    refreshAll();
  };

  const handleReturn = async (id) => {
    if (window.confirm('Are you sure you want to return this PPE?')) {
      await ppeService.returnItem(id);
      showMsg('PPE returned successfully!');
      refreshAll();
    }
  };

  const handleMove = async (id, data) => {
    await ppeService.moveItem(id, data);
    showMsg('Location updated successfully!');
    refreshAll();
  };

  const handleWriteOff = async (id, data) => {
    await ppeService.writeOffItem(id, data);
    showMsg('PPE written off successfully!');
    refreshAll();
  };

  const handleViewHistory = async (id) => {
    try {
      const data = await ppeService.getHistory(id);
      setHistoryDialog({ open: true, histories: data || [] });
    } catch (err) {
      alert('Failed to load history: ' + err.message);
    }
  };

  // Helper functions
  const getStatusChip = (status) => {
    const s = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
    return <Chip label={s.label} color={s.color} size="small" variant="outlined" />;
  };

  const getConditionChip = (c) => {
    const x = CONDITION_OPTIONS.find(o => o.value === c) || CONDITION_OPTIONS[0];
    return <Chip label={x.label} color={x.color} size="small" />;
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={400} height={60} />
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={6} sm={3} key={i}>
              <Skeleton variant="rounded" height={120} />
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
          <Typography variant="h4" fontWeight="bold">🛡️ PPE List</Typography>
          <Typography variant="body2" color="textSecondary">
            Personal Protective Equipment Management
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refreshAll}>
            Refresh
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => setFormDialog({ open: true, editData: null })}
          >
            Add PPE
          </Button>
        </Stack>
      </Box>

      {/* MESSAGES */}
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
            icon={<ShieldIcon sx={{ fontSize: 36 }} />} 
            title="Total PPE" 
            value={stats.total || 0} 
            color="#1976d2" 
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard 
            icon={<CheckCircleIcon sx={{ fontSize: 36 }} />} 
            title="Available" 
            value={stats.available || 0} 
            color="#4caf50" 
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard 
            icon={<PersonAddIcon sx={{ fontSize: 36 }} />} 
            title="Assigned" 
            value={stats.assigned || 0} 
            color="#2196f3" 
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard 
            icon={<WarningIcon sx={{ fontSize: 36 }} />} 
            title="Write-off" 
            value={stats.write_off || 0} 
            color="#f44336" 
          />
        </Grid>
      </Grid>

      {/* FILTER */}
      <FilterBar 
        filters={filters} 
        setFilters={setFilters} 
        categories={categories}
        onClear={() => setFilters({ 
          search: '', 
          category_id: '', 
          status: '', 
          condition: '', 
          location: '' 
        })} 
      />

      {/* TABLE */}
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
            {!Array.isArray(items) || items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  No PPE items found
                </TableCell>
              </TableRow>
            ) : (
              items.map(item => (
                <TableRow 
                  key={item.id} 
                  hover 
                  sx={{ 
                    bgcolor: item.condition === 'expired' ? '#fff3e0' : 
                              item.status === 'write_off' ? '#ffebee' : 'inherit' 
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ShieldIcon color="primary" fontSize="small" />
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {item.name || ''}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {item.code || ''} 
                          {item.serial_number && ` | SN: ${item.serial_number}`}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={item.category?.name || '-'} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationOnIcon fontSize="small" color="action" />
                      <Typography variant="body2">{item.location || 'N/A'}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {item.current_holder_name ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: '#1976d2' }}>
                          {item.current_holder_name?.charAt(0) || ''}
                        </Avatar>
                        <Typography variant="body2">{item.current_holder_name}</Typography>
                      </Box>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{getStatusChip(item.status)}</TableCell>
                  <TableCell>{getConditionChip(item.condition)}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.3} justifyContent="center">
                      <Tooltip title="History">
                        <IconButton size="small" onClick={() => handleViewHistory(item.id)}>
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Edit">
                        <IconButton 
                          size="small" 
                          color="primary" 
                          onClick={() => setFormDialog({ open: true, editData: item })}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      {item.status === 'available' && (
                        <Tooltip title="Assign">
                          <IconButton 
                            size="small" 
                            color="success" 
                            onClick={() => setAssignDialog({ open: true, item })}
                          >
                            <PersonAddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {item.status === 'assigned' && (
                        <>
                          <Tooltip title="Return">
                            <IconButton 
                              size="small" 
                              color="secondary" 
                              onClick={() => handleReturn(item.id)}
                            >
                              <KeyboardReturnIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Move">
                            <IconButton 
                              size="small" 
                              color="info" 
                              onClick={() => setMoveDialog({ open: true, item })}
                            >
                              <LocationOnIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      
                      {item.status !== 'write_off' && (
                        <Tooltip title="Write-off">
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => setWriteOffDialog({ open: true, item })}
                          >
                            <ArchiveIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      <Tooltip title="Delete">
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => setDeleteDialog({ open: true, item })}
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

      {/* PAGINATION */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination 
            count={totalPages} 
            page={page} 
            onChange={(e, v) => setPage(v)} 
            color="primary" 
          />
        </Box>
      )}

      {/* DIALOGS */}
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

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, item: null })}>
        <DialogTitle>Delete {deleteDialog.item?.name || 'PPE'}?</DialogTitle>
        <DialogContent>
          <Typography>This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, item: null })}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}