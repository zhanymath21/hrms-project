import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Chip, IconButton,
  Stack, Alert, Skeleton, Grid, Card, CardContent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import CategoryIcon from '@mui/icons-material/Category';
import ShieldIcon from '@mui/icons-material/Shield';
import CloseIcon from '@mui/icons-material/Close';
import ppeCategoryService from '../../services/ppeCategoryService';

// ========== CONSTANTS ==========
const CATEGORY_ICONS = {
  HEAD: '🪖',
  EYE: '👓',
  EAR: '🦻',
  RESP: '😷',
  HAND: '🧤',
  FOOT: '👢',
  BODY: '🦺',
  FALL: '🪢',
  HIVIS: '🚦',
};

const CATEGORY_COLORS = [
  '#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c2185b',
  '#0097a7', '#e64a19', '#5d4037', '#6a1b9a'
];

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

// ========== FORM DIALOG ==========
function CategoryFormDialog({ open, onClose, onSubmit, editData }) {
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      if (editData) {
        setForm({
          name: editData.name || '',
          code: editData.code || '',
          description: editData.description || ''
        });
      } else {
        setForm({ name: '', code: '', description: '' });
      }
      setErrors({});
    }
  }, [open, editData]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.code.trim()) errs.code = 'Code is required';
    if (form.code.trim().length < 2) errs.code = 'Min 2 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try { await onSubmit(form); onClose(); }
    catch (err) { alert(err.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {editData ? '✏️ Edit Category' : '➕ Add Category'}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth margin="normal" label="Category Name *"
          value={form.name}
          onChange={e => setForm({
            ...form,
            name: e.target.value,
            code: editData ? form.code : e.target.value.substring(0, 8).toUpperCase().replace(/\s/g, '_')
          })}
          error={!!errors.name} helperText={errors.name}
          placeholder="e.g. Head Protection"
          autoFocus
        />
        <TextField
          fullWidth margin="normal" label="Code *"
          value={form.code}
          onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
          error={!!errors.code} helperText={errors.code || 'Auto-generated, e.g. HEAD, EYE'}
          inputProps={{ maxLength: 20 }}
          placeholder="e.g. HEAD"
        />
        <TextField
          fullWidth margin="normal" label="Description"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          multiline rows={3}
          placeholder="Describe this category..."
        />
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

// ========== MAIN PAGE ==========
export default function PPECategoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState([]);
  const [formDialog, setFormDialog] = useState({ open: false, editData: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await ppeCategoryService.getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load categories');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleCreate = async (data) => {
    await ppeCategoryService.createCategory(data);
    showMsg('Category created!');
    loadCategories();
  };

  const handleUpdate = async (data) => {
    await ppeCategoryService.updateCategory(formDialog.editData.id, data);
    showMsg('Category updated!');
    setFormDialog({ open: false, editData: null });
    loadCategories();
  };

  const handleDelete = async () => {
    try {
      await ppeCategoryService.deleteCategory(deleteDialog.item.id);
      showMsg('Category deleted!');
      setDeleteDialog({ open: false, item: null });
      loadCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Cannot delete this category');
      setDeleteDialog({ open: false, item: null });
    }
  };

  const getIcon = (code) => CATEGORY_ICONS[code] || '📦';
  const getColor = (index) => CATEGORY_COLORS[index % CATEGORY_COLORS.length];

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={50} />
        <Skeleton variant="rounded" height={300} sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            📦 PPE Categories
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage Personal Protective Equipment categories
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadCategories}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormDialog({ open: true, editData: null })}>
            Add Category
          </Button>
        </Stack>
      </Box>

      {/* MESSAGES */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* STATS */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4}>
          <StatCard
            icon={<CategoryIcon sx={{ fontSize: 36 }} />}
            title="Total Categories"
            value={categories.length}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={6} sm={4}>
          <StatCard
            icon={<ShieldIcon sx={{ fontSize: 36 }} />}
            title="Active"
            value={categories.length}
            color="#388e3c"
          />
        </Grid>
        <Grid item xs={6} sm={4}>
          <StatCard
            icon={<ShieldIcon sx={{ fontSize: 36 }} />}
            title="PPE Items"
            value={categories.reduce((sum, c) => sum + (c.items_count || 0), 0)}
            color="#f57c00"
          />
        </Grid>
      </Grid>

      {/* TABLE */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell><strong>Category</strong></TableCell>
              <TableCell><strong>Code</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
              <TableCell align="center"><strong>PPE Items</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <CategoryIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="h6" color="textSecondary">No categories yet</Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => setFormDialog({ open: true, editData: null })}
                    sx={{ mt: 1 }}
                  >
                    Add First Category
                  </Button>
                </TableCell>
              </TableRow>
            ) : categories.map((cat, index) => (
              <TableRow key={cat.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                      width: 48, height: 48, borderRadius: 2,
                      bgcolor: `${getColor(index)}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24
                    }}>
                      {getIcon(cat.code)}
                    </Box>
                    <Box>
                      <Typography fontWeight="bold" variant="body1">{cat.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        Created: {new Date(cat.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={cat.code}
                    size="small"
                    sx={{ bgcolor: `${getColor(index)}20`, color: getColor(index), fontWeight: 'bold' }}
                  />
                </TableCell>
                <TableCell sx={{ maxWidth: 300 }}>
                  <Typography variant="body2" noWrap title={cat.description}>
                    {cat.description || '-'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={cat.items_count || 0}
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={0.5} justifyContent="center">
                    <IconButton
                      size="small" color="primary"
                      onClick={() => setFormDialog({ open: true, editData: cat })}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small" color="error"
                      onClick={() => setDeleteDialog({ open: true, item: cat })}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* FORM DIALOG */}
      <CategoryFormDialog
        open={formDialog.open}
        onClose={() => setFormDialog({ open: false, editData: null })}
        onSubmit={formDialog.editData ? handleUpdate : handleCreate}
        editData={formDialog.editData}
      />

      {/* DELETE CONFIRM */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, item: null })}>
        <DialogTitle sx={{ color: 'error.main' }}>
          ⚠️ Delete Category
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>"{deleteDialog.item?.name}"</strong>?
          </Typography>
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            This will affect all PPE items in this category.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, item: null })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}