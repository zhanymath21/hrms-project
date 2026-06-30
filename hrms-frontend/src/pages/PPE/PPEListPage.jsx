// src/pages/PPE/PPEListPage.jsx

import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, Chip, IconButton, Stack, Alert,
  Skeleton, Tooltip, Avatar, Pagination
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
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
import FileDownloadIcon from '@mui/icons-material/FileDownload';

// Import components
import StatCard from '../../components/PPE/StatCard';
import FilterBar from '../../components/PPE/FilterBar';
import PPEFormDialog from '../../components/PPE/PPEFormDialog';
import ImportDialog from '../../components/PPE/ImportDialog';
import ExportDialog from '../../components/PPE/ExportDialog';
import AssignDialog from '../../components/PPE/AssignDialog';
import MoveDialog from '../../components/PPE/MoveDialog';
import WriteOffDialog from '../../components/PPE/WriteOffDialog';
import HistoryDialog from '../../components/PPE/HistoryDialog';
import { STATUS_OPTIONS, CONDITION_OPTIONS } from '../../constants/ppeConstants';
import ppeService from '../../services/ppeService';

export default function PPEListPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters dengan date
  const [filters, setFilters] = useState({ 
    search: '', 
    category_id: '', 
    status: '', 
    condition: '', 
    location: '',
    start_date: '',
    end_date: '',
    date_preset: ''
  });

  // Dialog states
  const [formDialog, setFormDialog] = useState({ open: false, editData: null });
  const [assignDialog, setAssignDialog] = useState({ open: false, item: null });
  const [moveDialog, setMoveDialog] = useState({ open: false, item: null });
  const [writeOffDialog, setWriteOffDialog] = useState({ open: false, item: null });
  const [historyDialog, setHistoryDialog] = useState({ open: false, histories: [] });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [importDialog, setImportDialog] = useState({ open: false, file: null, importing: false, result: null });
  const [exportDialog, setExportDialog] = useState({ open: false, filters: {}, exporting: false });

  // Load data
  useEffect(() => { 
    loadInitialData(); 
  }, []);
  
  useEffect(() => { 
    loadItems(); 
  }, [filters, page]);

  const loadInitialData = async () => {
    setLoading(true);
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
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      const params = { ...filters, page, per_page: 15 };
      // Remove empty values
      Object.keys(params).forEach(k => {
        if (!params[k] || params[k] === '') delete params[k];
      });
      const data = await ppeService.getItems(params);
      setItems(data?.data || []);
      setTotalPages(data?.last_page || 1);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshAll = async () => { 
    await loadInitialData(); 
    await loadItems(); 
  };
  
  const showMsg = (msg) => { 
    setSuccess(msg); 
    setTimeout(() => setSuccess(''), 3000); 
  };

  const handleClearFilters = () => {
    setFilters({ 
      search: '', 
      category_id: '', 
      status: '', 
      condition: '', 
      location: '',
      start_date: '',
      end_date: '',
      date_preset: ''
    });
  };

  // CRUD Handlers
  const handleCreate = async (data) => { 
    await ppeService.createItem(data); 
    showMsg('Created!'); 
    refreshAll(); 
  };
  
  const handleUpdate = async (data) => { 
    await ppeService.updateItem(formDialog.editData.id, data); 
    showMsg('Updated!'); 
    refreshAll(); 
  };
  
  const handleDelete = async () => { 
    await ppeService.deleteItem(deleteDialog.item.id); 
    showMsg('Deleted!'); 
    setDeleteDialog({ open: false }); 
    refreshAll(); 
  };
  
  const handleAssign = async (id, data) => { 
    await ppeService.assignItem(id, data); 
    showMsg('Assigned!'); 
    refreshAll(); 
  };
  
  const handleReturn = async (id) => { 
    if (window.confirm('Return this PPE?')) { 
      await ppeService.returnItem(id); 
      showMsg('Returned!'); 
      refreshAll(); 
    } 
  };
  
  const handleMove = async (id, data) => { 
    await ppeService.moveItem(id, data); 
    showMsg('Moved!'); 
    refreshAll(); 
  };
  
  const handleWriteOff = async (id, data) => { 
    await ppeService.writeOffItem(id, data); 
    showMsg('Written off!'); 
    refreshAll(); 
  };
  
  const handleViewHistory = async (id) => { 
    const data = await ppeService.getHistory(id); 
    setHistoryDialog({ open: true, histories: data || [] }); 
  };

  const handleImport = async () => {
    const { file } = importDialog;
    if (!file) return;
    setImportDialog({ ...importDialog, importing: true, result: null });
    try {
      const result = await ppeService.importPPE(file);
      setImportDialog({ ...importDialog, importing: false, result: result.data || result });
      showMsg('Import completed!');
      refreshAll();
      setTimeout(() => setImportDialog({ open: false, file: null, importing: false, result: null }), 1500);
    } catch (err) {
      setImportDialog({
        ...importDialog,
        importing: false,
        result: { status: 'error', message: err.response?.data?.message || 'Import failed', errors: err.response?.data?.errors || [] }
      });
    }
  };

  const handleExport = async (filters) => {
    setExportDialog({ ...exportDialog, exporting: true });
    try {
      const response = await ppeService.exportItems(filters);
      const blob = new Blob([response.data], { 
        type: response.headers?.['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PPE_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showMsg('Export completed!');
      setExportDialog({ open: false, filters: {}, exporting: false });
    } catch (err) {
      setError('Export failed: ' + (err.response?.data?.message || err.message));
      setExportDialog({ ...exportDialog, exporting: false });
    }
  };

  const getStatusChip = (s) => {
    const x = STATUS_OPTIONS.find(o => o.value === s) || STATUS_OPTIONS[0];
    return <Chip label={x.label} color={x.color} size="small" variant="outlined" />;
  };

  const getConditionChip = (c) => {
    const x = CONDITION_OPTIONS.find(o => o.value === c) || CONDITION_OPTIONS[0];
    return <Chip label={x.label} color={x.color} size="small" />;
  };

  if (loading) return (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="text" width={400} height={60} />
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {[1,2,3,4].map(i => (
          <Grid item xs={6} sm={3} key={i}>
            <Skeleton variant="rounded" height={120} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">🛡️ PPE List</Typography>
          <Typography variant="body2" color="textSecondary">Personal Protective Equipment Management</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refreshAll}>Refresh</Button>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={() => setExportDialog({ open: true, filters: {}, exporting: false })}>Export</Button>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setImportDialog({ open: true, file: null, importing: false, result: null })}>Import</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormDialog({ open: true, editData: null })}>Add PPE</Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}><StatCard icon={<ShieldIcon sx={{ fontSize: 36 }} />} title="Total" value={stats.total} color="#1976d2" /></Grid>
        <Grid item xs={6} sm={3}><StatCard icon={<CheckCircleIcon sx={{ fontSize: 36 }} />} title="Available" value={stats.available} color="#4caf50" /></Grid>
        <Grid item xs={6} sm={3}><StatCard icon={<PersonAddIcon sx={{ fontSize: 36 }} />} title="Assigned" value={stats.assigned} color="#2196f3" /></Grid>
        <Grid item xs={6} sm={3}><StatCard icon={<WarningIcon sx={{ fontSize: 36 }} />} title="Write-off" value={stats.write_off} color="#f44336" /></Grid>
      </Grid>

      {/* Filter Bar dengan Date Filter */}
      <FilterBar 
        filters={filters} 
        setFilters={setFilters} 
        categories={categories} 
        onClear={handleClearFilters} 
      />

      {/* Table */}
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
              <TableCell><strong>Price</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}>No items found</TableCell></TableRow>
            ) : items.map(item => (
              <TableRow key={item.id} hover sx={{ bgcolor: item.condition === 'expired' ? '#fff3e0' : item.status === 'write_off' ? '#ffebee' : 'inherit' }}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ShieldIcon color="primary" fontSize="small" />
                    <Box>
                      <Typography variant="body2" fontWeight="bold">{item.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {item.code} {item.serial_number && `| SN: ${item.serial_number}`}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell><Chip label={item.category?.name || '-'} size="small" variant="outlined" /></TableCell>
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
                        {item.current_holder_name?.charAt(0)}
                      </Avatar>
                      <Typography variant="body2">{item.current_holder_name}</Typography>
                    </Box>
                  ) : '-'}
                </TableCell>
                <TableCell>{getStatusChip(item.status)}</TableCell>
                <TableCell>{getConditionChip(item.condition)}</TableCell>
                <TableCell>{item.price ? `Rp ${Number(item.price).toLocaleString('id-ID')}` : '-'}</TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={0.3} justifyContent="center">
                    <Tooltip title="History">
                      <IconButton size="small" onClick={() => handleViewHistory(item.id)}>
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" color="primary" onClick={() => setFormDialog({ open: true, editData: item })}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {item.status === 'available' && (
                      <Tooltip title="Assign">
                        <IconButton size="small" color="success" onClick={() => setAssignDialog({ open: true, item })}>
                          <PersonAddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {item.status === 'assigned' && (
                      <>
                        <Tooltip title="Return">
                          <IconButton size="small" color="secondary" onClick={() => handleReturn(item.id)}>
                            <KeyboardReturnIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Move">
                          <IconButton size="small" color="info" onClick={() => setMoveDialog({ open: true, item })}>
                            <LocationOnIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    {item.status !== 'write_off' && (
                      <Tooltip title="Write-off">
                        <IconButton size="small" color="error" onClick={() => setWriteOffDialog({ open: true, item })}>
                          <ArchiveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, item })}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={totalPages} page={page} onChange={(e, v) => setPage(v)} color="primary" />
        </Box>
      )}

      {/* Dialogs */}
      <PPEFormDialog 
        open={formDialog.open} 
        onClose={() => setFormDialog({ open: false, editData: null })} 
        onSubmit={formDialog.editData ? handleUpdate : handleCreate} 
        categories={categories} 
        employees={employees} 
        editData={formDialog.editData} 
      />
      
      <ImportDialog 
        open={importDialog.open} 
        onClose={() => setImportDialog({ open: false, file: null, importing: false, result: null })} 
        onDownloadTemplate={ppeService.downloadTemplate} 
        onImport={handleImport} 
        importFile={importDialog.file} 
        setImportFile={(file) => setImportDialog({ ...importDialog, file })} 
        importing={importDialog.importing} 
        importResult={importDialog.result} 
      />
      
      <ExportDialog 
        open={exportDialog.open} 
        onClose={() => setExportDialog({ open: false, filters: {}, exporting: false })} 
        onExport={handleExport} 
        loading={exportDialog.exporting} 
        categories={categories} 
        filters={exportDialog.filters} 
        setFilters={(f) => setExportDialog({ ...exportDialog, filters: f })} 
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
      
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false })}>
        <DialogTitle>Delete {deleteDialog.item?.name}?</DialogTitle>
        <DialogContent><Typography>This action cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}