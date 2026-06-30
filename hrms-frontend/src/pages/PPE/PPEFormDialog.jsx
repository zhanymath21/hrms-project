// src/components/PPEFormDialog.jsx

import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Grid, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Chip, IconButton,
  MenuItem, Stack, Alert, Divider, FormControl, InputLabel,
  Select
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Constants
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

export default function PPEFormDialog({ 
  open, 
  onClose, 
  onSubmit, 
  categories = [], 
  employees = [], 
  editData = null,
  title = 'Add New PPE'
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
    price: '', // Tambahkan field price
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
          price: editData.price || '',
        });
      } else {
        setForm({
          name: '', 
          code: '', 
          category_id: categories[0]?.id || '', 
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
          price: '',
        });
      }
      setErrors({});
    }
  }, [open, editData, categories]);

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
    if (form.price && isNaN(form.price)) errs.price = 'Must be a number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try { 
      // Convert price to number if exists
      const submitData = { ...form };
      if (submitData.price) {
        submitData.price = parseFloat(submitData.price);
      }
      await onSubmit(submitData); 
      onClose(); 
    }
    catch (err) { 
      alert(err.response?.data?.message || err.message); 
    }
    finally { 
      setLoading(false); 
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editData ? '✏️ Edit PPE Item' : '🆕 Add New PPE'}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {/* Basic Information */}
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
              helperText={errors.code || 'Auto-generated'} 
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
              helperText={errors.category_id || 'Select category'}
            >
              <MenuItem value="">-- Select --</MenuItem>
              {(categories || []).map(c => (
                <MenuItem key={c.id} value={c.id}>{c.name} ({c.code})</MenuItem>
              ))}
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField 
              fullWidth 
              label="Location" 
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })} 
              placeholder="e.g. Building A - Floor 1" 
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

          {/* Price Field - TAMBAHKAN INI */}
          <Grid item xs={6} sm={3}>
            <TextField 
              fullWidth 
              label="Price (IDR)" 
              type="number"
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
              error={!!errors.price}
              helperText={errors.price || 'Optional'}
              InputProps={{
                startAdornment: <InputAdornment position="start">Rp</InputAdornment>,
              }}
            />
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <TextField 
              fullWidth 
              label="Serial Number" 
              value={form.serial_number} 
              onChange={e => setForm({ ...form, serial_number: e.target.value })} 
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField 
              fullWidth 
              type="date" 
              label="Expiry Date" 
              value={form.expiry_date} 
              onChange={e => setForm({ ...form, expiry_date: e.target.value })} 
              InputLabelProps={{ shrink: true }} 
            />
          </Grid>

          {/* Specification */}
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

          {/* Assign to Employee */}
          <Grid item xs={12} sx={{ mt: 1 }}>
            <Divider sx={{ mb: 1 }}>
              <Chip label="Assign to Employee (Optional)" size="small" color="success" />
            </Divider>
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
              {(employees || []).map(emp => (
                <MenuItem key={emp.id} value={emp.id}>
                  {emp.last_name || emp.first_name || ''} ({emp.employee_id || ''})
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
              helperText="Auto-filled" 
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
        <Button 
          variant="contained" 
          onClick={handleSubmit} 
          disabled={loading}
        >
          {loading ? 'Saving...' : editData ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}