// src/App.jsx

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// ============ CONTEXTS ============
import { AuthProvider, useAuth } from './pages/contexts/AuthContext';
import { EmployeeProvider } from './pages/contexts/EmployeeContext';
import { AttendanceProvider } from './pages/contexts/AttendanceContext';
import { NotificationProvider } from './pages/contexts/NotificationContext';
import { LeaveProvider } from './contexts/LeaveContext';
import ProtectedRoute from './pages/components/ProtectedRoute';

// ============ LAYOUT ============
import MainLayout from './layouts/MainLayout';

// ============ AUTH PAGES ============
import Login from './pages/Login';

// ============ DASHBOARD ============
import Dashboard from './pages/Dashboard';

// ============ EMPLOYEE PAGES ============
import EmployeeList from './pages/employees/EmployeeList';
import EmployeeCreate from './pages/employees/EmployeeCreate';
import EmployeeEdit from './pages/employees/EmployeeEdit';
import EmployeeDetail from './pages/employees/EmployeeDetails';

// ============ LEAVE PAGES ============
import LeaveDashboard from './pages/leaves/LeaveDashboard';
import LeaveList from './pages/leaves/LeaveList';
import LeaveCreate from './pages/leaves/LeaveCreate';
import LeaveBalance from './pages/leaves/LeaveBalance';
import LeaveApproval from './pages/leaves/LeaveApproval';
import LeaveDetail from './pages/leaves/LeaveDetail';
import AllLeaveBalances from './pages/leaves/AllLeaveBalances';
import ApprovalFlowList from './pages/leaves/ApprovalFlowList';
import ManageNewEmployees from './pages/leaves/ManageNewEmployees';

// ============ REPLACEMENT LEAVE PAGES ============
import ReplacementList from './pages/leaves/ReplacementList';
import ReplacementApproval from './pages/leaves/ReplacementApproval';
import ReplacementCreate from './pages/leaves/ReplacementLeave';

// ============ ATTENDANCE PAGES ============
import Attendance from './pages/attendance/Attendance';
import WorkSchedules from './pages/schedules/WorkSchedules';
import OfficeLocations from './pages/locations/OfficeLocations';
import AttendanceReport from './pages/reports/AttendanceReport';

// ============ DEPARTMENT PAGES ============
import DepartmentPage from './pages/Departments/DepartmentPage';
import TurnoverPage from './pages/Turnover/TurnoverPage';
import EmployeeAssetPage from './pages/EmployeeAssets/EmployeeAssetPage';

// ============ PPE PAGES ============
import PPEListPage from './pages/PPE/PPEListPage';
import PPECategoryPage from './pages/PPE/PPECategoryPage';

// ============ RECRUITMENT PAGES ============
import CandidateList from './pages/recruitment/CandidateList';
import CandidateForm from './pages/recruitment/CandidateForm';
import CandidateCVList from './pages/recruitment/CandidateCVList';
import CandidateDetail from './pages/recruitment/CandidateDetail';
import VacancyList from './pages/recruitment/VacancyList';
import VacancyForm from './pages/recruitment/VacancyForm';
import ApplicationList from './pages/recruitment/ApplicationList';
import ApplicationCreate from './pages/recruitment/ApplicationCreate';
import ApplicationDetail from './pages/recruitment/ApplicationDetail';
import OnboardingList from './pages/recruitment/OnboardingList';

// ============ INCIDENT PAGES ============
import IncidentList from './pages/incidents/IncidentList';
import IncidentCreate from './pages/incidents/IncidentCreate';
import IncidentDetail from './pages/incidents/IncidentDetail';
import IncidentEdit from './pages/incidents/IncidentEdit';

// ============ SAFETY PAGES ============
import LostTimeInjuryList from './pages/safety/LostTimeInjuryList';
import LostTimeInjuryCreate from './pages/safety/LostTimeInjuryCreate';
import LostTimeInjuryDetail from './pages/safety/LostTimeInjuryDetail';
import LostTimeInjuryEdit from './pages/safety/LostTimeInjuryEdit';

// ============ PAYROLL PAGES ============
import PayrollList from './pages/payroll/PayrollList';
import PayrollCreate from './pages/payroll/PayrollCreate';
import PayrollDetail from './pages/payroll/PayrollDetail';
import PayrollEdit from './pages/payroll/PayrollEdit';
import EmployeeSalarySettings from './pages/payroll/EmployeeSalarySettings';
import TaxSettings from './pages/payroll/TaxSettings';
import PayslipList from './pages/payroll/PayslipList';
import ExchangeRateSettings from './pages/payroll/ExchangeRateSettings';

// ============ THEME ============
const theme = createTheme({
  palette: {
    primary: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ec4899',
      light: '#f472b6',
      dark: '#db2777',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    },
    error: { main: '#ef4444' },
    warning: { main: '#f59e0b' },
    info: { main: '#3b82f6' },
    success: { main: '#10b981' },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            fontWeight: 600,
            backgroundColor: '#f8fafc',
          },
        },
      },
    },
  },
});

// ============ ERROR BOUNDARY ============
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ ERROR:', error);
    console.error('📚 STACK:', error?.stack);
    console.error('ℹ️ INFO:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <h2 style={{ color: '#ef4444', marginBottom: 16 }}>⚠️ Something went wrong</h2>
          <p style={{ color: '#64748b', maxWidth: 500 }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 20,
              padding: '10px 24px',
              backgroundColor: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// APP - WITH LeaveProvider AT THE TOP
// ==========================================
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <BrowserRouter>
            {/* ✅ LeaveProvider wraps EVERYTHING */}
            <LeaveProvider>
              <AuthProvider>
                <EmployeeProvider>
                  <AttendanceProvider>
                    <NotificationProvider>
                      <AppRoutes />
                    </NotificationProvider>
                  </AttendanceProvider>
                </EmployeeProvider>
              </AuthProvider>
            </LeaveProvider>
          </BrowserRouter>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </LocalizationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

// ==========================================
// ROUTES
// ==========================================
function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

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

      {/* EMPLOYEE ROUTES */}
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

      {/* LEAVE ROUTES */}
      <Route path="/leaves" element={
        <ProtectedRoute>
          <MainLayout>
            <LeaveDashboard />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/leaves/list" element={
        <ProtectedRoute>
          <MainLayout>
            <LeaveList />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/leaves/create" element={
        <ProtectedRoute>
          <MainLayout>
            <LeaveCreate />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/leaves/balance" element={
        <ProtectedRoute>
          <MainLayout>
            <LeaveBalance />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/leaves/approval" element={
        <ProtectedRoute>
          <MainLayout>
            <LeaveApproval />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/leaves/:id" element={
        <ProtectedRoute>
          <MainLayout>
            <LeaveDetail />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/leaves/all-balances" element={
        <ProtectedRoute>
          <MainLayout>
            <AllLeaveBalances />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/approval-flow" element={
        <ProtectedRoute>
          <MainLayout>
            <ApprovalFlowList />
          </MainLayout>
        </ProtectedRoute>
      } />

      {/* REPLACEMENT LEAVES */}
      <Route path="/leaves/replacement" element={
        <ProtectedRoute>
          <MainLayout>
            <ReplacementList />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/leaves/replacement/create" element={
        <ProtectedRoute>
          <MainLayout>
            <ReplacementCreate />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/leaves/replacement/approval" element={
        <ProtectedRoute>
          <MainLayout>
            <ReplacementApproval />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/leaves/new-employees" element={
          <ProtectedRoute>
              <MainLayout>
                  <ManageNewEmployees />
              </MainLayout>
          </ProtectedRoute>
      } />

      {/* OTHER ROUTES */}
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

      <Route path="/attendance-report" element={
        <ProtectedRoute>
          <MainLayout>
            <AttendanceReport />
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

      <Route path="/ppe" element={
        <ProtectedRoute>
          <MainLayout>
            <PPEListPage />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/ppe/categories" element={
        <ProtectedRoute>
          <MainLayout>
            <PPECategoryPage />
          </MainLayout>
        </ProtectedRoute>
      } />

      {/* RECRUITMENT */}
      <Route path="/candidates" element={
        <ProtectedRoute>
          <MainLayout>
            <CandidateList />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/candidates/create" element={
        <ProtectedRoute>
          <MainLayout>
            <CandidateForm />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/candidates/:id" element={
        <ProtectedRoute>
          <MainLayout>
            <CandidateDetail />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/candidates/:id/edit" element={
        <ProtectedRoute>
          <MainLayout>
            <CandidateForm />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/candidates/cv" element={
        <ProtectedRoute>
          <MainLayout>
            <CandidateCVList />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/vacancies" element={
        <ProtectedRoute>
          <MainLayout>
            <VacancyList />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/vacancies/create" element={
        <ProtectedRoute>
          <MainLayout>
            <VacancyForm />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/vacancies/:id/edit" element={
        <ProtectedRoute>
          <MainLayout>
            <VacancyForm />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/applications" element={
        <ProtectedRoute>
          <MainLayout>
            <ApplicationList />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/applications/create" element={
        <ProtectedRoute>
          <MainLayout>
            <ApplicationCreate />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/applications/:id" element={
        <ProtectedRoute>
          <MainLayout>
            <ApplicationDetail />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/onboarding" element={
        <ProtectedRoute>
          <MainLayout>
            <OnboardingList />
          </MainLayout>
        </ProtectedRoute>
      } />

      {/* INCIDENT REPORTS */}
      <Route path="/incident-reports" element={
        <ProtectedRoute>
          <MainLayout>
            <IncidentList />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/incident-reports/create" element={
        <ProtectedRoute>
          <MainLayout>
            <IncidentCreate />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/incident-reports/:id" element={
        <ProtectedRoute>
          <MainLayout>
            <IncidentDetail />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/incident-reports/:id/edit" element={
        <ProtectedRoute>
          <MainLayout>
            <IncidentEdit />
          </MainLayout>
        </ProtectedRoute>
      } />

      {/* LOST TIME INJURY */}
      <Route path="/lost-time-injuries" element={
        <ProtectedRoute>
          <MainLayout>
            <LostTimeInjuryList />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/lost-time-injuries/create" element={
        <ProtectedRoute>
          <MainLayout>
            <LostTimeInjuryCreate />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/lost-time-injuries/:id" element={
        <ProtectedRoute>
          <MainLayout>
            <LostTimeInjuryDetail />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/lost-time-injuries/:id/edit" element={
        <ProtectedRoute>
          <MainLayout>
            <LostTimeInjuryEdit />
          </MainLayout>
        </ProtectedRoute>
      } />

      {/* PAYROLL */}
      <Route path="/payroll" element={
        <ProtectedRoute>
          <MainLayout>
            <PayrollList />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/payroll/create" element={
        <ProtectedRoute>
          <MainLayout>
            <PayrollCreate />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/payroll/:id" element={
        <ProtectedRoute>
          <MainLayout>
            <PayrollDetail />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/payroll/:id/edit" element={
        <ProtectedRoute>
          <MainLayout>
            <PayrollEdit />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/employee-salary" element={
        <ProtectedRoute>
          <MainLayout>
            <EmployeeSalarySettings />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/payslips/:payrollId" element={
        <ProtectedRoute>
          <MainLayout>
            <PayslipList />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/payslips/employee/:employeeId" element={
        <ProtectedRoute>
          <MainLayout>
            <PayslipList />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/exchange-rates" element={
        <ProtectedRoute>
          <MainLayout>
            <ExchangeRateSettings />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/tax-settings" element={
        <ProtectedRoute>
          <MainLayout>
            <TaxSettings />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/settings" element={
        <ProtectedRoute>
          <MainLayout>
            <div>Settings Page</div>
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/notifications" element={
        <ProtectedRoute>
          <MainLayout>
            <div>Notifications Page</div>
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute>
          <MainLayout>
            <div>Profile Page</div>
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;