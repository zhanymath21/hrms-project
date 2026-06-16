import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  Chip, IconButton, MenuItem, Stack, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import departmentService from '../../services/departmentService';

function DepartmentPage() {
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState('departments');
  const [openDialog, setOpenDialog] = useState(false);
  const [editData, setEditData] = useState(null);
  const [dialogType, setDialogType] = useState('department');
  const [form, setForm] = useState({ name: '', code: '', title: '', department_id: '', description: '' });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, name: '', type: '' });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const depts = await departmentService.getDepartments();
      const pos = await departmentService.getPositions();
      setDepartments(depts);
      setPositions(pos);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const openForm = (type, data) => {
    setDialogType(type);
    setEditData(data);
    if (type === 'department') {
      setForm({
        name: data?.name || '',
        code: data?.code || '',
        title: '',
        department_id: '',
        description: data?.description || ''
      });
    } else {
      setForm({
        name: '',
        code: '',
        title: data?.title || '',
        department_id: data?.department_id || '',
        description: data?.description || ''
      });
    }
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    try {
      if (dialogType === 'department') {
        if (editData) {
          await departmentService.updateDepartment(editData.id, form);
          showSuccess('Department updated!');
        } else {
          await departmentService.createDepartment(form);
          showSuccess('Department created!');
        }
      } else {
        if (editData) {
          await departmentService.updatePosition(editData.id, form);
          showSuccess('Position updated!');
        } else {
          await departmentService.createPosition(form);
          showSuccess('Position created!');
        }
      }
      setOpenDialog(false);
      setEditData(null);
      loadData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async () => {
    try {
      if (deleteConfirm.type === 'department') {
        await departmentService.deleteDepartment(deleteConfirm.id);
      } else {
        await departmentService.deletePosition(deleteConfirm.id);
      }
      showSuccess('Deleted!');
      setDeleteConfirm({ open: false });
      loadData();
    } catch (err) {
      alert('Cannot delete: ' + (err.response?.data?.message || err.message));
      setDeleteConfirm({ open: false });
    }
  };

  const getDeptName = (id) => departments.find(d => d.id == id)?.name || 'N/A';

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">Departments & Positions</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData}>Refresh</Button>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => openForm('position', null)}>
            Add Position
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openForm('department', null)}>
            Add Department
          </Button>
        </Stack>
      </Box>

      {/* MESSAGES */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* TABS */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button
          variant={tab === 'departments' ? 'contained' : 'outlined'}
          onClick={() => setTab('departments')}
        >
          Departments ({departments.length})
        </Button>
        <Button
          variant={tab === 'positions' ? 'contained' : 'outlined'}
          onClick={() => setTab('positions')}
        >
          Positions ({positions.length})
        </Button>
      </Box>

      {/* DEPARTMENTS TABLE */}
      {tab === 'departments' && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell>Name</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Positions</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">No departments</TableCell>
                </TableRow>
              ) : departments.map(dept => (
                <TableRow key={dept.id}>
                  <TableCell><strong>{dept.name}</strong></TableCell>
                  <TableCell><Chip label={dept.code} size="small" color="primary" /></TableCell>
                  <TableCell>{dept.description || '-'}</TableCell>
                  <TableCell>{positions.filter(p => p.department_id == dept.id).length}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => openForm('department', dept)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error"
                      onClick={() => setDeleteConfirm({ open: true, id: dept.id, name: dept.name, type: 'department' })}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* POSITIONS TABLE */}
      {tab === 'positions' && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell>Title</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {positions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">No positions</TableCell>
                </TableRow>
              ) : positions.map(pos => (
                <TableRow key={pos.id}>
                  <TableCell><strong>{pos.title}</strong></TableCell>
                  <TableCell><Chip label={getDeptName(pos.department_id)} size="small" variant="outlined" /></TableCell>
                  <TableCell>{pos.description || '-'}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => openForm('position', pos)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error"
                      onClick={() => setDeleteConfirm({ open: true, id: pos.id, name: pos.title, type: 'position' })}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* FORM DIALOG */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editData ? 'Edit' : 'Add'} {dialogType === 'department' ? 'Department' : 'Position'}
        </DialogTitle>
        <DialogContent>
          {dialogType === 'department' ? (
            <>
              <TextField fullWidth margin="normal" label="Name"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <TextField fullWidth margin="normal" label="Code"
                value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
              <TextField fullWidth margin="normal" label="Description" multiline rows={3}
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </>
          ) : (
            <>
              <TextField select fullWidth margin="normal" label="Department"
                value={form.department_id}
                onChange={e => setForm({ ...form, department_id: e.target.value })}>
                <MenuItem value="">Select</MenuItem>
                {departments.map(dept => (
                  <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
                ))}
              </TextField>
              <TextField fullWidth margin="normal" label="Title"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              <TextField fullWidth margin="normal" label="Description" multiline rows={3}
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* DELETE CONFIRM */}
      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false })}>
        <DialogTitle>Delete {deleteConfirm.name}?</DialogTitle>
        <DialogContent>
          <Typography>Are you sure? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DepartmentPage;