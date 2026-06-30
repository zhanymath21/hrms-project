// src/components/PPE/AssignDialog.jsx

import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, MenuItem, Alert } from '@mui/material';

export default function AssignDialog({ open, onClose, onSubmit, item, employees = [] }) {
  const [empId, setEmpId] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const selectedEmp = employees.find(e => e.id == empId);

  useEffect(() => {
    if (open && item) {
      setEmpId('');
      setLocation(item.location || '');
    }
  }, [open, item]);

  const handleSubmit = async () => {
    if (!empId || !selectedEmp) return;
    setLoading(true);
    try {
      await onSubmit(item.id, {
        current_holder_id: selectedEmp.id,
        current_holder_name: selectedEmp.last_name || selectedEmp.first_name || '',
        current_holder_department: selectedEmp.department?.name || '',
        current_holder_position: selectedEmp.position?.title || '',
        location,
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
      <DialogTitle>👤 Assign PPE</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}><strong>Item:</strong> {item?.name} ({item?.code})</Alert>
        <TextField select fullWidth margin="normal" label="Employee *" value={empId} onChange={e => setEmpId(e.target.value)}>
          <MenuItem value="">Select Employee</MenuItem>
          {employees.map(emp => <MenuItem key={emp.id} value={emp.id}>{emp.last_name || emp.first_name}</MenuItem>)}
        </TextField>
        {selectedEmp && (
          <>
            <TextField fullWidth margin="normal" label="Name" value={selectedEmp.last_name || selectedEmp.first_name} InputProps={{ readOnly: true }} />
            <TextField fullWidth margin="normal" label="Department" value={selectedEmp.department?.name || ''} InputProps={{ readOnly: true }} />
            <TextField fullWidth margin="normal" label="Position" value={selectedEmp.position?.title || ''} InputProps={{ readOnly: true }} />
          </>
        )}
        <TextField fullWidth margin="normal" label="Location" value={location} onChange={e => setLocation(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading || !empId}>Assign</Button>
      </DialogActions>
    </Dialog>
  );
}