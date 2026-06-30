// src/components/PPE/HistoryDialog.jsx

import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Paper, Chip, Button } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';

const getColor = (t) => ({
  created: '#4caf50', updated: '#757575', assigned: '#2196f3',
  returned: '#9c27b0', moved: '#00bcd4', maintenance: '#ff9800',
  write_off: '#f44336', condition_change: '#ff5722'
}[t] || '#757575');

const getIcon = (t) => ({
  created: '🆕', assigned: '👤', returned: '🔄', moved: '📍',
  write_off: '🗑️', condition_change: '⚠️', updated: '✏️', maintenance: '🔧'
}[t] || '📋');

const fmt = (d) => d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '';

export default function HistoryDialog({ open, onClose, histories = [] }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>📋 History</DialogTitle>
      <DialogContent>
        {histories.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="textSecondary">No history yet</Typography>
          </Box>
        ) : (
          <Box sx={{ position: 'relative', pl: 3 }}>
            <Box sx={{ position: 'absolute', left: 12, top: 8, bottom: 8, width: 2, bgcolor: '#e0e0e0' }} />
            {histories.map((h) => (
              <Box key={h.id} sx={{ mb: 2.5, position: 'relative', pl: 3 }}>
                <Box sx={{
                  position: 'absolute', left: -4, top: 4, width: 28, height: 28, borderRadius: '50%',
                  bgcolor: getColor(h.action_type), display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 1
                }}>
                  {getIcon(h.action_type)}
                </Box>
                <Paper sx={{ p: 1.5, borderRadius: 2, boxShadow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                      {h.action_type?.replace(/_/g, ' ') || ''}
                    </Typography>
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