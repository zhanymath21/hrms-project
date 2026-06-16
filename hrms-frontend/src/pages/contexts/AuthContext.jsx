// src/pages/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deviceType, setDeviceType] = useState('web');
  const navigate = useNavigate();

  const API_URL = 'http://192.168.0.13:8000/api';

  // Login function - sesuai dengan response AuthController
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Attempting login with:', email);
      
      const response = await axios.post(`${API_URL}/login`, {
        email: email,
        password: password,
        device_type: 'web' // Karena ini untuk web admin
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('Login response:', response.data);
      
      // Response structure dari AuthController Anda:
      // {
      //   status: 'success',
      //   message: 'Login successful',
      //   data: {
      //     employee: {...},
      //     token: '...',
      //     device_type: 'web'
      //   }
      // }
      
      if (response.data.status === 'success' && response.data.data) {
        const { token: userToken, employee, device_type } = response.data.data;
        
        if (userToken) {
          setToken(userToken);
          setUser(employee);
          setDeviceType(device_type);
          
          // Save to localStorage
          localStorage.setItem('token', userToken);
          localStorage.setItem('user', JSON.stringify(employee));
          localStorage.setItem('device_type', device_type);
          
          // Set default axios header
          axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
          
          console.log('Login successful, redirecting to dashboard');
          navigate('/dashboard');
          return true;
        } else {
          console.error('No token in response');
          setError('Invalid response from server');
          return false;
        }
      } else {
        console.error('Login failed:', response.data.message);
        setError(response.data.message || 'Login failed');
        return false;
      }
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      
      // Handle specific error messages from AuthController
      let errorMessage = 'Login failed. Please try again.';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      if (err.response?.status === 403) {
        errorMessage = err.response.data.message || 'Access denied. Please contact administrator.';
      }
      
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        await axios.post(`${API_URL}/logout`, {}, {
          headers: {
            'Authorization': `Bearer ${currentToken}`
          }
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear all local data regardless of API response
      setToken(null);
      setUser(null);
      setDeviceType('web');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('device_type');
      delete axios.defaults.headers.common['Authorization'];
      navigate('/login');
    }
  };

  // Check if user is authenticated
  const isAuthenticated = !!token;

  // Load user from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedDeviceType = localStorage.getItem('device_type');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setDeviceType(storedDeviceType || 'web');
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      error,
      deviceType,
      login,
      logout,
      isAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  );
};
