// src/pages/components/AdminRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  
  // Check if user has admin/HR role
  const isAdmin = user?.position?.title?.includes('HR') || 
                  user?.position?.title?.includes('Admin') ||
                  user?.role === 'admin' ||
                  user?.email === 'admin@example.com'; // temporary for testing
  
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

export default AdminRoute; // Pastikan ini ada