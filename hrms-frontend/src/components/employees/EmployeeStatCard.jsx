// src/components/employees/EmployeeStatCard.jsx

import React from 'react';
import { Card, CardContent, Typography, CircularProgress } from '@mui/material';

export const EmployeeStatCard = ({ title, value, color = 'primary', loading }) => (
  <Card>
    <CardContent>
      <Typography color="textSecondary" gutterBottom variant="body2">
        {title}
      </Typography>
      {loading ? (
        <CircularProgress size={24} />
      ) : (
        <Typography variant="h4" component="div" color={`${color}.main`}>
          {value}
        </Typography>
      )}
    </CardContent>
  </Card>
);