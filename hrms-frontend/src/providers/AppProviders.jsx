// src/providers/AppProviders.jsx
import React from 'react';
import { AuthProvider } from '../pages/contexts/AuthContext';
import { EmployeeProvider } from '../pages/contexts/EmployeeContext';
import { AttendanceProvider } from '../pages/contexts/AttendanceContext';

export const AppProviders = ({ children }) => {
  return (
    <AuthProvider>
      <EmployeeProvider>
        <AttendanceProvider>
          {children}
        </AttendanceProvider>
      </EmployeeProvider>
    </AuthProvider>
  );
};