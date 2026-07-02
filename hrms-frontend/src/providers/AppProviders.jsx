// src/providers/AppProviders.jsx

import React from 'react';
import { AuthProvider } from '../pages/contexts/AuthContext';
import { EmployeeProvider } from '../pages/contexts/EmployeeContext';
import { AttendanceProvider } from '../pages/contexts/AttendanceContext';
import { LeaveProvider } from '../pages/contexts/LeaveContext';  // ← TAMBAHKAN
import { NotificationProvider } from '../pages/contexts/NotificationContext';  // ← TAMBAHKAN

export const AppProviders = ({ children }) => {
  return (
    <AuthProvider>
      <EmployeeProvider>
        <AttendanceProvider>
          <LeaveProvider>  {/* ← TAMBAHKAN */}
            <NotificationProvider>  {/* ← TAMBAHKAN */}
              {children}
            </NotificationProvider>
          </LeaveProvider>
        </AttendanceProvider>
      </EmployeeProvider>
    </AuthProvider>
  );
};