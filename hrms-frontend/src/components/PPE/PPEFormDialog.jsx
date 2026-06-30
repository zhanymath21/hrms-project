// src/components/PPE/PPEFormDialog.jsx

import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Grid, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Chip, IconButton, MenuItem, Divider, InputAdornment
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { STATUS_OPTIONS, CONDITION_OPTIONS } from '../../constants/ppeConstants';

const INITIAL_FORM = {
  name: '', code: '', category_id: '', location: '', status: 'available', condition: 'good',
  serial_number: '', manufacturer: '', model: '', size: '', color: '', material: '',
  expiry_date: '', description: '', price: '',
  current_holder_id: '', current_holder_name: '', current_holder_department: '',
  current_holder_position: '', expected_return_date: '',
};

export default function PPEFormDialog({ open, onClose, onSubmit, categories = [], employees = [], editData = null }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(editData ? { ...INITIAL_FORM, ...editData } : { ...INITIAL_FORM, category_id: categories[0]?.id || '' });
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
    if (form.price && isNaN(form.price)) errs.price = 'Must be a number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = { ...form };
      if (data.price) data.price = parseFloat(data.price);
      await onSubmit(data);
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
        {editData ? '✏️ Edit PPE' : '🆕 Add PPE'}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}><Divider><Chip label="Basic Info" size="small" color="primary" /></Divider></Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Name *" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value, code: editData ? form.code : e.target.value.substring(0, 10).toUpperCase().replace(/\s/g, '-') })}
              error={!!errors.name} helperText={errors.name} autoFocus />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Code *" value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              error={!!errors.code} helperText={errors.code} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth label="Category *" value={form.category_id}
              onChange={e => setForm({ ...form, category_id: e.target.value })} error={!!errors.category_id} helperText={errors.category_id}>
              <MenuItem value="">Select</MenuItem>
              {(categories || []).map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Location" value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })} />
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
          <Grid item xs={6} sm={3}>
            <TextField fullWidth label="Price" type="number" value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
              error={!!errors.price} helperText={errors.price || 'Optional'}
              InputProps={{ startAdornment: <InputAdornment position="start">Rp</InputAdornment> }} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField fullWidth label="Serial Number" value={form.serial_number}
              onChange={e => setForm({ ...form, serial_number: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="date" label="Expiry Date" value={form.expiry_date}
              onChange={e => setForm({ ...form, expiry_date: e.target.value })} InputLabelProps={{ shrink: true }} />
          </Grid>

          <Grid item xs={12}><Divider><Chip label="Specification" size="small" color="info" /></Divider></Grid>
          <Grid item xs={6} sm={4}><TextField fullWidth label="Manufacturer" value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} /></Grid>
          <Grid item xs={6} sm={4}><TextField fullWidth label="Model" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} /></Grid>
          <Grid item xs={4} sm={2}><TextField fullWidth label="Size" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} /></Grid>
          <Grid item xs={4} sm={2}><TextField fullWidth label="Color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} /></Grid>
          <Grid item xs={4} sm={2}><TextField fullWidth label="Material" value={form.material} onChange={e => setForm({ ...form, material: e.target.value })} /></Grid>
          <Grid item xs={12}><TextField fullWidth label="Description" multiline rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Grid>

          <Grid item xs={12}><Divider><Chip label="Assign Employee" size="small" color="success" /></Divider></Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth label="Employee" value={form.current_holder_id} onChange={e => handleEmployeeSelect(e.target.value)}>
              <MenuItem value="">Not Assigned</MenuItem>
              {(employees || []).map(emp => <MenuItem key={emp.id} value={emp.id}>{emp.last_name || emp.first_name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Holder Name" value={form.current_holder_name} InputProps={{ readOnly: true }} /></Grid>
          <Grid item xs={6} sm={4}><TextField fullWidth label="Department" value={form.current_holder_department} InputProps={{ readOnly: true }} /></Grid>
          <Grid item xs={6} sm={4}><TextField fullWidth label="Position" value={form.current_holder_position} InputProps={{ readOnly: true }} /></Grid>
          <Grid item xs={6} sm={4}><TextField fullWidth type="date" label="Return Date" value={form.expected_return_date} onChange={e => setForm({ ...form, expected_return_date: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
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