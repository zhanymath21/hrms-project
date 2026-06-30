// src/components/PPE/MoveDialog.jsx

import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Alert } from '@mui/material';

// PASTIKAN ADA export default
export default function MoveDialog({ open, onClose, onSubmit, item }) {
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
      <DialogTitle>📍 Move Location</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Item:</strong> {item?.name}<br />
          <strong>Current:</strong> {item?.location || 'N/A'}
        </Alert>
        <TextField 
          fullWidth 
          label="New Location *" 
          value={location} 
          onChange={e => setLocation(e.target.value)} 
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