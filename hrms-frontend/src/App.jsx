// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { AuthProvider, useAuth } from './pages/contexts/AuthContext';
import { EmployeeProvider } from './pages/contexts/EmployeeContext';
import { AttendanceProvider } from './pages/contexts/AttendanceContext';
import { LeaveProvider } from './pages/contexts/LeaveContext';
import { NotificationProvider } from './pages/contexts/NotificationContext';
import ProtectedRoute from './pages/components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeList from './pages/employees/EmployeeList';
import EmployeeCreate from './pages/employees/EmployeeCreate';
import EmployeeEdit from './pages/employees/EmployeeEdit';
import EmployeeDetail from './pages/employees/EmployeeDetails';
import Attendance from './pages/attendance/Attendance';
import WorkSchedules from './pages/schedules/WorkSchedules';
import OfficeLocations from './pages/locations/OfficeLocations';
import AttendanceReport from './pages/reports/AttendanceReport';
import Leave from './pages/leave/Leave';
import DepartmentPage from './pages/Departments/DepartmentPage'; 
import TurnoverPage from './pages/Turnover/TurnoverPage';
import EmployeeAssetPage from './pages/EmployeeAssets/EmployeeAssetPage';

import MainLayout from './layouts/MainLayout';

const theme = createTheme({
  palette: {
    primary: {
      main: '#6366f1',
    },
    secondary: {
      main: '#ec4899',
    },
  },
  shape: {
    borderRadius: 12,
  },
});

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <BrowserRouter>
            <AuthProvider>
              <EmployeeProvider>
                <AttendanceProvider>
                  <LeaveProvider>
                    <NotificationProvider>
                      <AppRoutes />
                    </NotificationProvider>
                  </LeaveProvider>
                </AttendanceProvider>
              </EmployeeProvider>
            </AuthProvider>
          </BrowserRouter>
          <ToastContainer position="top-right" autoClose={3000} />
        </LocalizationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

// Separate component for routes to use hooks
function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      
      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout>
            <Navigate to="/dashboard" replace />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <MainLayout>
            <Dashboard />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/employees" element={
        <ProtectedRoute>
          <MainLayout>
            <EmployeeList />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/employees/create" element={
        <ProtectedRoute>
          <MainLayout>
            <EmployeeCreate />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/employees/:id" element={
        <ProtectedRoute>
          <MainLayout>
            <EmployeeDetail />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/employees/:id/edit" element={
        <ProtectedRoute>
          <MainLayout>
            <EmployeeEdit />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/turnover" element={
        <ProtectedRoute>
          <MainLayout>
            <TurnoverPage />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/employee-assets" element={
        <ProtectedRoute>
          <MainLayout>
            <EmployeeAssetPage />
          </MainLayout>
        </ProtectedRoute>
      } />
            
      {/* ✅ DEPARTMENTS ROUTE */}
      <Route path="/departments" element={
        <ProtectedRoute>
          <MainLayout>
            <DepartmentPage />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/attendance" element={
        <ProtectedRoute>
          <MainLayout>
            <Attendance />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/schedules" element={
        <ProtectedRoute>
          <MainLayout>
            <WorkSchedules />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/locations" element={
        <ProtectedRoute>
          <MainLayout>
            <OfficeLocations />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/attendance-report" element={
        <ProtectedRoute>
          <MainLayout>
            <AttendanceReport />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      {/* Leave Route */}
      <Route path="/leave" element={
        <ProtectedRoute>
          <MainLayout>
            <Leave />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;