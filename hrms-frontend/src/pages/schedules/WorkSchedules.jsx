// src/pages/schedules/WorkSchedules.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  CircularProgress,
  Tooltip,
  Switch,
  FormControlLabel,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers';
import api from '../../services/axios';
import { formatTime } from '../../utils/dateFormat';

const WorkSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    start_time: null,
    end_time: null,
    break_start_time: null,
    break_end_time: null,
    break_duration_minutes: 60,
    total_working_hours: 8,
    is_overnight: false,
    description: '',
    is_active: true,
  });

  useEffect(() => {
    fetchSchedules();
    fetchEmployees();
  }, []);

  // ✅ Perbaiki endpoint: /schedules (bukan /work-schedules)
  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await api.get('/schedules');
      if (response.data.status === 'success') {
        setSchedules(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch schedules');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees?per_page=100');
      if (response.data.status === 'success') {
        setEmployees(response.data.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  // ✅ Perbaiki endpoint save
  const handleSave = async () => {
    try {
      setLoading(true);
      const data = {
        ...formData,
        start_time: formData.start_time ? formatTime(formData.start_time) : null,
        end_time: formData.end_time ? formatTime(formData.end_time) : null,
        break_start_time: formData.break_start_time ? formatTime(formData.break_start_time) : null,
        break_end_time: formData.break_end_time ? formatTime(formData.break_end_time) : null,
      };

      if (editingSchedule) {
        await api.put(`/schedules/${editingSchedule.id}`, data);
      } else {
        await api.post('/schedules', data);
      }
      
      await fetchSchedules();
      setOpenDialog(false);
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Perbaiki endpoint delete
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await api.delete(`/schedules/${id}`);
        await fetchSchedules();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete schedule');
      }
    }
  };

  // ✅ Perbaiki endpoint assign
  const handleAssign = async () => {
    try {
      setLoading(true);
      await api.post('/schedules/assign', {
        employee_ids: selectedEmployees,
        work_schedule_id: selectedSchedule.id,
        start_date: new Date().toISOString().split('T')[0],
      });
      
      setAssignDialogOpen(false);
      setSelectedEmployees([]);
      alert('Schedule assigned successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign schedule');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      start_time: null,
      end_time: null,
      break_start_time: null,
      break_end_time: null,
      break_duration_minutes: 60,
      total_working_hours: 8,
      is_overnight: false,
      description: '',
      is_active: true,
    });
    setEditingSchedule(null);
  };

  const editSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      code: schedule.code,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      break_start_time: schedule.break_start_time,
      break_end_time: schedule.break_end_time,
      break_duration_minutes: schedule.break_duration_minutes || 60,
      total_working_hours: schedule.total_working_hours,
      is_overnight: schedule.is_overnight || false,
      description: schedule.description || '',
      is_active: schedule.is_active,
    });
    setOpenDialog(true);
  };

  if (loading && schedules.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Work Schedules
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            resetForm();
            setOpenDialog(true);
          }}
        >
          Create Schedule
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Start Time</TableCell>
                <TableCell>End Time</TableCell>
                <TableCell>Break</TableCell>
                <TableCell>Total Hours</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {schedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">No work schedules found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                schedules.map((schedule) => (
                  <TableRow key={schedule.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {schedule.code}
                      </Typography>
                    </TableCell>
                    <TableCell>{schedule.name}</TableCell>
                    <TableCell>{schedule.start_time}</TableCell>
                    <TableCell>{schedule.end_time}</TableCell>
                    <TableCell>
                      {schedule.break_start_time && schedule.break_end_time ? 
                        `${schedule.break_start_time} - ${schedule.break_end_time}` : 
                        'No break'}
                    </TableCell>
                    <TableCell>{schedule.total_working_hours} hrs</TableCell>
                    <TableCell>
                      <Chip
                        label={schedule.is_active ? 'Active' : 'Inactive'}
                        color={schedule.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="Assign to Employees">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSelectedSchedule(schedule);
                              setAssignDialogOpen(true);
                            }}
                          >
                            <AssignmentIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" color="info" onClick={() => editSchedule(schedule)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDelete(schedule.id)}>
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
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingSchedule ? 'Edit Work Schedule' : 'Create New Work Schedule'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Schedule Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TimePicker
                label="Start Time"
                value={formData.start_time}
                onChange={(time) => setFormData({ ...formData, start_time: time })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TimePicker
                label="End Time"
                value={formData.end_time}
                onChange={(time) => setFormData({ ...formData, end_time: time })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TimePicker
                label="Break Start (Optional)"
                value={formData.break_start_time}
                onChange={(time) => setFormData({ ...formData, break_start_time: time })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TimePicker
                label="Break End (Optional)"
                value={formData.break_end_time}
                onChange={(time) => setFormData({ ...formData, break_end_time: time })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Break Duration (minutes)"
                value={formData.break_duration_minutes}
                onChange={(e) => setFormData({ ...formData, break_duration_minutes: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Total Working Hours"
                value={formData.total_working_hours}
                onChange={(e) => setFormData({ ...formData, total_working_hours: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_overnight}
                    onChange={(e) => setFormData({ ...formData, is_overnight: e.target.checked })}
                  />
                }
                label="Overnight Shift"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign to Employees Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Assign Schedule to Employees
          <Typography variant="body2" color="textSecondary">
            Schedule: {selectedSchedule?.name} ({selectedSchedule?.start_time} - {selectedSchedule?.end_time})
          </Typography>
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Employees</InputLabel>
            <Select
              multiple
              value={selectedEmployees}
              onChange={(e) => setSelectedEmployees(e.target.value)}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((id) => {
                    const emp = employees.find(e => e.id === id);
                    return (
                      <Chip key={id} label={emp ? `${emp.first_name} ${emp.last_name}` : id} size="small" />
                    );
                  })}
                </Box>
              )}
            >
              {employees.map((emp) => (
                <MenuItem key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} - {emp.employee_id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAssign} variant="contained" color="primary">
            Assign Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkSchedules;