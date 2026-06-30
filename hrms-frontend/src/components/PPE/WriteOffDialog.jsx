// src/components/PPE/WriteOffDialog.jsx

import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, MenuItem, Alert } from '@mui/material';
import { WRITE_OFF_REASONS } from '../../constants/ppeConstants';

// PASTIKAN ADA export default
export default function WriteOffDialog({ open, onClose, onSubmit, item }) {
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
          <strong>Item:</strong> {item?.name} ({item?.code})
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