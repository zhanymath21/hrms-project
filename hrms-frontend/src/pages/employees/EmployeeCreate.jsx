// src/pages/employees/EmployeeCreate.jsx
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
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Autocomplete,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Visibility,
  VisibilityOff,
  PersonAdd as PersonAddIcon,
  Business as BusinessIcon,
  Work as WorkIcon,
  People as PeopleIcon,
  LocationOn as LocationOnIcon,
} from '@mui/icons-material';
import { useEmployee } from '../contexts/EmployeeContext';
import { useNavigate } from 'react-router-dom';
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
  ],
  positions: [
    { id: 1, title: 'Software Engineer' },
    { id: 2, title: 'Senior Software Engineer' },
    { id: 3, title: 'HR Manager' },
    { id: 4, title: 'Finance Manager' },
    { id: 5, title: 'Marketing Specialist' },
  ],
  offices: [
    { id: 1, name: 'Head Office', code: 'HO', address: 'Jakarta' },
    { id: 2, name: 'Branch Office - Bandung', code: 'BO-BDG', address: 'Bandung' },
    { id: 3, name: 'Branch Office - Surabaya', code: 'BO-SBY', address: 'Surabaya' },
  ],
};

// 🔥 STATUS OPTIONS - HANYA "resigned"
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'success' },
  { value: 'inactive', label: 'Inactive', color: 'default' },
  { value: 'suspended', label: 'Suspended', color: 'warning' },
  { value: 'terminated', label: 'Terminated', color: 'error' },
  { value: 'resigned', label: 'Resigned', color: 'warning' },  // 🔥 HANYA resigned
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

const EmployeeCreate = () => {
  const navigate = useNavigate();
  const { addEmployee, loading } = useEmployee();
  const [activeStep, setActiveStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  
  // Data from API
  const [departments, setDepartments] = useState(FALLBACK_DATA.departments);
  const [positions, setPositions] = useState(FALLBACK_DATA.positions);
  const [managers, setManagers] = useState([]);
  const [offices, setOffices] = useState(FALLBACK_DATA.offices);
  const [loadingData, setLoadingData] = useState(true);
  const [usingFallback, setUsingFallback] = useState(true);

  // Form data state
  const [formData, setFormData] = useState({
    // Personal Information
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    date_of_birth: null,
    gender: '',
    national_id: '',
    address: '',
    
    // Employment Information
    hire_date: null,
    probation_end_date: null,
    department_id: '',
    department_name: '',
    position_id: '',
    position_name: '',
    default_office_id: '',
    default_office_name: '',
    employment_type: 'full_time',
    status: 'active',        // 🔥 Default active
    employment_status: 'probation',
    salary: '',
    manager_id: '',
    manager_name: '',
    
    // Emergency Contact
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    
    // Card Information
    card_number: '',
    card_type: 'RFID',
    use_card: false,
    
    // Notifications
    notification_email: true,
    notification_push: true,
    
    // Profile
    profile_photo: '',
  });

  const steps = ['Personal Information', 'Employment Details', 'Emergency Contact', 'Card & Notifications'];

  // Fetch departments
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

  // Fetch positions
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

  // Fetch managers
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

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        const results = await Promise.allSettled([
          fetchDepartments(),
          fetchPositions(),
          fetchManagers(),
        ]);
        const allFailed = results.every(r => r.status === 'rejected' || r.value === false);
        if (allFailed) {
          setUsingFallback(true);
          setDepartments(FALLBACK_DATA.departments);
          setPositions(FALLBACK_DATA.positions);
          setOffices(FALLBACK_DATA.offices);
        } else {
          setUsingFallback(false);
        }
        setOffices(FALLBACK_DATA.offices);
      } catch (error) {
        console.error('Error loading data:', error);
        setDepartments(FALLBACK_DATA.departments);
        setPositions(FALLBACK_DATA.positions);
        setOffices(FALLBACK_DATA.offices);
        setUsingFallback(true);
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, [fetchDepartments, fetchPositions, fetchManagers]);

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
        department_name: newValue.name
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        department_id: '',
        department_name: ''
      }));
    }
  };

  const handlePositionChange = (event, newValue) => {
    if (newValue) {
      setFormData(prev => ({
        ...prev,
        position_id: newValue.id,
        position_name: newValue.title
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        position_id: '',
        position_name: ''
      }));
    }
  };

  const handleManagerChange = (event, newValue) => {
    if (newValue) {
      setFormData(prev => ({
        ...prev,
        manager_id: newValue.id,
        manager_name: `${newValue.first_name || ''} ${newValue.last_name || ''}`.trim()
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        manager_id: '',
        manager_name: ''
      }));
    }
  };

  const handleOfficeChange = (event, newValue) => {
    if (newValue) {
      setFormData(prev => ({
        ...prev,
        default_office_id: newValue.id,
        default_office_name: newValue.name
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        default_office_id: '',
        default_office_name: ''
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

  const validateStep = () => {
    const newErrors = {};
    
    if (activeStep === 0) {
      if (!formData.first_name) newErrors.first_name = 'First name is required';
      if (!formData.last_name) newErrors.last_name = 'Last name is required';
      if (!formData.email) newErrors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    } else if (activeStep === 1) {
      if (!formData.hire_date) newErrors.hire_date = 'Hire date is required';
      if (!formData.department_id) newErrors.department_id = 'Department is required';
      if (!formData.position_id) newErrors.position_id = 'Position is required';
      if (!formData.employment_type) newErrors.employment_type = 'Employment type is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    
    if (activeStep === steps.length - 1) {
      if (validateStep()) {
        try {
          const submitData = {
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            password: formData.password,
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
            use_card: formData.use_card,
            notification_email: formData.notification_email,
            notification_push: formData.notification_push,
          };
          
          await addEmployee(submitData);
          navigate('/employees');
        } catch (error) {
          console.error('Error creating employee:', error);
          setSubmitError(error.response?.data?.message || error.message || 'Failed to create employee');
          if (error.response?.data?.errors) {
            setErrors(error.response.data.errors);
          }
        }
      }
    } else {
      handleNext();
    }
  };

  // Loading state
  if (loadingData) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px" gap={2}>
        <CircularProgress size={48} />
        <Typography color="textSecondary">Loading data...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3} gap={2}>
        <IconButton onClick={() => navigate('/employees')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Add New Employee
        </Typography>
      </Box>

      {usingFallback && (
        <Alert severity="info" sx={{ mb: 2 }} icon={<BusinessIcon />}>
          <Typography variant="subtitle2" fontWeight="bold">
            Using offline data
          </Typography>
          <Typography variant="body2">
            Some data couldn't be loaded from the server. Using default values.
          </Typography>
        </Alert>
      )}

      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError('')}>
          {submitError}
        </Alert>
      )}

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Personal Information */}
        {activeStep === 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
              <PersonAddIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Personal Information
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="First Name *"
                  name="first_name"
                  value={formData.first_name}
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
                  value={formData.last_name}
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
                  value={formData.email}
                  onChange={handleChange}
                  error={!!errors.email}
                  helperText={errors.email}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Password *"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  error={!!errors.password}
                  helperText={errors.password || 'Minimum 8 characters'}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={formData.phone}
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
                    value={formData.gender}
                    onChange={handleChange}
                    label="Gender"
                  >
                    <MenuItem value="">Select Gender</MenuItem>
                    <MenuItem value="male">Male</MenuItem>
                    <MenuItem value="female">Female</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="National ID"
                  name="national_id"
                  value={formData.national_id}
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
                  value={formData.address}
                  onChange={handleChange}
                  error={!!errors.address}
                  helperText={errors.address}
                />
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Step 2: Employment Details */}
        {activeStep === 1 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
              <WorkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Employment Details
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
                  getOptionLabel={(option) => option.title || ''}
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
                    value={formData.employment_type}
                    onChange={handleChange}
                    label="Employment Type *"
                    required
                  >
                    {EMPLOYMENT_TYPE_OPTIONS.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
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
                    value={formData.status}
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
                    value={formData.employment_status}
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
                  value={formData.salary}
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
                  getOptionLabel={(option) => {
                    const name = `${option.first_name || ''} ${option.last_name || ''}`.trim();
                    return name || option.employee_id || option.email || '';
                  }}
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
          </Paper>
        )}

        {/* Step 3: Emergency Contact */}
        {activeStep === 2 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
              <PeopleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Emergency Contact
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Emergency Contact Name"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
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
                  value={formData.emergency_contact_phone}
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
                  value={formData.emergency_contact_relation}
                  onChange={handleChange}
                  error={!!errors.emergency_contact_relation}
                  helperText={errors.emergency_contact_relation}
                  placeholder="e.g., Spouse, Parent, Sibling"
                />
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Step 4: Card & Notifications */}
        {activeStep === 3 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
              <LocationOnIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Card & Notification Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Card Number"
                  name="card_number"
                  value={formData.card_number}
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
                    value={formData.card_type}
                    onChange={handleChange}
                    label="Card Type"
                  >
                    <MenuItem value="RFID">RFID</MenuItem>
                    <MenuItem value="NFC">NFC</MenuItem>
                    <MenuItem value="Barcode">Barcode</MenuItem>
                    <MenuItem value="QR">QR</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                      Notifications & Access
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Switch
                              name="notification_email"
                              checked={formData.notification_email}
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
                              checked={formData.notification_push}
                              onChange={handleChange}
                              color="primary"
                            />
                          }
                          label="Push Notifications"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Switch
                              name="use_card"
                              checked={formData.use_card}
                              onChange={handleChange}
                              color="primary"
                            />
                          }
                          label="Use Card for Access"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={activeStep === 0 ? () => navigate('/employees') : handleBack}
            disabled={loading}
          >
            {activeStep === 0 ? 'Cancel' : 'Back'}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            startIcon={activeStep === steps.length - 1 ? <SaveIcon /> : null}
          >
            {loading ? 'Saving...' : activeStep === steps.length - 1 ? 'Create Employee' : 'Next'}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default EmployeeCreate;