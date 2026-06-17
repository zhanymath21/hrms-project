// src/pages/employees/EmployeeEdit.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Switch,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Autocomplete,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useEmployee } from '../contexts/EmployeeContext';
import { useNavigate, useParams } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import api from '../../services/axios';

// 🔥 FALLBACK DATA
const FALLBACK_DATA = {
  departments: [
    { id: 1, name: 'Engineering', code: 'ENG' },
    { id: 2, name: 'Human Resources', code: 'HR' },
    { id: 3, name: 'Finance', code: 'FIN' },
    { id: 4, name: 'Marketing', code: 'MKT' },
    { id: 5, name: 'Operations', code: 'OPS' },
    { id: 6, name: 'Sales', code: 'SALES' },
    { id: 7, name: 'Information Technology', code: 'IT' },
    { id: 8, name: 'Legal', code: 'LEGAL' },
  ],
  positions: [
    { id: 1, title: 'Software Engineer' },
    { id: 2, title: 'Senior Software Engineer' },
    { id: 3, title: 'HR Manager' },
    { id: 4, title: 'Finance Manager' },
    { id: 5, title: 'Marketing Specialist' },
    { id: 6, title: 'Operations Manager' },
    { id: 7, title: 'Sales Executive' },
    { id: 8, title: 'System Administrator' },
    { id: 9, title: 'Legal Counsel' },
    { id: 10, title: 'Product Manager' },
  ],
  offices: [
    { id: 1, name: 'Head Office', code: 'HO', address: 'Jakarta' },
    { id: 2, name: 'Branch Office - Bandung', code: 'BO-BDG', address: 'Bandung' },
    { id: 3, name: 'Branch Office - Surabaya', code: 'BO-SBY', address: 'Surabaya' },
    { id: 4, name: 'Branch Office - Medan', code: 'BO-MDN', address: 'Medan' },
    { id: 5, name: 'Branch Office - Makassar', code: 'BO-MKS', address: 'Makassar' },
  ],
};

// 🔥 STATUS OPTIONS - HANYA "resigned"
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'success' },
  { value: 'inactive', label: 'Inactive', color: 'default' },
  { value: 'suspended', label: 'Suspended', color: 'warning' },
  { value: 'terminated', label: 'Terminated', color: 'error' },
  { value: 'resigned', label: 'Resigned', color: 'warning' },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
];

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'probation', label: 'Probation' },
  { value: 'permanent', label: 'Permanent' },
  { value: 'contract', label: 'Contract' },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const CARD_TYPE_OPTIONS = [
  { value: 'RFID', label: 'RFID' },
  { value: 'NFC', label: 'NFC' },
  { value: 'Barcode', label: 'Barcode' },
  { value: 'QR', label: 'QR' },
];

const EmployeeEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { updateEmployee, loading } = useEmployee();
  const [formData, setFormData] = useState(null);
  const [error, setError] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState({});
  
  // Data from API - dengan fallback
  const [departments, setDepartments] = useState(FALLBACK_DATA.departments);
  const [positions, setPositions] = useState(FALLBACK_DATA.positions);
  const [managers, setManagers] = useState([]);
  const [offices, setOffices] = useState(FALLBACK_DATA.offices);
  const [loadingData, setLoadingData] = useState(true);
  const [usingFallback, setUsingFallback] = useState(true);

  // 🔥 PERBAIKAN: Fetch departments saja (tanpa offices)
  const fetchDepartments = useCallback(async () => {
    try {
      const response = await api.get('/departments');
      let deptData = [];
      if (response.data?.status === 'success' && Array.isArray(response.data.data)) {
        deptData = response.data.data;
      } else if (Array.isArray(response.data)) {
        deptData = response.data;
      }
      if (deptData.length > 0) {
        setDepartments(deptData);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Error fetching departments, using fallback:', error.message);
      return false;
    }
  }, []);

  // 🔥 PERBAIKAN: Fetch positions saja
  const fetchPositions = useCallback(async () => {
    try {
      const response = await api.get('/positions');
      let posData = [];
      if (response.data?.status === 'success' && Array.isArray(response.data.data)) {
        posData = response.data.data;
      } else if (Array.isArray(response.data)) {
        posData = response.data;
      }
      if (posData.length > 0) {
        setPositions(posData);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Error fetching positions, using fallback:', error.message);
      return false;
    }
  }, []);

  // 🔥 PERBAIKAN: Fetch managers (tanpa offices)
  const fetchManagers = useCallback(async () => {
    try {
      const response = await api.get('/employees', {
        params: { status: 'active', per_page: 100 }
      });
      let empData = [];
      if (response.data?.status === 'success' && response.data.data?.data) {
        empData = response.data.data.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        empData = response.data.data;
      }
      const potentialManagers = empData.filter(emp => 
        emp.position?.title?.toLowerCase().includes('manager') ||
        emp.position?.title?.toLowerCase().includes('head') ||
        emp.position?.title?.toLowerCase().includes('director')
      );
      setManagers(potentialManagers.length > 0 ? potentialManagers : empData.slice(0, 5));
      return true;
    } catch (error) {
      console.warn('Error fetching managers:', error.message);
      return false;
    }
  }, []);

  // 🔥 PERBAIKAN: Fetch employee data
  const fetchEmployee = useCallback(async () => {
    try {
      setFetching(true);
      const response = await api.get(`/employees/${id}`);
      
      if (response.data?.status === 'success') {
        const employeeData = response.data.data;
        setFormData({
          ...employeeData,
          date_of_birth: employeeData.date_of_birth ? new Date(employeeData.date_of_birth) : null,
          hire_date: employeeData.hire_date ? new Date(employeeData.hire_date) : null,
          probation_end_date: employeeData.probation_end_date ? new Date(employeeData.probation_end_date) : null,
        });
        return true;
      } else {
        setError('Employee not found');
        return false;
      }
    } catch (err) {
      console.error('Error fetching employee:', err);
      setError(err.message || 'Failed to fetch employee');
      return false;
    } finally {
      setFetching(false);
    }
  }, [id]);

  // 🔥 PERBAIKAN: Load data - TANPA fetchOffices
  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      setError(null);
      
      try {
        // Fetch employee first
        const employeeLoaded = await fetchEmployee();
        
        if (!employeeLoaded) {
          setLoadingData(false);
          return;
        }

        // Fetch other data
        const results = await Promise.allSettled([
          fetchDepartments(),
          fetchPositions(),
          fetchManagers(),
        ]);

        // Check if all failed
        const allFailed = results.every(r => r.status === 'rejected' || r.value === false);
        
        if (allFailed) {
          setUsingFallback(true);
          setDepartments(FALLBACK_DATA.departments);
          setPositions(FALLBACK_DATA.positions);
          setOffices(FALLBACK_DATA.offices);
        } else {
          setUsingFallback(false);
        }
        
        // 🔥 Offices always use fallback (endpoint not available)
        setOffices(FALLBACK_DATA.offices);
        
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data. Please try again.');
        // Set fallback data
        setDepartments(FALLBACK_DATA.departments);
        setPositions(FALLBACK_DATA.positions);
        setOffices(FALLBACK_DATA.offices);
        setUsingFallback(true);
      } finally {
        setLoadingData(false);
      }
    };
    
    loadData();
  }, [fetchEmployee, fetchDepartments, fetchPositions, fetchManagers]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleDepartmentChange = (event, newValue) => {
    if (newValue) {
      setFormData(prev => ({
        ...prev,
        department_id: newValue.id,
        department: newValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        department_id: '',
        department: null
      }));
    }
  };

  const handlePositionChange = (event, newValue) => {
    if (newValue) {
      setFormData(prev => ({
        ...prev,
        position_id: newValue.id,
        position: newValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        position_id: '',
        position: null
      }));
    }
  };

  const handleManagerChange = (event, newValue) => {
    if (newValue) {
      setFormData(prev => ({
        ...prev,
        manager_id: newValue.id,
        manager: newValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        manager_id: '',
        manager: null
      }));
    }
  };

  const handleOfficeChange = (event, newValue) => {
    if (newValue) {
      setFormData(prev => ({
        ...prev,
        default_office_id: newValue.id,
        default_office: newValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        default_office_id: '',
        default_office: null
      }));
    }
  };

  const handleDateChange = (name, date) => {
    setFormData(prev => ({
      ...prev,
      [name]: date
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    try {
      const submitData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth ? format(formData.date_of_birth, 'yyyy-MM-dd') : null,
        gender: formData.gender,
        national_id: formData.national_id,
        address: formData.address,
        hire_date: formData.hire_date ? format(formData.hire_date, 'yyyy-MM-dd') : null,
        probation_end_date: formData.probation_end_date ? format(formData.probation_end_date, 'yyyy-MM-dd') : null,
        department_id: formData.department_id,
        position_id: formData.position_id,
        default_office_id: formData.default_office_id || null,
        employment_type: formData.employment_type,
        status: formData.status,
        employment_status: formData.employment_status,
        salary: formData.salary ? parseFloat(formData.salary) : null,
        manager_id: formData.manager_id || null,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        emergency_contact_relation: formData.emergency_contact_relation,
        card_number: formData.card_number,
        card_type: formData.card_type,
        use_card: formData.use_card || false,
        notification_email: formData.notification_email !== undefined ? formData.notification_email : true,
        notification_push: formData.notification_push !== undefined ? formData.notification_push : true,
      };
      
      await updateEmployee(id, submitData);
      navigate(`/employees/${id}`);
    } catch (err) {
      console.error('Error updating employee:', err);
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setError(err.message || 'Failed to update employee');
      }
    }
  };

  // Loading state
  if (fetching || loadingData) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px" gap={2}>
        <CircularProgress size={48} />
        <Typography color="textSecondary">Loading employee data...</Typography>
      </Box>
    );
  }

  // Error state
  if (error || !formData) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Employee not found'}
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/employees')}
        >
          Back to Employees
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3} gap={2}>
        <IconButton onClick={() => navigate(`/employees/${id}`)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Edit Employee: {formData.first_name} {formData.last_name}
        </Typography>
      </Box>

      {/* 🔥 Tampilkan warning jika menggunakan fallback */}
      {usingFallback && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            Using offline data
          </Typography>
          <Typography variant="body2">
            Some data couldn't be loaded from the server. Using default values for departments, positions, and offices.
          </Typography>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
            Personal Information
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="First Name *"
                name="first_name"
                value={formData.first_name || ''}
                onChange={handleChange}
                error={!!errors.first_name}
                helperText={errors.first_name}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Name *"
                name="last_name"
                value={formData.last_name || ''}
                onChange={handleChange}
                error={!!errors.last_name}
                helperText={errors.last_name}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email *"
                name="email"
                type="email"
                value={formData.email || ''}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
                error={!!errors.phone}
                helperText={errors.phone}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Date of Birth"
                value={formData.date_of_birth}
                onChange={(date) => handleDateChange('date_of_birth', date)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.date_of_birth,
                    helperText: errors.date_of_birth,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Gender</InputLabel>
                <Select
                  name="gender"
                  value={formData.gender || ''}
                  onChange={handleChange}
                  label="Gender"
                >
                  <MenuItem value="">Select Gender</MenuItem>
                  {GENDER_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="National ID"
                name="national_id"
                value={formData.national_id || ''}
                onChange={handleChange}
                error={!!errors.national_id}
                helperText={errors.national_id}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                multiline
                rows={3}
                value={formData.address || ''}
                onChange={handleChange}
                error={!!errors.address}
                helperText={errors.address}
              />
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom fontWeight="bold" color="primary" sx={{ mt: 4 }}>
            Employment Information
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Hire Date *"
                value={formData.hire_date}
                onChange={(date) => handleDateChange('hire_date', date)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: !!errors.hire_date,
                    helperText: errors.hire_date,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Probation End Date"
                value={formData.probation_end_date}
                onChange={(date) => handleDateChange('probation_end_date', date)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.probation_end_date,
                    helperText: errors.probation_end_date,
                  },
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={departments}
                getOptionLabel={(option) => option.name || ''}
                value={departments.find(d => d.id === formData.department_id) || null}
                onChange={handleDepartmentChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Department *"
                    error={!!errors.department_id}
                    helperText={errors.department_id}
                    required
                  />
                )}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={positions}
                getOptionLabel={(option) => `${option.title} (${option.code || ''})`}
                value={positions.find(p => p.id === formData.position_id) || null}
                onChange={handlePositionChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Position *"
                    error={!!errors.position_id}
                    helperText={errors.position_id}
                    required
                  />
                )}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={offices}
                getOptionLabel={(option) => option.name || ''}
                value={offices.find(o => o.id === formData.default_office_id) || null}
                onChange={handleOfficeChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Default Office"
                    error={!!errors.default_office_id}
                    helperText={errors.default_office_id}
                  />
                )}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Employment Type *</InputLabel>
                <Select
                  name="employment_type"
                  value={formData.employment_type || 'full_time'}
                  onChange={handleChange}
                  label="Employment Type *"
                  required
                >
                  {EMPLOYMENT_TYPE_OPTIONS.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status || 'active'}
                  onChange={handleChange}
                  label="Status"
                >
                  {STATUS_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Employment Status</InputLabel>
                <Select
                  name="employment_status"
                  value={formData.employment_status || 'probation'}
                  onChange={handleChange}
                  label="Employment Status"
                >
                  {EMPLOYMENT_STATUS_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Salary"
                name="salary"
                type="number"
                value={formData.salary || ''}
                onChange={handleChange}
                error={!!errors.salary}
                helperText={errors.salary}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={managers}
                getOptionLabel={(option) => `${option.first_name} ${option.last_name} (${option.employee_id})`}
                value={managers.find(m => m.id === formData.manager_id) || null}
                onChange={handleManagerChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Manager"
                    error={!!errors.manager_id}
                    helperText={errors.manager_id}
                  />
                )}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
              />
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom fontWeight="bold" color="primary" sx={{ mt: 4 }}>
            Emergency Contact
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Emergency Contact Name"
                name="emergency_contact_name"
                value={formData.emergency_contact_name || ''}
                onChange={handleChange}
                error={!!errors.emergency_contact_name}
                helperText={errors.emergency_contact_name}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Emergency Contact Phone"
                name="emergency_contact_phone"
                value={formData.emergency_contact_phone || ''}
                onChange={handleChange}
                error={!!errors.emergency_contact_phone}
                helperText={errors.emergency_contact_phone}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Relationship"
                name="emergency_contact_relation"
                value={formData.emergency_contact_relation || ''}
                onChange={handleChange}
                error={!!errors.emergency_contact_relation}
                helperText={errors.emergency_contact_relation}
                placeholder="e.g., Spouse, Parent, Sibling"
              />
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom fontWeight="bold" color="primary" sx={{ mt: 4 }}>
            Card & Notifications
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Card Number"
                name="card_number"
                value={formData.card_number || ''}
                onChange={handleChange}
                error={!!errors.card_number}
                helperText={errors.card_number || "Leave empty for auto-generation"}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Card Type</InputLabel>
                <Select
                  name="card_type"
                  value={formData.card_type || 'RFID'}
                  onChange={handleChange}
                  label="Card Type"
                >
                  {CARD_TYPE_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="use_card"
                    checked={formData.use_card || false}
                    onChange={handleChange}
                    color="primary"
                  />
                }
                label="Use Card for Access"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="notification_email"
                    checked={formData.notification_email !== undefined ? formData.notification_email : true}
                    onChange={handleChange}
                    color="primary"
                  />
                }
                label="Email Notifications"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="notification_push"
                    checked={formData.notification_push !== undefined ? formData.notification_push : true}
                    onChange={handleChange}
                    color="primary"
                  />
                }
                label="Push Notifications"
              />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
            <Button
              variant="outlined"
              onClick={() => navigate(`/employees/${id}`)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Paper>
      </form>
    </Box>
  );
};

export default EmployeeEdit;