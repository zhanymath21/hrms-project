// src/pages/employees/EmployeeCreate.jsx
import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Visibility,
  VisibilityOff,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { useEmployee } from '../contexts/EmployeeContext';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import api from '../../services/axios';

const EmployeeCreate = () => {
  const navigate = useNavigate();
  const { addEmployee, loading } = useEmployee();
  const [activeStep, setActiveStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Data from API
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [managers, setManagers] = useState([]);
  const [offices, setOffices] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

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
    status: 'active',
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

  // Fetch departments from API
  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      if (response.data.status === 'success') {
        setDepartments(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  // Fetch positions from API
  const fetchPositions = async () => {
    try {
      const response = await api.get('/positions');
      if (response.data.status === 'success') {
        setPositions(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  // Fetch managers (employees with manager positions)
  const fetchManagers = async () => {
    try {
      const response = await api.get('/employees', {
        params: {
          status: 'active',
          per_page: 100
        }
      });
      if (response.data.status === 'success') {
        const allEmployees = response.data.data.data || [];
        // Filter employees who can be managers (has manager title or specific positions)
        const potentialManagers = allEmployees.filter(emp => 
          emp.position?.title?.toLowerCase().includes('manager') ||
          emp.position?.title?.toLowerCase().includes('head') ||
          emp.position?.title?.toLowerCase().includes('director')
        );
        setManagers(potentialManagers);
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  // Fetch offices
  const fetchOffices = async () => {
    try {
      const response = await api.get('/offices');
      if (response.data.status === 'success') {
        setOffices(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching offices:', error);
    }
  };

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      await Promise.all([
        fetchDepartments(),
        fetchPositions(),
        fetchManagers(),
        fetchOffices()
      ]);
      setLoadingData(false);
    };
    loadData();
  }, []);

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
        manager_name: `${newValue.first_name} ${newValue.last_name}`
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
          if (error.response?.data?.errors) {
            setErrors(error.response.data.errors);
          }
        }
      }
    } else {
      handleNext();
    }
  };

  if (loadingData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
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
                  getOptionLabel={(option) => option.name || option}
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
                  getOptionLabel={(option) => option.name || option}
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
                    <MenuItem value="full_time">Full Time</MenuItem>
                    <MenuItem value="part_time">Part Time</MenuItem>
                    <MenuItem value="contract">Contract</MenuItem>
                    <MenuItem value="intern">Intern</MenuItem>
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
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="suspended">Suspended</MenuItem>
                    <MenuItem value="terminated">Terminated</MenuItem>
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
                    <MenuItem value="probation">Probation</MenuItem>
                    <MenuItem value="permanent">Permanent</MenuItem>
                    <MenuItem value="contract">Contract</MenuItem>
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
          </Paper>
        )}

        {/* Step 3: Emergency Contact */}
        {activeStep === 2 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
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
          >
            {activeStep === 0 ? 'Cancel' : 'Back'}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            startIcon={activeStep === steps.length - 1 ? <SaveIcon /> : null}
          >
            {activeStep === steps.length - 1 ? 'Create Employee' : 'Next'}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default EmployeeCreate;